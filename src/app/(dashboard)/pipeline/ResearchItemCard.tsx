"use client";

import type { ResearchItem } from "./PipelineTypes";
import { SOURCE_LABELS, RESEARCH_PHASES } from "./PipelineTypes";
import { formatDate } from "./PipelineTypes";

interface ResearchItemCardProps {
  item: ResearchItem;
  expanded: boolean;
  onToggle: (id: string) => void;
  onPhaseChange?: (id: string, newPhase: ResearchItem["phase"]) => void;
  onOpenReport?: (filePath: string | null) => void;
}

export function ResearchItemCard({
  item,
  expanded,
  onToggle,
  onPhaseChange,
  onOpenReport,
}: ResearchItemCardProps) {
  const phaseInfo = RESEARCH_PHASES.find((p) => p.key === item.phase);
  const sourceInfo = SOURCE_LABELS[item.source];

  const canAdvance = () => {
    const currentIdx = RESEARCH_PHASES.findIndex((p) => p.key === item.phase);
    return currentIdx < RESEARCH_PHASES.length - 1;
  };

  const canRetreat = () => {
    const currentIdx = RESEARCH_PHASES.findIndex((p) => p.key === item.phase);
    return currentIdx > 0;
  };

  const advancePhase = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPhaseChange || !canAdvance()) return;
    const currentIdx = RESEARCH_PHASES.findIndex((p) => p.key === item.phase);
    const nextPhase = RESEARCH_PHASES[currentIdx + 1];
    onPhaseChange(item.id, nextPhase.key);
  };

  const retreatPhase = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPhaseChange || !canRetreat()) return;
    const currentIdx = RESEARCH_PHASES.findIndex((p) => p.key === item.phase);
    const prevPhase = RESEARCH_PHASES[currentIdx - 1];
    onPhaseChange(item.id, prevPhase.key);
  };

  const openReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenReport && item.filePath) {
      onOpenReport(item.filePath);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        padding: "10px 12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={() => onToggle(item.id)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px" }}>{phaseInfo?.icon}</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </span>
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                padding: "1px 5px",
                borderRadius: "3px",
                fontSize: "9px",
                fontWeight: 600,
                color: "#fff",
                background: sourceInfo.color,
                whiteSpace: "nowrap",
              }}
            >
              {sourceInfo.label}
            </span>
            <span
              style={{
                fontSize: "9px",
                color: item.priority === "high" ? "#ef4444" : item.priority === "medium" ? "#f59e0b" : "#6b7280",
                fontWeight: 600,
              }}
            >
              {item.priority.toUpperCase()}
            </span>
            {item.agent && (
              <span style={{ fontSize: "9px", color: "var(--text-muted)", background: "var(--surface-elevated)", padding: "1px 4px", borderRadius: "2px" }}>
                👤 {item.agent}
              </span>
            )}
            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{formatDate(item.date)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {item.filePath && onOpenReport && (
            <button
              onClick={openReport}
              style={{
                padding: "4px 6px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: "var(--surface-elevated)",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "10px",
              }}
              title="Abrir report"
            >
              📄
            </button>
          )}
          {onPhaseChange && (
            <>
              <button
                onClick={retreatPhase}
                disabled={!canRetreat()}
                style={{
                  padding: "4px 6px",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-elevated)",
                  color: canRetreat() ? "var(--text-secondary)" : "var(--text-muted)",
                  cursor: canRetreat() ? "pointer" : "not-allowed",
                  fontSize: "10px",
                  opacity: canRetreat() ? 1 : 0.5,
                }}
                title="Retroceder fase"
              >
                ◀
              </button>
              <button
                onClick={advancePhase}
                disabled={!canAdvance()}
                style={{
                  padding: "4px 6px",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-elevated)",
                  color: canAdvance() ? "var(--text-secondary)" : "var(--text-muted)",
                  cursor: canAdvance() ? "pointer" : "not-allowed",
                  fontSize: "10px",
                  opacity: canAdvance() ? 1 : 0.5,
                }}
                title="Avanzar fase"
              >
                ▶
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
          {item.description && (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", lineHeight: "1.5" }}>
              {item.description}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "10px", color: "var(--text-muted)" }}>
            <div>ID: {item.id}</div>
            <div>Status: {item.status}</div>
            {item.filePath && (
              <div style={{ color: "var(--accent)" }}>{item.filePath}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}