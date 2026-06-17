/**
 * Tests for /api/live route
 *
 * Validates the bounded-probe behaviour:
 * 1. When `openclaw sessions` resolves, sessions are parsed and returned.
 * 2. When the probe hangs, the route returns a 200 degraded empty snapshot
 *    within the timeout budget instead of hanging / 500ing.
 * 3. When the probe rejects, the route still returns the degraded snapshot.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// exec mock: tests control resolution via execCallback. The custom promisify
// symbol mirrors the real child_process.exec so `promisify(exec)` resolves with
// { stdout, stderr } instead of just the first callback argument.
type ExecCallback = (err: Error | null, stdout: string, stderr: string) => void;
let execCallback: ExecCallback | null = null;
let execLastCommand = "";

vi.mock("child_process", () => {
  const PROMISIFY_CUSTOM = Symbol.for("nodejs.util.promisify.custom");
  const exec = function (cmd: string, opts: unknown, cb: ExecCallback): unknown {
    execLastCommand = cmd;
    execCallback = cb;
    return undefined;
  } as ((cmd: string, opts: unknown, cb: ExecCallback) => unknown) & {
    [k: symbol]: unknown;
  };
  // Real exec exposes this custom promisifier returning {stdout, stderr}.
  exec[PROMISIFY_CUSTOM] = (cmd: string, opts: unknown) =>
    new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(cmd, opts, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });
  return { default: { exec }, exec };
});

import { GET } from "./route";

function buildRequest(filter?: string): Request {
  const base = "http://localhost:3000/api/live";
  const url = `${base}${filter ? `?filter=${filter}` : ""}`;
  return new Request(url);
}

describe("/api/live", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    execCallback = null;
    execLastCommand = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns parsed sessions when the probe resolves", async () => {
    const pending = GET(buildRequest("active"));
    // Let microtasks flush so execAsync wires the callback
    await vi.advanceTimersByTimeAsync(0);
    expect(execLastCommand).toContain("openclaw sessions");

    execCallback?.(null, JSON.stringify({
      sessions: [
        {
          sessionKey: "session:cron:dev-1",
          model: "gpt-test",
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          tokensIn: 10,
          tokensOut: 5,
        },
      ],
    }), "");

    // Flush microtasks so the resolved execAsync propagates to the route.
    await vi.advanceTimersByTimeAsync(0);

    const response = await pending;
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalCount).toBe(1);
    expect(data.sessions).toHaveLength(1);
    expect(data.hasActive).toBe(true);
    expect(data.degraded).toBeUndefined();
  });

  it("returns a degraded empty snapshot when the probe hangs past the budget", async () => {
    const pending = GET(buildRequest("active"));
    await vi.advanceTimersByTimeAsync(0);

    // Never invoke execCallback => simulates a hung `openclaw sessions`.
    await vi.advanceTimersByTimeAsync(6000);

    const response = await pending;
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.hasActive).toBe(false);
    expect(data.degraded).toBe(true);
  });

  it("returns a degraded empty snapshot when the probe rejects", async () => {
    const pending = GET(buildRequest("active"));
    await vi.advanceTimersByTimeAsync(0);

    execCallback?.(new Error("command not found"), "", "");

    const response = await pending;
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.degraded).toBe(true);
  });
});
