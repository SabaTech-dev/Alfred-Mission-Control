import { NextRequest, NextResponse } from "next/server";
import { listTasks } from "@/lib/kanban-db";
import { resolveDependencies, type ResolvedTask } from "@/lib/dependency-resolver";
import { requireAgentAuth } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  isExecutable: boolean;
  blockedReason: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
}

/**
 * GET /api/heartbeat/tasks
 * Returns tasks assigned to the agent.
 *
 * Query params:
 *   agentName  - required (must match X-Agent-Id)
 *   status     - optional filter: "backlog" | "in_progress" | "review" | "all"
 *                Defaults to "all" — returns backlog + in_progress + review for the agent
 *
 * Priority order: in_progress first, then backlog (by priority desc), then review
 */
export async function GET(request: NextRequest) {
  const authResult = requireAgentAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { agentId } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const requestedAgentName = searchParams.get("agentName");
    const statusFilter = searchParams.get("status");

    const agentName = requestedAgentName && requestedAgentName.trim().length > 0
      ? requestedAgentName.trim()
      : agentId;

    if (agentName !== agentId) {
      return NextResponse.json({
        error: "Agent mismatch",
        message: "agentName must match authenticated X-Agent-Id",
      }, { status: 403 });
    }

    // Determine which statuses to fetch
    let statuses: string[];
    if (statusFilter && statusFilter !== "all") {
      statuses = [statusFilter];
    } else {
      // Default: backlog + in_progress + review (the agent's active workflow)
      statuses = ["in_progress", "backlog", "review"];
    }

    // Fetch tasks across all relevant statuses
    let allTasks: any[] = [];
    for (const status of statuses) {
      const tasks = listTasks({
        assignee: agentName as string,
        status,
      });
      allTasks = allTasks.concat(tasks);
    }

    // Filter out tasks claimed by other agents
    const availableTasks = allTasks.filter((task) => {
      if (!task.claimedBy) return true;
      return task.claimedBy === agentName;
    });

    // Resolve dependencies to compute executability
    const resolvedTasks = resolveDependencies(availableTasks);

    // Sort: in_progress first, then backlog (high→medium→low), then review
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder: Record<string, number> = { in_progress: 0, backlog: 1, review: 2 };

    resolvedTasks.sort((a: ResolvedTask, b: ResolvedTask) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      const pa = priorityOrder[(a as any).priority] ?? 9;
      const pb = priorityOrder[(b as any).priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return 0;
    });

    // Transform to response format
    const response: TaskResponse[] = resolvedTasks.map((task: ResolvedTask) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: (task as any).priority,
      status: task.status,
      isExecutable: task.isExecutable,
      blockedReason: task.blockedReason,
      claimedBy: task.claimedBy,
      claimedAt: task.claimedAt,
    }));

    return NextResponse.json({
      agentName,
      count: response.length,
      tasks: response,
    });
  } catch (error) {
    console.error("[tasks] Error getting tasks:", error);
    return NextResponse.json(
      { error: "Failed to get tasks" },
      { status: 500 }
    );
  }
}
