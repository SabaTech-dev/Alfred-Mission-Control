"use client";

import { getModelDisplayName } from "@/lib/model-utils";
import { DEPARTMENTS, type DepartmentId } from "@/lib/agent-auto-config";

export type AgentStatus = "working" | "idle" | "error" | "paused" | "online" | "offline";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  allowAgents: string[];
  allowAgentsDetails?: Array<{ id: string; name: string; emoji: string; color: string }>;
  status: AgentStatus;
  activeSessions: number;
  skills?: string[];
}

interface DepartmentCardProps {
  deptId: DepartmentId;
  agents: Agent[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}

export function DepartmentCard({ deptId, agents, hoveredId, setHoveredId }: DepartmentCardProps) {
  const dept = DEPARTMENTS[deptId];

  return (
    <div
      style={{
        backgroundColor: `${dept.color}08`,
        borderRadius: "16px",
        border: `2px solid ${dept.color}30`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          backgroundColor: `${dept.color}15`,
          borderBottom: `1px solid ${dept.color}20`,
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>{dept.emoji}</span>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {dept.name}
          </h3>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Agents List */}
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {agents.map((agent) => {
          const isHovered = hoveredId === agent.id;
          const isOnline = agent.status === "online";

          return (
            <div
              key={agent.id}
              onMouseEnter={() => setHoveredId(agent.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: "10px",
                backgroundColor: isHovered ? `${agent.color}12` : "var(--card)",
                border: `1px solid ${isHovered ? agent.color : "var(--border)"}`,
                transition: "all 0.2s",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{agent.emoji}</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {agent.name}
                </span>

                {/* Status */}
                <div
                  style={{
                    marginLeft: "auto",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isOnline ? "#4ade80" : "#6b7280",
                  }}
                />

                {/* Active sessions */}
                {agent.activeSessions > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "9px",
                      backgroundColor: "rgba(255,59,48,0.15)",
                      border: "1px solid var(--accent)",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "var(--accent)",
                      padding: "0 5px",
                    }}
                  >
                    {agent.activeSessions}
                  </div>
                )}
              </div>

              {/* Model */}
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  marginTop: "0.15rem",
                  marginLeft: "1.7rem",
                }}
              >
                {getModelDisplayName(agent.model)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
