/**
 * Historical Tracker - Seguimiento histórico de métricas de rendimiento
 *
 * Almacena puntos de datos en una ventana rodante y provee análisis de tendencias.
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(process.cwd(), 'performance-history.json');
const MAX_HISTORY_POINTS = 2880; // ~24h at 30s intervals

/**
 * Registra un punto de datos de rendimiento
 */
function recordDataPoint({ apiResponseTimes, alertCount, lighthouseScores, bundleSize }) {
  const history = loadHistory();

  const dataPoint = {
    timestamp: new Date().toISOString(),
    apiResponseTimes: apiResponseTimes || [],
    alertCount: alertCount != null ? alertCount : 0,
    lighthouseScores: lighthouseScores || null,
    bundleSize: bundleSize || null,
  };

  history.push(dataPoint);

  // Rolling window
  const trimmed = history.length > MAX_HISTORY_POINTS
    ? history.slice(history.length - MAX_HISTORY_POINTS)
    : history;

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  return dataPoint;
}

/**
 * Carga el historial desde disco. Retorna [] si no existe.
 */
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch {
    // Corrupted or unreadable
  }
  return [];
}

/**
 * Obtiene la tendencia de un endpoint específico
 * Retorna { avg, min, max, current, sampleCount, isDegradading } o null
 */
function getEndpointTrend(endpoint) {
  const history = loadHistory();
  if (history.length === 0) return null;

  const responseTimes = [];
  for (const point of history) {
    const entry = (point.apiResponseTimes || []).find(e => e.endpoint === endpoint);
    if (entry && entry.responseTime != null) {
      responseTimes.push(entry.responseTime);
    }
  }

  if (responseTimes.length === 0) return null;

  const avg = responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length;
  const min = Math.min(...responseTimes);
  const max = Math.max(...responseTimes);
  const current = responseTimes[responseTimes.length - 1];

  // Detect degradation: compare last third vs first third
  let isDegradading = false;
  if (responseTimes.length >= 5) {
    const third = Math.floor(responseTimes.length / 3);
    const firstThird = responseTimes.slice(0, third);
    const lastThird = responseTimes.slice(-third);
    const avgFirst = firstThird.reduce((s, v) => s + v, 0) / firstThird.length;
    const avgLast = lastThird.reduce((s, v) => s + v, 0) / lastThird.length;
    isDegradading = avgLast > avgFirst * 1.25; // 25% increase = degradation
  }

  return {
    avg: Math.round(avg * 100) / 100,
    min,
    max,
    current,
    sampleCount: responseTimes.length,
    isDegradading,
  };
}

/**
 * Obtiene los últimos N puntos de datos (para la API)
 */
function getRecentHistory(count = 60) {
  const history = loadHistory();
  return history.slice(-count);
}

/**
 * Limpia historial anterior a una fecha
 */
function pruneHistory(beforeDate) {
  const history = loadHistory();
  const pruned = history.filter(p => new Date(p.timestamp) >= beforeDate);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(pruned, null, 2));
  return pruned.length;
}

module.exports = {
  recordDataPoint,
  loadHistory,
  getEndpointTrend,
  getRecentHistory,
  pruneHistory,
  MAX_HISTORY_POINTS,
};
