/**
 * Bounded async helpers for telemetry-style endpoints.
 *
 * The dashboard polls several endpoints (/api/live, /api/system/monitor, ...)
 * that shell out to local commands. A single hung subprocess must not be able
 * to stall the whole response (and, by saturating the process, cascade into
 * "Failed to fetch notifications" / "telemetry timeout" on sibling endpoints).
 *
 * These helpers race a promise against a hard deadline so callers always settle
 * within a known budget, then combine the results with Promise.allSettled.
 */

export class TimeoutError extends Error {
  readonly label: string;
  readonly isTimeout = true;

  constructor(label: string, ms: number) {
    super(`"${label}" timed out after ${ms}ms`);
    this.name = "TimeoutError";
    this.label = label;
  }
}

/**
 * Race a promise against a timeout. Resolves with the promise value if it
 * completes in time, otherwise rejects with a TimeoutError.
 *
 * The slow promise is NOT cancelled (Promises can't be aborted in JS without an
 * AbortController) but the rejection is observed, so no unhandled-rejection
 * leaks. For subprocess-based work pair this with the exec `timeout` option so
 * the OS reaps the child.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });

  // Observe the original promise so a late rejection after timeout never
  // surfaces as an unhandled rejection.
  promise.catch(() => {});

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export type SettledResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error; label: string };

/**
 * Always-settling variant. Useful with Promise.all on multiple probes where one
 * failing must not abort the batch — wrap each probe in settleWithTimeout and
 * collect the {ok} markers.
 */
export function settleWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<SettledResult<T>> {
  return withTimeout(promise, ms, label)
    .then((value): SettledResult<T> => ({ ok: true, value }))
    .catch((error: unknown): SettledResult<T> => ({
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      label,
    }));
}
