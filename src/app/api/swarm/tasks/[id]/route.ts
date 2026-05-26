/**
 * Swarm single task proxy
 * GET /api/swarm/tasks/[id] — Get a specific task
 * PATCH /api/swarm/tasks/[id] — Update a task (e.g. mark done)
 * DELETE /api/swarm/tasks/[id] — Delete a task
 */
import { NextRequest, NextResponse } from "next/server";

import { swarmFetch } from "@/lib/swarm-proxy";

export const dynamic = "force-dynamic";

async function proxyTask(
  req: NextRequest,
  params: { id: string },
  method: string,
) {
  const { id } = params;
  const body = method !== "GET" ? await req.text().catch(() => undefined) : undefined;

  const result = await swarmFetch(`/api/tasks/${id}`, {
    method,
    body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyTask(req, { id }, "GET");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyTask(req, { id }, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyTask(req, { id }, "DELETE");
}
