"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  FileCode,
  Loader2,
  X,
  Save,
  Eye,
  Code2,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { MarkdownPreview } from "./MarkdownPreview";
import { getMonacoLanguage, isMarkdownFile, isHtmlFile } from "@/lib/file-utils";

// Lazy-load Monaco editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─── Editor Modal ───────────────────────────────────────────────────────────────

interface EditorModalProps {
  workspace: string;
  filePath: string;
  fileName: string;
  initialViewMode?: "edit" | "preview";
  onClose: () => void;
}

export function EditorModal({ workspace, filePath, fileName, initialViewMode = "preview", onClose }: EditorModalProps) {
  const { t } = useI18n();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">(initialViewMode);
  const previewIsHtml = isHtmlFile(fileName);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const dialogTitleId = `editor-dialog-title-${fileName.replace(/[^a-zA-Z0-9]/g, "-")}`;

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/browse?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(filePath)}&content=true`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) {
          throw new Error(t("files.browser.editor.errors.load"));
        }
        return r.json();
      })
      .then((data) => {
        setContent(data.content || "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(t("files.browser.editor.errors.load"));
        setLoading(false);
      });
    return () => controller.abort();
  }, [workspace, filePath, t]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, path: filePath, content }),
      });
      if (!res.ok) throw new Error(t("files.browser.editor.errors.save"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(t("files.browser.editor.errors.save"));
    } finally {
      setSaving(false);
    }
  }, [workspace, filePath, content, t]);

  const handleOpenPreviewInNewTab = useCallback(() => {
    const htmlBlob = new Blob([content], { type: "text/html;charset=utf-8" });
    const previewUrl = URL.createObjectURL(htmlBlob);
    const newWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");
    if (newWindow) {
      setTimeout(() => {
        URL.revokeObjectURL(previewUrl);
      }, 15000);
      return;
    }
    URL.revokeObjectURL(previewUrl);
  }, [content]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, handleClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
      }}
    >
      <div style={{
        width: "95vw", maxWidth: "1200px", height: "90vh",
        backgroundColor: "var(--card)",
        borderRadius: "1rem",
        border: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <FileCode className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span id={dialogTitleId} style={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: "0.9rem", flex: 1 }}>
            {fileName}
          </span>

          {/* View mode toggle */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={() => setViewMode("edit")}
              aria-label={t("files.browser.editor.edit")}
              style={{
                padding: "0.375rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.75rem",
                backgroundColor: viewMode === "edit" ? "var(--accent)" : "var(--card-elevated)",
                color: viewMode === "edit" ? "#000" : "var(--text-secondary)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem",
              }}
            >
              <Code2 className="w-3.5 h-3.5" /> {t("files.browser.editor.edit")}
            </button>
            <button
              onClick={() => setViewMode("preview")}
              aria-label={t("files.browser.editor.preview")}
              style={{
                padding: "0.375rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.75rem",
                backgroundColor: viewMode === "preview" ? "var(--accent)" : "var(--card-elevated)",
                color: viewMode === "preview" ? "#000" : "var(--text-secondary)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem",
              }}
            >
              <Eye className="w-3.5 h-3.5" /> {t("files.browser.editor.preview")}
            </button>
          </div>

          {viewMode === "preview" && previewIsHtml && (
            <button
              onClick={handleOpenPreviewInNewTab}
              title={t("files.browser.editor.openNewTab")}
              aria-label={t("files.browser.editor.openNewTab")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.375rem",
                borderRadius: "0.375rem",
                backgroundColor: "var(--card-elevated)",
                color: "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            aria-label={t("files.browser.editor.save")}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 1rem", borderRadius: "0.5rem",
              backgroundColor: saved ? "var(--success)" : "var(--accent)",
              color: "#000", border: "none", cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "0.875rem", opacity: saving ? 0.7 : 1,
            }}
          >
            <Save className="w-4 h-4" />
            {saved ? t("files.browser.editor.saved") : saving ? t("files.browser.editor.saving") : t("files.browser.editor.save")}
          </button>

          <button
            ref={closeButtonRef}
            onClick={handleClose}
            aria-label={t("common.close")}
            style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error bar */}
        {error && (
          <div style={{ padding: "0.5rem 1rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--error)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {/* Editor */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : viewMode === "edit" ? (
            <MonacoEditor
              value={content}
              onChange={(val) => setContent(val || "")}
              language={getMonacoLanguage(fileName)}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderWhitespace: "selection",
                tabSize: 2,
                automaticLayout: true,
              }}
            />
          ) : viewMode === "preview" && isMarkdownFile(fileName) ? (
            <div style={{ height: "100%", overflow: "auto", padding: "1.5rem" }}>
              <MarkdownPreview content={content} withContainer={false} />
            </div>
          ) : viewMode === "preview" && previewIsHtml ? (
            <div style={{ height: "100%", backgroundColor: "#fff" }}>
              <iframe
                title={t("files.browser.editor.iframeTitle", { name: fileName })}
                srcDoc={content}
                sandbox="allow-forms allow-modals allow-popups allow-scripts"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          ) : (
            <div style={{ height: "100%", overflow: "auto", padding: "1.5rem" }}>
              <pre style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.875rem" }}>
                {content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
