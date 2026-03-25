import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getAgentWorkload, listTasks, type AgentWorkload } from "@/lib/kanban-db";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/workload
 * Returns workload statistics for all agents or a specific agent
 * Query params: agentName (optional) - filter to a specific agent
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authResult = await requireAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agentName");

    if (agentName) {
      const workload = getAgentWorkload(agentName);
      return NextResponse.json({ workloads: [workload] });
    }

    const tasks = listTasks();
    const agentSet = new Set<string>();

    for (const task of tasks) {
      if (task.assignee) {
        agentSet.add(task.assignee);
      }
      if (task.claimedBy) {
        agentSet.add(task.claimedBy);
      }
    }

    const workloads: AgentWorkload[] = [];
    for (const agent of agentSet) {
      workloads.push(getAgentWorkload(agent));
    }

    workloads.sort((a, b) => {
      const aTotal = a.todo + a.inProgress + a.claimed;
      const bTotal = b.todo + b.inProgress + b.claimed;
      return bTotal - aTotal;
    });

    return NextResponse.json({ workloads });
  } catch (error) {
    console.error("[workload] Error getting agent workloads:", error);
    return NextResponse.json(
      { error: "Failed to get agent workloads" },
      { status: 500 }
    );
  }
}
