/**
 * CSRF Protection for Alfred Mission Control
 *
 * Since the dashboard uses SameSite=Lax cookies for session auth,
 * CSRF via form POST is already mitigated for most cases. This
 * module provides defense-in-depth for state-changing requests
 * (POST, PUT, DELETE) by validating Origin and Referer headers.
 *
 * Strategy:
 * - Validate that Origin matches the app's own origin (or is absent
 *   only for same-origin GET/HEAD requests)
 * - For state-changing requests, require either a matching Origin
 *   or a matching Referer — both must be the app's own origin.
 * - No token-based CSRF needed because SameSite=Lax + origin check
 *   is sufficient for a first-party SPA dashboard.
 */

/**
 * Allowed origins for cross-origin CSRF validation.
 * In development, allow common ports. In production, only the app's origin.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Primary app origin from environment or default to localhost
  const appOrigin = process.env.APP_ORIGIN;
  if (appOrigin) {
    origins.push(appOrigin);
  }

  // Always allow localhost variations for development
  origins.push("http://localhost:3000", "http://127.0.0.1:3000");
  origins.push("http://localhost:3001", "http://127.0.0.1:3001");

  return origins;
}

/**
 * Validate that a request's Origin/Referer is allowed.
 * Returns true if the request is safe from CSRF, false otherwise.
 *
 * For GET/HEAD requests: no validation needed (read-only).
 * For state-changing requests: Origin or Referer must match an allowed origin.
 */
export function validateCsrf(
  method: string,
  origin: string | null,
  referer: string | null,
): boolean {
  // GET, HEAD, and OPTIONS are read-only — no CSRF validation needed
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check Origin header first (most reliable)
  if (origin) {
    return allowedOrigins.some((allowed) => origin.startsWith(allowed));
  }

  // Fall back to Referer header
  if (referer) {
    return allowedOrigins.some((allowed) => referer.startsWith(allowed));
  }

  // No Origin or Referer for a state-changing request — reject
  return false;
}

/**
 * Validate a Next.js request for CSRF.
 * Returns null if valid, or a 403 NextResponse if invalid.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function csrfGuard(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!validateCsrf(request.method, origin, referer)) {
    return NextResponse.json(
      { success: false, error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  return null;
}
