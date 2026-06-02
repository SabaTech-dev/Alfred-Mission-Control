"use client";

import { type PipelineStage, type Opportunity, STAGE_COLORS, STAGE_LABELS } from "@/lib/pipeline-types";
import { PipelineOppCard } from "./PipelineOppCard";
import { formatCurrency } from "./PipelineTypes";

interface PipelineStageColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  expandedCard: string | null;
  onToggleCard: (oppId: string, company: string) => void;
  onStageChange: (id: string, newStage: PipelineStage) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onOppClick: (opp: Opportunity) => void;
  activeStages: PipelineStage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kanbanTasks: Record<string, any[]>;
  loadingTasks: Record<string, boolean>;
}

export function PipelineStageColumn({
  stage,
  opportunities,
  expandedCard,
  onToggleCard,
  onStageChange,
  onEdit,
  onDelete,
  onOppClick,
  activeStages,
  kanbanTasks,
  loadingTasks,
}: PipelineStageColumnProps) {
  const stageOpps = opportunities.filter((o) => o.stage === stage);
  const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);

  return (
    <div
      style={{
        minWidth: "240px",
        flex: "1 0 240px",
        background: "var(--surface-elevated)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Stage Header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: STAGE_COLORS[stage] }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            {STAGE_LABELS[stage]}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--surface)", padding: "2px 6px", borderRadius: "4px" }}>
            {stageOpps.length}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {formatCurrency(stageValue)}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        {stageOpps.map((opp) => (
          <PipelineOppCard
            key={opp.id}
            opp={opp}
            expanded={expandedCard === opp.id}
            onToggle={() => onToggleCard(opp.id, opp.company)}
            onStageChange={onStageChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={() => onOppClick(opp)}
            activeStages={activeStages}
            kanbanTasks={kanbanTasks[opp.id] || []}
            loadingTasks={loadingTasks[opp.id] || false}
          />
        ))}
        {stageOpps.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
            Sin oportunidades
          </div>
        )}
      </div>
    </div>
  );
}
