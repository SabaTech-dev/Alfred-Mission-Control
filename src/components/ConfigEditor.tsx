"use client";

import {
  Lock,
  Unlock,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useConfigEditor, formatTimestamp, formatBytes } from "@/hooks/useConfigEditor";
import type { ConfigSection } from "@/hooks/useConfigEditor";
import { ConfigDataViewer } from "@/components/ConfigDataViewer";

function ConfigSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "var(--card)" }}>
          <div className="h-6 w-32 rounded mb-4" style={{ backgroundColor: "var(--card-elevated)" }} />
          <div className="space-y-2">
            <div className="h-4 w-full rounded" style={{ backgroundColor: "var(--card-elevated)" }} />
            <div className="h-4 w-3/4 rounded" style={{ backgroundColor: "var(--card-elevated)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ConfigSectionCardProps {
  name: string;
  section: ConfigSection;
  expanded: boolean;
  onToggle: () => void;
  localChanges: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
  t: (key: string) => string;
}

function ConfigSectionCard({
  name,
  section,
  expanded,
  onToggle,
  localChanges,
  onChange,
  t,
}: ConfigSectionCardProps) {
  const mergedData = { ...section.data, ...localChanges };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
          <span className="font-medium capitalize" style={{ color: "var(--text-primary)" }}>
            {name}
          </span>
          {section.editable ? (
            <Unlock className="w-4 h-4 text-success" />
          ) : (
            <Lock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {section.editable ? t("config.editable") : t("config.readOnly")}
        </span>
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t" style={{ borderColor: "var(--border)" }}>
          <ConfigDataViewer
            data={mergedData}
            editable={section.editable}
            path={name}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}

export function ConfigEditor() {
  const { t } = useI18n();
  const editor = useConfigEditor();

  if (editor.loading) return <ConfigSkeleton />;

  if (!editor.config) {
    return (
      <div
        className="p-8 text-center rounded-xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <X className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--error)" }} />
        <p className="mb-4" style={{ color: "var(--text-primary)" }}>
          Failed to load configuration
        </p>
        <button
          onClick={editor.fetchConfig}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-lg flex items-start gap-3"
        style={{
          backgroundColor: "rgba(234, 179, 8, 0.1)",
          border: "1px solid rgba(234, 179, 8, 0.3)",
        }}
      >
        <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-warning">{t("config.warningTitle")}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("config.warningDescription")}
          </p>
        </div>
      </div>

      {editor.backupInfo?.hasBackup && (
        <div
          className="p-3 rounded-lg flex items-center justify-between text-sm"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Last backup: {formatTimestamp(editor.backupInfo.backup!.timestamp)} (
            {formatBytes(editor.backupInfo.backup!.size)})
          </span>
        </div>
      )}

      {Object.entries(editor.config.sections).map(([key, section]) => (
        <ConfigSectionCard
          key={key}
          name={key}
          section={section}
          expanded={editor.expandedSections.includes(key)}
          onToggle={() => editor.toggleSection(key)}
          localChanges={editor.localChanges[key] || {}}
          onChange={editor.handleChange}
          t={t}
        />
      ))}

      <div
        className="flex flex-wrap gap-3 pt-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={editor.handleSave}
          disabled={!editor.hasChanges || editor.saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-success transition-colors"
        >
          {editor.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editor.saving ? t("config.saving") : t("config.saveChanges")}
        </button>

        <button
          onClick={editor.handleResetClick}
          disabled={editor.restoring || !editor.backupInfo?.hasBackup}
          className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          {editor.restoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          {editor.restoring ? t("config.saving") : t("config.restoreBackup")}
        </button>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={editor.showRestoreConfirm}
        title={t("config.restoreBackup")}
        message={t("config.restoreConfirm")}
        confirmLabel={t("config.restoreBackup")}
        cancelLabel={t("common.cancel")}
        variant="warning"
        isLoading={editor.restoring}
        onConfirm={editor.handleRestoreConfirm}
        onCancel={() => editor.setShowRestoreConfirm(false)}
      />

        {editor.hasChanges && (
          <button
            onClick={editor.handleDiscard}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <X className="w-4 h-4" />
            Discard Changes
          </button>
        )}
      </div>
    </div>
  );
}
