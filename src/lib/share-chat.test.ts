import { describe, expect, it } from "vitest";

import { buildSharePayload, buildShareSummary, type ShareMessage } from "./share-chat";

function msg(id: string, role: ShareMessage["role"], content: string): ShareMessage {
  return { id, role, content, timestamp: "2026-01-01T00:00:00.000Z" };
}

describe("buildSharePayload", () => {
  it("produces a read-only snapshot with metadata and messages", () => {
    const messages = [msg("1", "user", "hi"), msg("2", "assistant", "hello")];
    const payload = buildSharePayload({
      agentId: "dev",
      agentName: "Developer",
      sessionKey: "s1",
      messages,
    });

    expect(payload.readOnly).toBe(true);
    expect(payload.agentId).toBe("dev");
    expect(payload.agentName).toBe("Developer");
    expect(payload.sessionKey).toBe("s1");
    expect(payload.exportedAt).toBeTruthy();
    expect(payload.messages).toEqual(messages);
    expect(payload.messageCount).toBe(2);
  });

  it("strips system/tool messages for a clean share", () => {
    const messages = [
      msg("1", "user", "hi"),
      msg("2", "system", "[internal]"),
      msg("3", "tool", "result"),
      msg("4", "assistant", "hello"),
    ];
    const payload = buildSharePayload({ agentId: "a", sessionKey: "s", messages });
    expect(payload.messageCount).toBe(2);
    expect(payload.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("buildShareSummary", () => {
  it("describes the conversation in a single clipboard line", () => {
    const messages = [msg("1", "user", "hi"), msg("2", "assistant", "hello")];
    const summary = buildShareSummary({
      agentName: "Developer",
      messages,
    });
    expect(summary).toContain("Developer");
    expect(summary).toContain("2");
    expect(summary.toLowerCase()).toContain("message");
  });

  it("handles empty conversations", () => {
    const summary = buildShareSummary({ agentName: "Dev", messages: [] });
    expect(summary.toLowerCase()).toContain("0");
  });
});
