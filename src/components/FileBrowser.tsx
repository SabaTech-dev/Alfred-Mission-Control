"use client";

import { useState, useRef } from "react";
import {
  Folder, File, Loader2, AlertCircle, FolderOpen, Upload,
  Download, Trash2, FolderPlus, FilePlus, X, RefreshCw,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useI18n } from "@/i18n/provider";
import { FilePreview } from "./FilePreview";
import { EditorModal } from "./EditorModal";
import { useFileBrowser } from "@/hooks/useFileBrowser";
import { getFileIcon, getFileColor, formatFileSize, isEditable } from "@/lib/file-utils";
import type { FileEntry } from "@/lib/file-utils";

interface FileBrowserProps {
  workspace: string;
  path: string;
  onNavigate: (path: string) => void;
  viewMode?: "grid" | "list";
}

export function FileBrowser({ workspace, path, onNavigate, viewMode = "list" }: FileBrowserProps) {
  const { t } = useI18n();
  const {
    files: items, loading, error, uploading, refresh: loadItems,
    uploadFile: handleUpload, deleteFile: handleDelete, createFile, createFolder, downloadFile: handleDownload,
  } = useFileBrowser({ workspace, path, onNavigate });

  const [previewFile, setPreviewFile] = useState<{ workspace: string; path: string; name: string } | null>(null);
  const [editorFile, setEditorFile] = useState<{ workspace: string; path: string; name: string; initialViewMode?: "edit" | "preview" } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FileEntry | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleItemClick = (item: FileEntry, openMode: "preview" | "edit" = "preview") => {
    if (item.type === "folder") { onNavigate(path ? `${path}/${item.name}` : item.name); return; }
    const fp = path ? `${path}/${item.name}` : item.name;
    if (isEditable(item.name)) setEditorFile({ workspace, path: fp, name: item.name, initialViewMode: openMode });
    else setPreviewFile({ workspace, path: fp, name: item.name });
  };
  const handleItemDoubleClick = (item: FileEntry) => handleItemClick(item, "edit");

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const ok = await createFolder(newFolderName);
    if (ok) { setNewFolderName(""); setShowNewFolder(false); }
  };
  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    const filePath = await createFile(newFileName);
    if (filePath) { setNewFileName(""); setShowNewFile(false); setEditorFile({ workspace, path: filePath, name: newFileName.trim(), initialViewMode: "edit" }); }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); };
  const onDeleteConfirm = async () => { if (confirmDelete) { await handleDelete(confirmDelete); setConfirmDelete(null); } };

  if (loading) return (<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} /></div>);
  if (error) return (<div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--accent)" }}><AlertCircle className="w-12 h-12 mb-4" /><p>{error}</p></div>);

  const btnStyle = (bg = "var(--card-elevated)", color = "var(--text-secondary)") =>
    ({ display: "flex", alignItems: "center" as const, gap: "0.375rem", padding: "0.375rem 0.75rem", borderRadius: "0.5rem", backgroundColor: bg, color, border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.8rem" });

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title={t("files.browser.actions.upload")} aria-label={t("files.browser.actions.upload")} style={btnStyle()}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {t("files.browser.actions.upload")}
        </button>
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files)} />
        <button onClick={() => setShowNewFolder(true)} title={t("files.browser.actions.newFolder")} aria-label={t("files.browser.actions.newFolder")} style={btnStyle()}>
          <FolderPlus className="w-3.5 h-3.5" /> {t("files.browser.actions.newFolder")}
        </button>
        <button onClick={() => setShowNewFile(true)} title={t("files.browser.actions.newFile")} aria-label={t("files.browser.actions.newFile")} style={btnStyle()}>
          <FilePlus className="w-3.5 h-3.5" /> {t("files.browser.actions.newFile")}
        </button>
        <button onClick={loadItems} title={t("common.refresh")} aria-label={t("common.refresh")}
          style={{ display: "flex", alignItems: "center", padding: "0.375rem", borderRadius: "0.5rem", backgroundColor: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", marginLeft: "auto" }}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New Folder input */}
      {showNewFolder && (
        <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--card-elevated)" }}>
          <Folder className="w-4 h-4 mt-1.5" style={{ color: "#F59E0B", flexShrink: 0 }} />
          <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
            placeholder={t("files.browser.folderPlaceholder")} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.9rem" }} />
          <button onClick={handleCreateFolder} style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "var(--accent)", color: "#000", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>{t("common.create")}</button>
          <button onClick={() => setShowNewFolder(false)} aria-label={t("common.cancel")} style={{ padding: "0.25rem", borderRadius: "0.375rem", background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer" }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* New File input */}
      {showNewFile && (
        <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--card-elevated)" }}>
          <File className="w-4 h-4 mt-1.5" style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <input autoFocus value={newFileName} onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFile(); if (e.key === "Escape") setShowNewFile(false); }}
            placeholder={t("files.browser.filePlaceholder")} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.9rem" }} />
          <button onClick={handleCreateFile} style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "var(--accent)", color: "#000", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>{t("common.create")}</button>
          <button onClick={() => setShowNewFile(false)} aria-label={t("common.cancel")} style={{ padding: "0.25rem", borderRadius: "0.375rem", background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer" }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Drop zone */}
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        style={{ flex: 1, outline: dragging ? "2px dashed var(--accent)" : "none", outlineOffset: "-2px", transition: "outline 0.2s", minHeight: "100px" }}>
        {items.length === 0 && !dragging && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--text-secondary)" }}>
            <FolderOpen className="w-16 h-16 mb-4 opacity-50" /><p>{t("files.browser.empty.title")}</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>{t("files.browser.empty.hint")}</p>
          </div>
        )}
        {dragging && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--accent)" }}>
            <Upload className="w-16 h-16 mb-4" /><p>{t("files.browser.dropzone")}</p>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && items.length > 0 && !dragging && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)" }}>
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium"
              style={{ backgroundColor: "var(--background)", color: "var(--text-secondary)" }}>
              <div className="col-span-6">{t("files.browser.columns.name")}</div>
              <div className="col-span-2">{t("files.browser.columns.size")}</div>
              <div className="col-span-3">{t("files.browser.columns.modified")}</div>
              <div className="col-span-1"></div>
            </div>
            {items.map((item) => {
              const Icon = getFileIcon(item.name, item.type);
              const iconColor = getFileColor(item.name, item.type);
              return (
                <div key={item.name} className="flex md:grid md:grid-cols-12 gap-2 md:gap-4 px-3 md:px-6 py-2.5 md:py-3 cursor-pointer transition-colors hover:opacity-80 group"
                  style={{ borderBottom: "1px solid var(--border)", position: "relative" }}
                  onClick={() => handleItemClick(item)} onDoubleClick={() => handleItemDoubleClick(item)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <div className="md:col-span-6 flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <Icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" style={{ color: iconColor }} />
                    <span className="truncate text-sm md:text-base" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                    {isEditable(item.name) && item.type === "file" && (
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", opacity: 0 }} className="group-hover:opacity-100">{t("files.browser.hints.doubleClickEdit")}</span>
                    )}
                  </div>
                  <div className="md:col-span-2 text-xs md:text-sm flex items-center" style={{ color: "var(--text-secondary)" }}>
                    {item.type === "folder" ? "—" : formatFileSize(item.size)}
                  </div>
                  <div className="hidden md:col-span-3 md:text-sm md:flex items-center" style={{ color: "var(--text-secondary)" }}>
                    {new Date(item.modified).toLocaleString()}
                  </div>
                  <div className="md:col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === "file" && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} title={t("files.browser.actions.download")} aria-label={t("files.browser.actions.download")}
                        style={{ padding: "0.25rem", borderRadius: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(item); }} title={t("common.delete")} aria-label={t("common.delete")}
                      style={{ padding: "0.25rem", borderRadius: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && items.length > 0 && !dragging && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4 p-4">
            {items.map((item) => {
              const Icon = getFileIcon(item.name, item.type);
              const iconColor = getFileColor(item.name, item.type);
              return (
                <div key={item.name} onClick={() => handleItemClick(item)} onDoubleClick={() => handleItemDoubleClick(item)}
                  className="flex flex-col items-center p-3 md:p-4 rounded-xl cursor-pointer transition-all group relative" style={{ backgroundColor: "var(--card)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--card)"; }}>
                  <Icon className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3 group-hover:scale-110 transition-transform" style={{ color: iconColor }} />
                  <span className="text-xs md:text-sm text-center truncate w-full" style={{ color: "var(--text-primary)" }} title={item.name}>{item.name}</span>
                  <span className="text-[10px] md:text-xs mt-0.5 md:mt-1" style={{ color: "var(--text-muted)" }}>
                    {item.type === "folder" ? t("files.browser.folder") : formatFileSize(item.size)}
                  </span>
                  {isEditable(item.name) && item.type === "file" && (
                    <span className="text-[10px] mt-1 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: "var(--text-muted)" }}>{t("files.browser.hints.doubleClickEdit")}</span>
                  )}
                  <div style={{ position: "absolute", top: "0.25rem", right: "0.25rem", display: "flex", gap: "0.125rem", opacity: 0 }} className="group-hover:!opacity-100">
                    {item.type === "file" && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} aria-label={t("files.browser.actions.download")} title={t("files.browser.actions.download")}
                        style={{ padding: "0.2rem", borderRadius: "0.25rem", background: "var(--card-elevated)", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(item); }} aria-label={t("common.delete")} title={t("common.delete")}
                      style={{ padding: "0.2rem", borderRadius: "0.25rem", background: "var(--card-elevated)", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={Boolean(confirmDelete)}
        title={confirmDelete?.type === "folder" ? t("files.browser.deleteDialog.titleFolder") : t("files.browser.deleteDialog.titleFile")}
        message={confirmDelete ? t(confirmDelete.type === "folder" ? "files.browser.deleteDialog.messageFolder" : "files.browser.deleteDialog.messageFile", { name: confirmDelete.name }) : ""}
        cancelLabel={t("common.cancel")} confirmLabel={t("common.delete")} onCancel={() => setConfirmDelete(null)} onConfirm={onDeleteConfirm} />

      {previewFile && <FilePreview workspace={previewFile.workspace} path={previewFile.path} name={previewFile.name} onClose={() => setPreviewFile(null)} />}

      {editorFile && (
        <EditorModal workspace={editorFile.workspace} filePath={editorFile.path} fileName={editorFile.name}
          initialViewMode={editorFile.initialViewMode} onClose={() => { setEditorFile(null); loadItems(); }} />
      )}
    </>
  );
}
