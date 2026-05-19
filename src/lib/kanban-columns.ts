/**
 * Kanban Column Management & Task Movement
 * Column CRUD and float-based ordering for drag & drop.
 */

import { getDb } from "@/lib/kanban-db";
import { getTask, updateTask } from "@/lib/kanban-tasks";
import { logActivity } from "@/lib/activities-db";
import type {
  KanbanColumn,
  CreateColumnInput,
  UpdateColumnInput,
  KanbanTask,
} from "@/lib/kanban-types";

// ============================================================================
// Row Parser
// ============================================================================

function parseColumnRow(row: Record<string, unknown>): KanbanColumn {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    order: row.order as number,
    limit: row.limit as number | null,
  };
}

// ============================================================================
// Column CRUD
// ============================================================================

/** Get all columns ordered by their order field */
export function getColumns(): KanbanColumn[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM kanban_columns ORDER BY "order" ASC').all() as Record<string, unknown>[];
  return rows.map(parseColumnRow);
}

/** Get a column by ID */
export function getColumn(id: string): KanbanColumn | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM kanban_columns WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? parseColumnRow(row) : null;
}

/** Create a new column */
export function createColumn(input: CreateColumnInput): KanbanColumn {
  const db = getDb();
  const maxOrder = (db.prepare('SELECT COALESCE(MAX("order"), 0) as maxOrder FROM kanban_columns').get() as { maxOrder: number }).maxOrder;
  const order = maxOrder + 1000;
  const color = input.color ?? "#6b7280";
  const limit = input.limit ?? null;

  db.prepare(`
    INSERT INTO kanban_columns (id, name, color, "order", "limit")
    VALUES (?, ?, ?, ?, ?)
  `).run(input.id, input.name, color, order, limit);

  return { id: input.id, name: input.name, color, order, limit };
}

/** Update a column */
export function updateColumn(id: string, updates: UpdateColumnInput): KanbanColumn | null {
  const db = getDb();
  const existing = getColumn(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.color !== undefined) { fields.push("color = ?"); values.push(updates.color); }
  if (updates.order !== undefined) { fields.push('"order" = ?'); values.push(updates.order); }
  if (updates.limit !== undefined) { fields.push('"limit" = ?'); values.push(updates.limit); }

  if (fields.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE kanban_columns SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return getColumn(id);
}

/**
 * Delete a column
 * @throws Error if column has tasks
 */
export function deleteColumn(id: string): boolean {
  const db = getDb();
  const taskCount = (db.prepare("SELECT COUNT(*) as n FROM kanban_tasks WHERE status = ?").get(id) as { n: number }).n;
  if (taskCount > 0) {
    throw new Error(`Cannot delete column with ${taskCount} tasks. Move or delete tasks first.`);
  }
  const result = db.prepare("DELETE FROM kanban_columns WHERE id = ?").run(id);
  return result.changes > 0;
}

// ============================================================================
// Move Task Logic (Float Ordering)
// ============================================================================

const MIN_GAP = 0.5;

/**
 * Reindex all tasks in a column to have evenly spaced orders
 */
function reindexColumnOrder(columnId: string): void {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT id FROM kanban_tasks
    WHERE status = ?
    ORDER BY "order" ASC
  `).all(columnId) as Array<{ id: string }>;

  if (tasks.length === 0) return;

  const updateOrder = db.prepare('UPDATE kanban_tasks SET "order" = ? WHERE id = ?');
  const reindex = db.transaction(() => {
    tasks.forEach((task, index) => {
      updateOrder.run((index + 1) * 1000, task.id);
    });
  });

  reindex();
}

/**
 * Move a task to a new position with float-based ordering
 * @param taskId - Task UUID
 * @param targetColumnId - Target column identifier
 * @param targetOrder - Optional target order position (if null, appends at end)
 * @returns The updated task or null if not found
 */
export function moveTask(taskId: string, targetColumnId: string, targetOrder?: number): KanbanTask | null {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) return null;

  const targetColumn = getColumn(targetColumnId);
  if (!targetColumn) return null;

  const fromColumn = task.status;
  const isSameColumn = task.status === targetColumnId;

  // If no target order specified, append at end of column
  if (targetOrder === undefined) {
    const maxOrder = (db.prepare(`
      SELECT COALESCE(MAX("order"), 0) as maxOrder FROM kanban_tasks WHERE status = ?
    `).get(targetColumnId) as { maxOrder: number }).maxOrder;

    const updatedTask = updateTask(taskId, {
      status: targetColumnId,
      order: maxOrder + 1000,
    });

    if (!isSameColumn && updatedTask) {
      logActivity("task", `Moved task "${task.title}" from ${fromColumn} to ${targetColumnId}`, "success", {
        metadata: { taskId, taskTitle: task.title, fromColumn, toColumn: targetColumnId },
      });
    }

    return updatedTask;
  }

  // Find surrounding tasks for float calculation
  const surroundingTasks = db.prepare(`
    SELECT id, "order" FROM kanban_tasks
    WHERE status = ? AND "order" >= ?
    ORDER BY "order" ASC
    LIMIT 2
  `).all(targetColumnId, targetOrder) as Array<{ id: string; order: number }>;

  let newOrder: number;

  if (surroundingTasks.length === 0) {
    newOrder = targetOrder;
  } else if (surroundingTasks.length === 1) {
    const nextOrder = surroundingTasks[0].order;
    if (isSameColumn && surroundingTasks[0].id === taskId) {
      return task;
    }
    newOrder = (targetOrder + nextOrder) / 2;
  } else {
    const order1 = surroundingTasks[0].order;
    const order2 = surroundingTasks[1].order;
    newOrder = (order1 + order2) / 2;
  }

  // Check if gap is too small, trigger reindex if needed
  if (Math.abs(newOrder - targetOrder) < MIN_GAP) {
    reindexColumnOrder(targetColumnId);

    const reindexedSurrounding = db.prepare(`
      SELECT id, "order" FROM kanban_tasks
      WHERE status = ? AND "order" >= ?
      ORDER BY "order" ASC
      LIMIT 2
    `).all(targetColumnId, targetOrder) as Array<{ id: string; order: number }>;

    if (reindexedSurrounding.length >= 2) {
      newOrder = (reindexedSurrounding[0].order + reindexedSurrounding[1].order) / 2;
    } else if (reindexedSurrounding.length === 1) {
      newOrder = (targetOrder + reindexedSurrounding[0].order) / 2;
    } else {
      newOrder = targetOrder;
    }
  }

  const updatedTask = updateTask(taskId, {
    status: targetColumnId,
    order: newOrder,
  });

  if (!isSameColumn && updatedTask) {
    logActivity("task", `Moved task "${task.title}" from ${fromColumn} to ${targetColumnId}`, "success", {
      metadata: { taskId, taskTitle: task.title, fromColumn, toColumn: targetColumnId },
    });
  }

  return updatedTask;
}
