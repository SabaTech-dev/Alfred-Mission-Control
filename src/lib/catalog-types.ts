/**
 * Service Catalog Types — Dynamic pricing & landing status
 */

export type ServiceCategory = "consultoria" | "orquestacion" | "qa_framework";

export interface PricingTier {
  name: string;
  price: number;
  priceDetail: string;
  description: string;
  features: string[];
  highlight?: boolean;
}

export interface ServiceProduct {
  id: string;
  category: ServiceCategory;
  name: string;
  tagline: string;
  description: string;
  landingUrl: string | null;
  repoPath: string | null;
  status: "live" | "staging" | "development" | "error";
  frameworks?: string[];
  targetMarket?: string;
  tiers: PricingTier[];
}

export interface LandingConfig {
  id: string;
  url: string;
  label: string;
}

export type LandingStatus = "live" | "staging" | "error" | "unknown";

export interface LandingCheckResult {
  id: string;
  url: string;
  label: string;
  status: LandingStatus;
  statusCode?: number;
  responseTimeMs?: number;
  checkedAt: string;
  error?: string;
}

export interface CatalogKPIs {
  total_services: number;
  live_count: number;
  total_tiers: number;
  avg_price_consultoria: number;
  avg_price_orquestacion: number;
  revenue_potential_y1: number;
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultoria: "Consultoría",
  orquestacion: "Orquestación",
  qa_framework: "QA Framework",
};

export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  consultoria: "#8b5cf6",
  orquestacion: "#3b82f6",
  qa_framework: "#10b981",
};

export const STATUS_LABELS: Record<ServiceProduct["status"], string> = {
  live: "En vivo",
  staging: "Staging",
  development: "En desarrollo",
  error: "Error",
};

export const STATUS_COLORS: Record<ServiceProduct["status"], string> = {
  live: "#10b981",
  staging: "#f59e0b",
  development: "#3b82f6",
  error: "#ef4444",
};

/** Format price number as EUR string */
export function formatPrice(price: number): string {
  return `€${price.toLocaleString("es-ES")}`;
}

// ─── Inventory types ────────────────────────────────────────────────

export interface AgentInfo {
  name: string;
  id: string;
  agentDir: string;
  model: { primary: string; fallbacks: string[] };
  isDefault: boolean;
  status: "active" | "inactive";
  heartbeatEvery?: string;
}

export interface SkillInfo {
  name: string;
  source: "system" | "workspace" | "plugin" | "agent";
  location: string;
  hasSKILL: boolean;
}

export interface InventoryData {
  agents: AgentInfo[];
  skills: {
    system: SkillInfo[];
    workspace: SkillInfo[];
    plugin: SkillInfo[];
    total: number;
  };
  models: {
    available: { id: string; alias?: string }[];
    default: string;
  };
  mcps: { name: string; configured: boolean; source?: string }[];
  timestamp: string;
}

export interface CatalogData {
  services: ServiceProduct[];
  kpis: CatalogKPIs;
  landingStatus: LandingCheckResult[];
  _meta: { source: string; lastChecked: string | null };
}

export type CatalogTab = "services" | "inventory";

export const SKILL_SOURCE_COLORS: Record<string, string> = {
  system: "#3b82f6",
  workspace: "#8b5cf6",
  plugin: "#f59e0b",
};

export const SKILL_SOURCE_LABELS: Record<string, string> = {
  system: "Sistema",
  workspace: "Workspace",
  plugin: "Plugin",
};

/** Categorize agents by role */
export function getAgentCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alfred") || n.includes("main") || n.includes("principal"))
    return "Orquestación";
  if (n.includes("coder") || n.includes("code"))
    return "Coding";
  if (n.includes("security")) return "Security";
  if (n.includes("research")) return "Research";
  if (n.includes("devops") || n.includes("infra")) return "DevOps";
  if (n.includes("qa") || n.includes("test")) return "Testing";
  if (n.includes("opencode")) return "Development";
  return "Otro";
}
