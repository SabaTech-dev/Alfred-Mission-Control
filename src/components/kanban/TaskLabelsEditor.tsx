"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import type { KanbanLabel } from "@/lib/kanban-db";
import { LABEL_COLORS } from "@/lib/kanban-modal-types";

interface TaskLabelsEditorProps {
  labels: KanbanLabel[];
  onLabelsChange: (labels: KanbanLabel[]) => void;
}

/**
 * Label management sub-component for the TaskModal.
 * Renders current labels and an inline picker to add new ones.
 */
export function TaskLabelsEditor({ labels, onLabelsChange }: TaskLabelsEditorProps) {
  const { t } = useI18n();

  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  function addLabel() {
    if (!newLabelName.trim()) return;
    onLabelsChange([...labels, { name: newLabelName.trim(), color: newLabelColor }]);
    setNewLabelName("");
    setShowLabelPicker(false);
  }

  function removeLabel(index: number) {
    onLabelsChange(labels.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {t("kanban.taskModal.labels")}
        </label>
        <button
          type="button"
          onClick={() => setShowLabelPicker(!showLabelPicker)}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ color: "var(--accent)" }}
        >
          <Plus className="h-3 w-3" />
          {t("kanban.taskModal.add")}
        </button>
      </div>

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map((label, index) => (
            <span
              key={`${label.name}-${index}`}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${label.color}20`, color: label.color }}
            >
              {label.name}
              <button
                type="button"
                onClick={() => removeLabel(index)}
                className="ml-1 hover:opacity-100"
                style={{ color: label.color }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showLabelPicker && (
        <div className="p-3 rounded-lg border" style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)" }}>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder={t("kanban.taskModal.labelNamePlaceholder")}
              className="flex-1 rounded border px-2 py-1 text-xs outline-none"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex gap-1">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewLabelColor(color)}
                className="w-6 h-6 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: color,
                  transform: newLabelColor === color ? "scale(1.2)" : "scale(1)",
                  border: newLabelColor === color ? "2px solid white" : "2px solid transparent",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addLabel}
            disabled={!newLabelName.trim()}
            className="w-full rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              borderColor: "var(--accent)",
              color: "white",
              cursor: newLabelName.trim() ? "pointer" : "not-allowed",
            }}
          >
            {t("kanban.taskModal.addLabel")}
          </button>
        </div>
      )}
    </div>
  );
}
