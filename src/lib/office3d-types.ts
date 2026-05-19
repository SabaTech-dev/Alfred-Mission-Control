/**
 * Office3D Types — shared interfaces for the 3D office scene
 */

import { type AvatarAccessories } from "@/components/Office3D/agentsConfig";

export interface Visitor {
  id: string;
  parentId: string;
  subagentId: string;
  name: string;
  task: string;
  model: string;
  tokens: number;
  status: "active" | "idle" | "offline";
  ageMs: number;
}

export interface AgentApiResponse {
  agents: AgentApiItem[];
}

export interface AgentApiItem {
  id: string;
  model?: string;
  tokensUsed?: number;
  sessionCount?: number;
  mood?: {
    mood: string;
    emoji: string;
    streak: number;
    energyLevel: number;
  };
  allowAgents?: string[];
  allowAgentsDetails?: AllowedSubagent[];
}

export interface AllowedSubagent {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface ConfiguredSubagent {
  id: string;
  parentId: string;
  subagentId: string;
  name: string;
  emoji: string;
  color: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  position: [number, number, number];
  deskRotation?: [number, number, number];
  tableId?: string;
  color: string;
  role: string;
  department?: string;
  accessories?: AvatarAccessories;
  parentId?: string;
  currentTask?: string;
}

export interface PlantDecoration {
  position: [number, number, number];
  size: "small" | "medium" | "large";
  type: "bush" | "tree" | "succulent";
  radius: number;
}

export interface WalkwayLane {
  id: string;
  position: [number, number, number];
  size: [number, number];
  rotationY?: number;
  color: string;
}
