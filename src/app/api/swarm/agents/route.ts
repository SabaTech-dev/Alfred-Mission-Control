/**
 * Swarm agents proxy
 * GET /api/swarm/agents — Proxies agent list from Agent Swarm server
 */
import { NextResponse } from "next/server";

import { swarmFetch } from "@/lib/swarm-proxy";

export const dynamic = "force-dynamic";

interface SwarmAgent {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

interface SwarmAgentsPayload {
  agents?: SwarmAgent[];
  [key: string]: unknown;
}

export async function GET() {
  const result = await swarmFetch<SwarmAgentsPayload | SwarmAgent[]>("/api/agents");

  if (!result.ok) {
    return NextResponse.json(
      {
        agents: [],
        connected: false,
        error: result.error,
      },
      { status: result.status },
    );
  }

  // Normalize: Swarm may return array or { agents: [...] }
  const raw = result.data;
  const agents: SwarmAgent[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.agents)
      ? raw.agents
      : [];

  return NextResponse.json({
    agents,
    connected: true,
  });
}
