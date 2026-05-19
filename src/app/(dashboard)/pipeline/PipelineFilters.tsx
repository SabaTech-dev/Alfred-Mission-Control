"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { PipelineStage } from "@/lib/pipeline-types";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/pipeline-types";

interface PipelineFiltersProps {
  filterStage: PipelineStage | "all";
  filterServiceType: string;
  filterDateFrom: string;
  filterDateTo: string;
  showFilters: boolean;
  hasActiveFilters: boolean;
  filteredOpportunitiesCount: number;
  totalOpportunitiesCount: number;
  onFilterStageChange: (stage: PipelineStage | "all") => void;
  onFilterServiceTypeChange: (type: string) => void;
  onFilterDateFromChange: (date: string) => void;
  onFilterDateToChange: (date: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

export function PipelineFilters({
  filterStage,
  filterServiceType,
  filterDateFrom,
  filterDateTo,
  showFilters,
  hasActiveFilters,
  filteredOpportunitiesCount,
  totalOpportunitiesCount,
  onFilterStageChange,
  onFilterServiceTypeChange,
  onFilterDateFromChange,
  onFilterDateToChange,
  onToggleFilters,
  onClearFilters,
}: PipelineFiltersProps) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onToggleFilters}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: hasActiveFilters ? "var(--accent)" : "var(--surface)",
            color: hasActiveFilters ? "#fff" : "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Filter size={14} /> Filtros {hasActiveFilters && `(activos: ${filteredOpportunitiesCount}/${totalOpportunitiesCount})`}
        </button>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>
      {showFilters && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            padding: "12px",
            background: "var(--surface-elevated)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ minWidth: "140px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Etapa</label>
            <select
              value={filterStage}
              onChange={(e) => onFilterStageChange(e.target.value as PipelineStage | "all")}
              style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
            >
              <option value="all">Todas</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: "160px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Tipo Servicio</label>
            <select
              value={filterServiceType}
              onChange={(e) => onFilterServiceTypeChange(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
            >
              <option value="all">Todos</option>
              <option value="consultoria_audit">🔍 Audit</option>
              <option value="consultoria_retainer">🔄 Retainer</option>
              <option value="consultoria_managed">🛡️ Managed</option>
              <option value="orquestacion_setup">⚙️ Setup</option>
              <option value="orquestacion_advanced">🚀 Advanced</option>
              <option value="orquestacion_managed">🤖 Managed Orch.</option>
              <option value="other">📋 Otro</option>
            </select>
          </div>
          <div style={{ minWidth: "140px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Desde</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => onFilterDateFromChange(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ minWidth: "140px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Hasta</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => onFilterDateToChange(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}