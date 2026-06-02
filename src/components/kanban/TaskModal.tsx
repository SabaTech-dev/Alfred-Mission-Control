"use client";

import { useState, useEffect } from "react";
import { X, Archive, Inbox } from "lucide-react";
import { motion } from "framer-motion";

import { useI18n } from "@/i18n/provider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TaskCommentsSection } from "@/components/kanban/TaskCommentsSection";
import { TaskLabelsEditor } from "@/components/kanban/TaskLabelsEditor";
import { useTaskComments } from "@/hooks/useTaskComments";
import type { TaskModalProps } from "@/lib/kanban-modal-types";
import type { KanbanTask as KanbanTaskType, KanbanLabel } from "@/lib/kanban-db";
import { authFetch } from "@/lib/auth-fetch";

const INPUT_STYLE = {
  backgroundColor: "var(--card-elevated)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};
const LABEL_STYLE = { color: "var(--text-secondary)" } as const;

export function TaskModal({
  isOpen, onClose, onSave, onDelete, columns, editingTask, onCommentsUpdated,
}: TaskModalProps) {
  const { t } = useI18n();
  const commentHook = useTaskComments(isOpen && editingTask ? editingTask.id : null, onCommentsUpdated);

  const PRIORITIES = [
    { value: "low", label: t("kanban.priorities.low"), color: "var(--text-muted)" },
    { value: "medium", label: t("kanban.priorities.medium"), color: "var(--info)" },
    { value: "high", label: t("kanban.priorities.high"), color: "var(--warning)" },
    { value: "critical", label: t("kanban.priorities.critical"), color: "var(--error)" },
  ];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanTaskType["priority"]>("medium");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState("backlog");
  const [labels, setLabels] = useState<KanbanLabel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setPriority(editingTask.priority);
      setAssignee(editingTask.assignee || "");
      setStatus(editingTask.status);
      setLabels(editingTask.labels || []);
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssignee("");
      setStatus("backlog");
      setLabels([]);
    }
    setError(null);
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError(t("kanban.taskModal.titleRequired")); return; }
    setIsSaving(true);
    setError(null);
    try {
      const taskData = {
        title: title.trim(), description: description.trim() || null,
        priority, assignee: assignee.trim() || null, status, labels,
      };
      if (editingTask) {
        const res = await authFetch(`/api/kanban/tasks/${editingTask.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskData),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to update task"); }
        onSave({ ...editingTask, ...taskData });
      } else {
        const res = await authFetch("/api/kanban/tasks", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskData),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to create task"); }
        const { task } = await res.json();
        onSave(task);
        setStatus(task.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally { setIsSaving(false); }
  }

  function confirmDelete() {
    if (!editingTask) return;
    onDelete(editingTask.id);
    setShowDeleteConfirm(false);
    onClose();
  }

  async function handleArchiveToggle() {
    if (!editingTask) return;
    setIsSaving(true);
    setError(null);
    try {
      const newArchived = !editingTask.archived;
      const res = await authFetch(`/api/kanban/tasks/${editingTask.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: newArchived }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to update task"); }
      onSave({ ...editingTask, archived: newArchived });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive task");
    } finally { setIsSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl mx-4"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {editingTask ? t("kanban.taskModal.editTitle") : t("kanban.taskModal.newTitle")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" style={LABEL_STYLE}>
              {t("kanban.taskModal.titleLabel")}
            </label>
            <input type="text" value={title}
              onChange={(e) => { setTitle(e.target.value); if (error) setError(null); }}
              placeholder={t("kanban.taskModal.titlePlaceholder")}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-offset-0"
              style={{ ...INPUT_STYLE, borderColor: error ? "var(--error)" : "var(--border)" }} />
            {error && <p className="text-sm mt-1" style={{ color: "var(--error)" }}>{error}</p>}
          </div>
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={LABEL_STYLE}>
              {t("kanban.taskModal.description")}
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={t("kanban.taskModal.descriptionPlaceholder")} rows={3}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none resize-none" style={INPUT_STYLE} />
          </div>
          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2" style={LABEL_STYLE}>
              {t("kanban.taskModal.status")}
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none cursor-pointer" style={INPUT_STYLE}>
              {columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
            </select>
          </div>
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2" style={LABEL_STYLE}>
              {t("kanban.taskModal.priority")}
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button key={p.value} type="button"
                  onClick={() => setPriority(p.value as KanbanTaskType["priority"])}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: priority === p.value ? `${p.color}20` : "var(--card-elevated)",
                    borderColor: priority === p.value ? p.color : "var(--border)",
                    color: priority === p.value ? p.color : "var(--text-secondary)",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium mb-2" style={LABEL_STYLE}>
              {t("kanban.taskModal.assignee")}
            </label>
            <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)}
              placeholder={t("kanban.taskModal.assigneePlaceholder")}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none" style={INPUT_STYLE} />
          </div>
          {/* Labels */}
          <TaskLabelsEditor labels={labels} onLabelsChange={setLabels} />
          {/* Comments (existing tasks only) */}
          {editingTask && (
            <TaskCommentsSection taskId={editingTask.id} onCommentsUpdated={onCommentsUpdated}
              comments={commentHook.comments} loading={commentHook.loading} error={commentHook.error}
              isPosting={commentHook.isPosting} submitError={commentHook.submitError}
              formState={commentHook.formState} setFormState={commentHook.setFormState}
              addComment={commentHook.addComment} commentTemplates={commentHook.commentTemplates} />
          )}
          {/* Actions */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex gap-2">
              {editingTask && (
                <>
                  <button type="button" onClick={handleArchiveToggle} disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      color: editingTask.archived ? "var(--success)" : "var(--text-muted)",
                      backgroundColor: editingTask.archived ? "var(--success-bg)" : "var(--surface-elevated)",
                      border: "1px solid var(--border)",
                    }}
                    title={editingTask.archived ? t("kanban.archiveActions.unarchiveHint") : t("kanban.archiveActions.archiveHint")}>
                    {editingTask.archived ? <Inbox className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {editingTask.archived ? t("kanban.archiveActions.unarchive") : t("kanban.archiveActions.archive")}
                  </button>
                  <button type="button" onClick={() => { if (editingTask) setShowDeleteConfirm(true); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    style={{ color: "var(--error)", backgroundColor: "var(--error-bg)" }}>
                    {t("common.delete")}
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}>
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={isSaving}
                className="rounded-lg px-4 py-2 text-sm font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "white", cursor: isSaving ? "not-allowed" : "pointer" }}>
                {isSaving ? t("kanban.taskModal.saving") : editingTask ? t("kanban.taskModal.update") : t("kanban.taskModal.create")}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
      <ConfirmDialog isOpen={showDeleteConfirm} title={t("kanban.taskModal.deleteTitle")}
        message={t("kanban.taskModal.deleteConfirm")} confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")} variant="danger" onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)} />
    </div>
  );
}
