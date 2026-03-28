#!/usr/bin/env node

/**
 * Performance Monitor - Monitoreo continuo de métricas de rendimiento
 * 
 * Este script se ejecuta en segundo plano y monitorea continuamente
 * las métricas de rendimiento de la aplicación, alertando cuando se
 * exceden los thresholds definidos en el baseline.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Configuración
const config = {
  checkInterval: 30000, // 30 segundos
  apiUrl: 'http://localhost:3000',
  thresholds: {
    apiResponseTime: {
      default: 100, // ms por defecto
      multiplier: 1.5, // multiplicador sobre el baseline
    },
    webVitals: {
      fcp: 2500, // ms
      lcp: 4000, // ms
      cls: 0.1, // score
      tbt: 200, // ms
      interactive: 3000, // ms
    },
    lighthouse: {
      performance: 0.90,
      accessibility: 0.90,
      bestPractices: 0.90,
      seo: 0.90,
    },
    bundleSize: {
      main: 2 * 1024 * 1024, // 2MB
      total: 5 * 1024 * 1024, // 5MB
    },
  },
  alerts: {
    logFile: 'performance-monitor.log',
    maxAlerts: 10,
  },
};

// Cargar baseline
let baselineData = null;
let alertCount = 0;

function loadBaseline() {
  try {
    const baselineFile = path.join(process.cwd(), 'performance-baseline-results', 'baseline-performance-2026-03-27T22-47-30-307Z.json');
    if (fs.existsSync(baselineFile)) {
      const content = fs.readFileSync(baselineFile, 'utf8');
      baselineData = JSON.parse(content);
      console.log('✅ Baseline de rendimiento cargado');
    } else {
      console.log('⚠️ No se encontró el baseline, usando thresholds por defecto');
    }
  } catch (error) {
    console.log('⚠️ Error al cargar baseline:', error.message);
  }
}

function logAlert(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Escribir a archivo de log
  try {
    fs.appendFileSync(config.alerts.logFile, logMessage + '\n');
  } catch (error) {
    console.log('⚠️ Error al escribir log:', error.message);
  }
}

async function checkApiResponseTimes() {
  if (!baselineData || !baselineData.metrics || !baselineData.metrics.apiResponseTime) {
    logAlert('Datos de baseline de API no disponibles', 'WARN');
    return;
  }

  const baselineTimes = baselineData.metrics.apiResponseTime.endpoints;
  const results = [];

  for (const [endpoint, baseline] of Object.entries(baselineTimes)) {
    try {
      const startTime = Date.now();
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`${config.apiUrl}${endpoint}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
      });
      
      const duration = Date.now() - startTime;
      const baselineTime = baseline.responseTime * 1000 * config.thresholds.apiResponseTime.multiplier;
      const status = duration <= baselineTime ? 'OK' : 'SLOW';
      
      results.push({
        endpoint,
        duration,
        baseline: baseline.responseTime * 1000,
        threshold: baselineTime,
        status,
      });

      if (status === 'SLOW') {
        alertCount++;
        logAlert(`API LENTA: ${endpoint} (${duration}ms > ${baselineTime}ms)`, 'WARN');
      }
    } catch (error) {
      results.push({
        endpoint,
        error: error.message,
        status: 'ERROR',
      });
      logAlert(`API ERROR: ${endpoint} - ${error.message}`, 'ERROR');
    }
  }

  return results;
}

async function runLighthouseAudit() {
  return new Promise((resolve) => {
    const child = spawn('npx', ['lighthouse', config.apiUrl, '--output=json', '--output-path=/tmp/lighthouse-output.json'], {
      stdio: 'pipe',
      timeout: 120000,
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const output = fs.readFileSync('/tmp/lighthouse-output.json', 'utf8');
          const data = JSON.parse(output);
          resolve(data);
        } catch (error) {
          logAlert(`Error al procesar Lighthouse: ${error.message}`, 'ERROR');
          resolve(null);
        }
      } else {
        logAlert(`Lighthouse failed with code ${code}`, 'ERROR');
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logAlert(`Error ejecutando Lighthouse: ${error.message}`, 'ERROR');
      resolve(null);
    });
  });
}

async function checkLighthouseScores() {
  logAlert('Ejecutando auditoría Lighthouse...', 'INFO');
  
  const lighthouseData = await runLighthouseAudit();
  if (!lighthouseData) {
    return null;
  }

  const categories = lighthouseData.categories;
  const results = {};

  for (const [category, data] of Object.entries(categories)) {
    const categoryName = category === 'best-practices' ? 'bestPractices' : category;
    const threshold = config.thresholds.lighthouse[categoryName];
    
    results[category] = {
      score: data.score,
      threshold: threshold,
      status: data.score >= threshold ? 'PASS' : 'FAIL',
    };

    if (data.score < threshold) {
      alertCount++;
      logAlert(`Lighthouse ${category}: ${data.score} < ${threshold} (FAIL)`, 'WARN');
    } else {
      logAlert(`Lighthouse ${category}: ${data.score} >= ${threshold} (PASS)`, 'INFO');
    }
  }

  return results;
}

async function checkBundleSize() {
  const buildDir = path.join(process.cwd(), '.next');
  const statsPath = path.join(buildDir, 'stats.json');
  
  if (!fs.existsSync(statsPath)) {
    logAlert('No se encontraron artefactos de build', 'WARN');
    return null;
  }

  try {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    const assets = stats.assets || [];
    
    let totalSize = 0;
    const mainBundle = assets.find((asset) => 
      asset.name.includes('main') || asset.name.includes('pages')
    );

    results = {
      mainBundle: mainBundle ? {
        name: mainBundle.name,
        size: mainBundle.size,
        threshold: config.thresholds.bundleSize.main,
        status: mainBundle.size <= config.thresholds.bundleSize.main ? 'PASS' : 'FAIL',
      } : null,
      totalSize: {
        size: assets.reduce((sum, asset) => sum + (asset.size || 0), 0),
        threshold: config.thresholds.bundleSize.total,
        status: totalSize <= config.thresholds.bundleSize.total ? 'PASS' : 'FAIL',
      },
    };

    if (mainBundle && mainBundle.size > config.thresholds.bundleSize.main) {
      alertCount++;
      logAlert(`Main bundle demasiado grande: ${mainBundle.size} > ${config.thresholds.bundleSize.main}`, 'WARN');
    }

    if (totalSize > config.thresholds.bundleSize.total) {
      alertCount++;
      logAlert(`Total bundle demasiado grande: ${totalSize} > ${config.thresholds.bundleSize.total}`, 'WARN');
    }

    return results;
  } catch (error) {
    logAlert(`Error al verificar bundle size: ${error.message}`, 'ERROR');
    return null;
  }
}

async function performFullCheck() {
  logAlert('=== Iniciando chequeo completo de rendimiento ===', 'INFO');
  
  const checkResults = {
    timestamp: new Date().toISOString(),
    apiResponseTimes: await checkApiResponseTimes(),
    lighthouseScores: await checkLighthouseScores(),
    bundleSize: await checkBundleSize(),
    alertCount: alertCount,
  };

  logAlert(`Chequeo completado. Alertas totales: ${alertCount}`, 'INFO');
  
  // Guardar resultados
  const resultsFile = path.join(process.cwd(), 'performance-monitor-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(checkResults, null, 2));
  
  return checkResults;
}

// Iniciar monitoreo
loadBaseline();
logAlert('Iniciando Performance Monitor...', 'INFO');

// Ejecutar chequeos completos periódicamente
setInterval(performFullCheck, config.checkInterval);

// Ejecutar primer chequeo inmediatamente
performFullCheck().catch(console.error);

// Manejar graceful shutdown
process.on('SIGINT', () => {
  logAlert('Performance Monitor detenido', 'INFO');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logAlert('Performance Monitor detenido', 'INFO');
  process.exit(0);
});

logAlert('Performance Monitor iniciado. Chequeos cada 30 segundos.', 'INFO');