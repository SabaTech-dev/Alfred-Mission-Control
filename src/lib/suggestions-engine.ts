import fs from "fs";
import path from "path";

import {
  collectSuggestionsData,
  getMemoryStats,
  getFileStats,
  getKanbanStats,
  getAgentStats,
} from "./suggestions-data";
import {
  analyzeModelUsage,
  analyzeCronHealth,
  analyzeSkillUsage,
  analyzeErrors,
  analyzeHeartbeat,
} from "./suggestions-scoring-core";
import {
  analyzeMemoryUsage,
  analyzeFiles,
} from "./suggestions-scoring-data";
import {
  analyzeKanban,
  analyzeAgents,
  invalidateStaleSuggestions,
} from "./suggestions-scoring-workflow";
import { analyzeMissionAlignment } from "./suggestions-scoring-mission";
import type { Suggestion, UsageData } from "./suggestions-types";

// Re-export types for backward compatibility
export type {
  SuggestionType,
  SuggestionCategory,
  Suggestion,
  UsageData,
} from "./suggestions-types";
export type {
  MemoryStats,
  FileStats,
  KanbanStats,
  AgentStats,
} from "./suggestions-data";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const SUGGESTIONS_FILE = path.join(DATA_DIR, "suggestions.json");
const DISMISSED_FILE = path.join(DATA_DIR, "dismissed-suggestions.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSuggestions(): Suggestion[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SUGGESTIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SUGGESTIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveSuggestions(suggestions: Suggestion[]): void {
  ensureDataDir();
  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
}

function loadDismissed(): Set<string> {
  try {
    ensureDataDir();
    if (!fs.existsSync(DISMISSED_FILE)) {
      return new Set();
    }
    const data = fs.readFileSync(DISMISSED_FILE, "utf-8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

function saveDismissed(dismissed: Set<string>): void {
  ensureDataDir();
  fs.writeFileSync(DISMISSED_FILE, JSON.stringify([...dismissed], null, 2));
}

export function generateSuggestions(data?: Partial<UsageData>): Suggestion[] {
  const dismissed = loadDismissed();
  const existing = loadSuggestions();

  let fullData: UsageData;

  if (data) {
    fullData = {
      modelUsage: data.modelUsage || [],
      recentErrors: data.recentErrors || [],
      cronHealth: data.cronHealth || [],
      skillUsage: data.skillUsage || [],
      heartbeatFrequency: data.heartbeatFrequency || 60000,
      memoryStats: data.memoryStats || getMemoryStats(),
      fileStats: data.fileStats || getFileStats(),
      kanbanStats: data.kanbanStats || getKanbanStats(),
      agentStats: data.agentStats || getAgentStats(),
      // Pass missionStats through when provided; otherwise let the mission
      // analyzer fall back to loadMissionStats(). Previously this field was
      // dropped here, so a caller-supplied missionStats was silently ignored
      // and the analyzer always read from disk.
      missionStats: data.missionStats,
    };
  } else {
    const collected = collectSuggestionsData();
    fullData = {
      modelUsage: [],
      recentErrors: collected.recentErrors,
      cronHealth: [],
      skillUsage: [],
      heartbeatFrequency: collected.heartbeatFrequency,
      memoryStats: collected.memoryStats,
      fileStats: collected.fileStats,
      kanbanStats: collected.kanbanStats,
      agentStats: collected.agentStats,
    };
  }

  const validatedExisting = invalidateStaleSuggestions(existing, fullData);
  const validatedExistingIds = new Set(validatedExisting.map((s) => s.id));

  const newSuggestions: Suggestion[] = [
    ...analyzeModelUsage(fullData, dismissed),
    ...analyzeCronHealth(fullData, dismissed),
    ...analyzeSkillUsage(fullData, dismissed),
    ...analyzeErrors(fullData, dismissed),
    ...analyzeHeartbeat(fullData, dismissed),
    ...analyzeMemoryUsage(fullData, dismissed),
    ...analyzeFiles(fullData, dismissed),
    ...analyzeKanban(fullData, dismissed),
    ...analyzeAgents(fullData, dismissed),
    ...analyzeMissionAlignment(fullData, dismissed),
  ].filter((s) => !validatedExistingIds.has(s.id) && !dismissed.has(s.id));

  if (newSuggestions.length > 0 || validatedExisting.length !== existing.length) {
    const allSuggestions = [...newSuggestions, ...validatedExisting].slice(0, 20);
    saveSuggestions(allSuggestions);
    return allSuggestions.filter((s) => !s.dismissedAt && !s.appliedAt);
  }

  return validatedExisting.filter((s) => !s.dismissedAt && !s.appliedAt);
}

export function getSuggestions(): Suggestion[] {
  const suggestions = loadSuggestions();
  return suggestions.filter((s) => !s.dismissedAt && !s.appliedAt);
}

export function dismissSuggestion(id: string): boolean {
  const suggestions = loadSuggestions();
  const suggestion = suggestions.find((s) => s.id === id);
  if (!suggestion) return false;

  suggestion.dismissedAt = new Date().toISOString();
  saveSuggestions(suggestions);

  const dismissed = loadDismissed();
  dismissed.add(id);
  saveDismissed(dismissed);

  return true;
}

export function applySuggestion(id: string): boolean {
  const suggestions = loadSuggestions();
  const suggestion = suggestions.find((s) => s.id === id);
  if (!suggestion) return false;

  suggestion.appliedAt = new Date().toISOString();
  saveSuggestions(suggestions);

  return true;
}

export function getSuggestionById(id: string): Suggestion | null {
  const suggestions = loadSuggestions();
  return suggestions.find((s) => s.id === id) || null;
}
