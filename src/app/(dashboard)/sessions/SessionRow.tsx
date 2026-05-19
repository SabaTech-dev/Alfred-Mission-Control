"use client";

import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ModelDropdown } from "@/components/ModelDropdown";
import type { SessionListItem } from "@/operations/sessions-list-ops";
import { formatTokens, shortModel, typeColor } from "./utils";

interface SessionRowProps {
  session: SessionListItem;
  onClick: () => void;
  onModelChanged?: (sessionId: string, newModel: string) => void;
}

export function SessionRow({ session, onClick, onModelChanged }: SessionRowProps) {
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
      <SessionIcon color={color} emoji={session.typeEmoji} />

      <SessionInfo session={session} color={color} />

      {onModelChanged && (
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
      )}

      <TokenSection session={session} contextBar={contextBar} />

      <TimeSection session={session} />

      <ChevronRight style={{ width: "14px", height: "14px", color: "var(--text-muted)", flexShrink: 0 }} />
    </div>
  );
}

interface SessionIconProps {
  color: string;
  emoji: string;
}

function SessionIcon({ color, emoji }: SessionIconProps) {
  return (
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
      {emoji}
    </div>
  );
}

interface SessionInfoProps {
  session: SessionListItem;
  color: string;
}

function SessionInfo({ session, color }: SessionInfoProps) {
  return (
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
  );
}

interface TokenSectionProps {
  session: SessionListItem;
  contextBar: number | null;
}

function TokenSection({ session, contextBar }: TokenSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100px" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {formatTokens(session.totalTokens)}
      </span>
      {contextBar !== null && <ContextBar value={contextBar} />}
      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
        {contextBar !== null ? `${contextBar}% ctx` : ""}
      </span>
    </div>
  );
}

interface ContextBarProps {
  value: number;
}

function ContextBar({ value }: ContextBarProps) {
  const barColor = value > 80 ? "var(--error)" : value > 60 ? "var(--warning)" : "var(--success)";

  return (
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
          width: `${value}%`,
          height: "100%",
          borderRadius: "2px",
          backgroundColor: barColor,
        }}
      />
    </div>
  );
}

interface TimeSectionProps {
  session: SessionListItem;
}

function TimeSection({ session }: TimeSectionProps) {
  return (
    <div style={{ minWidth: "80px", textAlign: "right" }}>
      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
      </span>
    </div>
  );
}