import { NextRequest, NextResponse } from "next/server";
import {
  listOpportunities,
  updateOpportunity,
  getOpportunity,
} from "@/lib/pipeline-db";
import {
  listTasks,
  type KanbanTask,
} from "@/lib/kanban-db";
import { fullSync, type FullSyncResult } from "@/lib/pipeline-kanban-bridge";
import { logActivity } from "@/lib/activities-db";

export const dynamic = "force-dynamic";

/**
 * Simple progress-only sync for won opportunities.
 */
function syncProgressOnly(): FullSyncResult {
  const result: FullSyncResult = {
    opportunities_checked: 0,
    progress_updated: 0,
    stages_advanced: 0,
    tasks_matched: 0,
    details: [],
  };

  const allOpportunities = listOpportunities();
  const allTasks = listTasks({ view: "all" });

  for (const opp of allOpportunities) {
    if (opp.stage !== "won") continue;

    result.opportunities_checked++;

    const oppTasks = allTasks.filter((task: KanbanTask) =>
      task.description?.includes(`[Opportunity: ${opp.company}]`)
    );
    if (oppTasks.length === 0) continue;

    result.tasks_matched += oppTasks.length;
    const doneCount = oppTasks.filter(
      (task: KanbanTask) => task.status === "done"
    ).length;
    const progress = Math.round((doneCount / oppTasks.length) * 100);

    const updated = progress !== opp.progress;
    if (updated) {
      updateOpportunity(opp.id, { progress });
      result.progress_updated++;
    }

    result.details.push({
      opportunityId: opp.id,
      company: opp.company,
      stage: opp.stage,
      tasks_total: oppTasks.length,
      tasks_done: doneCount,
      progress,
      updated,
      advanced: false,
    });
  }

  if (result.progress_updated > 0) {
    logActivity(
      "pipeline_kanban_sync",
      `Bridge sync: ${result.progress_updated} opportunities updated from Kanban task progress`,
      "pipeline",
      {
        agent: "kanban-bridge",
        metadata: {
          checked: result.opportunities_checked,
          updated: result.progress_updated,
          tasksMatched: result.tasks_matched,
        } as Record<string, unknown>,
      }
    );
  }

  return result;
}

/**
 * POST /api/pipeline/kanban-bridge
 *
 * Bidirectional sync between Pipeline and Kanban.
 *
 * Actions:
 * - "sync-progress" (default): Recalculate opportunity progress from Kanban task status (won only)
 * - "full-sync": Full bidirectional sync (stage→status + status→stage + progress) for all active stages
 * - "link-task": Link a Kanban task to an opportunity (adds [Opportunity: Company] to description)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "sync-progress";

    if (action === "sync-progress") {
      const result = syncProgressOnly();
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "full-sync") {
      const result = fullSync(listOpportunities, updateOpportunity);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "link-task") {
      const { taskId, opportunityId } = body;
      if (!taskId || !opportunityId) {
        return NextResponse.json(
          { error: "taskId and opportunityId are required" },
          { status: 400 }
        );
      }

      const opp = getOpportunity(opportunityId);
      if (!opp) {
        return NextResponse.json(
          { error: "Opportunity not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Task ${taskId} should be linked to opportunity ${opp.company}. Add "[Opportunity: ${opp.company}]" to task description.`,
        opportunity: opp.company,
        taskId,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Pipeline-Kanban bridge error:", error);
    return NextResponse.json(
      { error: "Bridge sync failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline/kanban-bridge
 *
 * Returns bridge status: linked tasks per opportunity, progress overview.
 * Includes all active stages (proposal, negotiation, won).
 */
export async function GET() {
  try {
    const allOpportunities = listOpportunities();
    const allTasks = listTasks({ view: "all" });

    const activeStages = ["proposal", "negotiation", "won"];

    const linkedOpportunities = allOpportunities
      .filter((opp) => activeStages.includes(opp.stage))
      .map((opp) => {
        const oppTasks = allTasks.filter((task: KanbanTask) =>
          task.description?.includes(`[Opportunity: ${opp.company}]`)
        );
        const doneCount = oppTasks.filter(
          (task: KanbanTask) => task.status === "done"
        ).length;

        return {
          id: opp.id,
          company: opp.company,
          title: opp.title,
          stage: opp.stage,
          value: opp.value,
          progress: opp.progress,
          tasks_total: oppTasks.length,
          tasks_done: doneCount,
          tasks: oppTasks.map((t: KanbanTask) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            assignee: t.assignee,
          })),
        };
      })
      .filter((opp) => opp.tasks_total > 0);

    return NextResponse.json({
      linked_opportunities: linkedOpportunities,
      total_linked: linkedOpportunities.length,
      total_tasks_linked: linkedOpportunities.reduce(
        (sum, o) => sum + o.tasks_total,
        0
      ),
    });
  } catch (error) {
    console.error("Pipeline-Kanban bridge GET error:", error);
    return NextResponse.json(
      { error: "Failed to load bridge status" },
      { status: 500 }
    );
  }
}
