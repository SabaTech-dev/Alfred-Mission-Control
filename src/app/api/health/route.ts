/**
 * Health check endpoint (F-B: minimal public surface)
 * GET /api/health - public: { status } only, no service detail
 * Full per-service detail lives at GET /api/health/detail (authenticated)
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "healthy" });
}
