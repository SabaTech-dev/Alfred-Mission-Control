/**
 * Pipeline Types — shared between client and server
 */

export type PipelineStage =
  | "lead"
  | "contacted"
  | "qualifying"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export const PIPELINE_STAGES: PipelineStage[] = [
  "lead",
  "contacted",
  "qualifying",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: "Lead",
  contacted: "Contactado",
  qualifying: "Cualificando",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  lead: "#6b7280",
  contacted: "#3b82f6",
  qualifying: "#f59e0b",
  proposal: "#8b5cf6",
  negotiation: "#ec4899",
  won: "#10b981",
  lost: "#ef4444",
};

export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  lead: 0.1,
  contacted: 0.2,
  qualifying: 0.35,
  proposal: 0.5,
  negotiation: 0.7,
  won: 1.0,
  lost: 0,
};

export interface Opportunity {
  id: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  title: string;
  description: string | null;
  stage: PipelineStage;
  value: number;
  currency: string;
  service_type: "consultoria_audit" | "consultoria_retainer" | "consultoria_managed" | "orquestacion_setup" | "orquestacion_advanced" | "orquestacion_managed" | "other";
  probability: number | null;
  source: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface PipelineKPIs {
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  won_value: number;
  lost_value: number;
  avg_deal_size: number;
  win_rate: number;
  total_opportunities: number;
  by_stage: Record<PipelineStage, { count: number; value: number; weighted: number }>;
}
