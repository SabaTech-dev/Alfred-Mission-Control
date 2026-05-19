import type { LucideIcon } from "lucide-react";

import {
  Star,
  Shield,
  TrendingUp,
  FlaskConical,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Target,
  Beaker,
  Search,
  Wrench,
  BookType,
  FileCode,
  BookOpen,
  Lightbulb,
  Clock,
  CheckCircle2,
  Ban,
} from "lucide-react";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface LearningEntry {
  id: string;
  title: string;
  category: "golden" | "rule" | "pattern" | "adoption";
  content: string;
  date: string;
}

export interface ErrorEntry {
  id: string;
  title: string;
  status: "open" | "mitigated" | "resolved" | "verified";
  content: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  content: string;
}

export interface Data {
  learnings: LearningEntry[];
  errors: ErrorEntry[];
  features: FeatureRequest[];
  radarContent: string;
  radarCategories: string[];
  stats: {
    learnings: { total: number; golden: number; rules: number; patterns: number; adoptions: number };
    errors: { total: number; open: number; mitigated: number; resolved: number; verified: number };
    features: number;
  };
}

export interface PDCACycle {
  id: string;
  title: string;
  status: "plan" | "do" | "check" | "act" | "done";
  date: string;
  category: "mejora" | "investigacion" | "fix" | "aprendizaje" | "protocolo";
  description: string;
  source: string;
  metrics?: string;
  outcome?: string;
}

export interface PDCAData {
  cycles: PDCACycle[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byMonth: Record<string, number>;
  };
}

export interface SkillAuditEntry {
  name: string;
  emoji: string;
  status: "active" | "disabled" | "missing" | "command-only";
  missingBins?: string;
}

export interface SkillsAuditData {
  total: number;
  eligible: number;
  visibleToModel: number;
  availableAsCommand: number;
  disabled: number;
  blocked: number;
  excludedByAgent: number;
  missingRequirements: number;
  healthScore: number;
  skills: SkillAuditEntry[];
  timestamp: string;
}

export interface TrackedFeature {
  id: string;
  source: "feature_requests" | "autoresearch_ideas";
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "done" | "rejected";
  date: string;
  tags: string[];
  outcome?: string;
  complexity?: string;
  metricGoal?: string;
  stateOverride?: { status?: string; updatedAt?: string };
}

export interface FeatureTrackerData {
  features: TrackedFeature[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export interface RadarData {
  technologies: {
    id: string;
    name: string;
    quadrant: "Adopt" | "Trial" | "Assess" | "Hold";
    ring: number;
    description: string;
    category: string;
    license?: string;
    version?: string;
    purpose?: string;
    note?: string;
  }[];
  stats: {
    total: number;
    byQuadrant: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

// ── Tab Type ────────────────────────────────────────────────────────────────

export type Tab = "learnings" | "errors" | "features" | "feature-tracker" | "radar" | "pdca" | "skills-audit";

// ── Config: Learnings ───────────────────────────────────────────────────────

export const categoryConfig: Record<
  LearningEntry["category"],
  { icon: LucideIcon; color: string; label: string; bg: string }
> = {
  golden: { icon: Star, color: "#fbbf24", label: "Regla de Oro", bg: "rgba(251,191,36,0.1)" },
  rule: { icon: Shield, color: "#60a5fa", label: "Regla", bg: "rgba(96,165,250,0.1)" },
  pattern: { icon: TrendingUp, color: "#34d399", label: "Patrón", bg: "rgba(52,211,153,0.1)" },
  adoption: { icon: FlaskConical, color: "#a78bfa", label: "Adopción", bg: "rgba(167,139,250,0.1)" },
};

// ── Config: Errors ──────────────────────────────────────────────────────────

export const statusConfig: Record<
  ErrorEntry["status"],
  { icon: LucideIcon; color: string; label: string }
> = {
  open: { icon: XCircle, color: "#ef4444", label: "Abierto" },
  mitigated: { icon: AlertTriangle, color: "#f59e0b", label: "Mitigado" },
  resolved: { icon: CheckCircle, color: "#22c55e", label: "Resuelto" },
  verified: { icon: Shield, color: "#3b82f6", label: "Verificado" },
};

// ── Config: PDCA ────────────────────────────────────────────────────────────

export const pdcaStatusConfig: Record<string, { icon: LucideIcon; color: string; label: string; bg: string }> = {
  plan: { icon: Target, color: "#60a5fa", label: "Plan", bg: "rgba(96,165,250,0.1)" },
  do: { icon: Beaker, color: "#fbbf24", label: "Do", bg: "rgba(251,191,36,0.1)" },
  check: { icon: Search, color: "#a78bfa", label: "Check", bg: "rgba(167,139,250,0.1)" },
  act: { icon: Wrench, color: "#f97316", label: "Act", bg: "rgba(249,115,22,0.1)" },
  done: { icon: CheckCircle, color: "#22c55e", label: "Done", bg: "rgba(34,197,94,0.1)" },
};

export const pdcaCategoryConfig: Record<string, { color: string; label: string }> = {
  mejora: { color: "#22c55e", label: "Mejora" },
  investigacion: { color: "#60a5fa", label: "Investigación" },
  fix: { color: "#ef4444", label: "Fix" },
  aprendizaje: { color: "#a78bfa", label: "Aprendizaje" },
  protocolo: { color: "#fbbf24", label: "Protocolo" },
};

export const sourceIcons: Record<string, LucideIcon> = {
  "PDCA_LOG.md": BookType,
  "seguir-aprendiendo": FlaskConical,
  "weekly-self-improvement": TrendingUp,
  "AUTORESEARCH_PROTOCOL.md": FileCode,
};

// ── Config: Feature Tracker ─────────────────────────────────────────────────

export const ftStatusConfig: Record<string, { icon: LucideIcon; color: string; label: string; bg: string }> = {
  "open": { icon: Lightbulb, color: "#60a5fa", label: "Open", bg: "rgba(96,165,250,0.1)" },
  "in-progress": { icon: Clock, color: "#fbbf24", label: "In Progress", bg: "rgba(251,191,36,0.1)" },
  "done": { icon: CheckCircle2, color: "#22c55e", label: "Done", bg: "rgba(34,197,94,0.1)" },
  "rejected": { icon: Ban, color: "#ef4444", label: "Rejected", bg: "rgba(239,68,68,0.1)" },
};

export const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: "#ef4444", label: "High" },
  medium: { color: "#fbbf24", label: "Medium" },
  low: { color: "#60a5fa", label: "Low" },
};

export const categoryColors: Record<string, string> = {
  backend: "#60a5fa",
  ui: "#a78bfa",
  testing: "#34d399",
  infra: "#f97316",
  memory: "#ec4899",
  integration: "#8b5cf6",
  security: "#ef4444",
  research: "#06b6d4",
  automation: "#f59e0b",
  ai: "#10b981",
  other: "#6b7280",
};

// ── Shared icon for source fallback ─────────────────────────────────────────

export { BookOpen };
