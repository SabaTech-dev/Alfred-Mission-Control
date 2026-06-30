/**
 * CLI runner — async subprocess helpers for shelling out to OpenClaw / other
 * local CLIs from server-side code.
 *
 * Why a dedicated module?
 * ------------------------
 * Previously agent-ops called `execSync("openclaw agents list")` inline,
 * which blocks the Node event loop for ~5 s per call. The fix moves every
 * subprocess call through this module so:
 *
 *   1. Calls are ALWAYS async (`exec`, never `execSync`) — the event loop
 *      keeps serving other requests while the subprocess runs.
 *   2. Calls are bounded by `withTimeout` — a hung CLI cannot stall the
 *      whole Node process (which is what broke SPA routing in the first
 *      place: the browser-side App Router would abort the pending RSC
 *      navigation after the fetch budget elapsed).
 *   3. The surface is trivially mockable in tests via `vi.mock("@/lib/cli-runner")`
 *      — no contortions around `child_process`/`promisify`.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { withTimeout } from "@/lib/with-timeout";

const execAsync = promisify(exec);

export interface RunCliOptions {
  /** Working directory for the subprocess. */
  cwd?: string;
  /** Hard kill timeout for the subprocess (ms). The call will never take longer. */
  timeoutMs?: number;
  /** Environment overrides (merged with process.env). */
  env?: NodeJS.ProcessEnv;
  /** Label used in error messages and timeout logs. */
  label?: string;
}

export interface RunCliResult {
  stdout: string;
  stderr: string;
}

/**
 * Run a shell command asynchronously and return its stdout/stderr. The
 * call is wrapped in `withTimeout` so the returned promise always settles
 * within `opts.timeoutMs` — a wedged CLI cannot block the caller beyond
 * that bound. On timeout or non-zero exit the promise rejects; callers
 * are expected to handle that gracefully (typically by degrading to a
 * fallback dataset).
 */
export async function runCli(
  command: string,
  opts: RunCliOptions = {},
): Promise<RunCliResult> {
  const timeoutMs = opts.timeoutMs ?? 5_000;
  const label = opts.label ?? "cli-runner";
  const env = { ...process.env, ...(opts.env ?? {}) };
  return withTimeout(
    execAsync(command, {
      encoding: "utf-8",
      timeout: timeoutMs,
      cwd: opts.cwd,
      env,
      maxBuffer: 10 * 1024 * 1024, // 10 MB — agent lists / cron dumps fit easily.
    }),
    timeoutMs,
    label,
  );
}

/**
 * Convenience wrapper: run a command that is expected to print JSON to
 * stdout, and parse it. Returns `null` on any failure (non-zero exit,
 * timeout, malformed JSON) so callers can do `const data = await
 * runCliJson(...); if (!data) return fallback;` without try/catch noise.
 */
export async function runCliJson<T = unknown>(
  command: string,
  opts: RunCliOptions = {},
): Promise<T | null> {
  try {
    const result = await runCli(command, opts);
    return JSON.parse(result.stdout) as T;
  } catch {
    return null;
  }
}
