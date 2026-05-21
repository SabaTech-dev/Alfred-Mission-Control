"use client";

import {
  Bot,
  Wrench,
  Cpu,
  Activity,
  Search,
} from "lucide-react";
import {
  SKILL_SOURCE_COLORS,
  SKILL_SOURCE_LABELS,
  type InventoryData,
} from "@/lib/catalog-types";
import { AgentCard } from "./AgentCard";

interface InventoryTabProps {
  inventory: InventoryData;
  skillSearch: string;
  onSkillSearchChange: (value: string) => void;
}

export function InventoryTab({ inventory, skillSearch, onSkillSearchChange }: InventoryTabProps) {
  return (
    <div>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Agentes", value: inventory.agents.length, icon: Bot, color: "#8b5cf6" },
          { label: "Skills", value: inventory.skills.total, icon: Wrench, color: "#3b82f6" },
          { label: "Modelos", value: inventory.models.available.length, icon: Cpu, color: "#10b981" },
          { label: "MCPs", value: inventory.mcps.length, icon: Activity, color: "#f59e0b" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <kpi.icon style={{ width: "16px", height: "16px", color: kpi.color }} />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Agents Section ─── */}
      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Bot style={{ width: "20px", height: "20px", color: "#8b5cf6" }} />
        Agentes ({inventory.agents.length})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
        {inventory.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
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
