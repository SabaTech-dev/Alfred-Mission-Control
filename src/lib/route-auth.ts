import { NextRequest, NextResponse } from "next/server";
import { validateAgentAuth } from "@/lib/agent-auth";
import { jwtUtils } from "@/lib/jwt-utils";

/**
 * Require agent authentication (X-Agent-Id + X-Agent-Key headers)
 * Returns a 401 response if auth fails, or null if auth succeeds
 */
export async function requireAgentAuth(
  request: NextRequest
): Promise<NextResponse | null> {
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

  return null;
}

/**
 * Require session authentication (Bearer token or auth_token cookie)
 * Uses JWT stateless verification (Edge-compatible)
 * Returns a 401 response if auth fails, or null if auth succeeds
 */
export async function requireSessionAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const token = extractToken(request);
  if (!token || !(await jwtUtils.isValidToken(token))) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Require either agent authentication OR session authentication
 * Returns a 401 response if both fail, or null if either succeeds
 */
export async function requireAgentOrSessionAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  // Try agent auth first
  const agentId = validateAgentAuth(request);
  if (agentId) {
    return null; // Agent auth succeeded
  }

  // Fall back to session auth
  return requireSessionAuth(request);
}

/**
 * Extract authentication token from request
 * Checks Authorization header (Bearer token) or auth_token cookie
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return request.cookies.get("auth_token")?.value ?? null;
}
