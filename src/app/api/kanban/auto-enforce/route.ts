/**
 * Auto-Enforce Endpoint for Pipeline Governance
 *
 * POST /api/kanban/auto-enforce
 *
 * This endpoint enforces timeout rules on Kanban tasks to prevent stuck tasks
 * and improve pipeline transparency.
 *
 * Rules:
 * 1. Tasks in 'review' > 12h without comment → auto-comment + notify specialist
 * 2. Tasks in 'in_progress' > 2h → ping specialist
 * 3. Tasks in 'in_progress' > 4h → escalate to Alfred (main)
 *
 * This endpoint is designed to be called by a cron job every 15 minutes.
 */

import { NextRequest, NextResponse } from "next/server";
import { listTasks, getTask, createTaskComment, updateTask } from "@/lib/kanban-db";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activities-db";

export const dynamic = "force-dynamic";

// Threshold configurations — configurable via env vars, with sensible defaults
const REVIEW_TIMEOUT_MS = parseMsEnv('KANBAN_REVIEW_TIMEOUT_HOURS', 12) * 60 * 60 * 1000;
const IN_PROGRESS_WARNING_MS = parseMsEnv('KANBAN_PROGRESS_WARNING_HOURS', 2) * 60 * 60 * 1000;
const IN_PROGRESS_ESCALATE_MS = parseMsEnv('KANBAN_PROGRESS_ESCALATE_HOURS', 4) * 60 * 60 * 1000;
const REVIEW_NO_COMMENT_MS = parseMsEnv('KANBAN_REVIEW_NO_COMMENT_HOURS', 6) * 60 * 60 * 1000;

function parseMsEnv(key: string, defaultHours: number): number {
  const val = process.env[key];
  if (val) {
    const parsed = parseFloat(val);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return defaultHours;
}

interface EnforceResult {
  taskId: string;
  title: string;
  action: "ping" | "escalate" | "comment" | "none";
  reason: string;
  timestamp: string;
}

interface AutoEnforceResponse {
  success: boolean;
  processed: number;
  actions: EnforceResult[];
  summary: {
    pings: number;
    escalates: number;
    comments: number;
    noAction: number;
  };
}

/**
 * POST /api/kanban/auto-enforce
 * Enforce timeout rules on Kanban tasks
 */
export async function POST(request: NextRequest) {
  // Require agent or session authentication
  const authResult = await requireAgentOrSessionAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  const actorId: string = authResult.authType === "agent" ? (authResult.agentId ?? "system") : "system";

  try {
    const now = Date.now();
    const results: EnforceResult[] = [];

    // Get all active tasks (not done, not archived)
    const activeTasks = listTasks({
      status: undefined, // Get all statuses
    }).filter(
      (task) => task.status !== "done" && !task.archived
    );

    console.log(`[auto-enforce] Processing ${activeTasks.length} active tasks`);

    for (const task of activeTasks) {
      const result = await enforceTaskRules(task, now, actorId);
      results.push(result);
    }

    // Calculate summary
    const summary = {
      pings: results.filter((r) => r.action === "ping").length,
      escalates: results.filter((r) => r.action === "escalate").length,
      comments: results.filter((r) => r.action === "comment").length,
      noAction: results.filter((r) => r.action === "none").length,
    };

    // Log activity
    logActivity(
      "pipeline-governance",
      `Auto-enforce completado: ${summary.pings} pings, ${summary.escalates} escalados, ${summary.comments} comentarios`,
      "info",
      {
        agent: actorId,
        metadata: {
          processed: activeTasks.length,
          summary,
        },
      }
    );

    const response: AutoEnforceResponse = {
      success: true,
      processed: activeTasks.length,
      actions: results,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[auto-enforce] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Enforce rules on a single task
 */
async function enforceTaskRules(
  task: any,
  now: number,
  actorId: string
): Promise<EnforceResult> {
  const updated = new Date(task.updated_at).getTime();
  const timeInStatus = now - updated;

  // Rule 1: Tasks in 'review' without recent comment
  if (task.status === "review") {
    const lastComment = getLastCommentTime(task.id);
    const timeSinceComment = lastComment ? now - lastComment : timeInStatus;

    // Two sub-rules: long review (>REVIEW_TIMEOUT) or no comments (>REVIEW_NO_COMMENT)
    const timeoutToUse = Math.min(timeSinceComment > REVIEW_NO_COMMENT_MS ? timeSinceComment : Infinity, timeInStatus);
    
    if (timeInStatus > REVIEW_TIMEOUT_MS || timeSinceComment > REVIEW_NO_COMMENT_MS) {
      const idleReason = timeInStatus > REVIEW_TIMEOUT_MS
        ? `Review task idle for ${formatDuration(timeInStatus)} (status timeout)`
        : `Review task has no comments for ${formatDuration(timeSinceComment)}`;

      await addAutoComment(
        task.id,
        `⚠️ **Auto-Enforce**: ${idleReason}. Revisa y añade comentarios o toma acción.`,
        actorId
      );
      await notifySpecialist(task.assignee, task.title, "review", Math.max(timeInStatus, timeSinceComment));

      return {
        taskId: task.id,
        title: task.title,
        action: "comment",
        reason: idleReason,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Rule 2: Tasks in 'in_progress' > 2h → ping specialist
  if (task.status === "in_progress") {
    if (timeInStatus > IN_PROGRESS_ESCALATE_MS) {
      // Rule 3: Tasks in 'in_progress' > 4h → escalate to Alfred
      await escalateToAlfred(task, timeInStatus, actorId);

      return {
        taskId: task.id,
        title: task.title,
        action: "escalate",
        reason: `Tarea en progreso durante ${formatDuration(timeInStatus)} (>4h)`,
        timestamp: new Date().toISOString(),
      };
    } else if (timeInStatus > IN_PROGRESS_WARNING_MS) {
      await addAutoComment(
        task.id,
        "🔔 **Auto-Enforce**: Esta tarea está en progreso desde hace más de 2 horas. ¿Necesitas ayuda?",
        actorId
      );
      await notifySpecialist(task.assignee, task.title, "in_progress", timeInStatus);

      return {
        taskId: task.id,
        title: task.title,
        action: "ping",
        reason: `Tarea en progreso durante ${formatDuration(timeInStatus)} (>2h)`,
        timestamp: new Date().toISOString(),
      };
    }
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
 * Get the timestamp of the last comment on a task
 */
function getLastCommentTime(taskId: string): number | null {
  try {
    // Import dynamically to avoid circular dependencies
    const { listTaskComments } = require("@/lib/kanban-db");
    const comments = listTaskComments({ taskId });
    if (comments.length === 0) return null;
    const lastComment = comments[comments.length - 1];
    return new Date(lastComment.created_at).getTime();
  } catch (error) {
    console.error(`[auto-enforce] Error getting comments for ${taskId}:`, error);
    return null;
  }
}

/**
 * Add an automatic comment to a task
 */
async function addAutoComment(
  taskId: string,
  message: string,
  actorId: string
): Promise<void> {
  try {
    createTaskComment({
      taskId,
      authorType: "agent",
      authorId: actorId,
      body: message,
    });
  } catch (error) {
    console.error(`[auto-enforce] Error adding comment to ${taskId}:`, error);
  }
}

/**
 * Notify a specialist about a task
 * Writes .pipeline-status flag and logs for Alfred heartbeat pickup.
 */
async function notifySpecialist(
  assignee: string | null,
  taskTitle: string,
  status: string,
  duration: number
): Promise<void> {
  if (!assignee) return;

  // Write flag for Alfred heartbeat to detect
  writePipelineFlag("PING", {
    agent: assignee,
    title: taskTitle.substring(0, 50),
    status,
    duration: formatDuration(duration),
  });

  logActivity(
    "pipeline-governance",
    `Notificación auto-enforce: ${assignee} — tarea "${taskTitle}" en ${status} durante ${formatDuration(duration)}`,
    "info",
    {
      agent: "auto-enforce",
      metadata: {
        targetAgent: assignee,
        taskTitle,
        status,
        duration,
        action: "notify",
      },
    }
  );

  console.log(`[auto-enforce] Notified ${assignee} about task "${taskTitle}" (flag + log)`);
}


/**
 * Write an action flag to .pipeline-status for Alfred heartbeat detection.
 * Ensures Alfred knows about auto-enforce actions without waiting for manual check.
 */
function writePipelineFlag(action: string, details: Record<string, string>): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const flagPath = path.join(
      process.env.HOME || '/home/ubuntu',
      '.openclaw',
      'workspace',
      '.pipeline-status'
    );
    const timestamp = new Date().toISOString();
    const params = Object.entries(details).map(([k, v]) => `${k}=${v}`).join('|');
    const entry = `${timestamp}:${action}|${params}`;
    let existing = '';
    if (fs.existsSync(flagPath)) {
      existing = fs.readFileSync(flagPath, 'utf8').trim();
      if (existing && !existing.endsWith('CLEAN')) {
        fs.writeFileSync(flagPath, existing + '\n' + entry + '\n');
      } else {
        fs.writeFileSync(flagPath, entry + '\n');
      }
    } else {
      fs.writeFileSync(flagPath, entry + '\n');
    }
    console.log(`[auto-enforce] Wrote .pipeline-status flag: ${action}`);
  } catch (flagError) {
    console.error('[auto-enforce] Could not write .pipeline-status flag:', flagError);
  }
}
/**
/**
 * Escalate a task to Alfred (main agent)
 * Adds a comment, writes .pipeline-status flag, and logs for heartbeat pickup.
 * Does NOT auto-block — Alfred decides next action.
 */
async function escalateToAlfred(
  task: any,
  duration: number,
  actorId: string
): Promise<void> {
  try {
    createTaskComment({
      taskId: task.id,
      authorType: "agent",
      authorId: actorId,
      commentType: "comment",
      body: `🚨 **ESCALADO**: Tarea en progreso durante ${formatDuration(duration)} (>4h). Marcada para revisión de Alfred. Especialista: ${task.assignee || "sin asignar"}.`,
    });

    // Write flag for Alfred heartbeat to detect immediately
    writePipelineFlag("ESCALATION", {
      taskId: task.id,
      title: task.title.substring(0, 50),
      assignee: task.assignee || "none",
      duration: formatDuration(duration),
    });

    logActivity(
      "pipeline-governance",
      `Tarea escalada: ${task.title} (${task.id}) - en progreso durante ${formatDuration(duration)}`,
      "warning",
      {
        agent: actorId,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          assignee: task.assignee,
          duration,
          action: "escalate_flag",
          note: ".pipeline-status flag written. Alfred decides via heartbeat.",
        },
      }
    );

    console.log(`[auto-enforce] Escalated task "${task.title}" to Alfred (flagged, not blocked)`);
  } catch (error) {
    console.error(`[auto-enforce] Error escalating task ${task.id}:`, error);
  }
}

/**
 * Format duration in milliseconds to human-readable format
 * Handles Infinity and NaN gracefully
 */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "unknown";
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
