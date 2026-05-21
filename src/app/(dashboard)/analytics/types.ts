import { MODEL_PRICING } from "@/lib/pricing-types";

export type Tab = "overview" | "costs";

export interface AnalyticsClientProps {
  initialAnalyticsData: import("@/lib/analytics-data").AnalyticsData;
  initialCostData: import("@/lib/costs-data").CostData | null;
}

export function getModelName(modelId: string): string {
  const pricing = MODEL_PRICING.find((p) => p.id === modelId || p.alias === modelId);
  return pricing?.name || modelId;
}

export const COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
  "#30B0C7", "#32ADE6", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55",
];
