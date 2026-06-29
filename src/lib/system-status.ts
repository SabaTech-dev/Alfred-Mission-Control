/**
 * Compact system status for the TopBar location badge.
 *
 * @module system-status
 */

import os from "os";

/**
 * Format an uptime (in seconds) into a compact, human-readable string.
 *
 * Examples: "6d", "6d 4h", "5h 30m", "12m", "<1m".
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) return "<1m";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export interface SystemStatus {
  hostname: string;
  uptime: string;
  uptimeSeconds: number;
}

/** Collect hostname + compact uptime. */
export function getSystemStatus(): SystemStatus {
  const uptimeSeconds = os.uptime();
  return {
    hostname: os.hostname(),
    uptime: formatUptime(uptimeSeconds),
    uptimeSeconds,
  };
}
