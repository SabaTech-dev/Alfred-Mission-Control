// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const collectUsageMock = vi.fn();
const getStatusMock = vi.fn();

vi.mock("@/lib/usage-collector", () => ({
  collectUsageFromFiles: () => collectUsageMock(),
  getRecentTokenHistoryByAgent: () => ({}),
}));

vi.mock("@/operations", () => ({
  getAgentStatusList: () => getStatusMock(),
}));

vi.mock("@/lib/kanban/kanban-agents", () => ({
  getAgentIdentity: () => null,
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAgentOrSessionAuth: vi.fn().mockResolvedValue({ authorized: true }),
}));

function fixtureDir(agentList: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "hb-enrich-"));
  writeFileSync(
    join(dir, "openclaw.json"),
    JSON.stringify({ agents: { list: agentList } })
  );
  return dir;
}

function callGet(agentId?: string) {
  const url = agentId
    ? `http://localhost/api/heartbeat?agentId=${agentId}`
    : "http://localhost/api/heartbeat";
  return import("./route").then((mod) => mod.GET(new Request(url) as never));
}

describe("/api/heartbeat enrichment", () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    tmpDir = fixtureDir([
      { id: "coder", name: "Coder", heartbeat: { every: "15m", target: "last" } },
      { id: "research", name: "Research", heartbeat: { every: "1h", target: "all" } },
    ]);
    vi.stubEnv("OPENCLAW_DIR", tmpDir);

    collectUsageMock.mockReturnValue([
      {
        agentId: "coder",
        model: "claude-sonnet-4",
        totalTokens: 5000,
        inputTokens: 3000,
        outputTokens: 2000,
      },
    ]);
    getStatusMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: "coder",
          name: "Coder",
          status: "working",
          activeSessions: 1,
          lastActivity: "2026-06-29T10:00:00Z",
        },
      ],
    });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("enriches agent heartbeats with tokens, active model and session status", async () => {
    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agentHeartbeats).toHaveLength(2);

    const coder = data.agentHeartbeats.find((a: { agentId: string }) => a.agentId === "coder");
    expect(coder).toBeDefined();
    expect(coder.tokensUsed).toBe(5000);
    expect(coder.activeModel).toBe("claude-sonnet-4");
    expect(coder.sessionActive).toBe(true);
    expect(coder.lastActivity).toBe("2026-06-29T10:00:00Z");
  });

  it("leaves metrics unset for agents with no usage or status data", async () => {
    const response = await callGet();
    const data = await response.json();

    const research = data.agentHeartbeats.find((a: { agentId: string }) => a.agentId === "research");
    expect(research).toBeDefined();
    expect(research.tokensUsed).toBeUndefined();
    expect(research.activeModel).toBeUndefined();
    expect(research.sessionActive).toBeUndefined();
  });

  it("still returns 200 with tokens when status source fails", async () => {
    getStatusMock.mockResolvedValue({ success: false, error: "boom" });

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    const coder = data.agentHeartbeats.find((a: { agentId: string }) => a.agentId === "coder");
    expect(coder.tokensUsed).toBe(5000);
    expect(coder.sessionActive).toBeUndefined();
  });

  it("still returns 200 with status when usage source throws", async () => {
    collectUsageMock.mockImplementation(() => {
      throw new Error("usage unavailable");
    });

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    const coder = data.agentHeartbeats.find((a: { agentId: string }) => a.agentId === "coder");
    expect(coder.sessionActive).toBe(true);
    expect(coder.tokensUsed).toBeUndefined();
  });
});
