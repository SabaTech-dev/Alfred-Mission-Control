"use client";

import {
  Bot,
  Wrench,
  Cpu,
  Activity,
  Search,
} from "lucide-react";

interface AgentInfo {
  name: string;
  id: string;
  agentDir: string;
  model: { primary: string; fallbacks: string[] };
  isDefault: boolean;
  status: "active" | "inactive";
  heartbeatEvery?: string;
}

interface SkillInfo {
  name: string;
  source: "system" | "workspace" | "plugin" | "agent";
  location: string;
  hasSKILL: boolean;
}

interface InventoryData {
  agents: AgentInfo[];
  skills: {
    system: SkillInfo[];
    workspace: SkillInfo[];
    plugin: SkillInfo[];
    total: number;
  };
  models: {
    available: { id: string; alias?: string }[];
    default: string;
  };
  mcps: { name: string; configured: boolean; source?: string }[];
  timestamp: string;
}

const SKILL_SOURCE_COLORS: Record<string, string> = {
  system: "#3b82f6",
  workspace: "#8b5cf6",
  plugin: "#f59e0b",
};

const SKILL_SOURCE_LABELS: Record<string, string> = {
  system: "Sistema",
  workspace: "Workspace",
  plugin: "Plugin",
};

function getAgentCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alfred") || n.includes("main") || n.includes("principal"))
    return "Orquestación";
  if (n.includes("coder") || n.includes("code"))
    return "Coding";
  if (n.includes("security")) return "Security";
  if (n.includes("research")) return "Research";
  if (n.includes("devops") || n.includes("infra")) return "DevOps";
  if (n.includes("qa") || n.includes("test")) return "Testing";
  if (n.includes("opencode")) return "Development";
  return "Otro";
}

interface InventoryTabProps {
  inventory: InventoryData;
  skillSearch: string;
  onSkillSearchChange: (value: string) => void;
}

export function InventoryTab({ inventory, skillSearch, onSkillSearchChange }: InventoryTabProps) {
  return (
    <div>
      {/* ─── Agents Section ─── */}
      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Bot style={{ width: "20px", height: "20px", color: "#8b5cf6" }} />
        Agents ({inventory.agents.length})
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "32px" }}>
        {inventory.agents.map((agent) => {
          const category = getAgentCategory(agent.name);
          return (
            <div
              key={agent.id}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-elevated)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {agent.name}
                  {agent.isDefault && (
                    <span style={{ marginLeft: "8px", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#3b82f620", color: "#3b82f6", fontWeight: 600 }}>
                      Default
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", backgroundColor: agent.status === "active" ? "#10b98120" : "#6b728020", color: agent.status === "active" ? "#10b981" : "#6b7280" }}>
                  {agent.status}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Category: {category}
              </div>
              {agent.heartbeatEvery && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  💓 Heartbeat: {agent.heartbeatEvery}
                </div>
              )}
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                <strong>Model:</strong>{" "}
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: "#8b5cf620",
                    color: "#8b5cf6",
                    fontWeight: 600,
                  }}
                >
                  {agent.model.primary}
                </span>
                {agent.model.fallbacks.slice(0, 3).map((fb, i) => (
                  <span key={i} style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    → {fb}
                  </span>
                ))}
                {agent.model.fallbacks.length > 3 && (
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    +{agent.model.fallbacks.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Skills Section ─── */}
      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Wrench style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
        Skills ({inventory.skills.total})
      </h2>
      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
          padding: "8px 14px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface-elevated)",
        }}
      >
        <Search style={{ width: "16px", height: "16px", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Buscar skills..."
          value={skillSearch}
          onChange={(e) => onSkillSearchChange(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            color: "var(--text-primary)",
            fontSize: "14px",
            width: "100%",
          }}
        />
      </div>
      {(["system", "workspace", "plugin"] as const).map((source) => {
        const skills = inventory.skills[source];
        const filtered = skillSearch
          ? skills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()))
          : skills;
        if (filtered.length === 0) return null;
        return (
          <div key={source} style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: SKILL_SOURCE_COLORS[source],
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: SKILL_SOURCE_COLORS[source],
                }}
              />
              {SKILL_SOURCE_LABELS[source]} ({filtered.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {filtered.map((skill) => (
                <span
                  key={skill.name}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-elevated)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {skill.hasSKILL ? "✓" : "○"} {skill.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* ─── Models Section ─── */}
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "16px",
          marginTop: "32px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Cpu style={{ width: "20px", height: "20px", color: "#10b981" }} />
        Modelos Disponibles ({inventory.models.available.length})
      </h2>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
        Default: <strong>{inventory.models.default}</strong>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "32px" }}>
        {inventory.models.available.map((m) => (
          <span
            key={m.id}
            style={{
              fontSize: "11px",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              backgroundColor: m.id === inventory.models.default ? "#10b98120" : "var(--surface-elevated)",
              color: m.id === inventory.models.default ? "#10b981" : "var(--text-secondary)",
              fontWeight: m.id === inventory.models.default ? 600 : 400,
            }}
            title={m.id}
          >
            {m.alias || m.id}
          </span>
        ))}
      </div>

      {/* ─── MCPs Section ─── */}
      {inventory.mcps.length > 0 && (
        <>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Activity style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
            MCPs / Integraciones ({inventory.mcps.length})
          </h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {inventory.mcps.map((mcp) => (
              <div
                key={mcp.name}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-elevated)",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>{mcp.name}</div>
                {mcp.source && (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{mcp.source}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "24px" }}>
        Inventario generado: {new Date(inventory.timestamp).toLocaleString("es-ES")}
      </div>
    </div>
  );
}

export type { InventoryData, AgentInfo, SkillInfo };
