import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for /api/agents.
 *
 * Context: the QA pipeline reported /api/agents among the endpoints returning
 * 500 after the better-sqlite3 → node:sqlite migration. The route itself never
 * broke — it delegates to `getAgents()` which was instrumented for the new
 * sqlite-wrapper — but we had no unit coverage proving the handler's contract.
 * These tests lock the happy path, the empty-list path, the operation-failure
 * path, and the throw path so a future regression surfaces in CI rather than
 * in the dashboard.
 */

const getAgentsMock = vi.fn();
const registerAgentMock = vi.fn();

vi.mock("@/operations/agent-ops", () => ({
  getAgents: () => getAgentsMock(),
  registerAgent: (...args: unknown[]) => registerAgentMock(...args),
}));

vi.mock("@/lib/api-validation", () => ({
  validateBody: (_schema: unknown, data: unknown) => ({ success: true, data }),
  CreateAgentSchema: {},
}));

function makeRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

async function callGet() {
  const route = await import("./route");
  return route.GET();
}

async function callPost(body: unknown) {
  const route = await import("./route");
  return route.POST(makeRequest(body) as any);
}

describe("/api/agents GET", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with the agent list on the happy path", async () => {
    // 7 agents is the canonical SabaTech fleet size (main + 6 specialists).
    // Locking the count guards against accidental agent-config regressions
    // that would silently shrink the dashboard grid.
    const fleet = [
      "main",
      "coder",
      "security",
      "research",
      "devops",
      "qa-tester",
      "opencode",
    ].map((id) => ({
      id,
      name: id,
      emoji: "🤖",
      color: "#000000",
      status: "offline",
      model: "zai/glm-5.2",
      tokensUsed: 0,
      sessionCount: 0,
      activeSessions: 0,
    }));

    getAgentsMock.mockResolvedValue({ success: true, data: fleet });

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(7);
    expect(data.agents.map((a: { id: string }) => a.id)).toEqual(
      expect.arrayContaining(fleet.map((a) => a.id)),
    );
  });

  it("returns 200 with an empty list when operation succeeds without data", async () => {
    getAgentsMock.mockResolvedValue({ success: true, data: undefined });

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toEqual([]);
  });

  it("returns 500 when the operation reports failure", async () => {
    getAgentsMock.mockResolvedValue({
      success: false,
      error: "openclaw.json missing",
    });

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("openclaw.json missing");
  });

  it("returns 500 with the thrown message when getAgents throws", async () => {
    getAgentsMock.mockRejectedValue(new Error("sqlite locked"));

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("sqlite locked");
  });
});

describe("/api/agents POST", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 201 when the agent is registered successfully", async () => {
    registerAgentMock.mockResolvedValue({
      success: true,
      data: { id: "coder", name: "Coder" },
    });

    const response = await callPost({
      name: "Coder",
      model: "zai/glm-5.2",
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.agent.id).toBe("coder");
    expect(data.agent.skills).toEqual([]);
    expect(data.agent.temperature).toBe(0.7);
    expect(data.agent.maxTokens).toBe(4096);
    expect(data.agent.autoStart).toBe(true);
  });

  it("returns 400 when registration fails", async () => {
    registerAgentMock.mockResolvedValue({
      success: false,
      error: "agent already exists",
    });

    const response = await callPost({ name: "Dup" });

    expect(response.status).toBe(400);
  });

  it("returns 500 when registerAgent throws", async () => {
    registerAgentMock.mockRejectedValue(new Error("disk full"));

    const response = await callPost({ name: "Boom" });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("disk full");
  });
});
