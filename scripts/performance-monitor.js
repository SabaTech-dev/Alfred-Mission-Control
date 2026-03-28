#!/usr/bin/env node

/**
 * Performance Monitor v2 - Monitoreo continuo con alertas e historial
 *
 * Integrado con alert-system.js (alertas con severidad) y
 * historical-tracker.js (datos históricos con ventana rodante).
 * Lighthouse se salta gracefully si no está disponible.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { createAlert, loadAlerts } = require('./alert-system');
const { recordDataPoint, getEndpointTrend } = require('./historical-tracker');

// Configuración
const config = {
  checkInterval: 30000, // 30 segundos
  apiUrl: 'http://localhost:3000',
  thresholds: {
    apiResponseTime: {
      default: 100,
      multiplier: 1.5,
    },
    webVitals: {
      fcp: 2500,
      lcp: 4000,
      cls: 0.1,
      tbt: 200,
      interactive: 3000,
    },
    lighthouse: {
      performance: 0.90,
      accessibility: 0.90,
      bestPractices: 0.90,
      seo: 0.90,
    },
    bundleSize: {
      main: 2 * 1024 * 1024,
      total: 5 * 1024 * 1024,
    },
  },
  alerts: {
    logFile: 'performance-monitor.log',
  },
};

// Cargar baseline
let baselineData = null;
let alertCount = 0;
let lighthouseAvailable = true; // Will be set to false after first failure

function loadBaseline() {
  try {
    const baselineDir = path.join(process.cwd(), 'performance-baseline-results');
    if (fs.existsSync(baselineDir)) {
      const files = fs.readdirSync(baselineDir).filter(f => f.startsWith('baseline-'));
      if (files.length > 0) {
        const latest = files.sort().pop();
        const content = fs.readFileSync(path.join(baselineDir, latest), 'utf8');
        baselineData = JSON.parse(content);
        console.log('✅ Baseline de rendimiento cargado');
      }
    }
    if (!baselineData) {
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
  
  try {
    fs.appendFileSync(config.alerts.logFile, logMessage + '\n');
  } catch (error) {
    // Silently fail
  }
}

async function checkApiResponseTimes() {
  if (!baselineData || !baselineData.metrics || !baselineData.metrics.apiResponseTime) {
    logAlert('Datos de baseline de API no disponibles', 'WARN');
    return [];
  }

  const baselineTimes = baselineData.metrics.apiResponseTime.endpoints;
  const results = [];

  for (const [endpoint, baseline] of Object.entries(baselineTimes)) {
    try {
      const startTime = Date.now();
      await new Promise((resolve, reject) => {
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
        logAlert(`API LENTA: ${endpoint} (${duration}ms > ${baselineTime.toFixed(1)}ms)`, 'WARN');
        createAlert({
          level: 'WARN',
          category: 'api',
          endpoint,
          message: `Response time ${duration}ms exceeds threshold ${baselineTime.toFixed(1)}ms`,
          value: duration,
          threshold: baselineTime,
        });
      } else {
        // Check for degradation trend
        const trend = getEndpointTrend(endpoint);
        if (trend && trend.isDegradading) {
          createAlert({
            level: 'WARN',
            category: 'api',
            endpoint,
            message: `Degradation trend detected: avg ${trend.avg.toFixed(1)}ms (min ${trend.min}, max ${trend.max})`,
            value: trend.avg,
            threshold: trend.min,
          });
        }
      }
    } catch (error) {
      results.push({
        endpoint,
        error: error.message,
        status: 'ERROR',
      });
      alertCount++;
      logAlert(`API ERROR: ${endpoint} - ${error.message}`, 'ERROR');
      createAlert({
        level: 'CRITICAL',
        category: 'api',
        endpoint,
        message: `Endpoint unreachable: ${error.message}`,
        value: null,
        threshold: null,
      });
    }
  }

  return results;
}

async function runLighthouseAudit() {
  // Skip if previously failed (graceful degradation)
  if (!lighthouseAvailable) {
    return null;
  }

  return new Promise((resolve) => {
    const child = spawn('npx', ['lighthouse', config.apiUrl, '--output=json', '--output-path=/tmp/lighthouse-output.json', '--chrome-flags=--headless=new', '--no-enable-error-reporting'], {
      stdio: 'pipe',
      timeout: 60000, // Reduced from 120s
    });

    let stderr = '';
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const output = fs.readFileSync('/tmp/lighthouse-output.json', 'utf8');
          resolve(JSON.parse(output));
        } catch (error) {
          logAlert(`Error al procesar Lighthouse: ${error.message}`, 'WARN');
          resolve(null);
        }
      } else {
        // Mark as unavailable so we don't keep retrying
        lighthouseAvailable = false;
        logAlert(`Lighthouse no disponible (code ${code}). Se saltará en futuros chequeos.`, 'WARN');
        createAlert({
          level: 'INFO',
          category: 'lighthouse',
          message: `Lighthouse unavailable in this environment (skipped)`,
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      lighthouseAvailable = false;
      logAlert(`Lighthouse no ejecutable: ${error.message}. Se saltará.`, 'WARN');
      resolve(null);
    });
  });
}

async function checkLighthouseScores() {
  if (!lighthouseAvailable) {
    return null;
  }

  logAlert('Ejecutando auditoría Lighthouse...', 'INFO');
  
  const lighthouseData = await runLighthouseAudit();
  if (!lighthouseData) {
    return null;
  }

  const categories = lighthouseData.categories || {};
  const results = {};

  for (const [category, data] of Object.entries(categories)) {
    const categoryName = category === 'best-practices' ? 'bestPractices' : category;
    const threshold = config.thresholds.lighthouse[categoryName];
    
    results[category] = {
      score: data.score,
      threshold,
      status: data.score >= threshold ? 'PASS' : 'FAIL',
    };

    if (data.score < threshold) {
      alertCount++;
      logAlert(`Lighthouse ${category}: ${data.score} < ${threshold} (FAIL)`, 'WARN');
      createAlert({
        level: 'WARN',
        category: 'lighthouse',
        message: `Score ${data.score} below threshold ${threshold}`,
        value: data.score,
        threshold,
      });
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
    
    const mainBundle = assets.find((asset) => 
      asset.name.includes('main') || asset.name.includes('pages')
    );
    const totalSize = assets.reduce((sum, asset) => sum + (asset.size || 0), 0);

    const results = {
      mainBundle: mainBundle ? {
        name: mainBundle.name,
        size: mainBundle.size,
        threshold: config.thresholds.bundleSize.main,
        status: mainBundle.size <= config.thresholds.bundleSize.main ? 'PASS' : 'FAIL',
      } : null,
      totalSize: {
        size: totalSize,
        threshold: config.thresholds.bundleSize.total,
        status: totalSize <= config.thresholds.bundleSize.total ? 'PASS' : 'FAIL',
      },
    };

    if (mainBundle && mainBundle.size > config.thresholds.bundleSize.main) {
      alertCount++;
      createAlert({
        level: 'WARN',
        category: 'bundle',
        message: `Main bundle ${mainBundle.size} bytes exceeds ${(config.thresholds.bundleSize.main / 1024 / 1024).toFixed(1)}MB`,
        value: mainBundle.size,
        threshold: config.thresholds.bundleSize.main,
      });
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
    alertCount,
  };

  // Record to historical tracker
  recordDataPoint({
    apiResponseTimes: (checkResults.apiResponseTimes || []).map(ep => ({
      endpoint: ep.endpoint,
      responseTime: ep.duration,
      status: ep.status,
    })),
    alertCount: checkResults.alertCount,
    lighthouseScores: checkResults.lighthouseScores,
    bundleSize: checkResults.bundleSize,
  });

  logAlert(`Chequeo completado. Alertas totales: ${alertCount}`, 'INFO');
  
  // Guardar resultados actuales
  const resultsFile = path.join(process.cwd(), 'performance-monitor-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(checkResults, null, 2));
  
  return checkResults;
}

// Iniciar monitoreo
loadBaseline();
logAlert('Iniciando Performance Monitor v2...', 'INFO');

setInterval(performFullCheck, config.checkInterval);
performFullCheck().catch(console.error);

process.on('SIGINT', () => {
  logAlert('Performance Monitor detenido', 'INFO');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logAlert('Performance Monitor detenido', 'INFO');
  process.exit(0);
});

logAlert('Performance Monitor v2 iniciado. Chequeos cada 30s. Alertas + historial activos.', 'INFO');
