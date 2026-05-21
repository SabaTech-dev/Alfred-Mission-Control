import {
  type Suggestion,
  type UsageData,
  generateId,
} from "./suggestions-types";

export function analyzeKanban(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const stats = data.kanbanStats;

  if (!stats) return suggestions;

  // Suggestion: Overdue tasks
  if (stats.overdueTasks > 0) {
    const id = generateId("kanban", "overdue");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "warning",
        category: "kanban",
        titleKey: "suggestions.kanban.overdue.title",
        descriptionKey: "suggestions.kanban.overdue.description",
        titleParams: { count: stats.overdueTasks },
        descriptionParams: { count: stats.overdueTasks },
        title: "Tareas vencidas",
        description: `Hay ${stats.overdueTasks} tareas con fecha de vencimiento vencida. Revisa el tablero Kanban para tomar acción.`,
        impact: "high",
        action: {
          labelKey: "common.viewAll",
          label: "Ver Kanban",
          type: "link",
          target: "/kanban",
        },
        metadata: { overdueTasks: stats.overdueTasks, totalTasks: stats.totalTasks },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: Unassigned tasks
  if (stats.unassignedTasks > 5) {
    const id = generateId("kanban", "unassigned");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "info",
        category: "kanban",
        titleKey: "suggestions.kanban.unassigned.title",
        descriptionKey: "suggestions.kanban.unassigned.description",
        titleParams: { count: stats.unassignedTasks },
        descriptionParams: { count: stats.unassignedTasks },
        title: "Muchas tareas sin asignar",
        description: `Hay ${stats.unassignedTasks} tareas sin asignar. Los agentes podrían procesarlas automáticamente.`,
        impact: "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver Kanban",
          type: "link",
          target: "/kanban",
        },
        metadata: { unassignedTasks: stats.unassignedTasks },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: Many tasks in progress but few done
  const inProgress = stats.tasksByStatus["in_progress"] || 0;
  const done = stats.tasksByStatus["done"] || stats.tasksByStatus["completed"] || 0;

  if (inProgress > 10 && done < inProgress / 3) {
    const id = generateId("kanban", "bottleneck");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "warning",
        category: "kanban",
        titleKey: "suggestions.kanban.bottleneck.title",
        descriptionKey: "suggestions.kanban.bottleneck.description",
        titleParams: { inProgress, done },
        descriptionParams: { inProgress, done },
        title: "Cuello de botella en tareas",
        description: `Hay ${inProgress} tareas en progreso pero solo ${done} completadas. Los agentes podrían estar bloqueados o necesitar soporte.`,
        impact: "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver Kanban",
          type: "link",
          target: "/kanban",
        },
        metadata: { inProgress, done },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function analyzeAgents(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const stats = data.agentStats;

  if (!stats) return suggestions;

  // Suggestion: Agents without identity
  if (stats.agentsWithoutIdentity > 0) {
    const id = generateId("agent", "no-identity");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "info",
        category: "agent",
        titleKey: "suggestions.agent.noIdentity.title",
        descriptionKey: "suggestions.agent.noIdentity.description",
        titleParams: { count: stats.agentsWithoutIdentity, total: stats.totalAgents },
        descriptionParams: { count: stats.agentsWithoutIdentity, total: stats.totalAgents },
        title: "Agentes sin identidad",
        description: `${stats.agentsWithoutIdentity} de ${stats.totalAgents} agentes no tienen archivo IDENTITY.md. Define su rol y personalidad para mejorar la comunicación.`,
        impact: "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver agentes",
          type: "link",
          target: "/agents",
        },
        metadata: {
          totalAgents: stats.totalAgents,
          agentsWithoutIdentity: stats.agentsWithoutIdentity,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: No agents configured
  if (stats.totalAgents === 0) {
    const id = generateId("agent", "none");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "info",
        category: "agent",
        titleKey: "suggestions.agent.none.title",
        descriptionKey: "suggestions.agent.none.description",
        titleParams: {},
        descriptionParams: {},
        title: "Sin agentes configurados",
        description: "No hay agentes configurados en openclaw.json. Añade agentes para automatizar tareas.",
        impact: "high",
        action: {
          labelKey: "suggestions.agent.none.actionLabel",
          label: "Configurar agentes",
          type: "link",
          target: "/settings",
        },
        metadata: { totalAgents: 0 },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: Agents without heartbeat (not polling for tasks)
  const agentsWithoutHeartbeat = stats.totalAgents - stats.agentsWithHeartbeat;
  if (agentsWithoutHeartbeat > 0 && stats.totalAgents > 1) {
    const id = generateId("agent", "no-heartbeat");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "info",
        category: "agent",
        titleKey: "suggestions.agent.noHeartbeat.title",
        descriptionKey: "suggestions.agent.noHeartbeat.description",
        titleParams: { count: agentsWithoutHeartbeat },
        descriptionParams: { count: agentsWithoutHeartbeat },
        title: "Agentes sin heartbeat",
        description: `${agentsWithoutHeartbeat} agentes no tienen configurado heartbeat. No podrán recibir tareas automáticamente desde el Kanban.`,
        impact: "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver configuración",
          type: "link",
          target: "/settings",
        },
        metadata: {
          agentsWithHeartbeat: stats.agentsWithHeartbeat,
          agentsWithoutHeartbeat,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function invalidateStaleSuggestions(existing: Suggestion[], stats: UsageData): Suggestion[] {
  const validIds = new Set<string>();

  if (stats.kanbanStats) {
    if (stats.kanbanStats.overdueTasks > 0) validIds.add("kanban-overdue");
    if (stats.kanbanStats.unassignedTasks > 5) validIds.add("kanban-unassigned");
    const inProgress = stats.kanbanStats.tasksByStatus["in_progress"] || 0;
    const done = stats.kanbanStats.tasksByStatus["done"] || stats.kanbanStats.tasksByStatus["completed"] || 0;
    if (inProgress > 10 && done < inProgress / 3) validIds.add("kanban-bottleneck");
  }

  if (stats.memoryStats) {
    if (stats.memoryStats.memoryAgeDays !== null && stats.memoryStats.memoryAgeDays > 30) validIds.add("memory-old");
    if (stats.memoryStats.totalFiles > 0 && stats.memoryStats.totalSize < 5000) validIds.add("memory-small");
    if (stats.memoryStats.totalFiles === 0) validIds.add("memory-none");
  }

  if (stats.fileStats) {
    if (stats.fileStats.totalFiles > 1000) validIds.add("files-large");
    if (stats.fileStats.lastModified) {
      const lastMod = new Date(stats.fileStats.lastModified);
      const daysSince = Math.floor((Date.now() - lastMod.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 14 && stats.fileStats.totalFiles > 0) validIds.add("files-inactive");
    }
  }

  if (stats.agentStats) {
    if (stats.agentStats.agentsWithoutIdentity > 0) validIds.add("agent-no-identity");
    if (stats.agentStats.totalAgents === 0) validIds.add("agent-none");
    const agentsWithoutHeartbeat = stats.agentStats.totalAgents - stats.agentStats.agentsWithHeartbeat;
    if (agentsWithoutHeartbeat > 0 && stats.agentStats.totalAgents > 1) validIds.add("agent-no-heartbeat");
  }

  if (stats.heartbeatFrequency > 0 && stats.heartbeatFrequency < 30000) validIds.add("heartbeat-frequency");

  return existing.filter((s) => {
    if (validIds.has(s.id)) return true;
    const categoryPrefixesToInvalidate = ["kanban-", "memory-", "files-", "agent-", "heartbeat-"];
    return !categoryPrefixesToInvalidate.some((prefix) => s.id.startsWith(prefix));
  });
}
