/**
 * Detailed health check endpoint (F-B)
 * GET /api/health/detail - authenticated: full per-service checks
 * Requires an authenticated session (enforced by middleware: not in PUBLIC_API_ROUTES).
 */
import { NextResponse } from "next/server";

import {
  collectStackServiceChecks,
  summarizeStackHealth,
} from "@/lib/stack-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = await collectStackServiceChecks();
  const overallStatus = summarizeStackHealth(checks);

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
