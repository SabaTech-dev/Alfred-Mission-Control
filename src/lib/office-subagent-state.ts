/**
 * Office Subagent State — pure functions for computing subagent
 * runtime matching, desk configs, and status lookups.
 */

import type { AgentState, AgentStatus } from "@/components/Office3D/agentsConfig";
import type { Visitor, ConfiguredSubagent, AgentConfig } from "@/lib/office3d-types";
import { clamp, isSameSubagent } from "@/lib/office-utils";
import { SUBAGENT_DESK_BOUNDS } from "@/lib/office-scene-config";

/**
 * Two-pass matching of runtime visitors to configured subagents.
 * Pass 1: strict/fuzzy identifier match.
 * Pass 2: fallback by parent + recency order.
 */
export function matchRuntimeToConfigured(
  configuredSubagents: ConfiguredSubagent[],
  visitors: Visitor[],
): Map<string, Visitor> {
  const map = new Map<string, Visitor>();
  const usedRuntimeVisitorIds = new Set<string>();

  // Pass 1: strict/fuzzy identifier match
  configuredSubagents.forEach((subagent) => {
    const runtime = visitors.find(
      (visitor) =>
        !usedRuntimeVisitorIds.has(visitor.id) &&
        visitor.parentId === subagent.parentId &&
        (isSameSubagent(subagent.subagentId, visitor.subagentId) ||
          isSameSubagent(subagent.subagentId, visitor.name) ||
          isSameSubagent(subagent.name, visitor.name))
    );

    if (runtime) {
      map.set(subagent.id, runtime);
      usedRuntimeVisitorIds.add(runtime.id);
    }
  });

  // Pass 2: fallback by parent + recency order
  configuredSubagents.forEach((subagent) => {
    if (map.has(subagent.id)) return;

    const runtime = visitors
      .filter((visitor) => visitor.parentId === subagent.parentId && !usedRuntimeVisitorIds.has(visitor.id))
      .sort((a, b) => a.ageMs - b.ageMs)[0];

    if (runtime) {
      map.set(subagent.id, runtime);
      usedRuntimeVisitorIds.add(runtime.id);
    }
  });

  return map;
}

/**
 * Compute desk configs (positions, names, colors) for all configured subagents.
 */
export function computeSubagentConfigs(
  configuredSubagents: ConfiguredSubagent[],
  agents: AgentConfig[],
  runtimeSubagentByConfiguredId: Map<string, Visitor>,
): AgentConfig[] {
  const configs: AgentConfig[] = [];
  const parentSubagentCounts = new Map<string, number>();

  configuredSubagents.forEach((subagent) => {
    const parentAgent = agents.find((agent) => agent.id === subagent.parentId);
    if (!parentAgent) return;

    const count = parentSubagentCounts.get(subagent.parentId) || 0;
    parentSubagentCounts.set(subagent.parentId, count + 1);

    const laneIndex = count % 3;
    const laneOffsets = [-3.2, 0, 3.2] as const;
    const column = Math.floor(count / 3);

    // Prefer inward placement so desks do not cross side walls.
    const side = parentAgent.position[0] >= 0 ? -1 : 1;
    const offsetX = side * (3.8 + column * 3.0);
    const offsetZ = laneOffsets[laneIndex];

    const subagentPosition: [number, number, number] = [
      clamp(parentAgent.position[0] + offsetX, SUBAGENT_DESK_BOUNDS.minX, SUBAGENT_DESK_BOUNDS.maxX),
      0,
      clamp(parentAgent.position[2] + offsetZ, SUBAGENT_DESK_BOUNDS.minZ, SUBAGENT_DESK_BOUNDS.maxZ),
    ];

    const runtime = runtimeSubagentByConfiguredId.get(subagent.id);

    configs.push({
      id: subagent.id,
      name: subagent.name,
      emoji: subagent.emoji,
      position: subagentPosition,
      color: subagent.color,
      role: "Sub-agent",
      parentId: subagent.parentId,
      currentTask: runtime?.task,
    });
  });

  return configs;
}

/**
 * Compute subagent status lookup: configured subagent state if available,
 * otherwise derive from runtime visitor status.
 */
export function computeSubagentStateById(
  configuredSubagents: ConfiguredSubagent[],
  agentStates: Record<string, AgentState>,
  runtimeSubagentByConfiguredId: Map<string, Visitor>,
): Map<string, AgentStatus> {
  return new Map<string, AgentStatus>(
    configuredSubagents.map((subagent) => {
      const configuredSubagentState = agentStates[subagent.subagentId];
      if (configuredSubagentState) {
        return [subagent.id, configuredSubagentState.status];
      }

      const runtime = runtimeSubagentByConfiguredId.get(subagent.id);
      const status: AgentStatus =
        runtime?.status === "active" ? "working" : runtime?.status === "idle" ? "idle" : "offline";
      return [subagent.id, status];
    })
  );
}
