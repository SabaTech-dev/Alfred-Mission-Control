"use client";

import { MessageSquare, Send } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import type { TaskComment } from "@/lib/kanban-db";
import {
  COMMENT_TEMPLATE_KEYS,
  type StructuredCommentType,
  type CommentFormState,
  parseCommentMetadata,
} from "@/lib/kanban-modal-types";
import type { TaskCommentsSectionProps } from "@/lib/kanban-modal-types";

interface TaskCommentsSectionInternalProps extends TaskCommentsSectionProps {
  comments: TaskComment[];
  loading: boolean;
  error: string | null;
  isPosting: boolean;
  submitError: string | null;
  formState: CommentFormState;
  setFormState: React.Dispatch<React.SetStateAction<CommentFormState>>;
  addComment: (e: React.FormEvent) => Promise<void>;
  commentTemplates: typeof COMMENT_TEMPLATE_KEYS;
}

/**
 * Renders the full comments section inside TaskModal: comment list,
 * template buttons, and the comment submission form.
 */
export function TaskCommentsSection({
  comments,
  loading,
  error,
  isPosting,
  submitError,
  formState,
  setFormState,
  addComment,
  commentTemplates,
}: TaskCommentsSectionInternalProps) {
  const { t, formatDateTime } = useI18n();

  function applyTemplate(template: StructuredCommentType) {
    setFormState({
      commentType: template,
      commentContent: t(`kanban.comments.templates.${template}.content`),
      commentEvidence: t(`kanban.comments.templates.${template}.evidence`),
      commentNextAction: t(`kanban.comments.templates.${template}.nextAction`),
      activeTemplate: template,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("kanban.comments.title")}
        </h3>
      </div>

      {/* Comment list */}
      <div
        className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3"
        style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)" }}
      >
        {loading && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("kanban.comments.loading")}
          </p>
        )}

        {error && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {t("kanban.comments.errors.loadFailed")}
          </p>
        )}

        {!loading && !error && comments.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("kanban.comments.empty")}
          </p>
        )}

        {!loading && !error && comments.map((comment) => {
          const metadata = parseCommentMetadata(comment.metadata);
          const structuredType = COMMENT_TEMPLATE_KEYS.includes(metadata.commentType as StructuredCommentType)
            ? metadata.commentType as StructuredCommentType
            : "note";
          const authorLabel = comment.authorId
            ? t(`kanban.comments.authorWithId.${comment.authorType}`, { id: comment.authorId })
            : t(`kanban.comments.author.${comment.authorType}`);

          return (
            <article
              key={comment.id}
              className="rounded-md border p-2"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{authorLabel}</span>
                <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: "var(--card-elevated)" }}>
                  {t(`kanban.comments.types.${structuredType}`)}
                </span>
                <time>{formatDateTime(comment.createdAt)}</time>
              </div>

              <p className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>
                {comment.body}
              </p>

              {(metadata.evidence || metadata.nextAction) && (
                <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                  {metadata.evidence && (
                    <p style={{ color: "var(--text-secondary)" }}>
                      <strong>{t("kanban.comments.evidenceLabel")}: </strong>
                      {metadata.evidence}
                    </p>
                  )}
                  {metadata.nextAction && (
                    <p style={{ color: "var(--text-secondary)" }}>
                      <strong>{t("kanban.comments.nextActionLabel")}: </strong>
                      {metadata.nextAction}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Comment form */}
      <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("kanban.comments.form.type")}
            </label>
            <select
              value={formState.commentType}
              onChange={(e) => setFormState((prev) => ({ ...prev, commentType: e.target.value as StructuredCommentType }))}
              className="w-full rounded-lg border px-2 py-2 text-xs outline-none"
              style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              {commentTemplates.map((type) => (
                <option key={type} value={type}>{t(`kanban.comments.types.${type}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("kanban.comments.form.templates")}
            </label>
            <div className="flex flex-wrap gap-1">
              {commentTemplates.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded border px-2 py-1 text-[11px]"
                  style={{
                    borderColor: formState.activeTemplate === template ? "var(--accent)" : "var(--border)",
                    color: formState.activeTemplate === template ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {t(`kanban.comments.templates.${template}.label`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {t("kanban.comments.form.content")}
          </label>
          <textarea
            value={formState.commentContent}
            onChange={(e) => setFormState((prev) => ({ ...prev, commentContent: e.target.value }))}
            rows={3}
            className="w-full resize-none rounded-lg border px-2 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            placeholder={t("kanban.comments.form.contentPlaceholder")}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("kanban.comments.form.evidence")}
            </label>
            <input
              value={formState.commentEvidence}
              onChange={(e) => setFormState((prev) => ({ ...prev, commentEvidence: e.target.value }))}
              className="w-full rounded-lg border px-2 py-2 text-xs outline-none"
              style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder={t("kanban.comments.form.evidencePlaceholder")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("kanban.comments.form.nextAction")}
            </label>
            <input
              value={formState.commentNextAction}
              onChange={(e) => setFormState((prev) => ({ ...prev, commentNextAction: e.target.value }))}
              className="w-full rounded-lg border px-2 py-2 text-xs outline-none"
              style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder={t("kanban.comments.form.nextActionPlaceholder")}
            />
          </div>
        </div>

        {submitError && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {submitError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); addComment(e); }}
            disabled={isPosting}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            <Send className="h-3.5 w-3.5" />
            {isPosting ? t("kanban.comments.form.submitting") : t("kanban.comments.form.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
