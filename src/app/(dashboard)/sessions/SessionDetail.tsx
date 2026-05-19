"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Clock, Bot, AlertTriangle } from "lucide-react";
import type { SessionListItem, SessionMessage } from "@/operations/sessions-list-ops";

interface SessionDetailProps {
  session: SessionListItem;
  onClose: () => void;
}

export function SessionDetail({ session, onClose }: SessionDetailProps) {
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
        <SessionDetailHeader
          session={session}
          userCount={userCount}
          assistantCount={assistantCount}
          toolCount={toolCount}
          onClose={onClose}
        />
        <MessagesList
          loading={loading}
          error={error}
          messages={messages}
        />
      </div>
    </div>
  );
}

interface SessionDetailHeaderProps {
  session: SessionListItem;
  userCount: number;
  assistantCount: number;
  toolCount: number;
  onClose: () => void;
}

function SessionDetailHeader({
  session,
  userCount,
  assistantCount,
  toolCount,
  onClose,
}: SessionDetailHeaderProps) {
  return (
    <>
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <SessionHeaderInfo session={session} onClose={onClose} />
        <SessionMetadata session={session} />
      </div>

      {userCount + assistantCount + toolCount > 0 && (
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
          <MessageStat label={`${userCount} user`} />
          <MessageStat label={`${assistantCount} assistant`} />
          <MessageStat label={`${toolCount} tool calls`} />
        </div>
      )}
    </>
  );
}

function SessionHeaderInfo({ session, onClose }: { session: SessionListItem; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "1.25rem" }}>{session.typeEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SessionBadges session={session} />
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
  );
}

function SessionBadges({ session }: { session: SessionListItem }) {
  return (
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
  );
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

function MessageStat({ label }: { label: string }) {
  return <span style={{ fontSize: "0.72rem", color: "var(--accent)" }}>{label}</span>;
}

function SessionMetadata({ session }: { session: SessionListItem }) {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <MetadataItem icon={Cpu} label={shortModel(session.model)} color="#a78bfa" />
      <MetadataItem icon={Hash} label={`${formatTokens(session.totalTokens)} tokens`} color="var(--accent)" />
      <MetadataItem
        icon={TrendingUp}
        label={
          session.contextUsedPercent !== null
            ? `${session.contextUsedPercent}% ctx`
            : "ctx n/a"
        }
        color={
          session.contextUsedPercent !== null && session.contextUsedPercent > 80
            ? "var(--error)"
            : "var(--text-muted)"
        }
      />
      <MetadataItem
        icon={Clock}
        label={formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
        color="var(--text-muted)"
      />
    </div>
  );
}

import { Cpu, TrendingUp, Hash, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MetadataItemProps {
  icon: React.ElementType;
  label: string;
  color: string;
}

function MetadataItem({ icon: Icon, label, color }: MetadataItemProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
      <Icon size={12} style={{ color }} />
      <span style={{ fontSize: "0.75rem", color }}>{label}</span>
    </div>
  );
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

interface MessagesListProps {
  loading: boolean;
  error: string | null;
  messages: SessionMessage[];
}

function MessagesList({ loading, error, messages }: MessagesListProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1rem 1.25rem",
      }}
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && messages.length === 0 && <EmptyState />}
      {!loading && messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
    </div>
  );
}

function LoadingSpinner() {
  return (
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
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

function EmptyState() {
  return (
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
  );
}

interface MessageBubbleProps {
  msg: SessionMessage;
}

function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.type === "user";
  const isTool = msg.type === "tool_use";
  const isResult = msg.type === "tool_result";

  if (isTool) {
    return <ToolMessage msg={msg} />;
  }

  if (isResult) {
    return <ToolResult msg={msg} />;
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
      <MessageAvatar isUser={isUser} />
      <MessageContent msg={msg} isUser={isUser} />
    </div>
  );
}

function MessageAvatar({ isUser }: { isUser: boolean }) {
  return (
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
        <User style={{ width: "12px", height: "12px", color: "var(--bg, #000)" }} />
      ) : (
        <Bot style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
      )}
    </div>
  );
}

function MessageContent({ msg, isUser }: { msg: SessionMessage; isUser: boolean }) {
  return (
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
  );
}

function ToolMessage({ msg }: { msg: SessionMessage }) {
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

function ToolResult({ msg }: { msg: SessionMessage }) {
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