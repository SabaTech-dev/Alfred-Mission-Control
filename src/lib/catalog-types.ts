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
