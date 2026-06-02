/**
 * Health check endpoint
 * GET /api/health - Check health of all services
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
