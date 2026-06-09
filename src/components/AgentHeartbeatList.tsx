"use client";

import {
  Heart,
  Clock,
  Target,
  Save,
  Loader2,
  Settings,
  User,
} from "lucide-react";

import type { AgentHeartbeat } from "@/hooks/useHeartbeat";

interface AgentHeartbeatListProps {
  agents: AgentHeartbeat[];
  selectedAgentId: string | null;
  editingConfigAgent: string | null;
  editForm: { every: string; target: string };
  isSavingAgent: string | null;
  onSelectAgent: (id: string) => void;
  onStartEditConfig: (agent: AgentHeartbeat) => void;
  onCancelEditConfig: () => void;
  onSaveAgentConfig: (agentId: string) => void;
  onEditFormChange: (form: { every: string; target: string }) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export function AgentHeartbeatList({
  agents,
  selectedAgentId,
  editingConfigAgent,
  editForm,
  isSavingAgent,
  onSelectAgent,
  onStartEditConfig,
  onCancelEditConfig,
  onSaveAgentConfig,
  onEditFormChange,
  t,
}: AgentHeartbeatListProps) {
  if (agents.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        padding: "1.25rem",
      }}
    >
      <h3
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          color: "var(--text-primary)",
          fontFamily: "var(--font-heading)",
        }}
      >
        <Heart className="w-5 h-5" style={{ color: "var(--error)" }} />
        {t("heartbeat.agentHeartbeatsTitle")}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {agents.map((agent) => (
          <div
            key={agent.agentId}
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: selectedAgentId === agent.agentId ? "var(--accent)" : "var(--card-elevated)",
              borderRadius: "0.5rem",
              border: selectedAgentId === agent.agentId ? "2px solid var(--accent)" : editingConfigAgent === agent.agentId ? "2px solid var(--info)" : "1px solid var(--border)",
              cursor: "pointer",
            }}
            onClick={() => onSelectAgent(agent.agentId)}
          >
            {editingConfigAgent === agent.agentId ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: agent.enabled ? "var(--success)" : "var(--text-muted)",
                    }}
                  />
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    {agent.identity?.name || agent.agentName}
                  </span>
                  {agent.identity?.role && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {agent.identity.role}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {t("heartbeat.interval")}
                    </label>
                    <select
                      value={editForm.every}
                      onChange={(e) => onEditFormChange({ ...editForm, every: e.target.value })}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "0.375rem",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="1m">1m</option>
                      <option value="5m">5m</option>
                      <option value="15m">15m</option>
                      <option value="30m">30m</option>
                      <option value="1h">1h</option>
                      <option value="2h">2h</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {t("heartbeat.target")}
                    </label>
                    <select
                      value={editForm.target}
                      onChange={(e) => onEditFormChange({ ...editForm, target: e.target.value })}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "0.375rem",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="none">none</option>
                      <option value="last">last</option>
                      <option value="all">all</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={onCancelEditConfig}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={() => onSaveAgentConfig(agent.agentId)}
                    disabled={isSavingAgent === agent.agentId}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      backgroundColor: "var(--success)",
                      color: "#000",
                      cursor: isSavingAgent === agent.agentId ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      opacity: isSavingAgent === agent.agentId ? 0.7 : 1,
                    }}
                  >
                    {isSavingAgent === agent.agentId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {t("common.save")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: agent.enabled ? "var(--success)" : "var(--text-muted)",
                    }}
                  />
                  {agent.identity?.avatar ? (
                    <img
                      src={agent.identity.avatar}
                      alt={agent.identity.name}
                      style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: selectedAgentId === agent.agentId ? "rgba(0,0,0,0.2)" : "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: selectedAgentId === agent.agentId ? "#000" : "#000",
                      }}
                    >
                      {(agent.identity?.name || agent.agentName).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: selectedAgentId === agent.agentId ? "#000" : "var(--text-primary)", fontWeight: 500, lineHeight: 1.2 }}>
                      {agent.identity?.name || agent.agentName}
                    </span>
                    {agent.identity?.role && (
                      <span style={{ color: selectedAgentId === agent.agentId ? "rgba(0,0,0,0.6)" : "var(--text-muted)", fontSize: "0.7rem", lineHeight: 1.2 }}>
                        {agent.identity.role}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: selectedAgentId === agent.agentId ? "#000" : "var(--info)" }} />
                    <span style={{ color: selectedAgentId === agent.agentId ? "#000" : "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {t("heartbeat.every", { interval: agent.every })}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Target className="w-3.5 h-3.5" style={{ color: selectedAgentId === agent.agentId ? "#000" : "var(--accent)" }} />
                    <span style={{ color: selectedAgentId === agent.agentId ? "#000" : "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {agent.target}
                    </span>
                  </div>
                  {agent.activeHours && (
                    <span style={{ color: selectedAgentId === agent.agentId ? "#000" : "var(--text-muted)", fontSize: "0.75rem" }}>
                      {agent.activeHours.start} - {agent.activeHours.end}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditConfig(agent);
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {t("common.edit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
