/**
 * Share-chat helpers — build a read-only conversation export and a short
 * clipboard summary. Pure functions, fully client-side.
 *
 * @module share-chat
 */

export type ShareRole = "user" | "assistant" | "system" | "tool";

export interface ShareMessage {
  id: string;
  role: ShareRole;
  content: string;
  timestamp: string;
}

export interface SharePayload {
  readOnly: true;
  app: string;
  exportedAt: string;
  agentId: string;
  agentName?: string;
  sessionKey?: string;
  messageCount: number;
  messages: ShareMessage[];
}

interface BuildPayloadInput {
  agentId: string;
  agentName?: string;
  sessionKey?: string;
  messages: ShareMessage[];
}

const CONVERSATION_ROLES: ReadonlySet<ShareRole> = new Set(["user", "assistant"]);

/** Filter to user/assistant turns only — keep the share clean and readable. */
function conversationOnly(messages: ShareMessage[]): ShareMessage[] {
  return messages.filter((m) => CONVERSATION_ROLES.has(m.role));
}

/** Build the read-only JSON payload to download. */
export function buildSharePayload(input: BuildPayloadInput): SharePayload {
  const messages = conversationOnly(input.messages);
  return {
    readOnly: true,
    app: "Alfred Mission Control",
    exportedAt: new Date().toISOString(),
    agentId: input.agentId,
    agentName: input.agentName,
    sessionKey: input.sessionKey,
    messageCount: messages.length,
    messages,
  };
}

interface BuildSummaryInput {
  agentName?: string;
  messages: ShareMessage[];
}

/** Build a single-line, human-readable summary for the clipboard. */
export function buildShareSummary(input: BuildSummaryInput): string {
  const count = conversationOnly(input.messages).length;
  const label = input.agentName ?? "Agent";
  const plural = count === 1 ? "message" : "messages";
  return `Shared chat with ${label} — ${count} ${plural} (exported from Alfred Mission Control).`;
}

/** Trigger a JSON file download in the browser. */
export function downloadJson(payload: SharePayload, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
