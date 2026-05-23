/**
 * Role-based access control for AMC admin pages.
 *
 * SECURITY MODEL:
 * - Uses JWT tokens for stateless session management (Edge-compatible)
 * - Admin-only routes require role: 'admin' in JWT payload
 * - Non-admin users get 403 Forbidden for admin routes
 *
 * @module role-based-access
 */

import { jwtUtils } from "./jwt-utils";

export type UserRole = "user" | "admin";

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
 * Check if a user has admin role based on JWT session token.
 *
 * @param token - JWT session token
 * @returns true if user is admin, false otherwise
 */
export async function isAdminFromToken(token: string): Promise<boolean> {
  const payload = await jwtUtils.verifyToken(token);
  if (!payload) return false;
  return payload.role === "admin";
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
