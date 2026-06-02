/**
 * SQLite-backed Kanban Board Storage — Re-export Hub
 *
 * This file provides the database singleton (getDb) and re-exports all
 * domain-specific functions from the kanban/ subdirectory for backward
 * compatibility. Every function that was previously defined inline here
 * is still importable from `@/lib/kanban-db`.
 *
 * Module layout:
 *   kanban/kanban-types.ts    — Shared type definitions
 *   kanban/kanban-schema.ts   — CREATE TABLE statements, migrations
 *   kanban/kanban-tasks.ts    — Task CRUD (create, get, update, delete)
 *   kanban/kanban-columns.ts  — Column CRUD, moveTask, float ordering
 *   kanban/kanban-task-comments.ts — Task comment DB operations
 *   kanban/kanban-metrics.ts  — listTasks, stats, claiming, auto-archive
 *   kanban/kanban-projects.ts — Project CRUD
 *   kanban/kanban-agents.ts   — Agent identity CRUD
 *   kanban/kanban-journal.ts  — Operations journal CRUD
 */

import Database from "@/lib/sqlite-wrapper";
import path from "path";
import fs from "fs";
import { initSchema } from "./kanban/kanban-schema";

// ============================================================================
// Database Singleton
// ============================================================================

// Use in-memory database for tests to avoid concurrency issues
const IS_TEST_ENV = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const DB_PATH = IS_TEST_ENV
  ? ":memory:"
  : path.join(process.cwd(), "data", "kanban.db");

let _db: Database | null = null;

/**
 * Reset the database connection (for testing only)
 * Closes the current connection and resets the singleton
 */
export function resetDbForTesting(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Get the database connection singleton
 * Creates tables and seeds default columns on first run
 */
export function getDb(): Database {
  // Clean up stale WASM SQLite lock directory (node-sqlite3-wasm VFS artifact)
  const lockDir = DB_PATH + ".lock";
  try {
    if (fs.existsSync(lockDir)) {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup failures
  }

  if (_db) return _db;

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // WAL mode for better concurrency (better-sqlite3 supports it natively)
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  // busy_timeout prevents "database is locked" errors under concurrent access
  _db.pragma("busy_timeout = 5000");

  // Initialize schema (tables, migrations, seeding)
  initSchema(_db);

  return _db;
}

/**
 * Clear all data from the database (for testing only)
 * Resets connection and reseeds default columns
 *
 * IMPORTANT: Call this in beforeEach/afterEach to ensure test isolation
 */
export function clearAllDataForTesting(): void {
  // Reset connection to ensure fresh state
  resetDbForTesting();

  const db = getDb();
  db.exec("DELETE FROM kanban_tasks");
  db.exec("DELETE FROM kanban_columns");
  db.exec("DELETE FROM projects");
  db.exec("DELETE FROM agent_identities");
  db.exec("DELETE FROM operations_journal");
  db.exec("DELETE FROM task_comments");

  // Re-seed default columns (use INSERT OR IGNORE to handle existing columns)
  const defaultColumns = [
    { id: "backlog", name: "Backlog", color: "#6b7280", order: 0, limit: null },
    { id: "in_progress", name: "In Progress", color: "#3b82f6", order: 1, limit: null },
    { id: "review", name: "Review", color: "#f59e0b", order: 2, limit: null },
    { id: "done", name: "Done", color: "#22c55e", order: 3, limit: null },
  ];

  const insertColumn = db.prepare(`
    INSERT OR IGNORE INTO kanban_columns (id, name, color, "order", "limit")
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((columns: typeof defaultColumns) => {
    for (const col of columns) {
      insertColumn.run(col.id, col.name, col.color, col.order, col.limit);
    }
  });

  insertMany(defaultColumns);
}

// ============================================================================
// Re-exports — Types
// ============================================================================

export type {
  TaskPriority,
  KanbanLabel,
  KanbanTask,
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksFilters,
  TasksStats,
  KanbanColumn,
  CreateColumnInput,
  UpdateColumnInput,
  TaskComment,
  CreateTaskCommentInput,
  ListTaskCommentsFilters,
  ClaimResult,
  ReleaseResult,
  AgentWorkload,
} from "./kanban/kanban-types";

export {
  TASK_COMMENT_AUTHOR_TYPE,
  TASK_COMMENT_TYPE,
} from "./kanban/kanban-types";

export type {
  TaskCommentAuthorType,
} from "./kanban/kanban-types";

// ============================================================================
// Re-exports — Schema
// ============================================================================

export { initSchema } from "./kanban/kanban-schema";

// ============================================================================
// Re-exports — Task CRUD
// ============================================================================

export {
  parseTaskRow,
  createTask,
  getTask,
  updateTask,
  deleteTask,
} from "./kanban/kanban-tasks";

// ============================================================================
// Re-exports — Column CRUD & Move
// ============================================================================

export {
  getColumns,
  getColumn,
  createColumn,
  updateColumn,
  deleteColumn,
  moveTask,
} from "./kanban/kanban-columns";

// ============================================================================
// Re-exports — Task Comments (DB operations)
// ============================================================================

export {
  createTaskComment,
  listTaskComments,
  listAllTaskComments,
} from "./kanban/kanban-task-comments";

// ============================================================================
// Re-exports — Metrics, Listing, Claiming & Auto-Archive
// ============================================================================

export {
  listTasks,
  getTasksByColumn,
  getTasksStats,
  claimTask,
  releaseTask,
  getAgentWorkload,
  getTasksByClaimant,
  getAutoArchiveDays,
  runAutoArchiveSweepIfDue,
  forceAutoArchiveSweep,
} from "./kanban/kanban-metrics";

// ============================================================================
// Re-exports — Project CRUD
// ============================================================================

export {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
} from "./kanban/kanban-projects";

// ============================================================================
// Re-exports — Agent Identity CRUD
// ============================================================================

export {
  createAgentIdentity,
  getAgentIdentity,
  updateAgentIdentity,
  deleteAgentIdentity,
  listAgentIdentities,
} from "./kanban/kanban-agents";

// ============================================================================
// Re-exports — Operations Journal CRUD
// ============================================================================

export {
  createJournalEntry,
  getJournalEntry,
  updateJournalEntry,
  listJournalEntries,
  deleteJournalEntry,
} from "./kanban/kanban-journal";
