import {
  type MemoryStats,
  type FileStats,
  type KanbanStats,
  type AgentStats,
} from "./suggestions-data";

export type SuggestionType = "optimization" | "warning" | "info" | "cost";
export type SuggestionCategory =
  | "model"
  | "cron"
  | "heartbeat"
  | "token"
  | "skill"
  | "error"
  | "general"
  | "memory"
  | "files"
  | "kanban"
  | "agent"
  | "mission";

export interface Suggestion {
  id: string;
  type: SuggestionType;
  category: SuggestionCategory;
  // Translation keys for i18n
  titleKey: string;
  descriptionKey: string;
  titleParams?: Record<string, string | number>;
  descriptionParams?: Record<string, string | number>;
  // Fallback text (for backwards compatibility)
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action?: {
    labelKey?: string;
    label?: string;
    type: "config" | "link" | "manual";
    target?: string;
    value?: string;
  };
  metadata?: Record<string, string | number>;
  createdAt: string;
  dismissedAt?: string;
  appliedAt?: string;
}

export interface UsageData {
  modelUsage: Array<{ model: string; count: number; totalTokens: number; totalCost: number }>;
  recentErrors: Array<{ message: string; count: number; lastSeen: string }>;
  cronHealth: Array<{ name: string; successRate: number; lastRun: string }>;
  skillUsage: Array<{ name: string; lastUsed: string; uses: number }>;
  heartbeatFrequency: number;
  // New fields for enhanced suggestions
  memoryStats?: MemoryStats;
  fileStats?: FileStats;
  kanbanStats?: KanbanStats;
  agentStats?: AgentStats;
  missionStats?: MissionStats;
}

export type { MemoryStats, FileStats, KanbanStats, AgentStats } from "./suggestions-data";

export function generateId(category: SuggestionCategory, key: string): string {
  return `${category}-${key}`;
}

export interface MissionStats {
  hasMission: boolean;
  goalsCount: number;
  valuesCount: number;
  lastUpdated: string | null;
  missionAgeDays: number | null;
  tasksAligned: number;
  tasksTotal: number;
  alignmentScore: number; // 0-100
}
