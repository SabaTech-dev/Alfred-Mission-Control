"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (name: string, color: string) => Promise<void>;
}

export function AddColumnModal({ isOpen, onClose, onAddColumn }: AddColumnModalProps) {
  const { t } = useI18n();
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#3b82f6");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!columnName.trim()) return;
    await onAddColumn(columnName.trim(), columnColor);
    setColumnName("");
    setColumnColor("#3b82f6");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("kanban.columnModal.title")}
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("kanban.columnModal.columnName")}
            </label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder={t("kanban.columnModal.columnNamePlaceholder")}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none"
              style={{
                backgroundColor: "var(--card-elevated)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("kanban.columnModal.color")}
            </label>
            <input
              type="color"
              value={columnColor}
              onChange={(e) => setColumnColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!columnName.trim()}
            className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            {t("kanban.columnModal.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
