"use client";

import { Clock, Play } from "lucide-react";

import type { SystemCronJob } from "@/app/api/cron/system/route";

function ListSystemCronRow({
  job,
  onRun,
}: {
  job: SystemCronJob;
  onRun: (id: string) => Promise<void>;
}) {
  return (
    <div
      className="flex items-center gap-4 py-3 px-4 hover:bg-[color-mix(in_srgb,var(--card-elevated)_50%,transparent)] border-b border-[var(--border)] last:border-0 transition-colors group"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div className="flex items-center gap-3 w-48 shrink-0">
        <span className="w-10 text-[0.65rem] font-bold py-1 rounded text-center bg-[color-mix(in_srgb,var(--info)_20%,transparent)] text-[var(--info)]">
          SYS
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🖥️</span>
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

        {job.description && (
          <span className="text-xs text-[var(--text-muted)] truncate flex-1">
            {job.description}
          </span>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-32 shrink-0 text-xs text-[var(--text-secondary)]">
        <span className="text-[var(--text-muted)]">system task</span>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onRun && (
          <button
            onClick={() => onRun(job.id)}
            className="p-1.5 rounded bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_25%,transparent)] transition-colors"
            title="Run now"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface SystemCronTabProps {
  systemJobs: SystemCronJob[];
  onRun: (id: string) => Promise<void>;
}

export function SystemCronTab({ systemJobs, onRun }: SystemCronTabProps) {
  return (
    <>
      {systemJobs.map((job) => (
        <ListSystemCronRow key={job.id} job={job} onRun={onRun} />
      ))}
    </>
  );
}
