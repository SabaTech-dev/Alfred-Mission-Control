/**
 * Swarm health proxy
 * GET /api/swarm/health — Proxies health check to Agent Swarm server
 */
import { NextResponse } from "next/server";

import { swarmFetch } from "@/lib/swarm-proxy";

export const dynamic = "force-dynamic";

interface SwarmHealthResponse {
  status: string;
  timestamp?: string;
  uptime?: number;
  [key: string]: unknown;
}

export async function GET() {
  const result = await swarmFetch<SwarmHealthResponse>("/api/health");

  if (!result.ok) {
    // Graceful: return structured error, not a cascade
    return NextResponse.json(
      {
        status: "unreachable",
        connected: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    status: "connected",
    connected: true,
    upstream: result.data,
    timestamp: new Date().toISOString(),
  });
}
