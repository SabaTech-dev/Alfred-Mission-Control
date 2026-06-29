/**
 * Pure helpers for enriching agent heartbeats with runtime metrics and for
 * rendering token-usage sparklines without any external charting library.
 *
 * These functions are intentionally side-effect free so they can be unit
 * tested in isolation and reused by both the API route and the UI.
 */

import type { AgentHeartbeat, AgentHeartbeatBase } from "./heartbeat-types";

/** Lightweight session usage record consumed by the enricher. */
export interface SessionUsageEntry {
  agentId: string;
  model: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

/** Lightweight agent status record consumed by the enricher. */
export interface StatusEntry {
  id: string;
  activeSessions: number;
  lastActivity?: string;
}

interface SparklineOptions {
  /** Inset (in SVG units) applied to all four sides. Defaults to 2. */
  padding?: number;
}

/**
 * Merge heartbeat configuration with live usage, status and history data.
 *
 * The function never mutates its inputs; each returned agent is a shallow
 * copy of the original base record extended with the available metrics.
 * Missing data sources simply leave the corresponding metric unset.
 */
export function enrichHeartbeats(
  agents: AgentHeartbeatBase[],
  sessions: SessionUsageEntry[],
  statuses: StatusEntry[],
  tokenHistoryByAgent: Record<string, number[]>
): AgentHeartbeat[] {
  const sessionsByAgent = groupBy(sessions, (s) => s.agentId);
  const statusById = new Map(statuses.map((s) => [s.id, s]));

  return agents.map((agent) => {
    const agentSessions = sessionsByAgent.get(agent.agentId) ?? [];
    const status = statusById.get(agent.agentId);

    const enriched: AgentHeartbeat = { ...agent };

    if (agentSessions.length > 0) {
      enriched.tokensUsed = agentSessions.reduce((sum, s) => sum + s.totalTokens, 0);
      const top = agentSessions.reduce((best, s) => (s.totalTokens > best.totalTokens ? s : best));
      enriched.activeModel = top.model;
    }

    if (status) {
      enriched.sessionActive = status.activeSessions > 0;
      if (status.lastActivity) {
        enriched.lastActivity = status.lastActivity;
      }
    }

    const history = tokenHistoryByAgent[agent.agentId];
    if (history && history.length > 0) {
      enriched.tokenHistory = history;
    }

    return enriched;
  });
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Build an SVG path string (`d` attribute) for a sparkline of numeric values.
 *
 * - Empty input returns an empty string (nothing to draw).
 * - A single value, or values that are all identical, render as a flat
 *   horizontal line at the vertical center.
 * - Otherwise values are normalised to the drawable area and drawn as a
 *   polyline, with higher values rendered higher up (smaller y).
 *
 * No external libraries are used.
 */
export function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  options: SparklineOptions = {}
): string {
  if (values.length === 0) {
    return "";
  }

  const padding = options.padding ?? 2;
  const centerY = height / 2;

  if (values.length === 1) {
    return linePath(padding, centerY, width - padding, centerY);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  // Flat line when there is no variation.
  if (min === max) {
    return linePath(padding, centerY, width - padding, centerY);
  }

  const drawableWidth = width - 2 * padding;
  const drawableHeight = height - 2 * padding;
  const span = max - min;
  const last = values.length - 1;

  const points = values.map((value, index) => {
    const x = padding + (index / last) * drawableWidth;
    const ratio = (value - min) / span;
    const y = padding + (1 - ratio) * drawableHeight;
    return { x, y };
  });

  const segments = points.map((p, i) => {
    const roundedX = round(p.x);
    const roundedY = round(p.y);
    return i === 0 ? `M ${roundedX} ${roundedY}` : `L ${roundedX} ${roundedY}`;
  });

  return segments.join(" ");
}

function linePath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a raw token count into a compact human-readable string.
 *
 * Examples: 0 -> "0", 42 -> "42", 1500 -> "1.5k", 2000 -> "2k",
 * 1500000 -> "1.5M", 3000000 -> "3M".
 */
export function formatTokenCount(tokens: number | undefined): string {
  const value = tokens ?? 0;
  if (value === 0) return "0";
  if (value < 1000) return String(value);

  if (value < 1_000_000) {
    const scaled = value / 1000;
    return `${trimDecimal(scaled)}k`;
  }

  const scaled = value / 1_000_000;
  return `${trimDecimal(scaled)}M`;
}

function trimDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
