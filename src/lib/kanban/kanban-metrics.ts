/**
 * Kanban Metrics, Listing, Claiming & Auto-Archive
 * Query operations, agent coordination, and archive lifecycle.
 */

import { getDb } from "@/lib/kanban-db";
import { getTask, parseTaskRow } from "./kanban-tasks";
import { logActivity } from "@/lib/activities-db";
import type {
  KanbanTask,
  ListTasksFilters,
  TasksStats,
  AgentWorkload,
  ClaimResult,
  ReleaseResult,
} from "./kanban-types";

// ============================================================================
// Auto-Archive Engine
// ============================================================================

let lastAutoArchiveSweep = 0;
const AUTO_ARCHIVE_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Get the configured auto-archive threshold in days (default: 7) */
export function getAutoArchiveDays(): number {
  const envValue = process.env.KANBAN_AUTO_ARCHIVE_DAYS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 7;
}

/**
 * Run auto-archive sweep if enough time has passed since last run.
 * Uses lazy throttle: only runs once per hour per process.
 * @returns Number of tasks archived, or 0 if sweep was throttled
 */
export function runAutoArchiveSweepIfDue(): number {
  const now = Date.now();
  if (now - lastAutoArchiveSweep < AUTO_ARCHIVE_SWEEP_INTERVAL_MS) {
    return 0;
  }
  lastAutoArchiveSweep = now;

  const db = getDb();
  const archiveDays = getAutoArchiveDays();
  const cutoffDate = new Date(now - archiveDays * 24 * 60 * 60 * 1000).toISOString();
  const archiveTimestamp = new Date(now).toISOString();

  const result = db.prepare(`
    UPDATE kanban_tasks
    SET archived = 1, archived_at = ?
    WHERE archived = 0
      AND status = 'done'
      AND done_at IS NOT NULL
      AND done_at <= ?
  `).run(archiveTimestamp, cutoffDate);

  if (result.changes > 0) {
    console.log(`[kanban-db] Auto-archived ${result.changes} done tasks (older than ${archiveDays} days)`);
  }

  return result.changes;
}

/** Force run auto-archive sweep (bypasses throttle). Useful for testing. */
export function forceAutoArchiveSweep(): number {
  lastAutoArchiveSweep = 0;
  return runAutoArchiveSweepIfDue();
}

// ============================================================================
// Task Listing & Stats
// ============================================================================

/**
 * List tasks with optional filters
 * Triggers auto-archive sweep on read (lazy, throttled).
 */
export function listTasks(filters?: ListTasksFilters): KanbanTask[] {
  runAutoArchiveSweepIfDue();

  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  const view = filters?.view ?? "active";
  if (view === "active") {
    conditions.push("archived = 0");
  } else if (view === "archived") {
    conditions.push("archived = 1");
  }

  if (filters?.status) { conditions.push("status = ?"); params.push(filters.status); }
  if (filters?.assignee) { conditions.push("assignee = ?"); params.push(filters.assignee); }
  if (filters?.priority) { conditions.push("priority = ?"); params.push(filters.priority); }
  if (filters?.search) {
    conditions.push("(title LIKE ? OR description LIKE ?)");
    const searchPattern = `%${filters.search}%`;
    params.push(searchPattern, searchPattern);
  }
  if (filters?.projectId !== undefined) { conditions.push("project_id = ?"); params.push(filters.projectId); }
  if (filters?.createdBy) { conditions.push("created_by = ?"); params.push(filters.createdBy); }
  if (filters?.domain) { conditions.push("domain = ?"); params.push(filters.domain); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`
    SELECT
      kanban_tasks.*,
      COALESCE(comment_counts.comment_count, 0) as comment_count
    FROM kanban_tasks
    LEFT JOIN (
      SELECT task_id, COUNT(*) as comment_count
      FROM task_comments
      GROUP BY task_id
    ) as comment_counts ON comment_counts.task_id = kanban_tasks.id
    ${where}
    ORDER BY kanban_tasks."order" ASC
  `).all(...params) as Record<string, unknown>[];

  return rows.map(parseTaskRow);
}

/** Get all tasks grouped by column */
export function getTasksByColumn(): Record<string, KanbanTask[]> {
  const tasks = listTasks();
  const result: Record<string, KanbanTask[]> = {};

  for (const task of tasks) {
    if (!result[task.status]) {
      result[task.status] = [];
    }
    result[task.status].push(task);
  }

  return result;
}

/** Get task statistics */
export function getTasksStats(includeArchived = false): TasksStats {
  runAutoArchiveSweepIfDue();

  const db = getDb();
  const archiveFilter = includeArchived ? "" : "WHERE archived = 0";

  const total = (db.prepare(`SELECT COUNT(*) as n FROM kanban_tasks ${archiveFilter}`).get() as { n: number }).n;

  const statusRows = db.prepare(`SELECT status, COUNT(*) as n FROM kanban_tasks ${archiveFilter} GROUP BY status`).all() as Array<{ status: string; n: number }>;
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.n;

  const priorityRows = db.prepare(`SELECT priority, COUNT(*) as n FROM kanban_tasks ${archiveFilter} GROUP BY priority`).all() as Array<{ priority: string; n: number }>;
  const byPriority: Record<string, number> = {};
  for (const r of priorityRows) byPriority[r.priority] = r.n;

  return { total, byStatus, byPriority };
}

// ============================================================================
// Agent Coordination
// ============================================================================

/** Atomically claim a task for an agent */
export function claimTask(taskId: string, agentName: string): ClaimResult {
  const db = getDb();
  const task = getTask(taskId);

  if (!task) {
    return { success: false, reason: "not_found" };
  }

  if (task.claimedBy === agentName) {
    return { success: true, task };
  }

  if (task.claimedBy !== null) {
    return { success: false, reason: "claimed_by_other" };
  }

  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE kanban_tasks
    SET claimed_by = ?, claimed_at = ?, updated_at = ?
    WHERE id = ? AND claimed_by IS NULL
  `).run(agentName, now, now, taskId);

  if (result.changes === 0) {
    return { success: false, reason: "already_claimed" };
  }

  const claimedTask = getTask(taskId);

  logActivity("task", `Task "${task.title}" claimed by ${agentName}`, "success", {
    metadata: { taskId, taskTitle: task.title, agentName },
  });

  return { success: true, task: claimedTask ?? undefined };
}

/** Release a task claim. Only the claiming agent can release. */
export function releaseTask(taskId: string, agentName: string): ReleaseResult {
  const db = getDb();
  const task = getTask(taskId);

  if (!task) {
    return { success: false, reason: "not_found" };
  }

  if (task.claimedBy === null) {
    return { success: false, reason: "not_claimed" };
  }

  if (task.claimedBy !== agentName) {
    return { success: false, reason: "claimed_by_other" };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE kanban_tasks
    SET claimed_by = NULL, claimed_at = NULL, updated_at = ?
    WHERE id = ? AND claimed_by = ?
  `).run(now, taskId, agentName);

  logActivity("task", `Task "${task.title}" released by ${agentName}`, "success", {
    metadata: { taskId, taskTitle: task.title, agentName },
  });

  return { success: true };
}

/** Get workload statistics for an agent */
export function getAgentWorkload(agentName: string): AgentWorkload {
  const db = getDb();

  const statusRows = db.prepare(`
    SELECT status, COUNT(*) as n
    FROM kanban_tasks
    WHERE assignee = ?
    GROUP BY status
  `).all(agentName) as Array<{ status: string; n: number }>;

  const claimedCount = (db.prepare(`
    SELECT COUNT(*) as n
    FROM kanban_tasks
    WHERE claimed_by = ?
  `).get(agentName) as { n: number }).n;

  const byStatus: Record<string, number> = {
    backlog: 0,
    in_progress: 0,
    done: 0,
  };

  for (const row of statusRows) {
    if (row.status === "backlog" || row.status === "todo") {
      byStatus.backlog += row.n;
    } else if (row.status === "in_progress") {
      byStatus.in_progress = row.n;
    } else if (row.status === "done") {
      byStatus.done = row.n;
    } else if (row.status !== "review" && row.status !== "blocked" && row.status !== "waiting") {
      byStatus.backlog += row.n;
    }
  }

  return {
    agentId: agentName,
    todo: byStatus.backlog,
    inProgress: byStatus.in_progress,
    done: byStatus.done,
    claimed: claimedCount,
  };
}

/** Get all tasks claimed by an agent */
export function getTasksByClaimant(agentName: string): KanbanTask[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM kanban_tasks
    WHERE claimed_by = ?
    ORDER BY claimed_at ASC
  `).all(agentName) as Record<string, unknown>[];

  return rows.map(parseTaskRow);
}
