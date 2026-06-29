"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Pin, PinOff, User } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { useToast } from "@/components/Toast";
import {
  loadPinnedIds,
  savePinnedIds,
  togglePin,
} from "@/lib/pinned-messages";

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
}

interface ChatMessageListProps {
  messages: MessageItem[];
  technicalMessages: MessageItem[];
  loading: boolean;
  sending: boolean;
  assistantDraft: string;
  listRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({
  messages,
  technicalMessages,
  loading,
  sending,
  assistantDraft,
  listRef,
}: ChatMessageListProps) {
  const { t, formatDateTime } = useI18n();
  const { showWarning } = useToast();
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedOpen, setPinnedOpen] = useState(true);

  // Load pinned ids from localStorage once on mount.
  useEffect(() => {
    setPinnedIds(loadPinnedIds());
  }, []);

  const pinnedMessages = messages.filter((m) => pinnedIds.includes(m.id));

  const handleTogglePin = (id: string) => {
    const isPinned = pinnedIds.includes(id);
    // When adding, enforce the cap with a warning (matches MAX_PINS in the lib).
    if (!isPinned && pinnedIds.length >= 10) {
      showWarning(t("chat.pinned.title"), t("chat.pinned.limitReached", { max: 10 }));
      return;
    }
    const next = togglePin(pinnedIds, id);
    setPinnedIds(next);
    savePinnedIds(next);
  };

  return (
    <div ref={listRef} className="h-[52vh] overflow-y-auto p-4">
      {loading ? (
        <div className="flex items-center gap-2 px-1 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("chat.loading")}
        </div>
      ) : (
        <>
          {/* Pinned messages — collapsible tray at the top */}
          {pinnedMessages.length > 0 ? (
            <details
              open={pinnedOpen}
              onToggle={(e) => setPinnedOpen((e.currentTarget as HTMLDetailsElement).open)}
              className="mb-3 rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--accent)",
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, var(--card))",
              }}
            >
              <summary
                className="flex cursor-pointer items-center gap-2 text-xs font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                <Pin className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                {t("chat.pinned.title")} ({pinnedMessages.length})
              </summary>
              <div className="mt-2 space-y-2">
                {pinnedMessages.map((message) => (
                  <div
                    key={`pinned-${message.id}`}
                    className="rounded-md border px-2.5 py-2 text-xs"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--card)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                        {message.role === "user" ? t("chat.you") : t("chat.assistant")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(message.id)}
                        className="rounded p-1 transition-all hover:bg-red-500/20"
                        style={{ color: "var(--text-muted)" }}
                        title={t("chat.pinned.unpin")}
                      >
                        <PinOff className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {messages.length === 0 ? (
            <div
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-muted)",
                backgroundColor: "var(--card-elevated)",
              }}
            >
              {t("chat.empty")}
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const isPinned = pinnedIds.includes(message.id);
            return (
              <div key={message.id} className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className="group max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed md:max-w-[80%]"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: isUser
                      ? "color-mix(in srgb, var(--accent) 22%, var(--card))"
                      : "var(--card-elevated)",
                    color: "var(--text-primary)",
                  }}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    {isUser ? t("chat.you") : t("chat.assistant")}
                    <span aria-hidden>•</span>
                    <time>{formatDateTime(message.timestamp)}</time>
                    <button
                      type="button"
                      onClick={() => handleTogglePin(message.id)}
                      className="ml-auto rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: isPinned ? "var(--accent)" : "var(--text-muted)" }}
                      title={isPinned ? t("chat.pinned.unpin") : t("chat.pinned.pin")}
                      aria-label={isPinned ? t("chat.pinned.unpin") : t("chat.pinned.pin")}
                    >
                      <Pin className="h-3 w-3" fill={isPinned ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
              </div>
            );
          })}

          {sending && !assistantDraft ? (
            <div className="mb-3 flex items-center gap-2 px-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("chat.assistantThinking")}
            </div>
          ) : null}

          {assistantDraft ? (
            <div className="mb-3 flex justify-start">
              <div
                className="max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed md:max-w-[80%]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card-elevated)",
                  color: "var(--text-primary)",
                }}
              >
                <div className="mb-1.5 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Bot className="h-3 w-3" />
                  {t("chat.assistant")} · {t("chat.streaming")}
                </div>
                <div className="whitespace-pre-wrap break-words">{assistantDraft}</div>
              </div>
            </div>
          ) : null}

          {technicalMessages.length > 0 ? (
            <details className="mt-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--card-elevated)" }}>
              <summary className="cursor-pointer text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {t("chat.technicalSummary", { count: technicalMessages.length })}
              </summary>
              <div className="mt-2 space-y-2">
                {technicalMessages.map((message) => (
                  <div key={`technical-${message.id}`} className="rounded-md border px-2.5 py-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "var(--card)" }}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                        {message.role === "system" ? t("chat.roles.system") : t("chat.roles.tool")}
                      </span>
                      <span aria-hidden>•</span>
                      <time>{formatDateTime(message.timestamp)}</time>
                    </div>
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
