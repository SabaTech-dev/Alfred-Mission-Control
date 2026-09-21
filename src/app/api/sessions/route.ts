import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { withTimeout } from "@/lib/with-timeout";
import { OPENCLAW_BIN } from "@/lib/openclaw-bin";

const execFileAsync = promisify(execFile);

// Hard ceiling for the `openclaw sessions` probe so a hung CLI cannot stall
// the office poller (mirrors /api/live's budget).
const SESSIONS_PROBE_TIMEOUT_MS = 5000;

interface CliSession {
  key: string;
  kind?: string;
  sessionId?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  ageMs?: number;
}

/**
 * GET /api/sessions — active OpenClaw sessions in the minimal shape consumed
 * by the office polling hook (useOfficePolling): only subagent-related fields.
 * `kind: "spawn-child"` is surfaced as `type: "subagent"` because the office
 * filter matches on that value.
 */
export async function GET() {
  try {
    const result = await withTimeout(
      execFileAsync(OPENCLAW_BIN, ["sessions", "--json", "--all-agents"], {
        timeout: SESSIONS_PROBE_TIMEOUT_MS,
      }),
      SESSIONS_PROBE_TIMEOUT_MS,
      "openclaw-sessions",
    );

    // CLI output may embed warnings around the JSON payload — extract it.
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ sessions: [], timestamp: new Date().toISOString() });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { sessions?: CliSession[] };
    const sessions = (parsed.sessions || []).map((s) => ({
      key: s.key,
      type: s.kind === "spawn-child" ? "subagent" : s.kind || "direct",
      subagentId: s.sessionId || s.key,
      model: s.model || "unknown",
      inputTokens: s.inputTokens ?? 0,
      outputTokens: s.outputTokens ?? 0,
      totalTokens: s.totalTokens ?? (s.inputTokens ?? 0) + (s.outputTokens ?? 0),
      ageMs: s.ageMs ?? Number.MAX_SAFE_INTEGER,
    }));

    return NextResponse.json({ sessions, timestamp: new Date().toISOString() });
  } catch (error) {
    // Probe failed — explicit empty snapshot keeps the office poller stable.
    console.warn("[api/sessions] probe failed, returning empty snapshot", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ sessions: [], timestamp: new Date().toISOString() });
  }
}
