"use client";

import { ChevronRight } from "lucide-react";
import { SessionListItem } from "@/operations/sessions-list-ops";
import { ModelDropdown } from "@/components/ModelDropdown";

interface SessionRowProps {
  session: SessionListItem;
  onClick: () => void;
  onModelChanged?: (sessionId: string, newModel: string) => void;
}

function typeColor(type: SessionListItem["type"]): string {
  switch (type) {
    case "main":
      return "var(--accent)";
    case "cron":
      return "#a78bfa";
    case "subagent":
      return "#60a5fa";
    case "direct":
      return "#4ade80";
    default:
      return "var(--text-muted)";
  }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function SessionRow({
  session,
  onClick,
  onModelChanged,
}: SessionRowProps) {
  const color = typeColor(session.type);
  const contextBar = session.contextUsedPercent !== null ? Math.min(session.contextUsedPercent, 100) : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        transition: "background-color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--card-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
        }}
      >
        {session.typeEmoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.1rem 0.4rem",
              borderRadius: "9999px",
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
              flexShrink: 0,
            }}
          >
            {session.typeLabel}
          </span>
          {session.aborted && (
            <span style={{ fontSize: "0.65rem", color: "var(--error)" }}>⚠ aborted</span>
          )}
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={session.key}
        >
          {session.key.replace("agent:main:", "")}
        </div>
      </div>

      <div
        style={{ display: "none", flexDirection: "column", alignItems: "flex-end", minWidth: "100px" }}
        className="sm-flex"
        onClick={(e) => e.stopPropagation()}
      >
        <ModelDropdown
          currentModel={session.model}
          sessionKey={session.key}
          onModelChanged={(newModel) => onModelChanged?.(session.id, newModel)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100px" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {formatTokens(session.totalTokens)}
        </span>
        {contextBar !== null && (
          <div
            style={{
              width: "64px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "var(--border)",
              marginTop: "0.25rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${contextBar}%`,
                height: "100%",
                borderRadius: "2px",
                backgroundColor:
                  contextBar > 80 ? "var(--error)" : contextBar > 60 ? "var(--warning)" : "var(--success)",
              }}
            />
          </div>
        )}
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
          {contextBar !== null ? `${contextBar}% ctx` : ""}
        </span>
      </div>

      <div style={{ minWidth: "80px", textAlign: "right" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {new Date(session.updatedAt).toLocaleString()}
        </span>
      </div>

      <ChevronRight style={{ width: "14px", height: "14px", color: "var(--text-muted)", flexShrink: 0 }} />
    </div>
  );
}