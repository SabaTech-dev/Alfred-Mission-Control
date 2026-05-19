/**
 * Kanban Task CRUD Operations
 * Core task create/read/update/delete with pipeline-kanban bridge integration.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/kanban-db";
import { logActivity } from "@/lib/activities-db";
import {
  extractOpportunityCompany,
  findActiveOpportunitiesByCompany,
  updateOpportunityProgress,
  checkStageAdvancement,
} from "@/lib/pipeline-kanban-bridge";
import {
  getOpportunity,
  listOpportunities,
  updateOpportunity as updatePipelineOpp,
} from "@/lib/pipeline-db";
import type {
  KanbanTask,
  KanbanLabel,
  CreateTaskInput,
  UpdateTaskInput,
  TaskPriority,
} from "@/lib/kanban-types";

// ============================================================================
// Row Parser
// ============================================================================

/**
 * Parse a database row into a KanbanTask object.
 * Exported for use by kanban-metrics.ts.
 */
export function parseTaskRow(row: Record<string, unknown>): KanbanTask {
  let labels: KanbanLabel[] = [];
  if (row.labels) {
    try {
      labels = JSON.parse(row.labels as string);
    } catch (error) {
      console.error(`[kanban-db] Failed to parse labels for task ${row.id}:`, error, `labels value:`, row.labels);
      labels = [];
    }
  }

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as string,
    priority: row.priority as TaskPriority,
    assignee: row.assignee as string | null,
    labels: labels,
    order: row.order as number,
    projectId: (row.project_id as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    dueDate: (row.due_date as string | null) ?? null,
    dependsOn: row.depends_on ? JSON.parse(row.depends_on as string) : null,
    executionStatus: (row.execution_status as KanbanTask["executionStatus"]) ?? null,
    executionResult: (row.execution_result as string | null) ?? null,
    blockedBy: row.blocked_by ? JSON.parse(row.blocked_by as string) : null,
    waitingFor: row.waiting_for ? JSON.parse(row.waiting_for as string) : null,
    claimedBy: (row.claimed_by as string | null) ?? null,
    claimedAt: (row.claimed_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    commentCount: Number.isFinite(row.comment_count) ? Number(row.comment_count) : 0,
    archived: Boolean(row.archived),
    archivedAt: (row.archived_at as string | null) ?? null,
    doneAt: (row.done_at as string | null) ?? null,
  };
}

// ============================================================================
// Task CRUD
// ============================================================================

/**
 * Create a new task
 * @param input - Task creation data
 * @returns The created task
 * @throws Error if title exceeds 200 characters
 */
export function createTask(input: CreateTaskInput): KanbanTask {
  if (input.title.length > 200) {
    throw new Error("Title must be 200 characters or less");
  }

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = input.status ?? "backlog";
  const priority = input.priority ?? "medium";
  const labels = input.labels ?? [];
  const projectId = input.projectId ?? null;
  const createdBy = input.createdBy ?? null;
  const domain = input.domain ?? null;

  const maxOrder = (db.prepare(`
    SELECT COALESCE(MAX("order"), 0) as maxOrder FROM kanban_tasks WHERE status = ?
  `).get(status) as { maxOrder: number }).maxOrder;

  const order = maxOrder + 1000;

  db.prepare(`
    INSERT INTO kanban_tasks (id, title, description, status, priority, assignee, labels, "order", project_id, domain, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title,
    input.description ?? null,
    status,
    priority,
    input.assignee ?? null,
    JSON.stringify(labels),
    order,
    projectId,
    domain,
    now,
    now,
    createdBy
  );

  logActivity(
    "task",
    `Created task "${input.title}" in ${status}`,
    "success",
    {
      metadata: {
        taskId: id,
        taskTitle: input.title,
        column: status,
        priority,
        projectId,
        createdBy,
      },
    }
  );

  return {
    id,
    title: input.title,
    description: input.description ?? null,
    status,
    priority,
    assignee: input.assignee ?? null,
    labels,
    order,
    projectId,
    domain: input.domain ?? null,
    created_at: now,
    updated_at: now,
    dueDate: null,
    dependsOn: null,
    executionStatus: null,
    executionResult: null,
    blockedBy: null,
    waitingFor: null,
    claimedBy: null,
    claimedAt: null,
    createdBy,
    archived: false,
    archivedAt: null,
    doneAt: null,
  };
}

/**
 * Get a task by ID
 */
export function getTask(id: string): KanbanTask | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM kanban_tasks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? parseTaskRow(row) : null;
}

/**
 * Update a task
 * Triggers pipeline-kanban bridge when status changes.
 * @throws Error if title exceeds 200 characters
 */
export function updateTask(id: string, updates: UpdateTaskInput): KanbanTask | null {
  if (updates.title !== undefined && updates.title.length > 200) {
    throw new Error("Title must be 200 characters or less");
  }

  const db = getDb();
  const existing = getTask(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  // Store previous status for Pipeline-Kanban bridge
  const previousStatus = existing.status;

  if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
    if (updates.status === "done" && existing.status !== "done") {
      fields.push("done_at = ?");
      values.push(now);
    }
  }
  if (updates.priority !== undefined) { fields.push("priority = ?"); values.push(updates.priority); }
  if (updates.assignee !== undefined) { fields.push("assignee = ?"); values.push(updates.assignee); }
  if (updates.labels !== undefined) { fields.push("labels = ?"); values.push(JSON.stringify(updates.labels)); }
  if (updates.order !== undefined) { fields.push('"order" = ?'); values.push(updates.order); }
  if (updates.projectId !== undefined) { fields.push("project_id = ?"); values.push(updates.projectId); }
  if (updates.claimedBy !== undefined) { fields.push("claimed_by = ?"); values.push(updates.claimedBy); }
  if (updates.claimedAt !== undefined) { fields.push("claimed_at = ?"); values.push(updates.claimedAt); }

  if (updates.archived !== undefined) {
    if (updates.archived) {
      fields.push("archived = 1");
      fields.push("archived_at = ?");
      values.push(now);
    } else {
      fields.push("archived = 0");
      fields.push("archived_at = NULL");
    }
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE kanban_tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const updated = getTask(id);
  if (!updated) return existing;

  // Pipeline-Kanban bridge: Recalculate opportunity progress when task status changes
  if (updates.status !== undefined && updates.status !== previousStatus) {
    const company = extractOpportunityCompany(updated);
    if (company) {
      // Update progress for all active opportunities associated with this company
      const opps = findActiveOpportunitiesByCompany(listOpportunities, company);
      for (const opp of opps) {
        const newProgress = updateOpportunityProgress(
          getOpportunity,
          updatePipelineOpp,
          opp.id
        );
        console.log(`[Kanban-Pipeline Bridge] Task "${updated.title}" status changed: ${previousStatus} → ${updates.status}. Updated opportunity progress for ${company}: ${newProgress}%`);
      }

      // Reverse sync: check if all tasks are done → advance opportunity stage
      if (updates.status === "done") {
        const advanced = checkStageAdvancement(
          company,
          listOpportunities,
          updatePipelineOpp
        );
        if (advanced.length > 0) {
          console.log(`[Kanban-Pipeline Bridge] Auto-advanced ${advanced.length} opportunity stage(s) for ${company}`);
        }
      }
    }
  }

  return updated;
}

/**
 * Delete a task
 */
export function deleteTask(id: string): boolean {
  const db = getDb();
  const task = getTask(id);
  const result = db.prepare("DELETE FROM kanban_tasks WHERE id = ?").run(id);

  if (result.changes > 0 && task) {
    logActivity(
      "task",
      `Deleted task "${task.title}"`,
      "success",
      {
        metadata: {
          taskId: id,
          taskTitle: task.title,
          column: task.status,
        },
      }
    );
  }

  return result.changes > 0;
}
