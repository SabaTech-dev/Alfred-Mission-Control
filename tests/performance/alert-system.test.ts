import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ALERTS_FILE = path.join(process.cwd(), 'performance-alerts.json');
const HISTORY_FILE = path.join(process.cwd(), 'performance-history.json');

// Clean up test artifacts
beforeEach(() => {
  [ALERTS_FILE, HISTORY_FILE].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

afterEach(() => {
  [ALERTS_FILE, HISTORY_FILE].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

describe('Alert System', () => {
  describe('Alert creation and severity', () => {
    it('should create an alert with correct structure', async () => {
      const { createAlert } = await import('../../scripts/alert-system.js');
      const alert = createAlert({
        level: 'WARN',
        category: 'api',
        endpoint: '/api/system',
        message: 'Response time exceeded threshold',
        value: 150,
        threshold: 100,
      });

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.level).toBe('WARN');
      expect(alert.category).toBe('api');
      expect(alert.endpoint).toBe('/api/system');
      expect(alert.value).toBe(150);
      expect(alert.threshold).toBe(100);
      expect(alert.timestamp).toBeDefined();
    });

    it('should assign INFO, WARN, or CRITICAL severity levels', async () => {
      const { createAlert } = await import('../../scripts/alert-system.js');

      const infoAlert = createAlert({ level: 'INFO', category: 'system', message: 'Check complete' });
      const warnAlert = createAlert({ level: 'WARN', category: 'api', message: 'Slow endpoint' });
      const criticalAlert = createAlert({ level: 'CRITICAL', category: 'api', message: 'Endpoint down' });

      expect(infoAlert.level).toBe('INFO');
      expect(warnAlert.level).toBe('WARN');
      expect(criticalAlert.level).toBe('CRITICAL');
    });

    it('should persist alerts to file', async () => {
      const { createAlert, loadAlerts } = await import('../../scripts/alert-system.js');

      createAlert({ level: 'WARN', category: 'api', message: 'Test alert 1' });
      createAlert({ level: 'CRITICAL', category: 'api', message: 'Test alert 2' });

      const alerts = loadAlerts();
      expect(alerts).toHaveLength(2);
      expect(alerts[0].message).toBe('Test alert 1');
      expect(alerts[1].message).toBe('Test alert 2');
    });
  });

  describe('Alert history and rotation', () => {
    it('should keep at most MAX_ALERTS alerts (rolling window)', async () => {
      const { createAlert, loadAlerts, MAX_ALERTS } = await import('../../scripts/alert-system.js');

      // Create more alerts than the max
      for (let i = 0; i < MAX_ALERTS + 5; i++) {
        createAlert({ level: 'INFO', category: 'api', message: `Alert ${i}` });
      }

      const alerts = loadAlerts();
      expect(alerts.length).toBeLessThanOrEqual(MAX_ALERTS);
      // Should keep the most recent ones
      expect(alerts[alerts.length - 1].message).toBe(`Alert ${MAX_ALERTS + 4}`);
    });

    it('should load empty array when no alerts file exists', async () => {
      const { loadAlerts } = await import('../../scripts/alert-system.js');
      const alerts = loadAlerts();
      expect(alerts).toEqual([]);
    });
  });

  describe('Alert filtering', () => {
    it('should filter alerts by level', async () => {
      const { createAlert, loadAlerts } = await import('../../scripts/alert-system.js');

      createAlert({ level: 'INFO', category: 'system', message: 'Info 1' });
      createAlert({ level: 'WARN', category: 'api', message: 'Warn 1' });
      createAlert({ level: 'CRITICAL', category: 'api', message: 'Critical 1' });
      createAlert({ level: 'WARN', category: 'api', message: 'Warn 2' });

      const allAlerts = loadAlerts();
      const warnAlerts = allAlerts.filter((a: any) => a.level === 'WARN');
      expect(warnAlerts).toHaveLength(2);
    });

    it('should filter alerts by category', async () => {
      const { createAlert, loadAlerts } = await import('../../scripts/alert-system.js');

      createAlert({ level: 'INFO', category: 'system', message: 'System check' });
      createAlert({ level: 'WARN', category: 'api', message: 'API slow' });
      createAlert({ level: 'WARN', category: 'lighthouse', message: 'Score low' });

      const allAlerts = loadAlerts();
      const apiAlerts = allAlerts.filter((a: any) => a.category === 'api');
      expect(apiAlerts).toHaveLength(1);
    });
  });
});

describe('Historical Tracker', () => {
  describe('Data point recording', () => {
    it('should record a performance data point with timestamp', async () => {
      const { recordDataPoint, loadHistory } = await import('../../scripts/historical-tracker.js');

      recordDataPoint({
        apiResponseTimes: [
          { endpoint: '/api/system', responseTime: 5, status: 'OK' },
          { endpoint: '/api/kanban/tasks', responseTime: 3, status: 'OK' },
        ],
        alertCount: 0,
      });

      const history = loadHistory();
      expect(history).toHaveLength(1);
      expect(history[0].apiResponseTimes).toHaveLength(2);
      expect(history[0].timestamp).toBeDefined();
    });

    it('should maintain rolling window of data points', async () => {
      const { recordDataPoint, loadHistory, MAX_HISTORY_POINTS } = await import('../../scripts/historical-tracker.js');

      for (let i = 0; i < MAX_HISTORY_POINTS + 10; i++) {
        recordDataPoint({
          apiResponseTimes: [{ endpoint: '/api/system', responseTime: i, status: 'OK' }],
          alertCount: 0,
        });
      }

      const history = loadHistory();
      expect(history.length).toBeLessThanOrEqual(MAX_HISTORY_POINTS);
    });

    it('should load empty array when no history file exists', async () => {
      const { loadHistory } = await import('../../scripts/historical-tracker.js');
      const history = loadHistory();
      expect(history).toEqual([]);
    });
  });

  describe('Trend analysis', () => {
    it('should calculate average response time for an endpoint', async () => {
      const { recordDataPoint, getEndpointTrend } = await import('../../scripts/historical-tracker.js');

      // Record 3 data points
      for (const ms of [5, 10, 15]) {
        recordDataPoint({
          apiResponseTimes: [{ endpoint: '/api/system', responseTime: ms, status: 'OK' }],
          alertCount: 0,
        });
      }

      const trend = getEndpointTrend('/api/system');
      expect(trend).toBeDefined();
      expect(trend.avg).toBeCloseTo(10, 1);
      expect(trend.min).toBe(5);
      expect(trend.max).toBe(15);
      expect(trend.current).toBe(15);
    });

    it('should return null trend for unknown endpoint', async () => {
      const { getEndpointTrend } = await import('../../scripts/historical-tracker.js');
      const trend = getEndpointTrend('/api/unknown');
      expect(trend).toBeNull();
    });

    it('should detect degradation trend (increasing response times)', async () => {
      const { recordDataPoint, getEndpointTrend } = await import('../../scripts/historical-tracker.js');

      // Response times increasing: 5, 10, 20, 40, 80
      for (const ms of [5, 10, 20, 40, 80]) {
        recordDataPoint({
          apiResponseTimes: [{ endpoint: '/api/system', responseTime: ms, status: 'OK' }],
          alertCount: 0,
        });
      }

      const trend = getEndpointTrend('/api/system');
      expect(trend).toBeDefined();
      expect(trend.isDegradading).toBe(true);
    });
  });
});
