"use client";

import { useState, useCallback } from "react";
import {
  Clock,
  Calendar,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bot,
  Zap,
  CheckCircle2,
  XCircle,
  History,
  Loader2,
  Edit3,
} from "lucide-react";

import {
  getAgentEmoji,
  formatDate,
  getRelativeTime,
  useRunHistory,
} from "@/hooks/useRunHistory";
import { CronRunHistorySection } from "@/components/CronRunHistorySection";

export interface CronJob {
  id: string;
  agentId: string;
  name: string;
  description: string;
  message: string;
  schedule: string | Record<string, unknown>;
  scheduleDisplay: string;
  timezone: string;
  enabled: boolean;
  nextRun: string | null;
  lastRun: string | null;
  sessionTarget: string;
  payload: Record<string, unknown>;
}

interface CronJobCardProps {
  job: CronJob;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (job: CronJob) => void;
  onDelete: (id: string) => void;
  onRun?: (id: string) => Promise<void>;
}

export function CronJobCard({ job, onToggle, onEdit, onDelete, onRun }: CronJobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<"success" | "error" | null>(null);
  const history = useRunHistory(job.id);

  const handleToggle = async () => {
    setIsToggling(true);
    await onToggle(job.id, !job.enabled);
    setIsToggling(false);
  };

  const handleRun = useCallback(async () => {
    if (!onRun || isRunning) return;
    setIsRunning(true);
    setRunResult(null);
    try {
      await onRun(job.id);
      setRunResult("success");
    } catch {
      setRunResult("error");
    } finally {
      setIsRunning(false);
      // Clear result indicator after 3s
      setTimeout(() => setRunResult(null), 3000);
    }
  }, [job.id, onRun, isRunning]);

  const agentEmoji = getAgentEmoji(job.agentId);
  return (
    <div
      className="rounded-xl"
      style={{
        border: "1px solid",
        borderColor: job.enabled ? "var(--border)" : "rgba(42, 42, 42, 0.5)",
        backgroundColor: job.enabled
          ? "color-mix(in srgb, var(--card) 50%, transparent)"
          : "color-mix(in srgb, var(--card) 30%, transparent)",
        opacity: job.enabled ? 1 : 0.6,
        transition: "all 0.2s",
      }}
    >
      <div className="p-3 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <span title={job.agentId}>{agentEmoji}</span>
              <h3
                className="text-sm md:text-lg font-semibold truncate"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
              >
                {job.name}
              </h3>
              <span
                className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  backgroundColor: job.enabled
                    ? "color-mix(in srgb, var(--success) 20%, transparent)"
                    : "rgba(42, 42, 42, 0.5)",
                  color: job.enabled ? "var(--success)" : "var(--text-secondary)",
                }}
              >
                {job.enabled ? "Active" : "Paused"}
              </span>
            </div>
            <p className="text-xs md:text-sm mt-0.5 md:mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
              {job.description}
            </p>
          </div>

          {/* Toggle Button */}
          <button
            onClick={handleToggle}
            disabled={isToggling}
            title={job.enabled ? "Pause job" : "Enable job"}
            className="p-1.5 md:p-2 rounded-lg flex-shrink-0"
            style={{
              border: "none",
              cursor: isToggling ? "not-allowed" : "pointer",
              opacity: isToggling ? 0.5 : 1,
              backgroundColor: job.enabled
                ? "color-mix(in srgb, var(--success) 20%, transparent)"
                : "rgba(42, 42, 42, 0.5)",
              color: job.enabled ? "var(--success)" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}
          >
            {isToggling ? (
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : job.enabled ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </button>
        </div>

        {/* Schedule Info */}
        <div className="flex flex-wrap gap-2 md:gap-4 mb-2 md:mb-4">
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--info)" }} />
            <code
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded"
              style={{ backgroundColor: "rgba(42, 42, 42, 0.5)", color: "var(--text-secondary)", fontFamily: "monospace" }}
            >
              {job.scheduleDisplay}
            </code>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
            <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-muted)" }}>{job.sessionTarget}</span>
          </div>
        </div>
        {job.enabled && job.nextRun && (
          <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm mb-2 md:mb-4">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--type-cron)" }} />
            <span style={{ color: "var(--text-secondary)" }}>Next:</span>
            <span style={{ color: "var(--text-primary)" }}>{formatDate(job.nextRun)}</span>
            <span style={{ color: "var(--type-cron)" }}>({getRelativeTime(job.nextRun)})</span>
          </div>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs md:text-sm"
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Hide details</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Show details</span>
            </>
          )}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-2 md:mt-3 pl-3 md:pl-4 flex flex-col gap-1 md:gap-2 text-xs md:text-sm" style={{ borderLeft: "2px solid var(--border)" }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>ID: </span>
              <code style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>{job.id}</code>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Agent: </span>
              <span style={{ color: "var(--text-secondary)" }}>{agentEmoji} {job.agentId}</span>
            </div>
            {job.lastRun && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Last run: </span>
                <span style={{ color: "var(--text-secondary)" }}>{formatDate(job.lastRun)}</span>
              </div>
            )}
            <div>
              <span style={{ color: "var(--text-muted)" }}>Timezone: </span>
              <span style={{ color: "var(--text-secondary)" }}>{job.timezone}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2 mt-3 md:mt-4 pt-2 md:pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => onDelete(job.id)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded-lg"
            style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}
          >
            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          <button
            onClick={() => onEdit(job)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded-lg"
            style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}
            title="Edit job"
          >
            <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={history.handleToggleHistory}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded-lg"
            style={{
              color: history.showHistory ? "var(--info)" : "var(--text-muted)",
              background: history.showHistory ? "color-mix(in srgb, var(--info) 10%, transparent)" : "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="Run history"
          >
            <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <div className="flex-1" />
          {onRun && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              title="Trigger this job now"
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded-lg"
              style={{
                backgroundColor: runResult === "success"
                  ? "color-mix(in srgb, var(--success) 15%, transparent)"
                  : runResult === "error"
                  ? "color-mix(in srgb, var(--error) 15%, transparent)"
                  : "color-mix(in srgb, var(--accent) 15%, transparent)",
                color: runResult === "success" ? "var(--success)" : runResult === "error" ? "var(--error)" : "var(--accent)",
                border: `1px solid ${runResult === "success" ? "color-mix(in srgb, var(--success) 30%, transparent)" : runResult === "error" ? "color-mix(in srgb, var(--error) 30%, transparent)" : "color-mix(in srgb, var(--accent) 30%, transparent)"}`,
                cursor: isRunning ? "not-allowed" : "pointer",
                opacity: isRunning ? 0.7 : 1,
                transition: "all 0.2s",
                fontWeight: 600,
              }}
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
              ) : runResult === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              ) : runResult === "error" ? (
                <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
              ) : (
                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
              )}
              <span className="hidden sm:inline">
                {isRunning ? "Running…" : runResult === "success" ? "Triggered!" : runResult === "error" ? "Failed" : "Run Now"}
              </span>
            </button>
          )}
        </div>

        {/* Run History Panel */}
        {history.showHistory && <CronRunHistorySection history={history} />}
      </div>
    </div>
  );
}
