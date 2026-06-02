"use client";

import { ArrowRight, Edit3, Trash2 } from "lucide-react";
import { PipelineStage, type Opportunity, type SourceType } from "@/lib/pipeline-types";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/pipeline-types";
import { formatDate, formatCurrency, serviceLabels, STATUS_COLORS } from "./PipelineTypes";
import type { KanbanTaskStatus } from "./PipelineTypes";

interface OppCardProps {
  opp: Opportunity;
  expanded: boolean;
  onToggle: () => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
  activeStages: PipelineStage[];
  kanbanTasks: any[];
  loadingTasks: boolean;
}

export function OppCard({
  opp,
  expanded,
  onToggle,
  onStageChange,
  onEdit,
  onDelete,
  onClick,
  activeStages,
  kanbanTasks,
  loadingTasks,
}: OppCardProps) {
  const stageIdx = activeStages.indexOf(opp.stage as PipelineStage);
  const canAdvance = stageIdx < activeStages.length - 1;
  const canRetreat = stageIdx > 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        padding: "10px 12px",
        cursor: "pointer",
      }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{opp.company}</div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{opp.title}</div>
        </div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
          {formatCurrency(opp.value)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--surface-elevated)", padding: "2px 6px", borderRadius: "3px" }}>
          {serviceLabels[opp.service_type] || opp.service_type}
        </span>
        <span style={{ fontSize: "10px", color: "#000", background: "#6b7280", padding: "2px 6px", borderRadius: "3px", fontWeight: 500 }}>
          {opp.source_type === "business_opportunity" ? "💼 Negocio" : opp.source_type === "internal_report" ? "📋 Técnico" : opp.source_type === "manual" ? "✏️ Manual" : "🔄 Auto Sync"}
        </span>
        {opp.contact_name && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>👤 {opp.contact_name}</span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
          {opp.description && (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>{opp.description}</div>
          )}
          {opp.next_action && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
              📌 {opp.next_action} {opp.next_action_date && `— ${formatDate(opp.next_action_date)}`}
            </div>
          )}
          {opp.source && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>📍 Fuente: {opp.source}</div>
          )}
          {opp.notes && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", fontStyle: "italic" }}>{opp.notes}</div>
          )}

          <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
            {canRetreat && (
              <button
                onClick={() => onStageChange(opp.id, activeStages[stageIdx - 1])}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }}
              >
                ←
              </button>
            )}
            {canAdvance && (
              <button
                onClick={() => onStageChange(opp.id, activeStages[stageIdx + 1])}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                Avanzar <ArrowRight size={12} />
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={() => onEdit(opp)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={14} /></button>
            <button onClick={() => onDelete(opp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Trash2 size={14} /></button>
          </div>

          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px" }}>
            Creado: {formatDate(opp.created_at)}
          </div>
          
          {/* Pipeline-Kanban Bridge: Show associated Kanban tasks */}
          {expanded && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", borderTopStyle: "dashed" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ background: "#8b5cf6", color: "#fff", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>KANBAN</span>
                Tareas asociadas ({kanbanTasks.length})
              </div>
              
              {loadingTasks ? (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px" }}>Cargando tareas...</div>
              ) : kanbanTasks.length === 0 ? (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px" }}>Sin tareas asociadas</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {kanbanTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "4px",
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border)",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {/* Status badge */}
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "9px",
                          fontWeight: 600,
                          color: "#fff",
                          background: STATUS_COLORS[task.status as KanbanTaskStatus] || "#6b7280",
                        }}
                      >
                        {String(task.status)}
                      </span>
                      
                      {/* Task title (truncated) */}
                      <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </div>
                      
                      {/* Assignee */}
                      {task.assignee && (
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", background: "var(--surface)", padding: "2px 5px", borderRadius: "3px" }}>
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Progress indicator */}
              {kanbanTasks.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    <span>Progreso:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {kanbanTasks.filter((t) => t.status === "done").length} / {kanbanTasks.length} tareas completadas
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: STATUS_COLORS[kanbanTasks.filter((t) => t.status === "done").length === kanbanTasks.length ? "done" : "in_progress"],
                        width: `${Math.round((kanbanTasks.filter((t) => t.status === "done").length / kanbanTasks.length) * 100)}%`,
                        transition: "width 0.3s ease, background 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { OppCard as PipelineOppCard };