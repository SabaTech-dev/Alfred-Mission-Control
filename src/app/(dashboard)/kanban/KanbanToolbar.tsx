"use client";

import Link from "next/link";
import { AlertCircle, Play, CheckCircle, XCircle, Clock, Calendar, Archive, Inbox } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { ArchiveView, ExecutionFilter, TaskCounts } from "./useKanbanData";

interface KanbanToolbarProps {
  archiveView: ArchiveView;
  onArchiveViewChange: (view: ArchiveView) => void;
  executionFilter: ExecutionFilter;
  onExecutionFilterChange: (filter: ExecutionFilter) => void;
  taskCounts: TaskCounts;
}

export function KanbanToolbar({
  archiveView,
  onArchiveViewChange,
  executionFilter,
  onExecutionFilterChange,
  taskCounts,
}: KanbanToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-4 flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--surface-elevated)" }}>
          <button
            onClick={() => onArchiveViewChange("active")}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: archiveView === "active" ? "var(--accent)" : "transparent",
              color: archiveView === "active" ? "white" : "var(--text-secondary)",
            }}
          >
            <Inbox className="h-4 w-4" />
            {t("kanban.archiveView.active")}
          </button>
          <button
            onClick={() => onArchiveViewChange("archived")}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: archiveView === "archived" ? "var(--accent)" : "transparent",
              color: archiveView === "archived" ? "white" : "var(--text-secondary)",
            }}
          >
            <Archive className="h-4 w-4" />
            {t("kanban.archiveView.archived")}
          </button>
        </div>

        {archiveView === "active" && (
          <>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("kanban.filter")}
            </span>
            <FilterButton
              active={executionFilter === "all"}
              onClick={() => onExecutionFilterChange("all")}
              count={taskCounts.all}
              label={t("kanban.executionFilter.all")}
            />
            <FilterButton
              active={executionFilter === "running"}
              onClick={() => onExecutionFilterChange("running")}
              count={taskCounts.running}
              label={t("kanban.executionFilter.running")}
              icon={<Play className="h-3 w-3" />}
              color="var(--info)"
            />
            <FilterButton
              active={executionFilter === "success"}
              onClick={() => onExecutionFilterChange("success")}
              count={taskCounts.success}
              label={t("kanban.executionFilter.success")}
              icon={<CheckCircle className="h-3 w-3" />}
              color="var(--success)"
            />
            <FilterButton
              active={executionFilter === "error"}
              onClick={() => onExecutionFilterChange("error")}
              count={taskCounts.error}
              label={t("kanban.executionFilter.error")}
              icon={<XCircle className="h-3 w-3" />}
              color="var(--error)"
            />
            <FilterButton
              active={executionFilter === "pending"}
              onClick={() => onExecutionFilterChange("pending")}
              count={taskCounts.pending}
              label={t("kanban.executionFilter.pending")}
              icon={<Clock className="h-3 w-3" />}
              color="var(--warning)"
            />
            <FilterButton
              active={executionFilter === "none"}
              onClick={() => onExecutionFilterChange("none")}
              count={taskCounts.none}
              label={t("kanban.executionFilter.manual")}
              icon={<AlertCircle className="h-3 w-3" />}
              color="var(--text-muted)"
            />
          </>
        )}
      </div>

      <Link
        href="/cron"
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
        style={{
          backgroundColor: "var(--surface-elevated)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <Calendar className="h-4 w-4" />
        {t("kanban.cronJobs")}
      </Link>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  count,
  label,
  icon,
  color = "var(--accent)",
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
      style={{
        backgroundColor: active ? color : "transparent",
        color: active ? "white" : "var(--text-secondary)",
        border: `1px solid ${active ? color : "var(--border)"}`,
      }}
    >
      {icon}
      {label}
      <span
        className="ml-1 rounded-full px-1.5 py-0.5 text-xs"
        style={{
          backgroundColor: active ? "rgba(255,255,255,0.2)" : "var(--surface-elevated)",
          color: active ? "white" : "var(--text-muted)",
        }}
      >
        {count}
      </span>
    </button>
  );
}
