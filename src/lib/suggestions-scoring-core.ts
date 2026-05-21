import { MODEL_PRICING_CONSTANTS } from "./model-pricing-constants";
import {
  type Suggestion,
  type UsageData,
  generateId,
} from "./suggestions-types";

export function analyzeModelUsage(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const expensiveModels = ["anthropic/claude-opus-4-6", "anthropic/claude-opus-4"];

  for (const usage of data.modelUsage) {
    if (expensiveModels.includes(usage.model) && usage.totalCost > 1) {
      const id = generateId("model", `expensive-${usage.model}`);
      if (dismissed.has(id)) continue;

      const modelName = MODEL_PRICING_CONSTANTS.find((m) => m.id === usage.model)?.name || usage.model;
      suggestions.push({
        id,
        type: "cost",
        category: "model",
        titleKey: "suggestions.model.expensive.title",
        descriptionKey: "suggestions.model.expensive.description",
        titleParams: { modelName, cost: usage.totalCost },
        descriptionParams: { modelName, cost: usage.totalCost },
        title: `Optimizar uso de ${modelName}`,
        description: `Has gastado $${usage.totalCost.toFixed(2)} en este modelo. Considera usar Claude Haiku para tareas simples y Sonnet para tareas complejas.`,
        impact: usage.totalCost > 10 ? "high" : "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver análisis de costes",
          type: "link",
          target: "/costs",
        },
        metadata: { model: usage.model, cost: usage.totalCost, count: usage.count },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function analyzeCronHealth(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const cron of data.cronHealth) {
    if (cron.successRate < 0.8) {
      const id = generateId("cron", `health-${cron.name}`);
      if (dismissed.has(id)) continue;

      const failureRate = ((1 - cron.successRate) * 100).toFixed(0);
      suggestions.push({
        id,
        type: "warning",
        category: "cron",
        titleKey: "suggestions.cron.lowSuccessRate.title",
        descriptionKey: "suggestions.cron.lowSuccessRate.description",
        titleParams: { cronName: cron.name, failureRate },
        descriptionParams: { cronName: cron.name, failureRate },
        title: `Cron "${cron.name}" tiene baja tasa de éxito`,
        description: `Este cron job tiene ${failureRate}% de fallos. Revisa la configuración y logs para identificar el problema.`,
        impact: "high",
        action: {
          labelKey: "common.viewAll",
          label: "Ver crons",
          type: "link",
          target: "/cron",
        },
        metadata: { cronName: cron.name, successRate: cron.successRate },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function analyzeSkillUsage(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const skill of data.skillUsage) {
    const lastUsed = new Date(skill.lastUsed).getTime();
    if (lastUsed < thirtyDaysAgo && skill.uses < 5) {
      const id = generateId("skill", `unused-${skill.name}`);
      if (dismissed.has(id)) continue;

      suggestions.push({
        id,
        type: "info",
        category: "skill",
        titleKey: "suggestions.skill.unused.title",
        descriptionKey: "suggestions.skill.unused.description",
        titleParams: { skillName: skill.name, uses: skill.uses },
        descriptionParams: { skillName: skill.name, uses: skill.uses },
        title: `Skill "${skill.name}" no se usa hace 30 días`,
        description: `Esta skill solo se ha usado ${skill.uses} veces. Considera desinstalarla si ya no la necesitas.`,
        impact: "low",
        action: {
          labelKey: "common.viewAll",
          label: "Ver skills",
          type: "link",
          target: "/skills",
        },
        metadata: { skillName: skill.name, uses: skill.uses, lastUsed: skill.lastUsed },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function analyzeErrors(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const error of data.recentErrors) {
    if (error.count >= 3) {
      const id = generateId("error", `pattern-${error.message.slice(0, 30)}`);
      if (dismissed.has(id)) continue;

      const errorMsg = error.message.slice(0, 100);
      suggestions.push({
        id,
        type: "warning",
        category: "error",
        titleKey: "suggestions.error.pattern.title",
        descriptionKey: "suggestions.error.pattern.description",
        titleParams: { count: error.count },
        descriptionParams: { count: error.count, message: errorMsg },
        title: "Patrón de errores detectado",
        description: `Se han producido ${error.count} errores similares recientemente: "${errorMsg}..."`,
        impact: "high",
        action: {
          labelKey: "common.viewAll",
          label: "Ver logs",
          type: "link",
          target: "/logs",
        },
        metadata: { errorCount: error.count, lastSeen: error.lastSeen },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function analyzeHeartbeat(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (data.heartbeatFrequency > 0 && data.heartbeatFrequency < 30000) {
    const id = generateId("heartbeat", "frequency");
    if (dismissed.has(id)) return suggestions;

    const frequencySecs = (data.heartbeatFrequency / 1000).toFixed(0);
    suggestions.push({
      id,
      type: "optimization",
      category: "heartbeat",
      titleKey: "suggestions.heartbeat.frequent.title",
      descriptionKey: "suggestions.heartbeat.frequent.description",
      titleParams: { frequencySecs: Number(frequencySecs) },
      descriptionParams: { frequencySecs: Number(frequencySecs) },
      title: "Heartbeat muy frecuente",
      description: `El heartbeat se ejecuta cada ${frequencySecs}s. Considera aumentar el intervalo para reducir carga.`,
      impact: "low",
      action: {
        labelKey: "common.viewAll",
        label: "Ver configuración",
        type: "link",
        target: "/settings",
      },
      metadata: { frequency: data.heartbeatFrequency },
      createdAt: new Date().toISOString(),
    });
  }

  return suggestions;
}
