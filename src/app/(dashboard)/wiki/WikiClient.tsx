"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Search,
  RefreshCw,
  GitFork,
  Clock,
  FileText,
  Tag,
  Link2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { useI18n } from "@/i18n/provider";

interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  [key: string]: any;
}

interface NoteData {
  content: string;
  frontmatter: Frontmatter;
  modified: string;
  size: number;
}

interface SearchResult {
  path: string;
  title: string;
  preview: string;
}

interface BacklinkResult {
  path: string;
  title: string;
}

interface WikiStats {
  totalNotes: number;
  lastSync: string | null;
  modifiedToday: number;
  topLinked: string[];
}

interface SyncStatus {
  status: "green" | "yellow" | "red";
  lastSync: string | null;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

type TreeFileNode = FileNode & {
  modified?: string;
  expanded?: boolean;
  type: "file" | "directory";
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isModifiedToday(isoString: string): boolean {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function processTreeWithModified(
  files: FileNode[],
  allNotes: Map<string, { modified: string }>
): TreeFileNode[] {
  return files.map((file) => {
    const note = allNotes.get(file.path);
    const processed: TreeFileNode = {
      ...file,
      modified: note?.modified,
      expanded: false,
    };

    if (file.children) {
      processed.children = processTreeWithModified(file.children, allNotes);
    }

    return processed;
  });
}

export default function WikiClient() {
  const { t } = useI18n();
  const [files, setFiles] = useState<TreeFileNode[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [stats, setStats] = useState<WikiStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadFileTree = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/wiki/tree");
      if (!res.ok) throw new Error("Failed to load tree");
      const data = await res.json();

      // Load all note metadata in one call (N+1 fix)
      const metaRes = await fetch("/api/wiki/meta");
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const allNotes = new Map<string, { modified: string }>();
        for (const m of meta) {
          allNotes.set(m.path, { modified: m.modified });
        }

        const totalNotes = meta.length;
        const modifiedToday = meta.filter((m: any) => isModifiedToday(m.modified)).length;
        setStats({ totalNotes, lastSync: null, modifiedToday, topLinked: [] });

        setFiles(processTreeWithModified(data, allNotes));
      } else {
        // Fallback without modified times
        setStats({ totalNotes: 0, lastSync: null, modifiedToday: 0, topLinked: [] });
        setFiles(data as TreeFileNode[]);
      }
    } catch (error) {
      console.error("Failed to load file tree:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load vault");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNote = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/wiki/note?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Failed to load note");
      const data = await res.json();
      setNoteData(data);

      // Load backlinks
      const backlinksRes = await fetch(`/api/wiki/backlinks?path=${encodeURIComponent(path)}`);
      if (backlinksRes.ok) {
        const backlinksData = await backlinksRes.json();
        setBacklinks(backlinksData.backlinks || []);
      }
    } catch (error) {
      console.error("Failed to load note:", error);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Failed to search:", error);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/wiki/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync");
      const data = await res.json();
      setSyncStatus({
        status: "green",
        lastSync: data.lastSync,
      });
      await loadFileTree();
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [loadFileTree]);

  const handleSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wiki/sync");
      if (!res.ok) throw new Error("Failed to get sync status");
      const data = await res.json();
      setSyncStatus(data);
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  }, []);

  const toggleFolder = useCallback((path: string) => {
    const toggle = (nodes: TreeFileNode[]): TreeFileNode[] => {
      return nodes.map((node) => {
        if (node.path === path && node.type === "directory") {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: toggle(node.children) };
        }
        return node;
      });
    };

    setFiles(toggle(files));
  }, [files]);

  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      await loadNote(path);
    },
    [loadNote]
  );

  useEffect(() => {
    loadFileTree();
    handleSyncStatus();
  }, [loadFileTree, handleSyncStatus]);

  useEffect(() => {
    // Select index.md by default
    const indexNote = files.find((f) => f.name === "index.md" && f.type === "file");
    if (indexNote && !selectedPath) {
      handleSelectFile(indexNote.path);
    }
  }, [files, selectedPath, handleSelectFile]);

  const renderSyncBadge = () => {
    if (!syncStatus) return null;

    const colors = {
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      red: "bg-red-500",
    };

    return (
      <button
        onClick={handleSync}
        disabled={isSyncing}
        title={isSyncing ? "Syncing..." : "Click to sync"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "12px",
          backgroundColor: `${colors[syncStatus.status]}20`,
          border: `1px solid ${colors[syncStatus.status]}`,
          cursor: isSyncing ? "not-allowed" : "pointer",
          fontSize: "11px",
          fontWeight: 500,
          color: `var(--${syncStatus.status === "green" ? "green" : syncStatus.status === "yellow" ? "yellow" : "red"}-400)`,
        }}
      >
        <GitFork size={12} style={{ color: `var(--${syncStatus.status === "green" ? "green" : syncStatus.status === "yellow" ? "yellow" : "red"}-400)` }} />
        <span>{syncStatus.lastSync ? formatDate(syncStatus.lastSync) : "Never"}</span>
        {isSyncing && <RefreshCw size={10} className="animate-spin" />}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 16px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-1px",
                color: "var(--text-primary)",
                marginBottom: "4px",
              }}
            >
              <BookMarked style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />
              Wiki Explorer
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
              Segundo cerebro - Obsidian Vault
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {stats && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  backgroundColor: "var(--card)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <FileText size={12} />
                  <span>{stats.totalNotes} notas</span>
                </div>
              </div>
            )}

            {renderSyncBadge()}

            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                padding: "6px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                backgroundColor: "var(--accent)",
                color: "var(--bg)",
              }}
            >
              <Search size={14} />
            </button>
          </div>
        </div>

        {showSearch && (
          <div style={{ marginTop: "12px", position: "relative" }}>
            <Search
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                width: "14px",
                height: "14px",
              }}
            />
            <input
              type="text"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
            {searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 10,
                  padding: "4px 0",
                }}
              >
                {searchResults.map((result) => (
                  <button
                    key={result.path}
                    onClick={() => {
                      handleSelectFile(result.path);
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowSearch(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {result.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.preview}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", height: "100%" }}>
          {/* File Tree */}
          <div
            style={{
              width: "clamp(200px, 25vw, 300px)",
              minWidth: "200px",
              maxWidth: "300px",
              flexShrink: 0,
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
              backgroundColor: "var(--card)",
              padding: "12px 0",
            }}
          >
            {loadError ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ marginBottom: "8px", fontSize: "24px" }}>⚠️</div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Error al cargar el vault</div>
                <div style={{ fontSize: "12px" }}>{loadError}</div>
              </div>
            ) : isLoading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                Loading...
              </div>
            ) : (
              <div style={{ padding: "0 8px" }}>
                {files.map((file) => (
                  <div key={file.path}>
                    {file.type === "directory" ? (
                      <div>
                        <button
                          onClick={() => toggleFolder(file.path)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 8px",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          {file.expanded ? (
                            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                          )}
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {file.name}
                          </span>
                        </button>
                        {file.expanded && file.children && (
                          <div style={{ marginLeft: "12px" }}>
                            {file.children.map((child) => (
                              <div key={child.path}>
                                {child.type === "file" ? (
                                  <button
                                    onClick={() => handleSelectFile(child.path)}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      padding: "6px 8px",
                                      border: "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      backgroundColor:
                                        selectedPath === child.path ? "var(--accent-soft)" : "transparent",
                                      borderLeft: selectedPath === child.path ? "2px solid var(--accent)" : "2px solid transparent",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                                    onMouseLeave={(e) =>
                                      e.currentTarget.style.backgroundColor =
                                        selectedPath === child.path ? "var(--accent-soft)" : "transparent"
                                    }
                                  >
                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{child.name}</span>
                                    {(child as any).modified && isModifiedToday((child as any).modified) && (
                                      <div
                                        style={{
                                          width: "6px",
                                          height: "6px",
                                          borderRadius: "50%",
                                          backgroundColor: "var(--accent)",
                                          marginLeft: "auto",
                                        }}
                                      />
                                    )}
                                  </button>
                                ) : (
                                  <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 8px" }}>
                                    {child.name}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectFile(file.path)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 8px",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          backgroundColor: selectedPath === file.path ? "var(--accent-soft)" : "transparent",
                          borderLeft: selectedPath === file.path ? "2px solid var(--accent)" : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                        onMouseLeave={(e) =>
                          e.currentTarget.style.backgroundColor =
                            selectedPath === file.path ? "var(--accent-soft)" : "transparent"
                        }
                      >
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{file.name}</span>
                        {(file as any).modified && isModifiedToday((file as any).modified) && (
                          <div
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: "var(--accent)",
                              marginLeft: "auto",
                            }}
                          />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {noteData ? (
              <>
                {/* Note Header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          marginBottom: "4px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {noteData.frontmatter.title || selectedPath || "Untitled"}
                      </h2>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={10} />
                          <span>{noteData.modified ? formatDate(noteData.modified) : "Unknown"}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FileText size={10} />
                          <span>{formatSize(noteData.size)}</span>
                        </div>
                      </div>
                    </div>

                    {noteData.frontmatter.tags && noteData.frontmatter.tags.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginLeft: "16px" }}>
                        {noteData.frontmatter.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: "10px",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              backgroundColor: "var(--accent-soft)",
                              color: "var(--accent)",
                            }}
                          >
                            <Tag size={10} style={{ width: "10px", display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Backlinks */}
                {backlinks.length > 0 && (
                  <div
                    style={{
                      padding: "8px 16px",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--surface-soft)",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
                      <Link2 size={12} />
                      <span>
                        <strong>{backlinks.length}</strong> notas enlazan aquí
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                      {backlinks.map((backlink) => (
                        <button
                          key={backlink.path}
                          onClick={() => handleSelectFile(backlink.path)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            fontSize: "10px",
                            color: "var(--text-secondary)",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--card)"}
                        >
                          {backlink.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note Content */}
                <div style={{ flex: 1, overflow: "auto" }}>
                  <MarkdownPreview content={noteData.content} withContainer={false} />
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <BookMarked style={{ width: "64px", height: "64px", margin: "0 auto 16px", opacity: 0.3 }} />
                  <p>Selecciona una nota para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
