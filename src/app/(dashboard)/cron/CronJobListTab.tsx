"use client";

import { Clock, Calendar, Play, Trash2 } from "lucide-react";

import { type CronJob } from "@/components/CronJobCard";

const AGENT_EMOJI: Record<string, string> = {
  main: "🫙",
  academic: "🎓",
  infra: "🔧",
  studio: "🎬",
  social: "📱",
  linkedin: "💼",
  freelance: "🔧",
};

function formatNextRun(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) return "now";
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return "soon";
}

function ListCronJobRow({
  job,
  onToggle,
  onEdit,
  onRun,
  onDelete,
  isDeleting,
}: {
  job: CronJob;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (job: CronJob) => void;
  onRun?: (id: string) => Promise<void>;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}) {
  const agentEmoji = AGENT_EMOJI[job.agentId] || "🤖";

  return (
    <div
      onClick={() => onEdit(job)}
      className="flex items-center gap-4 py-3 px-4 hover:bg-[color-mix(in_srgb,var(--card-elevated)_50%,transparent)] border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors group"
      style={{
        opacity: job.enabled ? 1 : 0.5,
        backgroundColor: "var(--card)",
      }}
    >
      <div className="flex items-center gap-3 w-48 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(job.id, !job.enabled);
          }}
          className="w-10 text-[0.65rem] font-bold py-1 rounded transition-colors"
          style={{
            backgroundColor: job.enabled
              ? "color-mix(in srgb, var(--success) 20%, transparent)"
              : "color-mix(in srgb, var(--text-muted) 20%, transparent)",
            color: job.enabled ? "var(--success)" : "var(--text-muted)",
          }}
        >
          {job.enabled ? "ON" : "OFF"}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{agentEmoji}</span>
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {job.name}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="w-3.5 h-3.5 text-[var(--info)]" />
          <code className="text-xs bg-[var(--card-elevated)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-mono">
            {job.scheduleDisplay}
          </code>
        </div>

        {job.message && (
          <span className="text-xs text-[var(--text-muted)] truncate flex-1">
            {job.message}
          </span>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-32 shrink-0 text-xs text-[var(--text-secondary)]">
        {job.enabled && job.nextRun ? (
          <>
            <Calendar className="w-3.5 h-3.5 text-[var(--type-cron)]" />
            {formatNextRun(job.nextRun)}
          </>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onRun && job.enabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun(job.id);
            }}
            className="p-1.5 rounded bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_25%,transparent)] transition-colors"
            title="Run now"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
            className="p-1.5 rounded transition-colors flex items-center justify-center min-w-[28px]"
            style={{
              backgroundColor: isDeleting
                ? "var(--error)"
                : "color-mix(in srgb, var(--error) 15%, transparent)",
              color: isDeleting ? "white" : "var(--error)",
            }}
            title="Delete job"
          >
            {isDeleting ? <span className="text-[0.65rem] font-bold px-1">?</span> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

interface CronJobListTabProps {
  jobs: CronJob[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (job: CronJob) => void;
  onRun: (id: string) => Promise<void>;
  onDelete: (job: CronJob) => void;
  isDeleting: boolean;
  deletingJobId: string | undefined;
}

export function CronJobListTab({
  jobs,
  onToggle,
  onEdit,
  onRun,
  onDelete,
  isDeleting,
  deletingJobId,
}: CronJobListTabProps) {
  return (
    <>
      {jobs.map((job) => (
        <ListCronJobRow
          key={job.id}
          job={job}
          onToggle={onToggle}
          onEdit={onEdit}
          onRun={onRun}
          onDelete={() => onDelete(job)}
          isDeleting={isDeleting && deletingJobId === job.id}
        />
      ))}
    </>
  );
}
