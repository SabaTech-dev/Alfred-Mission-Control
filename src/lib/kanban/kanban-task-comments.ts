/**
 * Kanban Task Comments — DB CRUD Operations
 * Low-level comment storage operations. Validation logic lives in kanban-comments.ts.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/kanban-db";
import type {
  TaskComment,
  CreateTaskCommentInput,
  ListTaskCommentsFilters,
  TaskCommentAuthorType,
  TaskCommentType,
} from "./kanban-types";
import {
  TASK_COMMENT_AUTHOR_TYPE,
  TASK_COMMENT_TYPE,
} from "./kanban-types";

// ============================================================================
// Internal Constants
// ============================================================================

const TASK_COMMENT_MAX_BODY_LENGTH = 5000;
const TASK_COMMENT_MAX_AUTHOR_ID_LENGTH = 120;
const TASK_COMMENT_MAX_STATUS_LENGTH = 64;
const TASK_COMMENT_DEFAULT_LIMIT = 50;
const TASK_COMMENT_MAX_LIMIT = 200;

// ============================================================================
// Internal Helpers
// ============================================================================

function parseTaskCommentMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function normalizeOptionalString(value: unknown, maxLength: number, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less`);
  }
  return trimmed;
}

function parseCommentRow(row: Record<string, unknown>): TaskComment {
  const validAuthorTypes = Object.values(TASK_COMMENT_AUTHOR_TYPE) as TaskCommentAuthorType[];
  const validCommentTypes = Object.values(TASK_COMMENT_TYPE) as TaskCommentType[];

  const legacyAgentId = typeof row.agent_id === "string" && row.agent_id.trim().length > 0
    ? row.agent_id.trim()
    : null;

  const rawAuthorType = typeof row.author_type === "string" ? row.author_type : null;
  const authorType = rawAuthorType && validAuthorTypes.includes(rawAuthorType as TaskCommentAuthorType)
    ? rawAuthorType as TaskCommentAuthorType
    : (legacyAgentId ? TASK_COMMENT_AUTHOR_TYPE.AGENT : TASK_COMMENT_AUTHOR_TYPE.HUMAN);

  const rawAuthorId = typeof row.author_id === "string" && row.author_id.trim().length > 0
    ? row.author_id.trim()
    : null;
  const authorId = rawAuthorId ?? legacyAgentId;

  const rawBody = typeof row.body === "string" && row.body.length > 0
    ? row.body
    : (typeof row.content === "string" ? row.content : "");

  const rawCommentType = typeof row.comment_type === "string" ? row.comment_type : null;
  const commentType = rawCommentType && validCommentTypes.includes(rawCommentType as TaskCommentType)
    ? rawCommentType as TaskCommentType
    : TASK_COMMENT_TYPE.COMMENT;

  const createdAt = typeof row.created_at === "string" && row.created_at.length > 0
    ? row.created_at
    : new Date(0).toISOString();

  const updatedAt = typeof row.updated_at === "string" && row.updated_at.length > 0
    ? row.updated_at
    : createdAt;

  const statusFrom = typeof row.status_from === "string" && row.status_from.trim().length > 0
    ? row.status_from
    : null;
  const statusTo = typeof row.status_to === "string" && row.status_to.trim().length > 0
    ? row.status_to
    : null;

  return {
    id: row.id as string,
    taskId: row.task_id as string,
    authorType,
    authorId,
    body: rawBody,
    commentType,
    statusFrom,
    statusTo,
    metadata: parseTaskCommentMetadata(row.metadata),
    createdAt,
    updatedAt,
  };
}

// ============================================================================
// Comment CRUD
// ============================================================================

/**
 * Create a comment for a task
 * @param input - Comment creation data
 * @returns The created task comment
 */
export function createTaskComment(input: CreateTaskCommentInput): TaskComment {
  const db = getDb();

  const taskId = normalizeOptionalString(input.taskId, 128, "taskId");
  if (!taskId) {
    throw new Error("taskId is required");
  }

  const taskExists = db.prepare("SELECT 1 FROM kanban_tasks WHERE id = ?").get(taskId) as { "1": number } | undefined;
  if (!taskExists) {
    throw new Error("Task not found");
  }

  const authorType = input.authorType ?? TASK_COMMENT_AUTHOR_TYPE.HUMAN;
  const validAuthorTypes = Object.values(TASK_COMMENT_AUTHOR_TYPE) as TaskCommentAuthorType[];
  if (!validAuthorTypes.includes(authorType)) {
    throw new Error(`authorType must be one of: ${validAuthorTypes.join(", ")}`);
  }

  const authorId = normalizeOptionalString(input.authorId, TASK_COMMENT_MAX_AUTHOR_ID_LENGTH, "authorId");

  if (typeof input.body !== "string") {
    throw new Error("body is required");
  }

  const body = input.body.trim();
  if (body.length === 0) {
    throw new Error("body is required");
  }
  if (body.length > TASK_COMMENT_MAX_BODY_LENGTH) {
    throw new Error(`body must be ${TASK_COMMENT_MAX_BODY_LENGTH} characters or less`);
  }

  const commentType = input.commentType ?? TASK_COMMENT_TYPE.COMMENT;
  const validCommentTypes = Object.values(TASK_COMMENT_TYPE) as TaskCommentType[];
  if (!validCommentTypes.includes(commentType)) {
    throw new Error(`commentType must be one of: ${validCommentTypes.join(", ")}`);
  }

  const statusFrom = normalizeOptionalString(input.statusFrom, TASK_COMMENT_MAX_STATUS_LENGTH, "statusFrom");
  const statusTo = normalizeOptionalString(input.statusTo, TASK_COMMENT_MAX_STATUS_LENGTH, "statusTo");

  if (commentType === TASK_COMMENT_TYPE.STATUS_CHANGE && !statusTo) {
    throw new Error("statusTo is required when commentType is status_change");
  }

  const metadata = input.metadata ?? null;
  if (metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) {
    throw new Error("metadata must be an object");
  }

  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  if (metadataJson && metadataJson.length > 20000) {
    throw new Error("metadata is too large");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const legacyAgentId = authorType === TASK_COMMENT_AUTHOR_TYPE.AGENT ? authorId : null;

  db.prepare(`
    INSERT INTO task_comments (
      id, task_id, author_type, author_id, body, comment_type,
      status_from, status_to, metadata, created_at, updated_at, agent_id, content
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, taskId, authorType, authorId, body, commentType,
    statusFrom, statusTo, metadataJson, now, now, legacyAgentId, body
  );

  return {
    id, taskId, authorType, authorId, body, commentType,
    statusFrom, statusTo, metadata, createdAt: now, updatedAt: now,
  };
}

/**
 * List comments for a task with deterministic ordering
 * @param filters - Required task ID and optional filters
 * @returns Array of comments ordered by createdAt desc, id desc
 */
export function listTaskComments(filters: ListTaskCommentsFilters): TaskComment[] {
  const db = getDb();
  const taskId = normalizeOptionalString(filters.taskId, 128, "taskId");
  if (!taskId) {
    throw new Error("taskId is required");
  }

  const conditions: string[] = ["task_id = ?"];
  const params: unknown[] = [taskId];

  if (filters.authorType) {
    const validAuthorTypes = Object.values(TASK_COMMENT_AUTHOR_TYPE) as TaskCommentAuthorType[];
    if (!validAuthorTypes.includes(filters.authorType)) {
      throw new Error(`authorType must be one of: ${validAuthorTypes.join(", ")}`);
    }
    conditions.push("author_type = ?");
    params.push(filters.authorType);
  }

  if (filters.authorId) {
    conditions.push("author_id = ?");
    params.push(filters.authorId);
  }

  if (filters.commentType) {
    const validCommentTypes = Object.values(TASK_COMMENT_TYPE) as TaskCommentType[];
    if (!validCommentTypes.includes(filters.commentType)) {
      throw new Error(`commentType must be one of: ${validCommentTypes.join(", ")}`);
    }
    conditions.push("comment_type = ?");
    params.push(filters.commentType);
  }

  const rawLimit = Number.isFinite(filters.limit) ? Number(filters.limit) : TASK_COMMENT_DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(TASK_COMMENT_MAX_LIMIT, Math.floor(rawLimit)));
  params.push(limit);

  const rows = db.prepare(`
    SELECT * FROM task_comments
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(...params) as Record<string, unknown>[];

  return rows.map(parseCommentRow);
}

/**
 * List all task comments for analytics and reporting
 * @returns Array of comments ordered by createdAt asc, id asc
 */
export function listAllTaskComments(): TaskComment[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM task_comments
    ORDER BY created_at ASC, id ASC
  `).all() as Record<string, unknown>[];

  return rows.map(parseCommentRow);
}
