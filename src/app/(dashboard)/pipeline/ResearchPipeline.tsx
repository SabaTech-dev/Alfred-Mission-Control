"use client";

import { SOURCE_LABELS, RESEARCH_PHASES, type ResearchItem } from "./PipelineTypes";

interface ResearchPipelineProps {
  researchItems: ResearchItem[];
  researchLoading: boolean;
  showResearch: boolean;
  onToggle: () => void;
}

export function ResearchPipeline({ researchItems, researchLoading, showResearch, onToggle }: ResearchPipelineProps) {
  if (!showResearch) {
    return (
      <button
        onClick={onToggle}
        style={{ marginBottom: "16px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
      >
        🔬 Mostrar Pipeline de Investigaciones
      </button>
    );
  }

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            🔬 Pipeline de Investigaciones & Reportes
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
            {researchLoading ? "Cargando..." : `${researchItems.length} items desde reports, PDCA, feature requests y Kanban`}
          </p>
        </div>
        <button
          onClick={onToggle}
          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }}
        >
          Ocultar
        </button>
      </div>

      {!researchLoading && (
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
          {RESEARCH_PHASES.map((phase) => {
            const phaseItems = researchItems.filter((i) => i.phase === phase.key);
            return (
              <div
                key={phase.key}
                style={{
                  minWidth: "200px",
                  flex: "1 0 200px",
                  background: "var(--surface-elevated)",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{phase.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{phase.label}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--surface)", padding: "1px 5px", borderRadius: "3px" }}>{phaseItems.length}</span>
                  </div>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: phase.color }} />
                </div>
                <div style={{ padding: "6px", flex: 1, display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>
                  {phaseItems.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>Sin items</div>
                  ) : (
                    phaseItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          fontSize: "11px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "6px" }}>
                          <div style={{ flex: 1, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title}
                          </div>
                          <span
                            style={{
                              padding: "1px 5px",
                              borderRadius: "3px",
                              fontSize: "9px",
                              fontWeight: 600,
                              color: "#fff",
                              background: SOURCE_LABELS[item.source].color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {SOURCE_LABELS[item.source].label}
                          </span>
                        </div>
                        {item.description && (
                          <div style={{ color: "var(--text-muted)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.description}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px", alignItems: "center", flexWrap: "wrap" }}>
                          {item.agent && (
                            <span style={{ fontSize: "9px", color: "var(--text-muted)", background: "var(--surface-elevated)", padding: "1px 4px", borderRadius: "2px" }}>
                              👤 {item.agent}
                            </span>
                          )}
                          <span style={{ fontSize: "9px", color: item.priority === "high" ? "#ef4444" : item.priority === "medium" ? "#f59e0b" : "#6b7280" }}>
                            {item.priority.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{item.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}