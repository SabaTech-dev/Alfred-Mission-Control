import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Authentication middleware for Alfred Mission Control.
 *
 * PROTECTED ROUTES:
 * - All routes under / (except /login, /api/auth/*, /api/health)
 * - Requires valid auth_token cookie or Authorization: Bearer header
 *
 * PUBLIC ROUTES:
 * - /login — login page
 * - /api/auth/login — login endpoint
 * - /api/auth/logout — logout endpoint
 * - /api/health — health check (for monitoring)
 * - /api/heartbeat/tasks — agent heartbeat (uses agent auth, not session)
 * - /api/kanban/agent/* — agent kanban (uses agent auth, not session)
 * - /reports/[token] — shared reports (token-based access)
 * - /office — public office 3D view (no sensitive data)
 * - Static files (/_next/*, /favicon.ico, /logo.svg, /logo.png, etc.)
 */

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/heartbeat/tasks",
  "/office",
  "/reports/",
];

const AGENT_AUTH_PREFIXES = [
  "/api/heartbeat/",
  "/api/kanban/agent/",
];

function isPublicPath(pathname: string): boolean {
  // Exact public paths
  for (const pp of PUBLIC_PATHS) {
    if (pathname === pp || pathname.startsWith(pp)) return true;
  }

  // Static files (Next.js internals, public assets)
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js")
  ) {
    return true;
  }

  return false;
}

function isAgentAuthPath(pathname: string): boolean {
  for (const prefix of AGENT_AUTH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — pass through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Agent auth paths — handled by route-level auth (requireAgentAuth)
  // These use X-Agent-Id + X-Agent-Key headers, not session cookies
  if (isAgentAuthPath(pathname)) {
    return NextResponse.next();
  }

  // All other routes require authentication
  const token =
    request.cookies.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "") ??
    null;

  if (!token) {
    // Redirect to login for page routes, 401 for API routes
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists — pass through (validation happens in requireAuth/sessionStore at route level)
  // We do lightweight check here; full HMAC validation is in sessionStore.validate()
  // to avoid double-validation overhead
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
