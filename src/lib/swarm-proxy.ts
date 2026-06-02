/**
 * Swarm API proxy utilities
 * Shared helpers for proxying requests to the Agent Swarm server
 * with timeout, auth forwarding, and graceful error handling.
 */

/** Default Swarm server URL (configurable via env) */
const SWARM_BASE_URL =
  process.env.SWARM_API_URL || "http://localhost:3013";

/** Request timeout in milliseconds */
const SWARM_TIMEOUT_MS = 8_000;

/** Auth header key from server-side env — NEVER expose in client bundle */
const SWARM_API_KEY = process.env.SWARM_API_KEY || "";

export interface SwarmProxyResult<T = unknown> {
  ok: true;
  data: T;
  status: number;
}

export interface SwarmProxyError {
  ok: false;
  error: string;
  status: number;
  upstream?: boolean;
}

/**
 * Build auth headers for the Swarm server.
 * Uses the server-side API key (not the browser-exposed one).
 */
function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SWARM_API_KEY) {
    headers["Authorization"] = `Bearer ${SWARM_API_KEY}`;
  }
  return headers;
}

/**
 * Proxy a request to the Swarm server with timeout and graceful fallback.
 *
 * @param path   - Path after the base URL, e.g. "/api/health"
 * @param init   - Optional fetch init overrides (method, body, etc.)
 * @returns Structured result — never throws on upstream failure
 */
export async function swarmFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<SwarmProxyResult<T> | SwarmProxyError> {
  const url = `${SWARM_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SWARM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...buildAuthHeaders(),
        ...(init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : (init?.headers as Record<string, string> | undefined)),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: body || `Swarm responded ${response.status}`,
        status: response.status,
        upstream: true,
      };
    }

    const data = (await response.json()) as T;
    return { ok: true, data, status: response.status };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        ok: false,
        error: "Swarm server timed out",
        status: 504,
      };
    }

    const message =
      err instanceof Error ? err.message : "Unknown proxy error";

    return {
      ok: false,
      error: `Swarm unreachable: ${message}`,
      status: 502,
    };
  } finally {
    clearTimeout(timer);
  }
}
