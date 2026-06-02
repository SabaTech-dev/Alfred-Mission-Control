/**
 * Swarm tasks proxy
 * GET /api/swarm/tasks — List tasks from Agent Swarm server
 * POST /api/swarm/tasks — Create a new task
 * PATCH /api/swarm/tasks/:id — Update a task
 */
import { NextRequest, NextResponse } from "next/server";

import { swarmFetch } from "@/lib/swarm-proxy";

export const dynamic = "force-dynamic";

// GET /api/swarm/tasks
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const agentId = searchParams.get("agentId");

  let path = "/api/tasks";
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (agentId) params.set("agentId", agentId);
  if (params.toString()) path += `?${params.toString()}`;

  const result = await swarmFetch(path);

  if (!result.ok) {
    return NextResponse.json(
      { tasks: [], total: 0, connected: false, error: result.error },
      { status: result.status },
    );
  }

  // Normalize response
  const raw = result.data;
  const tasks = Array.isArray(raw) ? raw : raw.tasks || raw.data || [];
  const total = Array.isArray(raw) ? raw.length : raw.total || tasks.length;

  return NextResponse.json({ tasks, total, connected: true });
}

// POST /api/swarm/tasks
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await swarmFetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
