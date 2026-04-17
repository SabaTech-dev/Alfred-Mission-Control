"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import { useI18n } from "@/i18n/provider";

interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave: () => Promise<void> | void;
  hasUnsavedChanges?: boolean;
}

export function MarkdownEditor({
  content,
  onChange,
  onSave,
  hasUnsavedChanges = false,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("common.save")}
        </button>
      </div>

      <textarea
        value={content}
        onChange={(event) => onChange(event.target.value)}
        className="flex-1 w-full resize-none p-4 outline-none"
        style={{
          backgroundColor: "var(--bg)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      />
    </div>
  );
}