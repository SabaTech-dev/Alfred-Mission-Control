import { NextResponse } from "next/server";

import { getSystemStatus } from "@/lib/system-status";

export const dynamic = "force-dynamic";

/** GET /api/system/status — compact hostname + uptime for the location badge. */
export async function GET() {
  try {
    const status = getSystemStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to fetch system status:", error);
    return NextResponse.json(
      { error: "Failed to fetch system status" },
      { status: 500 },
    );
  }
}
