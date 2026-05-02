import type { NextRequest } from "next/server";

export function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get("auth_token")?.value;
  return !!token;
}

export function requireAuth(request: NextRequest): void {
  if (!isAuthenticated(request)) {
    throw new Error("Unauthorized");
  }
}
