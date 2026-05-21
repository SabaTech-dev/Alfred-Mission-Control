"use client";

import { type PipelineStage, type Opportunity, STAGE_COLORS, STAGE_LABELS } from "@/lib/pipeline-types";
import { formatCurrency } from "./PipelineTypes";

interface PipelineWonLostProps {
  opportunities: Opportunity[];
  wonLostStages: PipelineStage[];
}

export function PipelineWonLost({ opportunities, wonLostStages }: PipelineWonLostProps) {
  const hasWonOrLost = opportunities.some((o) => o.stage === "won" || o.stage === "lost");

  if (!hasWonOrLost) return null;

  return (
    <div style={{ marginTop: "24px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
        Historial
      </h2>
      <div style={{ display: "flex", gap: "12px" }}>
        {wonLostStages.map((stage) => {
          const stageOpps = opportunities.filter((o) => o.stage === stage);
          if (stageOpps.length === 0) return null;
          return (
            <div key={stage} style={{ flex: 1, background: "var(--surface-elevated)", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                {stage === "won" ? <span style={{ color: "#10b981" }}>🏆</span> : <span style={{ color: "#ef4444" }}>✖</span>}
                <span style={{ fontSize: "13px", fontWeight: 600, color: STAGE_COLORS[stage] }}>{STAGE_LABELS[stage]}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>({stageOpps.length})</span>
              </div>
              <div style={{ padding: "8px" }}>
                {stageOpps.map((opp) => (
                  <div key={opp.id} style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{opp.company}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{opp.title}</div>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: STAGE_COLORS[stage] }}>{formatCurrency(opp.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
