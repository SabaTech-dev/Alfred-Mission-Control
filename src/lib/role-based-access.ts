/**
 * Role-based access control for AMC admin pages.
 *
 * SECURITY MODEL:
 * - Extends session-store with role information
 * - Admin-only routes require role: 'admin' in session payload
 * - Non-admin users get 403 Forbidden for admin routes
 *
 * @module role-based-access
 */

import { sessionStore } from "./session-store";

export type UserRole = "user" | "admin";

interface SessionPayloadWithRole {
  exp: number;
  jti: string;
  role: UserRole;
  username?: string;
}

const ADMIN_USERS = new Set<string>(
  process.env.ADMIN_USERS?.split(",").map((u) => u.trim()) || ["admin"]
);

/**
 * Check if a username is an admin user.
 *
 * @param username - Username to check
 * @returns true if user is admin, false otherwise
 */
export function isAdminUser(username: string): boolean {
  return ADMIN_USERS.has(username);
}

/**
 * Extract role from a session token.
 *
 * @param token - Session token
 * @returns Role or null if token is invalid
 */
export function extractRoleFromToken(token: string): UserRole | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [payloadB64] = parts;
    if (!payloadB64) {
      return null;
    }

    const payload: SessionPayloadWithRole = JSON.parse(base64UrlDecode(payloadB64));
    return payload.role || "user";
  } catch {
    return null;
  }
}

/**
 * Base64 URL decode (copied from session-store.ts for compatibility).
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  if (typeof globalThis !== "undefined" && globalThis.Buffer) {
    return globalThis.Buffer.from(str, "base64").toString("utf8");
  }
  return atob(str);
}

/**
 * Check if a user has admin role based on session token.
 *
 * @param token - Session token
 * @returns true if user is admin, false otherwise
 */
export async function isAdminFromToken(token: string): Promise<boolean> {
  const role = extractRoleFromToken(token);
  return role === "admin";
}

/**
 * Routes that require admin access.
 */
export const ADMIN_ROUTES = new Set([
  "/admin",
  "/admin/audit-logs",
  "/admin/performance-metrics",
  "/admin/database-backups",
  "/admin/system-health",
  "/admin/api-usage",
  "/admin/user-audit",
  "/admin/error-tracking",
  "/admin/config-audit",
  "/admin/security-scan",
  "/admin/compliance-reports",
  "/admin/cluster-status",
  "/admin/cost-optimization",
  "/admin/feature-flags",
  "/admin/integrations-status",
  "/admin/legacy-migration",
]);

/**
 * Check if a route requires admin access.
 *
 * @param pathname - Route path
 * @returns true if route is admin-only, false otherwise
 */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.has(pathname);
}
