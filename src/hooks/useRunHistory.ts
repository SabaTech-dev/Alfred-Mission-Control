import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RunHistoryEntry {
  id: string;
  jobId: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  durationMs: number | null;
  error: string | null;
}

export interface UseRunHistoryReturn {
  showHistory: boolean;
  runHistory: RunHistoryEntry[];
  loadingHistory: boolean;
  historyTotal: number;
  statusFilter: string;
  fromDate: string;
  toDate: string;
  setStatusFilter: (v: string) => void;
  setFromDate: (v: string) => void;
  setToDate: (v: string) => void;
  loadHistory: (filters?: { status?: string; from?: string; to?: string }) => Promise<void>;
  handleToggleHistory: () => void;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AGENT_EMOJI: Record<string, string> = {
  main: "🫙",
  academic: "🎓",
  infra: "🔧",
  studio: "🎬",
  social: "📱",
  linkedin: "💼",
  freelance: "🔧",
};

export function getAgentEmoji(agentId: string): string {
  return AGENT_EMOJI[agentId] || "🤖";
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

export function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) return "overdue";
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return "now";
}

export function formatHistoryDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("es-ES", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useRunHistory(jobId: string): UseRunHistoryReturn {
  const [showHistory, setShowHistory] = useState(false);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadHistory = useCallback(async (filters?: { status?: string; from?: string; to?: string }) => {
    if (loadingHistory) return;
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({ id: jobId, limit: "20" });
      const status = filters?.status || statusFilter;
      const from = filters?.from || fromDate;
      const to = filters?.to || toDate;

      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/cron/runs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRunHistory(data.runs || []);
        setHistoryTotal(data.total || 0);
      }
    } catch {
      setRunHistory([]);
      setHistoryTotal(0);
    } finally {
      setLoadingHistory(false);
    }
  }, [jobId, loadingHistory, statusFilter, fromDate, toDate]);

  const handleToggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      setStatusFilter("");
      setFromDate("");
      setToDate("");
      loadHistory({ status: "", from: "", to: "" });
    }
  };

  const handleApplyFilters = () => {
    loadHistory({ status: statusFilter, from: fromDate, to: toDate });
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    loadHistory({ status: "", from: "", to: "" });
  };

  return {
    showHistory,
    runHistory,
    loadingHistory,
    historyTotal,
    statusFilter,
    fromDate,
    toDate,
    setStatusFilter,
    setFromDate,
    setToDate,
    loadHistory,
    handleToggleHistory,
    handleApplyFilters,
    handleClearFilters,
  };
}
