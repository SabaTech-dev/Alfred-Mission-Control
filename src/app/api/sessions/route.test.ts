/**
 * Tests for /api/sessions route
 *
 * The office polling hook (useOfficePolling) consumes this endpoint to build
 * visitor avatars for running subagent sessions. Validates:
 * 1. Sessions from `openclaw sessions --json --all-agents` are mapped to the
 *    shape the hook expects (type "subagent" for spawn-child sessions).
 * 2. The probe uses --all-agents (multi-agent setups reject bare `sessions`).
 * 3. When the probe hangs or rejects, the route returns a 200 empty snapshot
 *    instead of hanging / 500ing (the hook bails on !res.ok silently).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// execFile mock: tests control resolution via execFileCallback. The custom
// promisify symbol mirrors the real child_process.execFile so
// `promisify(execFile)` resolves with { stdout, stderr }.
type ExecFileCallback = (err: Error | null, stdout: string, stderr: string) => void;
let execFileCallback: ExecFileCallback | null = null;
let lastCommand: string = "";
let lastArgs: string[] = [];

vi.mock("child_process", () => {
  const PROMISIFY_CUSTOM = Symbol.for("nodejs.util.promisify.custom");
  const execFile = function (
    cmd: string,
    args: string[],
    opts: unknown,
    cb: ExecFileCallback,
  ): unknown {
    lastCommand = cmd;
    lastArgs = args;
    execFileCallback = cb;
    return undefined;
  } as ((cmd: string, args: string[], opts: unknown, cb: ExecFileCallback) => unknown) & {
    [k: symbol]: unknown;
  };
  execFile[PROMISIFY_CUSTOM] = (cmd: string, args: string[], opts: unknown) =>
    new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(cmd, args, opts, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });
  return { default: { execFile }, execFile };
});

import { GET } from "./route";

const CLI_OUTPUT = JSON.stringify({
  ok: true,
  sessions: [
    {
      key: "agent:main:subagent:91bd4b78",
      kind: "spawn-child",
      sessionId: "91bd4b78",
      label: "Formalizar proof card 646feeaf",
      model: "zai/glm-5.3",
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      ageMs: 42_000,
    },
    {
      key: "agent:main:cron:f3208af7",
      kind: "cron",
      sessionId: "f3208af7",
      model: "zai/glm-5.3",
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      ageMs: 5000,
    },
  ],
});

function flushCli(stdout = CLI_OUTPUT): void {
  execFileCallback?.(null, stdout, "");
}

describe("GET /api/sessions", () => {
  beforeEach(() => {
    execFileCallback = null;
    lastCommand = "";
    lastArgs = [];
  });

  it("maps CLI sessions to the office shape (spawn-child -> type subagent)", async () => {
    const pending = GET();
    flushCli();

    const res = await pending;
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.sessions).toHaveLength(2);
    const sub = body.sessions[0];
    expect(sub).toEqual({
      key: "agent:main:subagent:91bd4b78",
      type: "subagent",
      subagentId: "91bd4b78",
      model: "zai/glm-5.3",
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      ageMs: 42_000,
    });
    // Non-spawn sessions keep their kind as type
    expect(body.sessions[1].type).toBe("cron");
  });

  it("invokes the openclaw CLI with --json --all-agents", async () => {
    const pending = GET();
    flushCli();
    await pending;

    expect(lastCommand).toBe("openclaw");
    expect(lastArgs).toContain("sessions");
    expect(lastArgs).toContain("--json");
    expect(lastArgs).toContain("--all-agents");
  });

  it("returns a 200 empty snapshot when the probe rejects", async () => {
    const pending = GET();
    execFileCallback?.(new Error("cli exploded"), "", "");
    execFileCallback = null;

    const res = await pending;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toEqual([]);
  });

  it("returns a 200 empty snapshot when output has no JSON payload", async () => {
    const pending = GET();
    flushCli("config warnings only, no json here");

    const res = await pending;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toEqual([]);
  });
});
