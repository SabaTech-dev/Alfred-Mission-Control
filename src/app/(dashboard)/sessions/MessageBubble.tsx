"use client";

import { Wrench } from "lucide-react";
import { SessionMessage } from "@/operations/sessions-list-ops";

interface MessageBubbleProps {
  msg: SessionMessage;
}

export function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.type === "user";
  const isTool = msg.type === "tool_use";
  const isResult = msg.type === "tool_result";

  if (isTool) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          backgroundColor: "rgba(96,165,250,0.08)",
          border: "1px solid rgba(96,165,250,0.2)",
          marginBottom: "0.5rem",
          fontSize: "0.78rem",
          fontFamily: "monospace",
        }}
      >
        <Wrench style={{ width: "13px", height: "13px", color: "#60a5fa", flexShrink: 0, marginTop: "2px" }} />
        <span style={{ color: "#60a5fa", fontWeight: 600, flexShrink: 0 }}>{msg.toolName}</span>
        <span style={{ color: "var(--text-muted)", wordBreak: "break-all" }}>
          {msg.content.replace(`${msg.toolName}(`, "").replace(/\)$/, "").slice(0, 200)}
        </span>
      </div>
    );
  }

  if (isResult) {
    return (
      <div
        style={{
          padding: "0.375rem 0.75rem",
          borderRadius: "0.375rem",
          backgroundColor: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.15)",
          marginBottom: "0.5rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          fontFamily: "monospace",
          maxHeight: "3rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        ↳ {msg.content}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "0.625rem",
        marginBottom: "0.75rem",
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "12px",
          backgroundColor: isUser ? "var(--accent)" : "var(--card-elevated)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "11px",
        }}
      >
        {isUser ? (
          <span style={{ width: "12px", height: "12px", color: "var(--bg, #000)" }}>👤</span>
        ) : (
          <span style={{ width: "12px", height: "12px", color: "var(--accent)" }}>🤖</span>
        )}
      </div>

      <div
        style={{
          maxWidth: "78%",
          padding: "0.5rem 0.75rem",
          borderRadius: isUser ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
          backgroundColor: isUser ? "rgba(255,59,48,0.12)" : "var(--card-elevated)",
          border: `1px solid ${isUser ? "rgba(255,59,48,0.2)" : "var(--border)"}`,
          fontSize: "0.82rem",
          lineHeight: "1.5",
          color: "var(--text-primary)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content.length > 800 ? msg.content.slice(0, 800) + "\n…(truncated)" : msg.content}
      </div>
    </div>
  );
}