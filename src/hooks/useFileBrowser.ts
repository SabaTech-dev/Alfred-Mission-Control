"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/i18n/provider";
import { useToast } from "@/components/Toast";
import type { FileEntry } from "@/lib/file-utils";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface UseFileBrowserParams {
  workspace: string;
  path: string;
  onNavigate: (path: string) => void;
}

interface UseFileBrowserReturn {
  files: FileEntry[];
  currentPath: string;
  loading: boolean;
  error: string | null;
  uploading: boolean;
  navigateTo: (newPath: string) => void;
  refresh: () => void;
  uploadFile: (files: FileList | null) => Promise<void>;
  deleteFile: (item: FileEntry) => Promise<void>;
  createFile: (name: string) => Promise<string | null>;
  createFolder: (name: string) => Promise<boolean>;
  downloadFile: (item: FileEntry) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useFileBrowser({ workspace, path, onNavigate }: UseFileBrowserParams): UseFileBrowserReturn {
  const { t } = useI18n();
  const { showError } = useToast();

  const [items, setItems] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const loadItemsControllerRef = useRef<AbortController | null>(null);

  const loadItems = useCallback(() => {
    loadItemsControllerRef.current?.abort();
    const controller = new AbortController();
    loadItemsControllerRef.current = controller;
    setLoading(true);
    setError(null);
    fetch(`/api/browse?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(path)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(t("files.browser.errors.loadDirectory"));
        return res.json();
      })
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      })
      .finally(() => {
        if (loadItemsControllerRef.current === controller) {
          loadItemsControllerRef.current = null;
        }
      });
  }, [workspace, path, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    return () => {
      loadItemsControllerRef.current?.abort();
    };
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("workspace", workspace);
      formData.append("path", path);
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(t("files.browser.errors.upload"));
      loadItems();
    } catch (e) {
      console.error("Upload error:", e);
      showError(t("files.browser.errors.upload"));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (item: FileEntry) => {
    const filePath = path ? `${path}/${item.name}` : item.name;
    const url = `/api/files/download?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(filePath)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    a.click();
  };

  const handleDelete = async (item: FileEntry) => {
    const filePath = path ? `${path}/${item.name}` : item.name;
    try {
      const res = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, path: filePath }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || t("files.browser.errors.delete"));
      } else {
        loadItems();
      }
    } catch {
      showError(t("files.browser.errors.delete"));
    }
  };

  const handleCreateFolder = async (name: string): Promise<boolean> => {
    if (!name.trim()) return false;
    try {
      const res = await fetch("/api/files/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, path, name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || t("files.browser.errors.createFolder"));
        return false;
      }
      loadItems();
      return true;
    } catch {
      showError(t("files.browser.errors.createFolder"));
      return false;
    }
  };

  const handleCreateFile = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;
    const filePath = path ? `${path}/${name.trim()}` : name.trim();
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, path: filePath, content: "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || t("files.browser.errors.createFile"));
        return null;
      }
      loadItems();
      return filePath;
    } catch {
      showError(t("files.browser.errors.createFile"));
      return null;
    }
  };

  return {
    files: items,
    currentPath: path,
    loading,
    error,
    uploading,
    navigateTo: onNavigate,
    refresh: loadItems,
    uploadFile: handleUpload,
    deleteFile: handleDelete,
    createFile: handleCreateFile,
    createFolder: handleCreateFolder,
    downloadFile: handleDownload,
  };
}
