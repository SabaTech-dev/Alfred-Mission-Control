"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Cpu, Hash, TrendingUp, Clock } from "lucide-react";
import { SessionListItem, SessionMessage } from "@/operations/sessions-list-ops";
import { MessageBubble } from "./MessageBubble";
import { AlertTriangle, MessageSquare } from "lucide-react";

interface SessionDetailProps {
  session: SessionListItem;
  onClose: () => void;
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

function shortModel(model: string): string {
  const m = model.replace("anthropic/", "").replace("claude-", "");
  const parts = m.split("-");
  if (parts.length >= 2) {
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const ver = parts.slice(1).join(".");
    return `${name} ${ver}`;
  }
  return model;
}

export function SessionDetail({
  session,
  onClose,
}: SessionDetailProps) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [fetchState, setFetchState] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const prevSessionIdRef = useRef<string | null>(null);

  const hasNoSession = !session.sessionId;

  useEffect(() => {
    if (!session.sessionId) {
      return;
    }

    if (prevSessionIdRef.current === session.sessionId) {
      return;
    }
    prevSessionIdRef.current = session.sessionId;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      setFetchState("loading");
      setErrorMessage(null);
    }, 0);

    fetch(`/api/sessions?id=${session.sessionId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
        if (data.error) {
          setFetchState("error");
          setErrorMessage(data.error);
        } else {
          setFetchState("success");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setFetchState("error");
          setErrorMessage("Failed to load messages");
        }
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [session.sessionId]);

  const loading = hasNoSession ? false : fetchState === "loading";
  const error = hasNoSession ? "No session file available" : errorMessage;

  const userCount = messages.filter((m) => m.type === "user").length;
  const assistantCount = messages.filter((m) => m.type === "assistant").length;
  const toolCount = messages.filter((m) => m.type === "tool_use").length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(640px, 100vw)",
          height: "100%",
          backgroundColor: "var(--card)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>{session.typeEmoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    backgroundColor: `color-mix(in srgb, ${typeColor(session.type)} 15%, transparent)`,
                    color: typeColor(session.type),
                  }}
                >
                  {session.typeLabel}
                </span>
                {session.aborted && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(239,68,68,0.15)",
                      color: "var(--error)",
                    }}
                  >
                    ⚠ Aborted
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  marginTop: "0.2rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session.key}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "0.375rem",
                borderRadius: "0.5rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { icon: Cpu, label: shortModel(session.model), color: "#a78bfa" },
              { icon: Hash, label: `${formatTokens(session.totalTokens)} tokens`, color: "var(--accent)" },
              {
                icon: TrendingUp,
                label: session.contextUsedPercent !== null ? `${session.contextUsedPercent}% ctx` : "ctx n/a",
                color:
                  session.contextUsedPercent !== null && session.contextUsedPercent > 80
                    ? "var(--error)"
                    : "var(--text-muted)",
              },
              {
                icon: Clock,
                label: formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true }),
                color: "var(--text-muted)",
              },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Icon style={{ width: "12px", height: "12px", color }} />
                <span style={{ fontSize: "0.75rem", color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {messages.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              padding: "0.5rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--card-elevated)",
              flexShrink: 0,
            }}
          >
            {[
              { label: `${userCount} user`, color: "var(--accent)" },
              { label: `${assistantCount} assistant`, color: "#60a5fa" },
              { label: `${toolCount} tool calls`, color: "#4ade80" },
            ].map(({ label, color }) => (
              <span key={label} style={{ fontSize: "0.72rem", color }}>
                {label}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 1.25rem",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                color: "var(--text-muted)",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid var(--accent)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Loading transcript...
            </div>
          )}

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "var(--error)",
                fontSize: "0.875rem",
              }}
            >
              <AlertTriangle style={{ width: "16px", height: "16px" }} />
              {error}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-muted)",
              }}
            >
              <MessageSquare style={{ width: "40px", height: "40px", margin: "0 auto 0.75rem", opacity: 0.3 }} />
              <p>No messages in this session</p>
            </div>
          )}

          {!loading && messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        </div>
      </div>
    </div>
  );
}