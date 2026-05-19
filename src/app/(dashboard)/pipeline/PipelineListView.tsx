"use client";

import { Edit3, Trash2 } from "lucide-react";
import { PipelineStage, type Opportunity } from "@/lib/pipeline-types";
import { STAGE_LABELS, STAGE_COLORS, formatCurrency, serviceLabels } from "./PipelineTypes";

interface PipelineListViewProps {
  opportunities: Opportunity[];
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
}

export function PipelineListView({ opportunities, onEdit, onDelete }: PipelineListViewProps) {
  return (
    <div style={{ background: "var(--surface-elevated)", borderRadius: "12px", border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Empresa</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Título</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Etapa</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>Valor</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Servicio</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Próx. Acción</th>
            <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600 }}></th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr key={opp.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>{opp.company}</td>
              <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{opp.title}</td>
              <td style={{ padding: "10px 12px" }}>
                <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, color: "#fff", background: STAGE_COLORS[opp.stage] }}>
                  {STAGE_LABELS[opp.stage]}
                </span>
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-primary)", fontWeight: 500 }}>{formatCurrency(opp.value)}</td>
              <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontSize: "12px" }}>{serviceLabels[opp.service_type] || opp.service_type}</td>
              <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "12px" }}>{opp.next_action || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                  <button onClick={() => onEdit(opp)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={14} /></button>
                  <button onClick={() => onDelete(opp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
          {opportunities.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No hay oportunidades. Crea la primera.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}