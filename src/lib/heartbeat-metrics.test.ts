import { describe, it, expect } from "vitest";
import {
  enrichHeartbeats,
  buildSparklinePath,
  formatTokenCount,
  type SessionUsageEntry,
  type StatusEntry,
} from "./heartbeat-metrics";
import type { AgentHeartbeatBase } from "./heartbeat-types";

function baseAgent(overrides: Partial<AgentHeartbeatBase> = {}): AgentHeartbeatBase {
  return {
    agentId: "coder",
    agentName: "Coder",
    workspace: "/ws/coder",
    enabled: true,
    every: "15m",
    target: "last",
    activeHours: null,
    identity: null,
    ...overrides,
  };
}

describe("enrichHeartbeats", () => {
  it("returns agents unchanged when no sessions or statuses are provided", () => {
    const agents = [baseAgent({ agentId: "coder" })];

    const result = enrichHeartbeats(agents, [], [], {});

    expect(result).toHaveLength(1);
    expect(result[0].agentId).toBe("coder");
    expect(result[0].tokensUsed).toBeUndefined();
    expect(result[0].sessionActive).toBeUndefined();
  });

  it("attaches total tokens summed across matching sessions", () => {
    const agents = [baseAgent({ agentId: "coder" })];
    const sessions: SessionUsageEntry[] = [
      { agentId: "coder", model: "claude-sonnet-4", totalTokens: 1000, inputTokens: 600, outputTokens: 400 },
      { agentId: "coder", model: "gpt-4o", totalTokens: 500, inputTokens: 300, outputTokens: 200 },
    ];

    const result = enrichHeartbeats(agents, sessions, [], {});

    expect(result[0].tokensUsed).toBe(1500);
  });

  it("uses the model of the session with the most tokens as activeModel", () => {
    const agents = [baseAgent({ agentId: "coder" })];
    const sessions: SessionUsageEntry[] = [
      { agentId: "coder", model: "claude-sonnet-4", totalTokens: 200, inputTokens: 100, outputTokens: 100 },
      { agentId: "coder", model: "claude-opus-4", totalTokens: 5000, inputTokens: 3000, outputTokens: 2000 },
    ];

    const result = enrichHeartbeats(agents, sessions, [], {});

    expect(result[0].activeModel).toBe("claude-opus-4");
  });

  it("marks sessionActive true when status reports active sessions", () => {
    const agents = [baseAgent({ agentId: "coder" })];
    const statuses: StatusEntry[] = [
      { id: "coder", activeSessions: 2, lastActivity: "2026-06-29T10:00:00Z" },
    ];

    const result = enrichHeartbeats(agents, [], statuses, {});

    expect(result[0].sessionActive).toBe(true);
    expect(result[0].lastActivity).toBe("2026-06-29T10:00:00Z");
  });

  it("marks sessionActive false when status reports zero active sessions", () => {
    const agents = [baseAgent({ agentId: "coder" })];
    const statuses: StatusEntry[] = [
      { id: "coder", activeSessions: 0 },
    ];

    const result = enrichHeartbeats(agents, [], statuses, {});

    expect(result[0].sessionActive).toBe(false);
  });

  it("attaches token history from the lookup map", () => {
    const agents = [baseAgent({ agentId: "coder" })];

    const result = enrichHeartbeats(agents, [], [], {
      coder: [10, 20, 30, 40],
    });

    expect(result[0].tokenHistory).toEqual([10, 20, 30, 40]);
  });

  it("does not mutate the input agents", () => {
    const agents = [baseAgent({ agentId: "coder" })];
    const original = JSON.parse(JSON.stringify(agents));

    enrichHeartbeats(
      agents,
      [{ agentId: "coder", model: "m", totalTokens: 5, inputTokens: 3, outputTokens: 2 }],
      [{ id: "coder", activeSessions: 1 }],
      { coder: [1, 2] }
    );

    expect(JSON.parse(JSON.stringify(agents))).toEqual(original);
  });

  it("ignores sessions for agents that have no heartbeat", () => {
    const agents = [baseAgent({ agentId: "coder" })];
    const sessions: SessionUsageEntry[] = [
      { agentId: "other", model: "m", totalTokens: 9999, inputTokens: 1, outputTokens: 1 },
    ];

    const result = enrichHeartbeats(agents, sessions, [], {});

    expect(result).toHaveLength(1);
    expect(result[0].tokensUsed).toBeUndefined();
  });
});

describe("buildSparklinePath", () => {
  it("returns empty string for no values", () => {
    expect(buildSparklinePath([], 100, 30)).toBe("");
  });

  it("draws a flat centered line for a single value", () => {
    const path = buildSparklinePath([42], 100, 30);
    // Should be a horizontal line at vertical center spanning the width
    expect(path).toMatch(/^M /);
    expect(path).toContain(" L ");
    // y coordinate should be the center (15)
    expect(path).toContain(" 15 ");
  });

  it("draws a flat centered line when all values are equal", () => {
    const path = buildSparklinePath([5, 5, 5], 100, 30);
    // all points at center height
    expect(path).toContain("15");
  });

  it("normalizes multiple values to span the drawable area", () => {
    const path = buildSparklinePath([0, 10, 20, 30], 120, 40);
    // Path starts with M and has line segments
    expect(path.startsWith("M ")).toBe(true);
    expect(path).toContain(" L ");
    // Highest value (30) maps to top (smallest y within padding)
    // Lowest value (0) maps to bottom (largest y)
    const coords = path.match(/-?\d+(\.\d+)?/g);
    expect(coords).not.toBeNull();
  });

  it("produces monotonically decreasing y for ascending values", () => {
    const path = buildSparklinePath([0, 100], 100, 40);
    // Extract the two points' y coordinates
    const moves = path.match(/M\s+[\d.]+\s+[\d.]+/);
    const lines = path.match(/L\s+[\d.]+\s+[\d.]+/);
    expect(moves).not.toBeNull();
    expect(lines).not.toBeNull();

    const firstY = parseFloat(moves![0].split(/\s+/)[2]);
    const secondY = parseFloat(lines![0].split(/\s+/)[2]);

    // Ascending value → second point higher up → smaller y
    expect(secondY).toBeLessThan(firstY);
  });

  it("produces monotonically increasing y for descending values", () => {
    const path = buildSparklinePath([100, 0], 100, 40);
    const moves = path.match(/M\s+[\d.]+\s+[\d.]+/);
    const lines = path.match(/L\s+[\d.]+\s+[\d.]+/);

    const firstY = parseFloat(moves![0].split(/\s+/)[2]);
    const secondY = parseFloat(lines![0].split(/\s+/)[2]);

    // Descending value → second point lower → larger y
    expect(secondY).toBeGreaterThan(firstY);
  });

  it("respects padding option", () => {
    const noPad = buildSparklinePath([0, 100], 100, 40, { padding: 0 });
    const withPad = buildSparklinePath([0, 100], 100, 40, { padding: 8 });

    expect(noPad).not.toBe(withPad);
  });
});

describe("formatTokenCount", () => {
  it("returns '0' for zero", () => {
    expect(formatTokenCount(0)).toBe("0");
  });

  it("formats thousands with k suffix", () => {
    expect(formatTokenCount(1500)).toBe("1.5k");
  });

  it("formats exact thousands without decimals", () => {
    expect(formatTokenCount(2000)).toBe("2k");
  });

  it("formats millions with M suffix", () => {
    expect(formatTokenCount(1_500_000)).toBe("1.5M");
  });

  it("formats exact millions without decimals", () => {
    expect(formatTokenCount(3_000_000)).toBe("3M");
  });

  it("formats small numbers as-is", () => {
    expect(formatTokenCount(42)).toBe("42");
  });

  it("returns '0' for undefined", () => {
    expect(formatTokenCount(undefined)).toBe("0");
  });
});
