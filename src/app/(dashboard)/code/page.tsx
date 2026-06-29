"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Code, FolderOpen, FileText, GitPullRequest, Copy, Check } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { computeUnifiedDiff, type DiffLine } from "@/lib/code-diff";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export default function CodePage() {
  const { t } = useI18n();
  const [basePath, setBasePath] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [diffBefore, setDiffBefore] = useState<string>("");
  const [diffAfter, setDiffAfter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPrModal, setShowPrModal] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!basePath.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/code/files?path=${encodeURIComponent(basePath)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch files");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const fetchFileContent = useCallback(async (filePath: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/code/files?path=${encodeURIComponent(filePath)}&content=true`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch file");
      }
      const data = await res.json();
      setFileContent(data.content || "");
      setSelectedFile(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setFileContent("");
    } finally {
      setLoading(false);
    }
  }, []);

  const diffResult = useMemo<DiffLine[]>(() => {
    if (!diffBefore && !diffAfter) return [];
    return computeUnifiedDiff(diffBefore, diffAfter);
  }, [diffBefore, diffAfter]);

  const handleCopyPr = useCallback(() => {
    const body = `## ${prTitle || "PR Title"}\n\n${prDescription || "Description"}\n\n### Files Changed\n- \`${selectedFile || "file"}\`\n\n### Diff\n\`\`\`diff\n${diffResult
      .map((d) => `${d.type === "add" ? "+" : d.type === "remove" ? "-" : " "}${d.text}`)
      .join("\n")}\n\`\`\``;
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prTitle, prDescription, selectedFile, diffResult]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <Code className="h-7 w-7 text-[var(--accent)]" />
            {t("code.title")}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t("code.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowPrModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-black font-medium hover:opacity-90 transition-opacity"
        >
          <GitPullRequest className="h-4 w-4" />
          {t("code.createPr")}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_1fr] gap-4">
        {/* File Tree */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)] space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-[var(--accent)]" />
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchFiles()}
              placeholder="/path/to/dir"
              className="flex-1 px-2 py-1 text-sm bg-transparent border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="px-3 py-1 text-xs rounded bg-[var(--accent)] text-black hover:opacity-80"
            >
              {t("code.browse")}
            </button>
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => !f.isDirectory && fetchFileContent(f.path)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-[var(--hover)] transition-colors text-left ${
                  selectedFile === f.path ? "bg-[var(--hover)] text-[var(--accent)]" : "text-[var(--text)]"
                }`}
              >
                {f.isDirectory ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                )}
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            {files.length === 0 && !loading && (
              <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                {t("code.empty")}
              </p>
            )}
          </div>
        </div>

        {/* Code Viewer */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--text)]">
              {selectedFile ? selectedFile.split("/").pop() : t("code.viewer")}
            </h3>
          </div>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-[500px] font-mono text-xs p-3 bg-transparent border border-[var(--border)] rounded resize-none focus:outline-none focus:border-[var(--accent)]"
            placeholder={t("code.viewerPlaceholder")}
            spellCheck={false}
          />
        </div>

        {/* Diff Viewer */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
          <h3 className="text-sm font-medium text-[var(--text)] mb-3">{t("code.diff")}</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t("code.before")}</label>
              <textarea
                value={diffBefore}
                onChange={(e) => setDiffBefore(e.target.value)}
                className="w-full h-[180px] font-mono text-xs p-2 bg-transparent border border-[var(--border)] rounded resize-none focus:outline-none focus:border-[var(--accent)]"
                placeholder={t("code.beforePlaceholder")}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t("code.after")}</label>
              <textarea
                value={diffAfter}
                onChange={(e) => setDiffAfter(e.target.value)}
                className="w-full h-[180px] font-mono text-xs p-2 bg-transparent border border-[var(--border)] rounded resize-none focus:outline-none focus:border-[var(--accent)]"
                placeholder={t("code.afterPlaceholder")}
                spellCheck={false}
              />
            </div>
            {diffResult.length > 0 && (
              <div className="mt-3 border border-[var(--border)] rounded p-2 max-h-[120px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {diffResult.map((d, i) => (
                    <span
                      key={i}
                      className={
                        d.type === "add"
                          ? "text-green-400"
                          : d.type === "remove"
                          ? "text-red-400"
                          : "text-[var(--text)]"
                      }
                    >
                      {d.type === "add" ? "+ " : d.type === "remove" ? "- " : "  "}
                      {d.text}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PR Modal */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPrModal(false)}>
          <div
            className="w-full max-w-lg p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-[var(--accent)]" />
              {t("code.createPr")}
            </h2>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t("code.prTitle")}</label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-transparent border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
                placeholder="feat: add new feature"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t("code.prDescription")}</label>
              <textarea
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                className="w-full h-24 px-3 py-2 text-sm bg-transparent border border-[var(--border)] rounded resize-none focus:outline-none focus:border-[var(--accent)]"
                placeholder="Describe the changes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPrModal(false)}
                className="px-4 py-2 text-sm rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)]"
              >
                {t("code.cancel")}
              </button>
              <button
                onClick={handleCopyPr}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-[var(--accent)] text-black font-medium hover:opacity-90"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("code.copied") : t("code.copyPr")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
