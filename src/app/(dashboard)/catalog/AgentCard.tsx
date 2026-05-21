"use client";

import type { AgentInfo } from "@/lib/catalog-types";
import { getAgentCategory } from "@/lib/catalog-types";

interface AgentCardProps {
  agent: AgentInfo;
}

export function AgentCard({ agent }: AgentCardProps) {
  const cat = getAgentCategory(agent.name);

  return (
    <div
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              backgroundColor: "#8b5cf620",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            🤖
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                {agent.name}
              </span>
              {agent.isDefault && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "8px",
                    backgroundColor: "#f59e0b20",
                    color: "#f59e0b",
                    fontWeight: 600,
                  }}
                >
                  DEFAULT
                </span>
              )}
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  backgroundColor: "#10b98120",
                  color: "#10b981",
                }}
              >
                {cat}
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {agent.id}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
            {agent.model.primary}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {agent.model.fallbacks.length} fallbacks
          </div>
        </div>
      </div>
      {agent.heartbeatEvery && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
          💓 Heartbeat: {agent.heartbeatEvery}
        </div>
      )}
      {/* Model fallback chain */}
      {agent.model.fallbacks.length > 0 && (
        <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>Chain:</span>
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
      )}
    </div>
  );
}
