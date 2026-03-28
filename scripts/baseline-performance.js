#!/usr/bin/env node

/**
 * Performance Baseline Collector
 * 
 * Recopila métricas de rendimiento base de la aplicación para establecer
 * puntos de referencia y definir thresholds de éxito.
 * 
 * Ejecución: node scripts/baseline-performance.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../performance-baseline-results');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Ejecuta Lighthouse en la aplicación local
 */
function runLighthouse() {
  console.log('🔍 Ejecutando Lighthouse audit...');
  
  try {
    const command = `npx lighthouse http://localhost:3000 --output=json --output-path=${RESULTS_DIR}/lighthouse-${TIMESTAMP}.json --chrome-flags="--headless" --preset=desktop --quiet`;
    execSync(command, { 
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 120000 // 2 minutos timeout
    });
    console.log('✅ Lighthouse audit completado');
    return true;
  } catch (error) {
    console.error('❌ Lighthouse audit fallido:', error.message);
    return false;
  }
}

/**
 * Mide el tiempo de respuesta de la API
 */
function measureApiResponseTime() {
  console.log('📊 Midiendo tiempos de respuesta de API...');
  
  const results = {
    timestamp: TIMESTAMP,
    endpoints: {}
  };
  
  const endpoints = [
    '/api/system',
    '/api/kanban/tasks',
    '/api/kanban/heartbeat'
  ];
  
  endpoints.forEach(endpoint => {
    try {
      const start = Date.now();
      const command = `curl -s -w "%{time_total}" -o /dev/null http://localhost:3000${endpoint}`;
      const output = execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 10000
      });
      const duration = parseFloat(output.toString());
      
      results.endpoints[endpoint] = {
        responseTime: duration,
        status: 'success'
      };
      
      console.log(`  ${endpoint}: ${duration.toFixed(3)}s`);
    } catch (error) {
      results.endpoints[endpoint] = {
        responseTime: null,
        status: 'error',
        error: error.message
      };
      console.error(`  ${endpoint}: Error - ${error.message}`);
    }
  });
  
  return results;
}

/**
 Analiza el tamaño del bundle
 */
function analyzeBundleSize() {
  console.log('📦 Analizando tamaño del bundle...');
  
  try {
    const statsPath = path.join(process.cwd(), '.next/stats.json');
    if (fs.existsSync(statsPath)) {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      
      const results = {
        timestamp: TIMESTAMP,
        assets: {}
      };
      
      Object.entries(stats.assetsByChunkName).forEach(([chunk, files]) => {
        if (Array.isArray(files)) {
          files.forEach(file => {
            const asset = stats.assets[file];
            if (asset && asset.size) {
              results.assets[file] = {
                size: asset.size,
                sizeKB: Math.round(asset.size / 1024)
              };
            }
          });
        }
      });
      
      console.log(`  Bundle principal: ${Object.keys(results.assets).length} assets`);
      return results;
    } else {
      console.log('⚠️  No se encontraron archivos .next/stats.json (ejecutar build primero)');
      return null;
    }
  } catch (error) {
    console.error('❌ Error analizando bundle size:', error.message);
    return null;
  }
}

/**
 * Guarda resultados en archivo
 */
function saveResults(results, filename) {
  const filePath = path.join(RESULTS_DIR, `${filename}-${TIMESTAMP}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`📄 Resultados guardados: ${filePath}`);
}

/**
 * Función principal
 */
function main() {
  console.log('🚀 Iniciando recolección de baseline de rendimiento...');
  console.log(`Timestamp: ${TIMESTAMP}`);
  
  // Crear directorio de resultados
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const results = {
    timestamp: TIMESTAMP,
    project: 'alfred-mission-control',
    version: require(path.join(process.cwd(), 'package.json')).version,
    metrics: {}
  };
  
  // Ejecutar mediciones
  results.metrics.lighthouse = runLighthouse();
  results.metrics.apiResponseTime = measureApiResponseTime();
  results.metrics.bundleSize = analyzeBundleSize();
  
  // Guardar resultados
  saveResults(results, 'baseline-performance');
  
  // Generar resumen
  console.log('\n📊 Resumen de baseline de rendimiento:');
  console.log('=====================================');
  
  if (results.metrics.apiResponseTime) {
    const avgResponseTime = Object.values(results.metrics.apiResponseTime.endpoints)
      .filter(e => e.status === 'success')
      .reduce((sum, e) => sum + e.responseTime, 0) / 
      Object.values(results.metrics.apiResponseTime.endpoints).filter(e => e.status === 'success').length;
    
    console.log(`⏱️  Tiempo de respuesta promedio API: ${avgResponseTime.toFixed(3)}s`);
  }
  
  if (results.metrics.bundleSize && Object.keys(results.metrics.bundleSize.assets).length > 0) {
    const totalSize = Object.values(results.metrics.bundleSize.assets)
      .reduce((sum, asset) => sum + asset.size, 0);
    console.log(`📦 Tamaño total del bundle: ${Math.round(totalSize / 1024)}KB`);
  }
  
  console.log('\n✅ Baseline de rendimiento completado');
  console.log('📄 Todos los resultados guardados en:', RESULTS_DIR);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runLighthouse, measureApiResponseTime, analyzeBundleSize, saveResults };