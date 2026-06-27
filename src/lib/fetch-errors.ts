/**
 * Helpers to classify fetch failures.
 *
 * Client components poll data endpoints on an interval. When the user navigates
 * away (or the document is unloaded) the browser aborts the in-flight request,
 * which surfaces as a `TypeError: Failed to fetch` or a `DOMException` with
 * name `AbortError`. Those are expected, transient conditions and must NOT be
 * logged as errors — doing so pollutes the console and trips the E2E audit.
 *
 * Use `isAbortFetchError` inside a `catch` block to swallow only navigation
 * aborts while still logging genuine failures (HTTP errors, parse errors, …).
 */

/**
 * Returns true when the given error represents an aborted/transient fetch
 * (navigation abort or explicit AbortController abort). Returns false for any
 * other error so real failures keep being reported.
 */
export function isAbortFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  // Chromium surfaces an aborted request as `TypeError: Failed to fetch`.
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return true;
  }

  return false;
}
