import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateAgentAuth } from "@/lib/agent-auth";
import { sessionStore } from "@/lib/session-store";
import { isAdminRoute, isAdminFromToken } from "@/lib/role-based-access";

// Routes that never require authentication
const PUBLIC_ROUTES = new Set(["/login"]);

// API routes that are always public (minimal surface)
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
]);

// API routes requiring agent credentials (X-Agent-Id + X-Agent-Key)
const AGENT_ONLY_API_PREFIXES = [
  "/api/heartbeat",
  "/api/agents",
  "/api/config",
  "/api/system",
  "/api/gateway",
  "/api/cron",
  "/api/subagents",
  "/api/handoffs",
  "/api/terminal",
  "/api/collect-usage",
  "/api/openclaw",
  "/api/logs",
  "/api/telemetry",
];

// API routes allowing agent credentials OR authenticated session
const AGENT_OR_SESSION_API_PREFIXES = [
  "/api/kanban",
  "/api/files",
  "/api/sessions",
  "/api/reports",
  "/api/wiki",
  "/api/skills",
  "/api/integrations",
  "/api/notifications",
  "/api/projects",
  "/api/learning",
  "/api/media",
  "/api/activities",
  "/api/costs",
  "/api/chat",
  "/api/memory",
  "/api/memories",
  "/api/pipeline",
  "/api/performance",
  "/api/analytics",
  "/api/browse",
  "/api/catalog",
  "/api/search",
  "/api/suggestions",
  "/api/tasks",
  "/api/actions",
  "/api/journal",
  "/api/models",
  "/api/pricing",
  "/api/weather",
  "/api/office",
  "/api/notepad",
  "/api/morning",
  "/api/realtime",
  "/api/git",
  "/api/live",
  "/api/hindsight",
];

function extractToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Fall back to cookie (set by login API)
  return request.cookies.get("auth_token")?.value ?? null;
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = extractToken(request);
  if (!token) {
    return false;
  }
  return sessionStore.validate(token);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public pages (login)
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Always allow explicit public API routes
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Agent-only API routes must use explicit agent credentials
  if (AGENT_ONLY_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const agentId = validateAgentAuth(request);

    if (!agentId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Valid X-Agent-Id and X-Agent-Key headers required",
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Kanban agent endpoints allow either agent headers or authenticated session
  if (AGENT_OR_SESSION_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const agentId = validateAgentAuth(request);
    if (agentId) {
      return NextResponse.next();
    }

    if (!(await isAuthenticated(request))) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Valid X-Agent-Id and X-Agent-Key headers or authenticated session required",
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Check authentication
  if (!(await isAuthenticated(request))) {
    // For API routes: return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // For page routes: redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access for admin routes
  if (isAdminRoute(pathname)) {
    const token = sessionStore.getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const isAdmin = await isAdminFromToken(token);
    if (!isAdmin) {
      // For API routes: return 403 JSON
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Admin access required" },
          { status: 403 }
        );
      }

      // For page routes: redirect to 403
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack|favicon.ico|.*\\..*).*)",
  ],
};
