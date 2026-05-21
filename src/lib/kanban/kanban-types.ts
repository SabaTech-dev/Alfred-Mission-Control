/**
 * Kanban Board Type Definitions
 * Shared types, interfaces, and constants for the Kanban board system.
 */

// ============================================================================
// Task Types
// ============================================================================

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface KanbanLabel {
  name: string;
  color: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  assignee: string | null;
  labels: KanbanLabel[];
  order: number;
  projectId: string | null;
  domain: string | null;  // Agent's domain: WORK, FINANCE, PERSONAL, COMMUNICATION, ADMIN, GENERAL
  created_at: string;
  updated_at: string;
  dueDate: string | null;
  dependsOn: string[] | null;
  executionStatus: "pending" | "running" | "success" | "error" | "skipped" | null;
  executionResult: string | null;
  blockedBy: string[] | null;
  waitingFor: string[] | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdBy?: string | null;  // Agent ID or "user" for human-created tasks
  commentCount?: number;
  // Archive fields for auto-archiving done tasks
  archived: boolean;       // Soft archive flag (0 = active, 1 = archived)
  archivedAt: string | null;  // ISO timestamp when archived
  doneAt: string | null;   // ISO timestamp when task entered 'done' status
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: string;
  priority?: TaskPriority;
  assignee?: string | null;
  labels?: KanbanLabel[];
  projectId?: string | null;
  domain?: string | null;  // Agent's domain: WORK, FINANCE, PERSONAL, etc.
  createdBy?: string | null;  // Agent ID or "user"
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: TaskPriority;
  assignee?: string | null;
  labels?: KanbanLabel[];
  order?: number;
  projectId?: string | null;
  domain?: string | null;  // Update task's domain
  claimedBy?: string | null;  // For claim/unclaim
  claimedAt?: string | null;  // Timestamp when claimed
  archived?: boolean;  // Archive/unarchive task
}

export interface ListTasksFilters {
  status?: string;
  assignee?: string;
  priority?: TaskPriority;
  search?: string;
  projectId?: string;
  createdBy?: string;  // Filter by creator (agent ID or "user")
  domain?: string;  // Filter by agent domain (WORK, FINANCE, PERSONAL, etc.)
  view?: "active" | "archived" | "all";  // Archive view filter (default: active)
}

export interface TasksStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

// ============================================================================
// Column Types
// ============================================================================

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order: number;
  limit: number | null;
}

export interface CreateColumnInput {
  id: string;
  name: string;
  color?: string;
  limit?: number | null;
}

export interface UpdateColumnInput {
  name?: string;
  color?: string;
  order?: number;
  limit?: number | null;
}

// ============================================================================
// Comment Types
// ============================================================================

export const TASK_COMMENT_AUTHOR_TYPE = {
  HUMAN: "human",
  AGENT: "agent",
  SYSTEM: "system",
} as const;

export type TaskCommentAuthorType = (typeof TASK_COMMENT_AUTHOR_TYPE)[keyof typeof TASK_COMMENT_AUTHOR_TYPE];

export const TASK_COMMENT_TYPE = {
  COMMENT: "comment",
  STATUS_CHANGE: "status_change",
} as const;

export type TaskCommentType = (typeof TASK_COMMENT_TYPE)[keyof typeof TASK_COMMENT_TYPE];

export interface TaskComment {
  id: string;
  taskId: string;
  authorType: TaskCommentAuthorType;
  authorId: string | null;
  body: string;
  commentType: TaskCommentType;
  statusFrom: string | null;
  statusTo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskCommentInput {
  taskId: string;
  authorType?: TaskCommentAuthorType;
  authorId?: string | null;
  body: string;
  commentType?: TaskCommentType;
  statusFrom?: string | null;
  statusTo?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListTaskCommentsFilters {
  taskId: string;
  authorType?: TaskCommentAuthorType;
  authorId?: string;
  commentType?: TaskCommentType;
  limit?: number;
}

// ============================================================================
// Agent Coordination Types
// ============================================================================

export interface ClaimResult {
  success: boolean;
  task?: KanbanTask;
  reason?: "not_found" | "already_claimed" | "claimed_by_other";
}

export interface ReleaseResult {
  success: boolean;
  reason?: "not_found" | "not_claimed" | "claimed_by_other";
}

export interface AgentWorkload {
  agentId: string;
  todo: number;
  inProgress: number;
  done: number;
  claimed: number;
}
