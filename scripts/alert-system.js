/**
 * Alert System - Sistema de alertas con niveles de severidad y persistencia
 *
 * Gestiona la creación, almacenamiento y consulta de alertas de rendimiento.
 * Mantiene una ventana rodante de alertas para evitar crecimiento infinito.
 */

const fs = require('fs');
const path = require('path');

const ALERTS_FILE = path.join(process.cwd(), 'performance-alerts.json');
const MAX_ALERTS = 200;

let alertIdCounter = Date.now();

/**
 * Crea una alerta y la persiste
 */
function createAlert({ level, category, message, endpoint, value, threshold }) {
  const alert = {
    id: `alert-${++alertIdCounter}`,
    timestamp: new Date().toISOString(),
    level,          // INFO | WARN | CRITICAL
    category,       // api | lighthouse | bundle | system
    message,
    endpoint: endpoint || null,
    value: value != null ? value : null,
    threshold: threshold != null ? threshold : null,
  };

  const alerts = loadAlerts();
  alerts.push(alert);

  // Rolling window: keep most recent
  const trimmed = alerts.length > MAX_ALERTS
    ? alerts.slice(alerts.length - MAX_ALERTS)
    : alerts;

  fs.writeFileSync(ALERTS_FILE, JSON.stringify(trimmed, null, 2));
  return alert;
}

/**
 * Carga alertas desde disco. Retorna [] si no existe el archivo.
 */
function loadAlerts() {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'));
    }
  } catch {
    // Corrupted or unreadable
  }
  return [];
}

/**
 * Limpia alertas anteriores a una fecha dada
 */
function pruneAlerts(beforeDate) {
  const alerts = loadAlerts();
  const pruned = alerts.filter(a => new Date(a.timestamp) >= beforeDate);
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(pruned, null, 2));
  return pruned.length;
}

module.exports = {
  createAlert,
  loadAlerts,
  pruneAlerts,
  MAX_ALERTS,
};
