"use client";

import { Vector3 } from "three";
import { type AgentStatus } from "./agentsConfig";
import { getDefaultAccessories } from "@/lib/office-agents";
import AgentDesk from "./AgentDesk";
import WalkingAvatar from "./WalkingAvatar";
import RestingAvatar from "./RestingAvatar";
import { AgentConnection } from "./AgentConnection";
import type { AgentConfig } from "@/lib/office3d-types";

interface SubagentLayerProps {
  subagentConfigs: AgentConfig[];
  subagentStateById: Map<string, AgentStatus>;
  agents: AgentConfig[];
  obstacles: Array<{ position: Vector3; radius: number }>;
  officeBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  walkingAvatarPositions: Map<string, Vector3>;
  onWalkingPositionUpdate: (id: string, pos: Vector3) => void;
  onDeskClick: (agentId: string) => void;
  selectedAgent: string | null;
}

export function SubagentLayer({
  subagentConfigs,
  subagentStateById,
  agents,
  obstacles,
  officeBounds,
  walkingAvatarPositions,
  onWalkingPositionUpdate,
  onDeskClick,
  selectedAgent,
}: SubagentLayerProps) {
  return (
    <>
      {/* Subagent desks */}
      {subagentConfigs.map((config) => {
        const avatarState = subagentStateById.get(config.id) ?? "offline";
        const parentAgent = agents.find((agent) => agent.id === config.parentId);
        const parentPos: [number, number, number] = parentAgent
          ? [parentAgent.position[0], 1.0, parentAgent.position[2]]
          : [0, 1.0, 0];

        return (
          <group key={`subagent-group-${config.id}`}>
            <AgentDesk
              agentId={config.id}
              agentName={config.name}
              agentColor={config.color}
              agentEmoji={config.emoji}
              agentRole={config.role}
              agentAccessories={getDefaultAccessories(config.id)}
              deskPosition={config.position}
              deskRotation={[0, 0, 0]}
              avatarState={avatarState}
              currentTask={config.currentTask}
              onClick={() => onDeskClick(config.id)}
              isSelected={selectedAgent === config.id}
            />
            {parentAgent && avatarState !== "offline" && (
              <AgentConnection
                from={parentPos}
                to={[config.position[0], 1.0, config.position[2]]}
                status={avatarState === "idle" ? "idle" : "active"}
                taskName={config.currentTask}
              />
            )}
          </group>
        );
      })}

      {/* Idle subagents walk around the office */}
      {subagentConfigs.map((subagent) => {
        const status = subagentStateById.get(subagent.id) ?? "offline";
        return (
          <WalkingAvatar
            key={`subagent-walking-${subagent.id}`}
            agent={subagent}
            status={status}
            visible={status === "idle"}
            officeBounds={officeBounds}
            obstacles={obstacles}
            otherAvatarPositions={walkingAvatarPositions}
            onPositionUpdate={onWalkingPositionUpdate}
          />
        );
      })}

      {/* Offline subagents rest in break zones */}
      {subagentConfigs.map((subagent) => {
        const status = subagentStateById.get(subagent.id) ?? "offline";
        return (
          <RestingAvatar
            key={`subagent-resting-${subagent.id}`}
            agent={subagent}
            visible={status === "offline"}
          />
        );
      })}
    </>
  );
}
