"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import { useToast } from "@/components/Toast";
import { ChatInputForm } from "@/components/ChatInputForm";
import { ChatMessageList, MessageItem } from "@/components/ChatMessageList";
import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";
import { getErrorMessage, mapGatewayScopeError, processChatStream } from "@/lib/chat-stream";

interface AgentOption {
  id: string;
  name: string;
}

interface SessionOption {
  key: string;
  label: string;
  updatedAt: number;
}

const TECHNICAL_METADATA_PATTERN = /sender\s*\(untrusted metadata\):/i;

function isTechnicalMessage(message: MessageItem): boolean {
  if (message.role === "system" || message.role === "tool") return true;
  return message.role !== "user" && TECHNICAL_METADATA_PATTERN.test(message.content);
}

interface ChatSnapshot {
  readOnly: boolean;
  gateway: { available: boolean; error: string | null };
  session: SessionOption | null;
  sessions: SessionOption[];
  messages: MessageItem[];
}

function formatSessionLabel(session: SessionOption): string {
  return `${session.label} (${new Date(session.updatedAt).toLocaleString()})`;
}

export function AgentChatPanel() {
  const { t } = useI18n();
  const { showError, showInfo } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentId, setAgentId] = useState("");
  const [sessionKey, setSessionKey] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [input, setInput] = useState("");
  const appliedUrlParamsRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await authFetch("/api/openclaw/agents");
        const data = (await response.json()) as { agents?: AgentOption[] };
        const nextAgents = data.agents ?? [];
        setAgents(nextAgents);
        setAgentId((current) => {
          if (current && nextAgents.some((agent) => agent.id === current)) return current;
          return nextAgents[0]?.id ?? "";
        });
      } catch {
        showError(t("chat.toasts.loadFailedTitle"), t("chat.toasts.loadAgentsFailed"));
      }
    };
    void loadAgents();
  }, [showError, t]);

  useEffect(() => {
    const rawParams = searchParams.toString();
    if (!rawParams) return;
    if (!appliedUrlParamsRef.current) {
      const urlAgentId = searchParams.get("agentId") ?? searchParams.get("agent");
      const urlSessionKey = searchParams.get("sessionKey");
      if (urlAgentId) setAgentId(urlAgentId);
      if (urlSessionKey) setSessionKey(urlSessionKey);
      appliedUrlParamsRef.current = true;
    }
    router.replace("/chat");
  }, [router, searchParams]);

  useEffect(() => {
    const loadSnapshot = async () => {
      if (!agentId) return;
      setLoading(true);
      try {
        const query = sessionKey ? `?sessionKey=${encodeURIComponent(sessionKey)}` : "";
        const response = await authFetch(`/api/chat/agents/${encodeURIComponent(agentId)}${query}`);
        const data = (await response.json()) as ChatSnapshot;
        setMessages(data.messages ?? []);
        setSessions(data.sessions ?? []);
        setReadOnly(Boolean(data.readOnly));
        setGatewayError(data.gateway?.error ? mapGatewayScopeError(data.gateway.error, t) : null);
        if (data.session?.key) setSessionKey(data.session.key);
      } catch {
        showError(t("chat.toasts.loadFailedTitle"), t("chat.toasts.loadHistoryFailed"));
      } finally {
        setLoading(false);
      }
    };
    void loadSnapshot();
  }, [agentId, sessionKey, showError, t]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [assistantDraft, messages]);

  const canSend = useMemo(() => !readOnly && !sending && input.trim().length > 0, [input, readOnly, sending]);
  const timelineMessages = useMemo(() => messages.filter((m) => !isTechnicalMessage(m)), [messages]);
  const technicalMessages = useMemo(() => messages.filter((m) => isTechnicalMessage(m)), [messages]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || !agentId || !sessionKey) return;

    const outgoing = input.trim();
    setInput("");
    setSending(true);
    setAssistantDraft("");
    setMessages((prev) => [...prev, {
      id: `local-user-${Date.now()}`, role: "user",
      content: outgoing, timestamp: new Date().toISOString(),
    }]);

    try {
      const response = await authFetch(`/api/chat/agents/${encodeURIComponent(agentId)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message: outgoing, sessionKey }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(response);
        throw new Error(message ?? `${t("chat.errors.sendFailed")} [HTTP ${response.status}]`);
      }

      const contentType = response.headers.get("Content-Type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const message = await getErrorMessage(response);
        throw new Error(message ?? `${t("chat.errors.unexpectedResponse")} [HTTP ${response.status}]`);
      }

      await processChatStream(response, {
        onDelta: (text) => setAssistantDraft((prev) => prev + text),
        onFinal: (text) => setAssistantDraft(text),
        onDone: (history) => { setMessages(history as MessageItem[]); setAssistantDraft(""); },
      }, t);
    } catch (error) {
      const resolvedMessage = error instanceof Error
        ? mapGatewayScopeError(error.message, t) : t("chat.errors.sendFailed");
      showError(t("chat.toasts.sendFailedTitle"), resolvedMessage);
      setAssistantDraft("");
    } finally {
      setSending(false);
    }
  };

  const handleReadOnlyClick = () => {
    showInfo(t("chat.toasts.readOnlyTitle"), t("chat.toasts.readOnlyDescription"));
  };

  const handleNewSession = () => {
    if (!agentId) return;
    setSessionKey(`agent:${agentId}:dashboard:${crypto.randomUUID()}`);
    setMessages([]);
  };

  const selectStyle = { backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center" style={{ borderColor: "var(--border)" }}>
        <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("chat.agent")}
          <select className="rounded-md px-3 py-2" style={selectStyle} value={agentId}
            onChange={(event) => { setSessionKey(""); setAgentId(event.target.value); }}>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name ?? agent.id}</option>)}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("chat.session")}
          <div className="flex gap-2">
            <select className="flex-1 rounded-md px-3 py-2" style={selectStyle} value={sessionKey}
              onChange={(event) => setSessionKey(event.target.value)}>
              {sessions.map((session) => <option key={session.key} value={session.key}>{formatSessionLabel(session)}</option>)}
            </select>
            <button type="button" onClick={handleNewSession}
              className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              title={t("chat.newSession")}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </label>
      </div>

      {readOnly && (
        <button type="button" onClick={handleReadOnlyClick}
          className="flex w-full items-center gap-2 border-b px-4 py-3 text-left"
          style={{ borderColor: "var(--border)", backgroundColor: "rgba(245, 158, 11, 0.12)", color: "var(--text-primary)" }}>
          <AlertTriangle className="h-4 w-4" style={{ color: "var(--warning)" }} />
          <span className="text-sm font-medium">{t("chat.readOnlyTitle")}</span>
          {gatewayError && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{gatewayError}</span>}
        </button>
      )}

      <ChatMessageList messages={timelineMessages} technicalMessages={technicalMessages}
        loading={loading} sending={sending} assistantDraft={assistantDraft} listRef={listRef} />
      <ChatInputForm input={input} onInputChange={setInput} canSend={canSend}
        readOnly={readOnly} sending={sending} onSubmit={handleSend} />
    </div>
  );
}
