/**
 * Office3D Utilities — helper functions for the 3D office scene
 */

import type { Visitor } from "@/lib/office3d-types";
import { FETCH_TIMEOUT_MS, ONLINE_WINDOW_MS, IDLE_WINDOW_MS } from "@/lib/office-scene-config";

export async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSubagentId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSameSubagent(configuredName: string, runtimeName: string): boolean {
  const configured = normalizeSubagentId(configuredName);
  const runtime = normalizeSubagentId(runtimeName);

  if (!configured || !runtime) return false;
  return configured === runtime || runtime.includes(configured) || configured.includes(runtime);
}

export function buildSubagentOfficeId(parentId: string, subagentId: string): string {
  return `${parentId}:${subagentId}`;
}

export function getVisitorStatus(ageMs: number): Visitor["status"] {
  if (ageMs < ONLINE_WINDOW_MS) return "active";
  if (ageMs < IDLE_WINDOW_MS) return "idle";
  return "offline";
}

export function parseParentFromKey(key: string): string {
  const parts = key.split(":");
  return parts[1] || "main";
}
