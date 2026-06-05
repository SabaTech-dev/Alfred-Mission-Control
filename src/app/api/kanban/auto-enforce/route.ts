/**
 * Auto-Enforce Endpoint for Pipeline Governance
 *
 * POST /api/kanban/auto-enforce
 *
 * This endpoint enforces timeout rules on Kanban tasks to prevent stuck tasks
 * and improve pipeline transparency.
 *
 * Rules:
 * 1. Dedup: detect same-title+assignee in_progress tasks → close all but newest
 * 2. backlog/in_progress/review > 1h → notify specialist (notification)
 * 3. review > 2h → escalate to Alfred for decision (notification)
 * 4. FAIL from security/qa-tester → reassign to coder + notification
 * 5. Cron executor processes notifications[] and executes sessions_send
 *
 * Called by the `Kanban Auto-Enforce` cron job every 40 minutes.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listTasks,
  getTask,
  createTaskComment,
  updateTask,
  listTaskComments,
} from "@/lib/kanban-db";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activities-db";

export const dynamic = "force-dynamic";

// ── Timeout thresholds (aggressive: 1h warning, 2h escalation) ──
const STALE_TASK_WARNING_MS = parseMsEnv('KANBAN_STALE_WARNING_HOURS', 1) * 60 * 60 * 1000;
const REVIEW_ESCALATE_MS = parseMsEnv('KANBAN_REVIEW_ESCALATE_HOURS', 2) * 60 * 60 * 1000;
const REVIEW_NO_COMMENT_MS = parseMsEnv('KANBAN_REVIEW_NO_COMMENT_HOURS', 2) * 60 * 60 * 1000;

function parseMsEnv(key: string, defaultHours: number): number {
  const val = process.env[key];
  if (val) {
    const parsed = parseFloat(val);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return defaultHours;
}

// ── Types ──

interface EnforceResult {
  taskId: string;
  title: string;
  action: "ping" | "escalate" | "comment" | "dedup_closed" | "fail_reroute" | "ltg_escalated" | "none";
  reason: string;
  timestamp: string;
}

interface Notification {
  type: "sessions_send" | "telegram";
  target: string;
  message: string;
}

interface AutoEnforceResponse {
  success: boolean;
  processed: number;
  dedup_closed: EnforceResult[];
  actions: EnforceResult[];
  notifications: Notification[];
  summary: {
    pings: number;
    escalates: number;
    comments: number;
    dedup_closed: number;
    fail_rerouted: number;
    ltgEscalated: number;
    noAction: number;
  };
}

// ── Helpers ──

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(fase\s*\d+|phase\s*\d+)/g, 'faseN')
    .trim();
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function getLastCommentTime(taskId: string): number | null {
  try {
    const comments = listTaskComments({ taskId });
    if (comments.length === 0) return null;
    return new Date(comments[comments.length - 1].created_at).getTime();
  } catch (error) {
    console.error(`[auto-enforce] Error getting comments for ${taskId}:`, error);
    return null;
  }
}

function addAutoComment(taskId: string, message: string, actorId: string): void {
  try {
    createTaskComment({ taskId, authorType: "agent", authorId: actorId, body: message });
  } catch (error) {
    console.error(`[auto-enforce] Error adding comment to ${taskId}:`, error);
  }
}

// ── Main Handler ──

export async function POST(request: NextRequest) {
  const authResult = await requireAgentOrSessionAuth(request);
  if (!authResult.authorized) return authResult.error;

  const actorId = authResult.authType === "agent" ? (authResult.agentId ?? "system") : "system";
  const now = Date.now();
  const dedupClosed: EnforceResult[] = [];
  const results: EnforceResult[] = [];
  const notifications: Notification[] = [];

  try {
    // ── 1. Get all active (not done, not archived) tasks ──
    const allTasks = listTasks({ status: undefined }).filter(
      (t: any) => t.status !== "done" && !t.archived
    );
    console.log(`[auto-enforce] ${allTasks.length} active tasks`);

    // ── 2. Dedup: close duplicate in_progress tasks ──
    const groups = new Map<string, any[]>();
    for (const task of allTasks) {
      if (task.status !== "in_progress" || !task.assignee) continue;
      const key = `${normalizeTitle(task.title)}::${task.assignee}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }

    const dedupRemaining = new Set<string>();
    for (const [, group] of groups) {
      if (group.length <= 1) {
        dedupRemaining.add(group[0].id);
        continue;
      }
      group.sort(
        (a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      dedupRemaining.add(group[0].id);
      for (const dup of group.slice(1)) {
        try {
          updateTask(dup.id, { status: "done" });
          addAutoComment(
            dup.id,
            `🔁 **Auto-Enforce**: Duplicado cerrado. Tarea activa: \`${group[0].id}\``,
            actorId
          );
          logActivity(
            "pipeline-governance",
            `Duplicado cerrado: ${dup.title} (${dup.id}) → activa: ${group[0].id}`,
            "info",
            { agent: actorId, metadata: { closedTaskId: dup.id, keptTaskId: group[0].id } }
          );
          dedupClosed.push({
            taskId: dup.id,
            title: dup.title,
            action: "dedup_closed",
            reason: `Duplicado de ${group[0].id}`,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error(`[auto-enforce] Error closing duplicate ${dup.id}:`, e);
        }
      }
    }

    // ── 3. Check stale LTG auto-generated tasks in backlog ──
    const autoGeneratedStale = checkAutoGeneratedStaleTasks(allTasks, now, actorId, notifications);
    for (const r of autoGeneratedStale) {
      results.push(r);
    }

    // ── 4. Process remaining active tasks for timeouts ──
    const remaining = allTasks.filter(
      (t: any) => t.status !== "in_progress" || dedupRemaining.has(t.id)
    );

    for (const task of remaining) {
      const result = await enforceTaskRules(task, now, actorId, notifications);
      results.push(result);
    }

    // ── 5. Summary ──
    const summary = {
      pings: results.filter((r) => r.action === "ping").length,
      escalates: results.filter((r) => r.action === "escalate").length,
      comments: results.filter((r) => r.action === "comment").length,
      dedup_closed: dedupClosed.length,
      fail_rerouted: results.filter((r) => r.action === "fail_reroute").length,
      ltgEscalated: results.filter((r) => r.action === "ltg_escalated").length,
      noAction: results.filter((r) => r.action === "none").length,
    };

    logActivity(
      "pipeline-governance",
      `Auto-enforce: ${summary.pings} pings, ${summary.escalates} escalados, ${summary.dedup_closed} dedup, ${summary.fail_rerouted} rerouted, ${summary.ltgEscalated} ltg_escalated`,
      "info",
      { agent: actorId, metadata: { processed: allTasks.length, summary, notifications: notifications.length } }
    );

    const response: AutoEnforceResponse = {
      success: true,
      processed: allTasks.length,
      dedup_closed: dedupClosed,
      actions: results,
      notifications,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[auto-enforce] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ── Per-task enforcement ──

async function enforceTaskRules(
  task: any,
  now: number,
  actorId: string,
  notifications: Notification[]
): Promise<EnforceResult> {
  const updated = new Date(task.updated_at).getTime();
  const timeInStatus = now - updated;

  // ── Rule: FAIL from security/qa-tester → reroute to coder ──
  if (task.status === "in_progress" || task.status === "review") {
    const hasFailFindings = checkForFailFindings(task);
    if (hasFailFindings && task.assignee !== "coder") {
      try {
        updateTask(task.id, { assignee: "coder" });
        addAutoComment(
          task.id,
          `🔄 **Auto-Enforce**: FAIL detectado de Security/QA. Reasignada a coder para aplicar fixes.`,
          actorId
        );
        notifications.push({
          type: "sessions_send",
          target: "coder",
          message: `🛠️ Tarea "${task.title}" tiene FAIL de Security/QA y te ha sido reasignada. Revisa los findings y aplica fixes.`,
        });
        logActivity(
          "pipeline-governance",
          `FAIL reroute: ${task.title} → coder`,
          "info",
          { agent: actorId, metadata: { taskId: task.id, fromAssignee: task.assignee } }
        );
        return {
          taskId: task.id,
          title: task.title,
          action: "fail_reroute",
          reason: `FAIL findings → reassigned to coder (was: ${task.assignee})`,
          timestamp: new Date().toISOString(),
        };
      } catch (e) {
        console.error(`[auto-enforce] Error rerouting FAIL task ${task.id}:`, e);
      }
    }
  }

  // ── Rule: backlog > 1h → notify intended assignee ──
  if (task.status === "backlog") {
    if (timeInStatus > STALE_TASK_WARNING_MS && task.assignee) {
      notifications.push({
        type: "sessions_send",
        target: task.assignee,
        message: `📋 Tarea "${task.title}" lleva >1h en **backlog**. ¿Puedes tomarla?`,
      });
      return {
        taskId: task.id,
        title: task.title,
        action: "ping",
        reason: `Backlog >1h, notified ${task.assignee}`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      taskId: task.id,
      title: task.title,
      action: "none",
      reason: "Backlog reciente o sin asignar",
      timestamp: new Date().toISOString(),
    };
  }

  // ── Rule: in_progress > 1h → notify specialist; > 2h → escalate (review only) ──
  if (task.status === "in_progress") {
    if (timeInStatus > STALE_TASK_WARNING_MS) {
      // Notify the specialist
      if (task.assignee) {
        notifications.push({
          type: "sessions_send",
          target: task.assignee,
          message: `⏰ Tarea "${task.title}" lleva >${formatDuration(timeInStatus)} en **progreso**. ¿Necesitas ayuda o está completada?`,
        });
      }
      return {
        taskId: task.id,
        title: task.title,
        action: "ping",
        reason: `In_progress >1h (${formatDuration(timeInStatus)}), notified ${task.assignee || "nadie"}`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      taskId: task.id,
      title: task.title,
      action: "none",
      reason: "En progreso reciente",
      timestamp: new Date().toISOString(),
    };
  }

  // ── Rule: review > 1h → notify assignee; > 2h → escalate to Alfred ──
  if (task.status === "review") {
    // Always ping at 1h
    if (timeInStatus > STALE_TASK_WARNING_MS && task.assignee) {
      notifications.push({
        type: "sessions_send",
        target: task.assignee,
        message: `👀 Tarea "${task.title}" lleva >${formatDuration(timeInStatus)} en **review**. ¿Puedes revisarla?`,
      });
    }

    // Escalate to Alfred at 2h — ONLY if assignee is main (awaiting Alfred's approval)
    // If assignee is another agent, ping them harder instead
    if (timeInStatus > REVIEW_ESCALATE_MS) {
      if (task.assignee === "main" || !task.assignee) {
        notifications.push({
          type: "sessions_send",
          target: "main",
          message: `📋 **DECISIÓN REQUERIDA**: Tarea "${task.title}" en **review** desde hace ${formatDuration(timeInStatus)}. ¿La apruebo (DONE) o la devuelvo al pipeline?`,
        });

        addAutoComment(
          task.id,
          `🚨 **Auto-Enforce**: Review >2h. Notificado Alfred para decisión.`,
          actorId
        );

        return {
          taskId: task.id,
          title: task.title,
          action: "escalate",
          reason: `Review >2h (${formatDuration(timeInStatus)}), notified Alfred`,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Task is in review but assigned to another agent — notify them, not Alfred
        notifications.push({
          type: "sessions_send",
          target: task.assignee,
          message: `⏰ Tarea "${task.title}" lleva >${formatDuration(timeInStatus)} en **review** asignada a ti. ¿Está completada? Muévela a done o al siguiente paso del pipeline.`,
        });

        return {
          taskId: task.id,
          title: task.title,
          action: "ping",
          reason: `Review >2h (${formatDuration(timeInStatus)}), pinged assignee ${task.assignee}`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // No comments for >2h → add comment
    if (timeInStatus > REVIEW_NO_COMMENT_MS) {
      const lastComment = getLastCommentTime(task.id);
      const timeSinceComment = lastComment ? now - lastComment : timeInStatus;
      if (timeSinceComment > REVIEW_NO_COMMENT_MS) {
        addAutoComment(
          task.id,
          `⚠️ **Auto-Enforce**: Sin actividad en ${formatDuration(timeSinceComment)}. Por favor revisa y toma acción.`,
          actorId
        );
        return {
          taskId: task.id,
          title: task.title,
          action: "comment",
          reason: `Sin comentarios en ${formatDuration(timeSinceComment)}`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return {
      taskId: task.id,
      title: task.title,
      action: timeInStatus > STALE_TASK_WARNING_MS ? "ping" : "none",
      reason: timeInStatus > STALE_TASK_WARNING_MS ? "Review >1h, notified" : "Review reciente",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    taskId: task.id,
    title: task.title,
    action: "none",
    reason: "Sin acción necesaria",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check for stale auto-generated tasks (created by Learning Task Generator).
 * Tasks with label containing "auto-generated" that have been in backlog > N hours.
 * Escalates to Alfred for review/informing Joker.
 */
function checkAutoGeneratedStaleTasks(
  tasks: any[],
  now: number,
  actorId: string,
  notifications: Notification[]
): EnforceResult[] {
  const results: EnforceResult[] = [];
  const nowISO = new Date().toISOString();

  for (const task of tasks) {
    if (task.status !== "backlog") continue;

    // Parse labels (can be JSON array of objects or simple strings)
    let hasAutoGenerated = false;
    try {
      const labels = typeof task.labels === "string" ? JSON.parse(task.labels) : (task.labels || []);
      for (const lbl of labels) {
        if (typeof lbl === "string" && lbl === "auto-generated") {
          hasAutoGenerated = true;
          break;
        }
        if (typeof lbl === "object" && (lbl.name === "auto-generated" || lbl.name === "#auto-generated")) {
          hasAutoGenerated = true;
          break;
        }
      }
    } catch {
      continue;
    }

    if (!hasAutoGenerated) continue;

    const created = new Date(task.created_at).getTime();
    const age = now - created;

    if (age > AUTO_GENERATED_STALE_MS) {
      const ageFormatted = formatDuration(age);

      notifications.push({
        type: "sessions_send",
        target: "main",
        message: `📋 **LTG ALERTA**: Tarea auto-generada "${task.title}" lleva ${ageFormatted} en backlog. Creada: ${task.created_at}. Revisa si es accionable o descartarla.`,
      });

      addAutoComment(
        task.id,
        `🚨 **Auto-Enforce**: Esta tarea auto-generada lleva ${ageFormatted} en backlog (umbral: ${formatDuration(AUTO_GENERATED_STALE_MS)}). Escalada a Alfred.`,
        actorId
      );

      logActivity(
        "pipeline-governance",
        `LTG stale escalate: ${task.title} (${task.id}) ${ageFormatted} en backlog`,
        "warning",
        { agent: actorId, metadata: { taskId: task.id, ageMs: age, thresholdMs: AUTO_GENERATED_STALE_MS } }
      );

      results.push({
        taskId: task.id,
        title: task.title,
        action: "ltg_escalated",
        reason: `Auto-generated task stale ${ageFormatted} in backlog (threshold: ${formatDuration(AUTO_GENERATED_STALE_MS)})`,
        timestamp: nowISO,
      });
    }
  }

  return results;
}

/**
 * Check if a task has FAIL findings from security or qa-tester.
 * Scans comments for FAIL/Hallazgos/HIGH/CRITICAL patterns from agent authors.
 */
function checkForFailFindings(task: any): boolean {
  try {
    const comments = listTaskComments({ taskId: task.id });
    return comments.some((c: any) => {
      if (c.authorType !== "agent") return false;
      if (!["security", "qa-tester"].includes(c.authorId)) return false;
      const body = (c.body || "").toLowerCase();
      return (
        body.includes("**fail**") ||
        body.includes("**hallazgo") ||
        body.includes("finding") ||
        (body.includes("hallazgos") && (body.includes("high") || body.includes("critical") || body.includes("medium")))
      );
    });
  } catch (error) {
    console.error(`[auto-enforce] Error checking FAIL findings for ${task.id}:`, error);
    return false;
  }
}
