import {
  type Suggestion,
  type UsageData,
  generateId,
} from "./suggestions-types";

export function analyzeMemoryUsage(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const stats = data.memoryStats;

  if (!stats) return suggestions;

  // Suggestion: Memory is old (> 30 days)
  if (stats.memoryAgeDays !== null && stats.memoryAgeDays > 30) {
    const id = generateId("memory", "old");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "info",
        category: "memory",
        titleKey: "suggestions.memory.old.title",
        descriptionKey: "suggestions.memory.old.description",
        titleParams: { days: stats.memoryAgeDays },
        descriptionParams: { days: stats.memoryAgeDays },
        title: "Memoria sin actualizar",
        description: `La última actualización de memoria fue hace ${stats.memoryAgeDays} días. Los agentes podrían beneficiarse de nueva información contextual.`,
        impact: "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver memoria",
          type: "link",
          target: "/memory",
        },
        metadata: { memoryAgeDays: stats.memoryAgeDays, totalFiles: stats.totalFiles },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: Memory files are too small (agents might be missing context)
  if (stats.totalFiles > 0 && stats.totalSize < 5000) {
    const id = generateId("memory", "small");
    if (!dismissed.has(id)) {
      const sizeKB = (stats.totalSize / 1024).toFixed(1);
      suggestions.push({
        id,
        type: "warning",
        category: "memory",
        titleKey: "suggestions.memory.small.title",
        descriptionKey: "suggestions.memory.small.description",
        titleParams: {},
        descriptionParams: { sizeKB: Number(sizeKB) },
        title: "Memoria muy pequeña",
        description: `Los archivos de memoria solo ocupan ${sizeKB} KB. Los agentes podrían beneficiarse de más contexto.`,
        impact: "medium",
        action: {
          labelKey: "common.viewAll",
          label: "Ver memoria",
          type: "link",
          target: "/memory",
        },
        metadata: { totalSize: stats.totalSize, totalFiles: stats.totalFiles },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: No memory files at all
  if (stats.totalFiles === 0) {
    const id = generateId("memory", "none");
    if (!dismissed.has(id)) {
      suggestions.push({
        id,
        type: "info",
        category: "memory",
        titleKey: "suggestions.memory.none.title",
        descriptionKey: "suggestions.memory.none.description",
        titleParams: {},
        descriptionParams: {},
        title: "Sin memoria configurada",
        description: "No hay archivos de memoria en el workspace. Los agentes trabajan sin contexto persistente entre sesiones.",
        impact: "high",
        action: {
          labelKey: "suggestions.memory.none.actionLabel",
          label: "Crear memoria",
          type: "link",
          target: "/memory",
        },
        metadata: { totalFiles: 0 },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

export function analyzeFiles(data: UsageData, dismissed: Set<string>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const stats = data.fileStats;

  if (!stats) return suggestions;

  // Suggestion: Large workspace with many files
  if (stats.totalFiles > 1000) {
    const id = generateId("files", "large");
    if (!dismissed.has(id)) {
      const sizeMB = (stats.totalSize / (1024 * 1024)).toFixed(1);
      suggestions.push({
        id,
        type: "info",
        category: "files",
        titleKey: "suggestions.files.large.title",
        descriptionKey: "suggestions.files.large.description",
        titleParams: { fileCount: stats.totalFiles, sizeMB: Number(sizeMB) },
        descriptionParams: { fileCount: stats.totalFiles, sizeMB: Number(sizeMB) },
        title: "Workspace grande",
        description: `El workspace tiene ${stats.totalFiles} archivos (${sizeMB} MB). Considera archivar proyectos antiguos.`,
        impact: "low",
        action: {
          labelKey: "common.viewAll",
          label: "Explorar archivos",
          type: "link",
          target: "/files",
        },
        metadata: { totalFiles: stats.totalFiles, totalSize: stats.totalSize },
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Suggestion: No recent file activity
  if (stats.lastModified) {
    const lastMod = new Date(stats.lastModified);
    const daysSince = Math.floor((Date.now() - lastMod.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince > 14 && stats.totalFiles > 0) {
      const id = generateId("files", "inactive");
      if (!dismissed.has(id)) {
        suggestions.push({
          id,
          type: "info",
          category: "files",
          titleKey: "suggestions.files.inactive.title",
          descriptionKey: "suggestions.files.inactive.description",
          titleParams: {},
          descriptionParams: { days: daysSince },
          title: "Workspace inactivo",
          description: `No hay actividad de archivos desde hace ${daysSince} días. Los agentes podrían no estar funcionando correctamente.`,
          impact: "medium",
          action: {
            labelKey: "common.viewAll",
            label: "Ver archivos",
            type: "link",
            target: "/files",
          },
          metadata: { daysSinceLastModified: daysSince, totalFiles: stats.totalFiles },
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return suggestions;
}
