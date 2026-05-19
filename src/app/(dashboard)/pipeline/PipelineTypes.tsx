"use client";

import type { PipelineStage, Opportunity, PipelineKPIs } from "@/lib/pipeline-types";
import { useMemo } from "react";

type KanbanTaskStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";

const STATUS_COLORS: Record<KanbanTaskStatus, string> = {
  backlog: "#6b7280",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#22c55e",
  blocked: "#ef4444",
};

// Research Pipeline types
export interface ResearchItem {
  id: string;
  title: string;
  source: "report" | "pdca" | "feature_request" | "kanban_task";
  phase: "investigacion" | "propuesta" | "desarrollo" | "testing" | "deploy";
  status: string;
  agent: string | null;
  priority: "low" | "medium" | "high";
  date: string;
  description: string;
  filePath: string | null;
}

export const RESEARCH_PHASES: { key: ResearchItem["phase"]; label: string; color: string; icon: string }[] = [
  { key: "investigacion", label: "Investigación", color: "#6366f1", icon: "🔍" },
  { key: "propuesta", label: "Propuesta", color: "#8b5cf6", icon: "📝" },
  { key: "desarrollo", label: "Desarrollo", color: "#3b82f6", icon: "⚙️" },
  { key: "testing", label: "Testing", color: "#f59e0b", icon: "🧪" },
  { key: "deploy", label: "Deploy", color: "#10b981", icon: "🚀" },
];

export const SOURCE_LABELS: Record<ResearchItem["source"], { label: string; color: string }> = {
  report: { label: "Report", color: "#3b82f6" },
  pdca: { label: "PDCA", color: "#8b5cf6" },
  feature_request: { label: "Feature Req", color: "#f59e0b" },
  kanban_task: { label: "Kanban", color: "#10b981" },
};

// Filter-aware KPI types
export interface FilteredKPIs {
  totalOpportunities: number;
  totalPipelineValue: number;
  avgCycleTimeDays: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  winRate: number;
}

// Utility functions
export const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

export const formatPercent = (val: number) =>
  new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1 }).format(val);

export const formatPercent = (val: number) =>
  new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1 }).format(val);

export const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

export const serviceLabels: Record<string, string> = {
  consultoria_audit: "🔍 Audit",
  consultoria_retainer: "🔄 Retainer",
  consultoria_managed: "🛡️ Managed",
  orquestacion_setup: "⚙️ Setup",
  orquestacion_advanced: "🚀 Advanced",
  orquestacion_managed: "🤖 Managed Orch.",
  other: "📋 Otro",
};

export { STATUS_COLORS };
export type { PipelineStage, Opportunity, PipelineKPIs, KanbanTaskStatus };