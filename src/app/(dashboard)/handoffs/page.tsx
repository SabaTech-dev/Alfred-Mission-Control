"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface Handoff {
  id: string;
  from: string;
  to: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  model?: string;
}

interface HandoffStats {
  total: number;
  completed: number;
  running: number;
  pending: number;
  failed: number;
  successRate: number;
  avgDurationMs: number;
}

interface HandoffData {
  handoffs: Handoff[];
  stats: HandoffStats;
  timestamp: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle; bgColor: string }> = {
  pending: { color: "#6b7280", icon: Clock, bgColor: "rgba(107, 114, 128, 0.2)" },
  running: { color: "#3b82f6", icon: Loader2, bgColor: "rgba(59, 130, 246, 0.2)" },
  completed: { color: "#10b981", icon: CheckCircle, bgColor: "rgba(16, 185, 129, 0.2)" },
  failed: { color: "#ef4444", icon: XCircle, bgColor: "rgba(239, 68, 68, 0.2)" },
};

const AGENT_EMOJIS: Record<string, string> = {
  alfred: "🤖",
  coder: "💻",
  research: "🔍",
  security: "🔒",
  debug: "🐛",
  "refactor-expert": "⚡",
};

export default function HandoffsPage() {
  const [data, setData] = useState<HandoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/handoffs");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch handoffs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const filteredHandoffs = data?.handoffs.filter((h) => {
    if (filter === "all") return true;
    if (filter === "active") return h.status === "running" || h.status === "pending";
    return h.status === filter;
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading handoff timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)",
            letterSpacing: "-1.5px",
          }}
        >
          🤝 Agent Handoff Timeline
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Track delegations between agents and their status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Total Handoffs</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {data?.stats.total || 0}
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Success Rate</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {data?.stats.successRate || 0}%
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Avg Duration</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {data?.stats.avgDurationMs ? formatDuration(data.stats.avgDurationMs) : "N/A"}
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: "#3b82f6" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Active</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {(data?.stats.running || 0) + (data?.stats.pending || 0)}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "active", "completed", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
            style={{
              backgroundColor: filter === f ? "var(--accent)" : "var(--card)",
              color: filter === f ? "var(--text-primary)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {f}
            {f === "active" && data && (
              <span className="ml-2 opacity-70">
                ({data.stats.running + data.stats.pending})
              </span>
            )}
            {f === "completed" && data && (
              <span className="ml-2 opacity-70">({data.stats.completed})</span>
            )}
            {f === "failed" && data && (
              <span className="ml-2 opacity-70">({data.stats.failed})</span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: "var(--border)" }}
        />

        <div className="space-y-4">
          {filteredHandoffs?.map((handoff, index) => {
            const config = STATUS_CONFIG[handoff.status];
            const StatusIcon = config.icon;
            const fromEmoji = AGENT_EMOJIS[handoff.from.toLowerCase()] || "🤖";
            const toEmoji = AGENT_EMOJIS[handoff.to.toLowerCase()] || "🤖";

            return (
              <div key={handoff.id} className="relative pl-12 md:pl-20">
                {/* Status dot */}
                <div
                  className="absolute left-2 md:left-6 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: config.bgColor, top: "1.5rem" }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                </div>

                {/* Card */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Header: From → To */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                      style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-primary)" }}
                    >
                      {fromEmoji} {handoff.from}
                    </span>
                    <ArrowRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                      style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-primary)" }}
                    >
                      {toEmoji} {handoff.to}
                    </span>
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: config.bgColor,
                        color: config.color,
                      }}
                    >
                      <StatusIcon
                        className={`w-3 h-3 ${handoff.status === "running" ? "animate-spin" : ""}`}
                      />
                      {handoff.status}
                    </span>
                  </div>

                  {/* Task */}
                  <p className="mb-3" style={{ color: "var(--text-primary)" }}>
                    {handoff.task}
                  </p>

                  {/* Footer: Time and Duration */}
                  <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Started: {new Date(handoff.startedAt).toLocaleString()}
                    </div>
                    {handoff.durationMs && (
                      <div className="flex items-center gap-1">
                        Duration: {formatDuration(handoff.durationMs)}
                      </div>
                    )}
                    {handoff.model && (
                      <div className="flex items-center gap-1">
                        Model: {handoff.model}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredHandoffs?.length === 0 && (
            <div
              className="text-center py-12 rounded-xl"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No handoffs match the selected filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
