/**
 * Mission-Aware Suggestions Analyzer
 * Generates suggestions based on mission alignment and configuration
 */

import {
  type Suggestion,
  type UsageData,
  type MissionStats,
  generateId,
} from "./suggestions-types";

// ============================================================================
// Data Collection
// ============================================================================

export function getMissionStats(data: UsageData): MissionStats {
  const stats: MissionStats = {
    hasMission: false,
    goalsCount: 0,
    valuesCount: 0,
    lastUpdated: null,
    missionAgeDays: null,
    tasksAligned: 0,
    tasksTotal: 0,
    alignmentScore: 0,
  };

  // Check if mission data is provided
  if (!data.missionStats) {
    return stats;
  }

  return data.missionStats;
}

/**
 * Load mission stats from storage directly
 */
export function loadMissionStats(): MissionStats {
  const stats: MissionStats = {
    hasMission: false,
    goalsCount: 0,
    valuesCount: 0,
    lastUpdated: null,
    missionAgeDays: null,
    tasksAligned: 0,
    tasksTotal: 0,
    alignmentScore: 0,
  };

  try {
    const fs = require("fs");
    const path = require("path");
    const missionPath = path.join(process.cwd(), "data", "mission.json");

    if (!fs.existsSync(missionPath)) {
      return stats;
    }

    const content = fs.readFileSync(missionPath, "utf-8");
    const data = JSON.parse(content);

    stats.hasMission = !!(data.statement && data.statement.trim().length > 0);
    stats.goalsCount = data.goals?.length || 0;
    stats.valuesCount = data.values?.length || 0;
    stats.lastUpdated = data.lastUpdated || null;

    if (data.lastUpdated) {
      const updated = new Date(data.lastUpdated);
      stats.missionAgeDays = Math.floor(
        (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Try to get alignment data from kanban tasks
    try {
      const kanbanDbPath = path.join(process.cwd(), "data", "kanban.db");
      if (fs.existsSync(kanbanDbPath)) {
        const mod = require("@/lib/sqlite-wrapper");
        const SqliteDb = mod.Database || mod.default || mod;
        const db = new SqliteDb(kanbanDbPath, { readonly: true });

        try {
          const hasTable = db.prepare(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='kanban_tasks'"
          ).get();

          if (hasTable) {
            const total = db.prepare(
              "SELECT COUNT(*) as c FROM kanban_tasks WHERE archived = 0"
            ).get() as { c: number };

            stats.tasksTotal = total?.c || 0;

            // Simple alignment: tasks that have a projectId (linked to mission goals)
            const aligned = db.prepare(
              "SELECT COUNT(*) as c FROM kanban_tasks WHERE archived = 0 AND project_id IS NOT NULL"
            ).get() as { c: number };

            stats.tasksAligned = aligned?.c || 0;
            stats.alignmentScore = stats.tasksTotal > 0
              ? Math.round((stats.tasksAligned / stats.tasksTotal) * 100)
              : 0;
          }
        } finally {
          db.close();
        }
      }
    } catch {
      // Kanban DB not available, skip alignment calculation
    }
  } catch (error) {
    console.error("[suggestions-mission] Error loading mission stats:", error);
  }

  return stats;
}

// ============================================================================
// Suggestion Generators
// ============================================================================

/**
 * Suggest setting up a mission if none exists
 */
function suggestMissionSetup(stats: MissionStats, dismissed: Set<string>): Suggestion[] {
  if (stats.hasMission) return [];

  const id = generateId("mission", "setup-required");
  if (dismissed.has(id)) return [];

  return [{
    id,
    type: "info",
    category: "mission",
    titleKey: "suggestions.mission.setup.title",
    descriptionKey: "suggestions.mission.setup.description",
    title: "Configura tu Mission Statement",
    description: "Definir una misión ayuda a alinear las tareas y permite al Reverse Prompting Engine priorizar automáticamente.",
    impact: "high",
    action: {
      labelKey: "common.viewAll",
      label: "Configurar misión",
      type: "link",
      target: "/mission",
    },
    metadata: { hasMission: false },
    createdAt: new Date().toISOString(),
  }];
}

/**
 * Suggest adding more goals/values if mission is sparse
 */
function suggestMissionEnrichment(stats: MissionStats, dismissed: Set<string>): Suggestion[] {
  if (!stats.hasMission) return [];

  const suggestions: Suggestion[] = [];

  // Suggest more goals
  if (stats.goalsCount > 0 && stats.goalsCount < 3) {
    const id = generateId("mission", "add-goals");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "optimization",
        category: "mission",
        titleKey: "suggestions.mission.goals.title",
        descriptionKey: "suggestions.mission.goals.description",
        titleParams: { count: stats.goalsCount },
        title: "Añade más objetivos a tu misión",
        description: `Tienes ${stats.goalsCount} objetivo(s). Agregar 3-5 objetivos estratégicos mejora la alineación de tareas con la misión.`,
        impact: "medium",
        action: {
          labelKey: "common.edit",
          label: "Editar misión",
          type: "link",
          target: "/mission",
        },
        metadata: { goalsCount: stats.goalsCount },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggest more values
  if (stats.valuesCount > 0 && stats.valuesCount < 3) {
    const id = generateId("mission", "add-values");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "optimization",
        category: "mission",
        titleKey: "suggestions.mission.values.title",
        descriptionKey: "suggestions.mission.values.description",
        titleParams: { count: stats.valuesCount },
        title: "Define valores guía para la misión",
        description: `Tienes ${stats.valuesCount} valor(es). Los valores ayudan al Reverse Prompting Engine a tomar mejores decisiones.`,
        impact: "low",
        action: {
          labelKey: "common.edit",
          label: "Editar misión",
          type: "link",
          target: "/mission",
        },
        metadata: { valuesCount: stats.valuesCount },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

/**
 * Suggest reviewing mission if it hasn't been updated in a while
 */
function suggestMissionReview(stats: MissionStats, dismissed: Set<string>): Suggestion[] {
  if (!stats.hasMission || !stats.missionAgeDays) return [];

  // Suggest review after 30 days
  if (stats.missionAgeDays < 30) return [];

  const id = generateId("mission", "review-stale");
  if (dismissed.has(id)) return [];

  return [{
    id,
    type: "info",
    category: "mission",
    titleKey: "suggestions.mission.review.title",
    descriptionKey: "suggestions.mission.review.description",
    titleParams: { days: stats.missionAgeDays },
    descriptionParams: { days: stats.missionAgeDays },
    title: "Revisa tu Mission Statement",
    description: `La misión no se ha actualizado hace ${stats.missionAgeDays} días. Revisa si los objetivos siguen alineados con tu visión actual.`,
    impact: "medium",
    action: {
      labelKey: "common.edit",
      label: "Revisar misión",
      type: "link",
      target: "/mission",
    },
    metadata: { missionAgeDays: stats.missionAgeDays },
    createdAt: new Date().toISOString(),
  }];
}

/**
 * Suggest linking tasks to projects when alignment is low
 */
function suggestTaskAlignment(stats: MissionStats, dismissed: Set<string>): Suggestion[] {
  if (!stats.hasMission || stats.tasksTotal === 0) return [];

  const suggestions: Suggestion[] = [];

  // Low alignment: less than 30% of tasks linked to projects
  if (stats.alignmentScore < 30 && stats.tasksTotal > 5) {
    const id = generateId("mission", "low-alignment");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "warning",
        category: "mission",
        titleKey: "suggestions.mission.alignment.title",
        descriptionKey: "suggestions.mission.alignment.description",
        titleParams: { score: stats.alignmentScore, total: stats.tasksTotal },
        descriptionParams: { score: stats.alignmentScore, total: stats.tasksTotal },
        title: `Baja alineación de tareas con la misión (${stats.alignmentScore}%)`,
        description: `Solo ${stats.tasksAligned} de ${stats.tasksTotal} tareas están vinculadas a proyectos. Asignar tareas a proyectos mejora el seguimiento de la misión.`,
        impact: "high",
        action: {
          labelKey: "common.viewAll",
          label: "Ver Kanban",
          type: "link",
          target: "/kanban",
        },
        metadata: {
          alignmentScore: stats.alignmentScore,
          tasksAligned: stats.tasksAligned,
          tasksTotal: stats.tasksTotal,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

// ============================================================================
// Main Analyzer
// ============================================================================

/**
 * Analyze mission-related data and generate suggestions
 */
export function analyzeMissionAlignment(data: UsageData, dismissed: Set<string>): Suggestion[] {
  // Use provided stats or load from storage
  const stats = data.missionStats || loadMissionStats();

  return [
    ...suggestMissionSetup(stats, dismissed),
    ...suggestMissionEnrichment(stats, dismissed),
    ...suggestMissionReview(stats, dismissed),
    ...suggestTaskAlignment(stats, dismissed),
  ];
}
