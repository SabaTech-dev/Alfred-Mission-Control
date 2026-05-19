import { useEffect, useState, useCallback } from "react";

import { useToast } from "@/components/Toast";

export interface ConfigSection {
  editable: boolean;
  data: Record<string, unknown>;
}

export interface ConfigResponse {
  sections: {
    meta: ConfigSection;
    env: ConfigSection;
    auth: ConfigSection;
    models: ConfigSection;
    wizard: ConfigSection;
  };
  raw: string;
}

export interface BackupInfo {
  hasBackup: boolean;
  backup: {
    timestamp: string;
    size: number;
    file: string;
  } | null;
}

export function formatTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useConfigEditor() {
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["env"]);
  const [localChanges, setLocalChanges] = useState<Record<string, Record<string, unknown>>>({});
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch config:", error);
      showError("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchBackupInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/config/restore");
      const data = await res.json();
      setBackupInfo(data);
    } catch (error) {
      console.error("Failed to fetch backup info:", error);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchBackupInfo();
  }, [fetchConfig, fetchBackupInfo]);

  const hasChanges = Object.keys(localChanges).some((section) =>
    Object.keys(localChanges[section] || {}).length > 0
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const handleChange = (path: string, value: unknown) => {
    const parts = path.split(".");
    const section = parts[0];
    const fieldPath = parts.slice(1);

    setLocalChanges((prev) => {
      const sectionChanges = { ...(prev[section] || {}) };
      let current: Record<string, unknown> = sectionChanges;

      for (let i = 0; i < fieldPath.length - 1; i++) {
        const key = fieldPath[i];
        if (!current[key] || typeof current[key] !== "object") {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }

      if (fieldPath.length > 0) {
        current[fieldPath[fieldPath.length - 1]] = value;
      }

      return {
        ...prev,
        [section]: sectionChanges,
      };
    });
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      for (const [section, updates] of Object.entries(localChanges)) {
        if (Object.keys(updates).length === 0) continue;

        const res = await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, updates }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.details?.join(", ") || "Failed to save");
        }
      }

      setLocalChanges({});
      showSuccess("Configuration saved successfully");
      fetchConfig();
      fetchBackupInfo();
    } catch (error) {
      console.error("Failed to save config:", error);
      showError(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleResetClick = () => {
    setShowRestoreConfirm(true);
  };

  const handleRestoreConfirm = async () => {
    setShowRestoreConfirm(false);
    setRestoring(true);
    try {
      const res = await fetch("/api/config/restore", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to restore");
      }

      setLocalChanges({});
      showSuccess("Configuration saved successfully");
      fetchConfig();
      fetchBackupInfo();
    } catch (error) {
      console.error("Failed to restore config:", error);
      showError(error instanceof Error ? error.message : "Failed to restore configuration");
    } finally {
      setRestoring(false);
    }
  };

  const handleDiscard = () => {
    setLocalChanges({});
    showSuccess("Changes discarded");
  };

  return {
    config,
    backupInfo,
    loading,
    saving,
    restoring,
    expandedSections,
    localChanges,
    showRestoreConfirm,
    hasChanges,
    toggleSection,
    handleChange,
    handleSave,
    handleResetClick,
    handleRestoreConfirm,
    handleDiscard,
    setShowRestoreConfirm,
    fetchConfig,
  };
}
