"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bot,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

interface StandupReport {
  date: string;
  generatedAt: string;
  summary: {
    totalActivities: number;
    successRate: number;
    topActivityTypes: { type: string; count: number }[];
  };
  yesterday: { title: string; items: string[]; count: number };
  today: { title: string; items: string[]; count: number };
  blockers: { title: string; items: string[]; count: number };
  tasksByAgent: {
    agent: string;
    total: number;
    done: number;
    inProgress: number;
    todo: number;
  }[];
  error?: string;
}

function Section({
  title,
  icon,
  items,
  count,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  count: number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold" style={{ color }}>
          {title}
        </h3>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
        >
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No activity recorded
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="text-xs flex items-start gap-2"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="break-all">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export default function StandupPage() {
  const [report, setReport] = useState<StandupReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/standup");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <AlertTriangle className="w-8 h-8" style={{ color: "var(--danger)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {error || "No data available"}
        </p>
        <button
          onClick={fetchReport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ backgroundColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sun className="w-6 h-6" style={{ color: "#f59e0b" }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Daily Standup
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {report.date} · Generated at{" "}
              {new Date(report.generatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={fetchReport}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <TrendingUp className="w-5 h-5 mx-auto mb-1" style={{ color: "#3b82f6" }} />
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {report.summary.totalActivities}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Total Activities</div>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <CheckCircle className="w-5 h-5 mx-auto mb-1" style={{ color: "#10b981" }} />
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {report.summary.successRate}%
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Success Rate</div>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <AlertTriangle className="w-5 h-5 mx-auto mb-1" style={{ color: "#ef4444" }} />
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {report.blockers.count}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Blockers</div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section
          title={report.yesterday.title}
          icon={<Clock className="w-4 h-4" style={{ color: "#8b5cf6" }} />}
          items={report.yesterday.items}
          count={report.yesterday.count}
          color="#8b5cf6"
        />
        <Section
          title={report.today.title}
          icon={<Sun className="w-4 h-4" style={{ color: "#f59e0b" }} />}
          items={report.today.items}
          count={report.today.count}
          color="#f59e0b"
        />
      </div>

      {/* Blockers */}
      {report.blockers.items.length > 0 && (
        <Section
          title={report.blockers.title}
          icon={<AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />}
          items={report.blockers.items}
          count={report.blockers.count}
          color="#ef4444"
        />
      )}

      {/* Tasks by Agent */}
      {report.tasksByAgent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4" style={{ color: "#06b6d4" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#06b6d4" }}>
              Tasks by Agent
            </h3>
          </div>
          <div className="space-y-2">
            {report.tasksByAgent.map((agent) => (
              <div key={agent.agent} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate" style={{ color: "var(--text-secondary)" }}>
                  {agent.agent}
                </span>
                <div className="flex-1 flex items-center gap-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                  {agent.done > 0 && (
                    <div className="h-full rounded-l-full" style={{ width: `${(agent.done / agent.total) * 100}%`, backgroundColor: "#10b981" }} />
                  )}
                  {agent.inProgress > 0 && (
                    <div className="h-full" style={{ width: `${(agent.inProgress / agent.total) * 100}%`, backgroundColor: "#3b82f6" }} />
                  )}
                  {agent.todo > 0 && (
                    <div className="h-full" style={{ width: `${(agent.todo / agent.total) * 100}%`, backgroundColor: "#6b7280" }} />
                  )}
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {agent.total}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10b981" }} /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3b82f6" }} /> In Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#6b7280" }} /> Todo
            </span>
          </div>
        </motion.div>
      )}

      {/* Top Activity Types */}
      {report.summary.topActivityTypes.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            Top Activity Types
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.summary.topActivityTypes.map((t) => (
              <span
                key={t.type}
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                {t.type} ({t.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
