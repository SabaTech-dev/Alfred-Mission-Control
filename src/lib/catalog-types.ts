/**
 * Service Catalog Types
 */

export type ServiceCategory = "consultoria" | "orquestacion" | "qa_framework";

export interface PricingTier {
  name: string;
  price: string;
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
  status: "live" | "staging" | "development" | "planned";
  tiers: PricingTier[];
  frameworks?: string[];
  targetMarket?: string;
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
  planned: "Planificado",
};

export const STATUS_COLORS: Record<ServiceProduct["status"], string> = {
  live: "#10b981",
  staging: "#f59e0b",
  development: "#3b82f6",
  planned: "#6b7280",
};
