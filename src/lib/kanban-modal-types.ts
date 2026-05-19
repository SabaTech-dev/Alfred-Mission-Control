/**
 * Shared types and constants for the TaskModal component tree.
 *
 * Extracted from TaskModal.tsx to keep the component file focused on rendering
 * while making these values reusable across the hook and sub-components.
 */

import type { KanbanColumn, KanbanTask, KanbanLabel, TaskComment } from "@/lib/kanban-db";

// ---------------------------------------------------------------------------
// Label colour palette
// ---------------------------------------------------------------------------

export const LABEL_COLORS = [
  "#ef4444", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f59e0b", "#fbbf24", "#a855f7",
  "#06b6d4", "#14b8ae", "#6366f1",
  "#8b5cf6", "#d97706",
];

// ---------------------------------------------------------------------------
// Comment template keys
// ---------------------------------------------------------------------------

export const COMMENT_TEMPLATE_KEYS = ["progress", "blocked", "waiting", "handoff", "done", "note"] as const;

export type StructuredCommentType = (typeof COMMENT_TEMPLATE_KEYS)[number];

// ---------------------------------------------------------------------------
// Structured comment metadata helpers
// ---------------------------------------------------------------------------

export interface StructuredCommentMetadata {
  commentType?: string;
  evidence?: string;
  nextAction?: string;
}

export function parseCommentMetadata(metadata: TaskComment["metadata"]): StructuredCommentMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const commentType = typeof metadata.commentType === "string" ? metadata.commentType : undefined;
  const evidence = typeof metadata.evidence === "string" ? metadata.evidence : undefined;
  const nextAction = typeof metadata.nextAction === "string" ? metadata.nextAction : undefined;

  return {
    commentType,
    evidence,
    nextAction,
  };
}

// ---------------------------------------------------------------------------
// Component prop interfaces
// ---------------------------------------------------------------------------

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<KanbanTask>) => void;
  onDelete: (taskId: string) => void;
  columns: KanbanColumn[];
  editingTask: KanbanTask | null;
  onCommentsUpdated?: () => void;
}

export interface TaskCommentsSectionProps {
  taskId: string;
  onCommentsUpdated?: () => void;
}

export interface CommentFormState {
  commentType: StructuredCommentType;
  commentContent: string;
  commentEvidence: string;
  commentNextAction: string;
  activeTemplate: string | null;
}
