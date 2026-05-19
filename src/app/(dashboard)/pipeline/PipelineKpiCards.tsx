"use client";

import { DollarSign, TrendingUp, Trophy, Target, BarChart3 } from "lucide-react";
import { PipelineKPIs } from "@/lib/pipeline-types";
import { formatCurrency, formatPercent } from "./PipelineTypes";

interface PipelineKpiCardsProps {
  kpis: PipelineKPIs | null;
}

export function PipelineKpiCards({ kpis }: PipelineKpiCardsProps) {
  if (!kpis) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
      <KpiCard icon={<DollarSign size={18} />} label="Pipeline Total" value={formatCurrency(kpis.total_pipeline_value)} color="#3b82f6" />
      <KpiCard icon={<TrendingUp size={18} />} label="Weighted" value={formatCurrency(kpis.weighted_pipeline_value)} color="#8b5cf6" />
      <KpiCard icon={<Trophy size={18} />} label="Ganado" value={formatCurrency(kpis.won_value)} color="#10b981" />
      <KpiCard icon={<Target size={18} />} label="Win Rate" value={formatPercent(kpis.win_rate)} color="#f59e0b" />
      <KpiCard icon={<BarChart3 size={18} />} label="Deals Activos" value={String(kpis.total_opportunities - (kpis.by_stage.won?.count || 0) - (kpis.by_stage.lost?.count || 0))} color="#06b6d4" />
      <KpiCard icon={<DollarSign size={18} />} label="Deal Medio" value={formatCurrency(kpis.avg_deal_size)} color="#ec4899" />
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--surface-elevated)", borderRadius: "10px", border: "1px solid var(--border)", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}