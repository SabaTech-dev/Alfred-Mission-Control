"use client";

import { useState, useCallback } from "react";
import {
  Zap, Play, RefreshCw, Loader2, CheckCircle2, XCircle,
  GitBranch, Trash2, BarChart3, Heart, ShieldCheck, Terminal,
  Clock, AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";

interface ActionResult {
  action: string;
  status: "success" | "error";
  output: string;
  duration_ms: number;
  timestamp: string;
}

interface ActionDef {
  id: string;
  label: string;
  description: string;
  icon: typeof Zap;
  color: string;
  category: "system" | "agents" | "infra";
  confirmMessage?: string;
}

const ACTIONS: ActionDef[] = [
  {
    id: "heartbeat",
    label: "System Heartbeat",
    description: "Run full stack health check — OpenClaw, Hindsight, GPU, DBs, services",
    icon: Heart,
    color: "#32D74B",
    category: "infra",
  },
  {
    id: "usage-stats",
    label: "Usage Stats",
    description: "Workspace size, disk, memory, CPU, uptime",
    icon: BarChart3,
    color: "#0A84FF",
    category: "infra",
  },
  {
    id: "git-status",
    label: "Git Status",
    description: "Check git status of all repos in workspace",
    icon: GitBranch,
    color: "#FF9F0A",
    category: "system",
  },
  {
    id: "clear-temp",
    label: "Clear Temp Files",
    description: "Clean temp files, old logs, and bak files from workspace",
    icon: Trash2,
    color: "#FF453A",
    category: "system",
    confirmMessage: "Delete temp files, old logs, and .bak files?",
  },
  {
    id: "restart-gateway",
    label: "Restart Gateway",
    description: "Restart OpenClaw gateway service",
    icon: RefreshCw,
    color: "#FF3B30",
    category: "infra",
    confirmMessage: "Restart OpenClaw gateway? This will briefly interrupt all agents.",
  },
  {
    id: "npm-audit",
    label: "NPM Audit",
    description: "Run npm audit on Alfred-Mission-Control for security vulnerabilities",
    icon: ShieldCheck,
    color: "#BF5AF2",
    category: "system",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  system: "System",
  agents: "Agents",
  infra: "Infrastructure",
};

export default function ActionsClient() {
  const { t } = useI18n();
  const { showSuccess, showError, showInfo } = useToast();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [confirmAction, setConfirmAction] = useState<ActionDef | null>(null);

  const runAction = useCallback(async (actionDef: ActionDef) => {
    setRunning(actionDef.id);
    try {
      const res = await authFetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionDef.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ActionResult = await res.json();
      setResults((prev) => ({ ...prev, [actionDef.id]: data }));
      if (data.status === "success") {
        showSuccess(`Action "${actionDef.label}" completed (${data.duration_ms}ms)`);
      } else {
        showError(`Action "${actionDef.label}" failed: ${data.output.slice(0, 100)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(`Action "${actionDef.label}" error: ${msg}`);
      setResults((prev) => ({
        ...prev,
        [actionDef.id]: {
          action: actionDef.id,
          status: "error",
          output: msg,
          duration_ms: 0,
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setRunning(null);
    }
  }, [showSuccess, showError]);

  const handleClick = useCallback((actionDef: ActionDef) => {
    if (actionDef.confirmMessage) {
      setConfirmAction(actionDef);
    } else {
      runAction(actionDef);
    }
  }, [runAction]);

  const handleConfirm = useCallback(() => {
    if (confirmAction) {
      runAction(confirmAction);
      setConfirmAction(null);
    }
  }, [confirmAction, runAction]);

  const categories = ["infra", "system", "agents"];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold mb-1"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
        >
          {t("actions.title") || "Quick Actions"}
        </h1>
        <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
          {t("actions.subtitle") || "Run system commands, check health, and manage infrastructure"}
        </p>
      </div>

      {/* Confirm Dialog */}
      {confirmAction && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }}>
          <div style={{
            backgroundColor: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "2rem", maxWidth: "420px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <AlertTriangle size={24} style={{ color: "var(--warning)" }} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Confirm Action
              </h3>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              {confirmAction.confirmMessage}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)", backgroundColor: "transparent",
                  color: "var(--text-primary)", cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "var(--radius-sm)",
                  border: "none", backgroundColor: "var(--error)",
                  color: "#fff", cursor: "pointer", fontWeight: 600,
                }}
              >
                Run Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.map((cat) => {
        const actions = ACTIONS.filter((a) => a.category === cat);
        if (actions.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((action) => {
                const isRunning = running === action.id;
                const result = results[action.id];
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    style={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      padding: "1.25rem",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = action.color;
                      e.currentTarget.style.boxShadow = `0 0 20px ${action.color}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "0.75rem" }}>
                      <div style={{
                        padding: "0.625rem",
                        backgroundColor: `${action.color}15`,
                        borderRadius: "var(--radius-sm)",
                        flexShrink: 0,
                      }}>
                        <Icon size={20} style={{ color: action.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: "0.9375rem", fontWeight: 600,
                          color: "var(--text-primary)", marginBottom: "0.25rem",
                        }}>
                          {action.label}
                        </h3>
                        <p style={{
                          fontSize: "0.8125rem", color: "var(--text-secondary)",
                          lineHeight: 1.4, margin: 0,
                        }}>
                          {action.description}
                        </p>
                      </div>
                    </div>

                    {/* Result indicator */}
                    {result && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.375rem",
                        marginBottom: "0.625rem", padding: "0.375rem 0.625rem",
                        backgroundColor: result.status === "success" ? "var(--success-bg)" : "var(--error-bg)",
                        borderRadius: "var(--radius-sm)",
                      }}>
                        {result.status === "success" ? (
                          <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                        ) : (
                          <XCircle size={14} style={{ color: "var(--error)" }} />
                        )}
                        <span style={{
                          fontSize: "0.75rem",
                          color: result.status === "success" ? "var(--success)" : "var(--error)",
                        }}>
                          {result.status === "success" ? "Completed" : "Failed"} · {result.duration_ms}ms
                        </span>
                      </div>
                    )}

                    {/* Run button */}
                    <button
                      onClick={() => handleClick(action)}
                      disabled={isRunning}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        width: "100%", padding: "0.5rem 0.875rem",
                        backgroundColor: isRunning ? "var(--card-elevated)" : `${action.color}15`,
                        color: action.color,
                        border: `1px solid ${action.color}30`,
                        borderRadius: "var(--radius-sm)",
                        cursor: isRunning ? "not-allowed" : "pointer",
                        fontSize: "0.8125rem", fontWeight: 600,
                        opacity: isRunning ? 0.7 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {isRunning ? (
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Play size={14} />
                      )}
                      {isRunning ? "Running..." : "Run"}
                    </button>

                    {/* Output preview */}
                    {result && result.output && (
                      <details style={{ marginTop: "0.625rem" }}>
                        <summary style={{
                          fontSize: "0.75rem", color: "var(--text-muted)",
                          cursor: "pointer", userSelect: "none",
                        }}>
                          View output
                        </summary>
                        <pre style={{
                          marginTop: "0.375rem", padding: "0.625rem",
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem", color: "var(--text-secondary)",
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                          maxHeight: "200px", overflow: "auto",
                          fontFamily: "var(--font-mono)",
                          lineHeight: 1.5,
                        }}>
                          {result.output}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
