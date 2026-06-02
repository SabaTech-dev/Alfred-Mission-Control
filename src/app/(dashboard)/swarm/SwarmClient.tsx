"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Bug,
  Clock,
  User,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

// --- Types ---

interface SwarmTask {
  id: string;
  task: string;
  status: string;
  agentId: string;
  createdAt: string;
  lastUpdatedAt?: string;
  priority?: number;
  tags?: string[];
  source?: string;
  dependsOn?: string[];
}

interface SwarmAgent {
  id: string;
  name: string;
  status: string;
}

type ApiStatus = "online" | "offline" | "loading" | "error";

// Use AMC proxy routes (works in both dev and prod)
const SWARM_PROXY = "/api/swarm";

function getHeaders(): RequestInit {
  return {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
}

// --- Status Badge ---

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    done: { bg: "rgba(16, 185, 129, 0.15)", text: "var(--success)" },
    completed: { bg: "rgba(16, 185, 129, 0.15)", text: "var(--success)" },
    in_progress: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
    running: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
    pending: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
    error: { bg: "rgba(239, 68, 68, 0.15)", text: "var(--error)" },
    failed: { bg: "rgba(239, 68, 68, 0.15)", text: "var(--error)" },
  };

  const c = colors[status.toLowerCase()] || { bg: "rgba(107, 114, 128, 0.15)", text: "var(--text-muted)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.text,
        textTransform: "uppercase" as const,
        letterSpacing: "0.03em",
      }}
    >
      {status.toLowerCase() === "done" || status.toLowerCase() === "completed" ? (
        <CheckCircle2 style={{ width: "12px", height: "12px" }} />
      ) : status.toLowerCase() === "in_progress" || status.toLowerCase() === "running" ? (
        <Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" />
      ) : (
        <Circle style={{ width: "12px", height: "12px" }} />
      )}
      {status}
    </span>
  );
}

// --- API Status Indicator ---

function ApiStatusIndicator({ status }: { status: ApiStatus }) {
  const { t } = useI18n();

  const config: Record<ApiStatus, { icon: typeof Wifi; color: string; label: string }> = {
    online: { icon: Wifi, color: "var(--success)", label: t("swarm.status.online") },
    offline: { icon: WifiOff, color: "var(--text-muted)", label: t("swarm.status.offline") },
    loading: { icon: Loader2, color: "var(--accent)", label: t("common.loading") },
    error: { icon: AlertTriangle, color: "var(--error)", label: t("swarm.status.error") },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: `${color}15`,
        color,
      }}
    >
      <Icon
        style={{ width: "14px", height: "14px" }}
        className={status === "loading" ? "animate-spin" : ""}
      />
      {label}
    </span>
  );
}

// --- Create Task Modal ---

function CreateTaskModal({
  agents,
  onClose,
  onSubmit,
}: {
  agents: SwarmAgent[];
  onClose: () => void;
  onSubmit: (task: string, agentId: string) => void;
}) {
  const { t } = useI18n();
  const [taskText, setTaskText] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    setSubmitting(true);
    await onSubmit(taskText.trim(), agentId);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "480px",
          margin: "16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        >
          {t("swarm.createTask.title")}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              {t("swarm.createTask.taskLabel")}
            </label>
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder={t("swarm.createTask.taskPlaceholder")}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "14px",
                outline: "none",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              {t("swarm.createTask.agentLabel")}
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "14px",
                outline: "none",
              }}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name || agent.id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !taskText.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--accent)",
                color: "#fff",
                cursor: submitting || !taskText.trim() ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: 600,
                opacity: submitting || !taskText.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? t("common.loading") : t("swarm.createTask.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Component ---

export function SwarmClient() {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();

  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [agents, setAgents] = useState<SwarmAgent[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const init = getHeaders();

      const [tasksRes, agentsRes] = await Promise.all([
        fetch(`${SWARM_PROXY}/tasks`, init),
        fetch(`${SWARM_PROXY}/agents`, init),
      ]);

      if (!tasksRes.ok || !agentsRes.ok) {
        if (tasksRes.status === 401 || agentsRes.status === 401) {
          setApiStatus("error");
          setErrorMessage(t("swarm.errors.unauthorized"));
          return;
        }
        throw new Error(`HTTP ${tasksRes.status}`);
      }

      const [tasksData, agentsData] = await Promise.all([
        tasksRes.json(),
        agentsRes.json(),
      ]);

      // Handle proxy response format {tasks, total, connected} and direct API format
      const tasksList = Array.isArray(tasksData)
        ? tasksData
        : tasksData.tasks || tasksData.data || [];
      const agentsList = Array.isArray(agentsData)
        ? agentsData
        : agentsData.agents || agentsData.data || [];

      setTasks(tasksList);
      setAgents(agentsList);
      setApiStatus("online");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("ECONNREFUSED")) {
        setApiStatus("offline");
        setErrorMessage(t("swarm.errors.offline"));
      } else {
        setApiStatus("error");
        setErrorMessage(t("swarm.errors.generic", { error: message }));
      }
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds when online
    const interval = setInterval(() => {
      if (apiStatus === "online" || apiStatus === "offline") {
        fetchData();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData, apiStatus]);

  const handleCreateTask = async (task: string, agentId: string) => {
    try {
      const res = await fetch(`${SWARM_PROXY}/tasks`, {
        ...getHeaders(),
        method: "POST",
        body: JSON.stringify({ task, agentId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showSuccess(t("swarm.createTask.success"));
      setShowCreateModal(false);
      await fetchData();
    } catch {
      showError(t("swarm.createTask.error"));
    }
  };

  const handleMarkDone = async (taskId: string) => {
    try {
      const res = await fetch(`${SWARM_PROXY}/tasks/${taskId}`, {
        ...getHeaders(),
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await fetchData();
    } catch {
      showError(t("swarm.createTask.error"));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (agentFilter !== "all" && t.agentId !== agentFilter) return false;
    return true;
  });

  // Unique statuses and agents for filter dropdowns
  const uniqueStatuses = [...new Set(tasks.map((t) => t.status))];

  return (
    <div>
      <PageHeader
        title={t("swarm.title")}
        subtitle={t("swarm.subtitle")}
        icon={<Bug style={{ width: "28px", height: "28px" }} />}
        helpTitle={t("help.swarm.title")}
        helpDescription={t("help.swarm.description")}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ApiStatusIndicator status={apiStatus} />
            <button
              onClick={fetchData}
              disabled={refreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-secondary)",
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: 500,
                transition: "all 150ms ease",
              }}
            >
              <RefreshCw
                style={{ width: "14px", height: "14px" }}
                className={refreshing ? "animate-spin" : ""}
              />
              {t("swarm.actions.refresh")}
            </button>
            {apiStatus === "online" && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "all 150ms ease",
                }}
              >
                <Plus style={{ width: "14px", height: "14px" }} />
                {t("swarm.actions.createTask")}
              </button>
            )}
          </div>
        }
      />

      {/* Error Banner */}
      {errorMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--error)",
            fontSize: "13px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          {errorMessage}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
        {/* Tasks Section */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Clock style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
              {t("swarm.tasks.title")}
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              {t("swarm.tasks.count", { count: tasks.length })}
            </span>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap" as const,
            }}
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
              }}
            >
              <option value="all">{t("swarm.filters.allStatuses")}</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
              }}
            >
              <option value="all">{t("swarm.filters.allAgents")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name || a.id}</option>
              ))}
            </select>
            {(statusFilter !== "all" || agentFilter !== "all") && (
              <button
                onClick={() => { setStatusFilter("all"); setAgentFilter("all"); }}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                {t("swarm.filters.clear")}
              </button>
            )}
          </div>

          {filteredTasks.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              {t("swarm.tasks.empty")}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>
                      {t("swarm.tasks.columns.task")}
                    </th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>
                      {t("swarm.tasks.columns.status")}
                    </th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>
                      {t("swarm.tasks.columns.agent")}
                    </th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>
                      {t("swarm.tasks.columns.created")}
                    </th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      style={{
                        borderTop: "1px solid var(--border)",
                        transition: "background-color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: "var(--text-primary)",
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.task}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <StatusBadge status={task.status} />
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {task.agentId || "—"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.createdAt ? formatDate(task.createdAt) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {task.status !== "done" && task.status !== "completed" && (
                          <button
                            onClick={() => handleMarkDone(task.id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              backgroundColor: "transparent",
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 500,
                              transition: "all 150ms ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--success)";
                              e.currentTarget.style.color = "var(--success)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border)";
                              e.currentTarget.style.color = "var(--text-secondary)";
                            }}
                          >
                            <CheckCircle2 style={{ width: "12px", height: "12px" }} />
                            {t("swarm.actions.markDone")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Agents Sidebar */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <User style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
              {t("swarm.agents.title")}
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              {t("swarm.agents.count", { count: agents.length })}
            </span>
          </div>

          {agents.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              {t("swarm.agents.empty")}
            </div>
          ) : (
            <div style={{ padding: "8px" }}>
              {agents.map((agent) => {
                const agentTasks = tasks.filter((task) => task.agentId === agent.id);
                const activeTasks = agentTasks.filter(
                  (task) => task.status !== "done" && task.status !== "completed"
                );

                return (
                  <div
                    key={agent.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      marginBottom: "4px",
                      transition: "background-color 150ms ease",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {agent.name || agent.id}
                      </span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        display: "flex",
                        gap: "12px",
                      }}
                    >
                      <span>
                        {activeTasks.length} active
                      </span>
                      <span>
                        {agentTasks.length} total
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && apiStatus === "online" && (
        <CreateTaskModal
          agents={agents}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </div>
  );
}
