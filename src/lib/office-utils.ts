/**
 * Office3D Utilities — helper functions for the 3D office scene
 */

import { Vector3 } from "three";
import type { Visitor, AgentConfig } from "@/lib/office3d-types";
import {
  FETCH_TIMEOUT_MS,
  ONLINE_WINDOW_MS,
  IDLE_WINDOW_MS,
  FILE_CABINET_POSITION,
  WHITEBOARD_POSITION,
  COFFEE_MACHINE_POSITION,
  LEFT_BOOKSHELF_POSITION,
  RIGHT_BOOKSHELF_POSITION,
  COLLAB_ZONE_CENTER,
  FOCUS_ZONE_CENTER,
  BREAK_ZONE_CENTER,
  PLANT_DECORATIONS,
} from "@/lib/office-scene-config";

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

/**
 * Build the obstacle list used by walking avatars for collision avoidance.
 */
export function buildObstacles(
  agents: AgentConfig[],
  subagentConfigs: AgentConfig[],
): Array<{ position: Vector3; radius: number }> {
  return [
    { position: new Vector3(...FILE_CABINET_POSITION), radius: 0.85 },
    { position: new Vector3(...WHITEBOARD_POSITION), radius: 1.45 },
    { position: new Vector3(...COFFEE_MACHINE_POSITION), radius: 0.8 },
    { position: new Vector3(...LEFT_BOOKSHELF_POSITION), radius: 0.95 },
    { position: new Vector3(...RIGHT_BOOKSHELF_POSITION), radius: 0.95 },
    { position: new Vector3(...COLLAB_ZONE_CENTER), radius: 1.85 },
    { position: new Vector3(...FOCUS_ZONE_CENTER), radius: 1.25 },
    { position: new Vector3(...BREAK_ZONE_CENTER), radius: 0.95 },
    ...PLANT_DECORATIONS.map((p) => ({
      position: new Vector3(...p.position),
      radius: p.radius,
    })),
    ...agents.map((a) => ({ position: new Vector3(...a.position), radius: 0.8 })),
    ...subagentConfigs.map((s) => ({ position: new Vector3(...s.position), radius: 0.8 })),
  ];
}
