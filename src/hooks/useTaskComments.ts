"use client";

import { useState, useEffect, useCallback } from "react";

import { useI18n } from "@/i18n/provider";
import type { TaskComment } from "@/lib/kanban-db";
import {
  COMMENT_TEMPLATE_KEYS,
  type StructuredCommentType,
  type CommentFormState,
} from "@/lib/kanban-modal-types";

interface UseTaskCommentsReturn {
  comments: TaskComment[];
  loading: boolean;
  error: string | null;
  addComment: (e: React.FormEvent) => Promise<void>;
  refreshComments: () => Promise<void>;
  commentTemplates: typeof COMMENT_TEMPLATE_KEYS;
  formState: CommentFormState;
  setFormState: React.Dispatch<React.SetStateAction<CommentFormState>>;
  isPosting: boolean;
  submitError: string | null;
}

/**
 * Hook that manages comment fetching, posting, template application,
 * and all related state for a task's comments section.
 */
export function useTaskComments(
  taskId: string | null,
  onCommentsUpdated?: () => void,
): UseTaskCommentsReturn {
  const { t } = useI18n();

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formState, setFormState] = useState<CommentFormState>({
    commentType: "note",
    commentContent: "",
    commentEvidence: "",
    commentNextAction: "",
    activeTemplate: null,
  });

  // ---------------------------------------------------------------------------
  // Fetch comments
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchComments(id: string) {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/kanban/tasks/${id}/comments?limit=100`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load comments");
        }

        const data = await response.json() as { comments?: TaskComment[] };
        setComments(data.comments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comments");
      } finally {
        setLoading(false);
      }
    }

    if (taskId) {
      fetchComments(taskId);
      return;
    }

    setComments([]);
  }, [taskId]);

  // ---------------------------------------------------------------------------
  // Refresh comments (silent — swallows errors)
  // ---------------------------------------------------------------------------

  const refreshComments = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}/comments?limit=100`);
      if (!response.ok) return;

      const data = await response.json() as { comments?: TaskComment[] };
      setComments(data.comments || []);
      onCommentsUpdated?.();
    } catch {
      // Ignore refresh errors after a successful write.
    }
  }, [taskId, onCommentsUpdated]);

  // ---------------------------------------------------------------------------
  // Template application
  // ---------------------------------------------------------------------------

  function applyTemplate(template: StructuredCommentType) {
    setFormState({
      commentType: template,
      commentContent: t(`kanban.comments.templates.${template}.content`),
      commentEvidence: t(`kanban.comments.templates.${template}.evidence`),
      commentNextAction: t(`kanban.comments.templates.${template}.nextAction`),
      activeTemplate: template,
    });
    setSubmitError(null);
  }

  // ---------------------------------------------------------------------------
  // Post comment
  // ---------------------------------------------------------------------------

  async function addComment(e: React.FormEvent) {
    e.preventDefault();

    if (!taskId) return;

    if (!formState.commentContent.trim()) {
      setSubmitError(t("kanban.comments.validation.contentRequired"));
      return;
    }

    try {
      setIsPosting(true);
      setSubmitError(null);

      const response = await fetch(`/api/kanban/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formState.commentType,
          content: formState.commentContent,
          evidence: formState.commentEvidence,
          nextAction: formState.commentNextAction,
          template: formState.activeTemplate,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(t("kanban.comments.errors.rateLimited"));
        }
        if (response.status === 400) {
          throw new Error(t("kanban.comments.errors.invalidPayload"));
        }
        throw new Error(t("kanban.comments.errors.postFailed"));
      }

      setFormState({
        commentType: "note",
        commentContent: "",
        commentEvidence: "",
        commentNextAction: "",
        activeTemplate: null,
      });
      await refreshComments();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("kanban.comments.errors.postFailed"));
    } finally {
      setIsPosting(false);
    }
  }

  return {
    comments,
    loading,
    error,
    addComment,
    refreshComments,
    commentTemplates: COMMENT_TEMPLATE_KEYS,
    formState,
    setFormState,
    isPosting,
    submitError,
  };
}
