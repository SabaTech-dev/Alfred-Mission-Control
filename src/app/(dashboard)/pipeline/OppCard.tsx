"use client";

import { ArrowRight, Edit3, Trash2 } from "lucide-react";
import {
  STAGE_COLORS,
  type PipelineStage,
  type Opportunity,
} from "@/lib/pipeline-types";

type KanbanTaskStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";

const STATUS_COLORS: Record<KanbanTaskStatus, string> = {
  backlog: "#6b7280",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#22c55e",
  blocked: "#ef4444",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OppCardKanbanTask = any;

interface OppCardProps {
  opp: Opportunity;
  expanded: boolean;
  onToggle: () => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  formatCurrency: (v: number) => string;
  formatDate: (d: string | null) => string;
  serviceLabels: Record<string, string>;
  activeStages: PipelineStage[];
  kanbanTasks: OppCardKanbanTask[];
  loadingTasks: boolean;
}

export function OppCard({
  opp,
  expanded,
  onToggle,
  onStageChange,
  onEdit,
  onDelete,
  formatCurrency,
  formatDate,
  serviceLabels,
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

          <KanbanTasksSection
            kanbanTasks={kanbanTasks}
            loadingTasks={loadingTasks}
          />
        </div>
      )}
    </div>
  );
}

function KanbanTasksSection({
  kanbanTasks,
  loadingTasks,
}: {
  kanbanTasks: OppCardKanbanTask[];
  loadingTasks: boolean;
}) {
  return (
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
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {kanbanTasks.map((task) => (
              <KanbanTaskRow key={task.id} task={task} />
            ))}
          </div>
          <KanbanProgressBar kanbanTasks={kanbanTasks} />
        </>
      )}
    </div>
  );
}

function KanbanTaskRow({ task }: { task: OppCardKanbanTask }) {
  return (
    <div
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
      <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {task.title}
      </div>
      {task.assignee && (
        <span style={{ fontSize: "9px", color: "var(--text-muted)", background: "var(--surface)", padding: "2px 5px", borderRadius: "3px" }}>
          {task.assignee}
        </span>
      )}
    </div>
  );
}

function KanbanProgressBar({ kanbanTasks }: { kanbanTasks: OppCardKanbanTask[] }) {
  const doneCount = kanbanTasks.filter((t) => t.status === "done").length;
  const percent = Math.round((doneCount / kanbanTasks.length) * 100);
  const isComplete = doneCount === kanbanTasks.length;

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>
        <span>Progreso:</span>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {doneCount} / {kanbanTasks.length} tareas completadas
        </span>
      </div>
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            background: STATUS_COLORS[isComplete ? "done" : "in_progress"],
            width: `${percent}%`,
            transition: "width 0.3s ease, background 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
