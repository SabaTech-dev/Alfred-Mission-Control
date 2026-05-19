import {
  Folder,
  FileText,
  FileCode,
  FileJson,
  Image,
  File,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  type: "file" | "folder";
  size: number;
  modified: string;
}

// ─── Icon helpers ───────────────────────────────────────────────────────────────

export function getFileIcon(name: string, type: string) {
  if (type === "folder") return Folder;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "py", "sh", "bash"].includes(ext)) return FileCode;
  if (["json", "yaml", "yml", "toml"].includes(ext)) return FileJson;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext)) return Image;
  if (["md", "mdx", "txt", "log"].includes(ext)) return FileText;
  return File;
}

export function getFileColor(name: string, type: string): string {
  if (type === "folder") return "#F59E0B";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx"].includes(ext)) return "#60A5FA";
  if (["js", "jsx"].includes(ext)) return "#FCD34D";
  if (["json"].includes(ext)) return "#4ADE80";
  if (["py"].includes(ext)) return "#93C5FD";
  if (["md", "mdx"].includes(ext)) return "var(--text-secondary)";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "#C084FC";
  return "var(--text-secondary)";
}

// ─── Formatting ─────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ─── Editor helpers ─────────────────────────────────────────────────────────────

export function getMonacoLanguage(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", md: "markdown", mdx: "markdown", py: "python",
    sh: "shell", bash: "shell", yaml: "yaml", yml: "yaml",
    toml: "toml", css: "css", html: "html", sql: "sql",
    txt: "plaintext", log: "plaintext",
  };
  return map[ext] || "plaintext";
}

export function isEditable(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const editableExts = ["ts", "tsx", "js", "jsx", "json", "md", "mdx", "txt", "py", "sh", "yaml", "yml", "toml", "css", "html", "sql", "log", "env"];
  return editableExts.includes(ext) || !name.includes(".");
}

export function isMarkdownFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext === "md" || ext === "mdx";
}

export function isHtmlFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext === "html" || ext === "htm";
}
