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
  Brain,
  TrendingUp,
  Calendar,
  Share2,
} from "lucide-react";
import dynamic from "next/dynamic";
const WikiGraphView = dynamic(() => import("@/components/WikiGraphView").then((m) => m.default), { ssr: false });
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

interface HindsightStats {
  total_nodes: number;
  total_links: number;
  total_documents: number;
  nodes_by_fact_type: {
    world: number;
    experience: number;
    observation: number;
  };
  links_by_link_type: {
    temporal: number;
    semantic: number;
    caused_by: number;
    entity: number;
  };
  last_recall?: string;
  top_categories: string[];
}

interface HindsightMemory {
  id: string;
  text: string;
  date: string;
  fact_type: 'world' | 'experience' | 'observation';
  entities: string;
  tags: string[];
  score?: number;
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

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  
  // Hindsight states
  const [hindsightQuery, setHindsightQuery] = useState("");
  const [hindsightResults, setHindsightResults] = useState<HindsightMemory[]>([]);
  const [hindsightStats, setHindsightStats] = useState<HindsightStats | null>(null);
  const [isHindsightLoading, setIsHindsightLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'wiki' | 'hindsight' | 'graph'>('wiki');
  const [selectedMemory, setSelectedMemory] = useState<HindsightMemory | null>(null);

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

  const handleHindsightSearch = useCallback(async (query: string) => {
    setHindsightQuery(query);

    if (query.length < 2) {
      setHindsightResults([]);
      return;
    }

    try {
      setIsHindsightLoading(true);
      const res = await fetch(`/api/hindsight/search?q=${encodeURIComponent(query)}&bank=alfred-coder::main`);
      if (!res.ok) throw new Error("Failed to search Hindsight");
      const data = await res.json();
      setHindsightResults(data.memories || []);
    } catch (error) {
      console.error("Failed to search Hindsight:", error);
    } finally {
      setIsHindsightLoading(false);
    }
  }, []);

  const loadHindsightStats = useCallback(async () => {
    try {
      const res = await fetch("/api/hindsight/stats?bank=alfred-coder::main");
      if (!res.ok) throw new Error("Failed to load Hindsight stats");
      const data = await res.json();
      setHindsightStats(data);
    } catch (error) {
      console.error("Failed to load Hindsight stats:", error);
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
    loadHindsightStats();
  }, [loadFileTree, handleSyncStatus, loadHindsightStats]);

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
            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
              <button
                onClick={() => setActiveTab('wiki')}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px 6px 0 0",
                  border: "none",
                  backgroundColor: activeTab === 'wiki' ? 'var(--card)' : 'transparent',
                  borderBottom: activeTab === 'wiki' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeTab === 'wiki' ? 600 : 400,
                  color: activeTab === 'wiki' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <BookMarked size={14} />
                Wiki Explorer
              </button>
              <button
                onClick={() => setActiveTab('hindsight')}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px 6px 0 0",
                  border: "none",
                  backgroundColor: activeTab === 'hindsight' ? 'var(--card)' : 'transparent',
                  borderBottom: activeTab === 'hindsight' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeTab === 'hindsight' ? 600 : 400,
                  color: activeTab === 'hindsight' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Brain size={14} />
                Hindsight Memory
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px 6px 0 0",
                  border: "none",
                  backgroundColor: activeTab === 'graph' ? 'var(--card)' : 'transparent',
                  borderBottom: activeTab === 'graph' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeTab === 'graph' ? 600 : 400,
                  color: activeTab === 'graph' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Share2 size={14} />
                Graph
              </button>
            </div>
            
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
              {activeTab === 'wiki' && <BookMarked style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />}
              {activeTab === 'hindsight' && <Brain style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />}
              {activeTab === 'graph' && <Share2 style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />}
              {activeTab === 'wiki' ? 'Wiki Explorer' : activeTab === 'hindsight' ? 'Hindsight Memory' : 'Grafo de Conexiones'}
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
              {activeTab === 'wiki' ? 'Segundo cerebro - Obsidian Vault' : activeTab === 'hindsight' ? 'Memoria semántica - Búsqueda vectorial y relaciones' : 'Visualización interactiva de backlinks entre notas'}
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
          {/* Wiki Tab Content */}
          {activeTab === 'wiki' && (<>
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
        </>)}
        
        {/* Hindsight Tab Content */}
        {activeTab === 'hindsight' && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px" }}>
            {/* Stats Bar */}
            {hindsightStats && (
              <div style={{
                display: "flex",
                gap: "16px",
                marginBottom: "24px",
                padding: "16px",
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Brain size={16} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Memories</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{hindsightStats.total_nodes}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={16} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Relations</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{hindsightStats.total_links}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={16} />
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Last Recall</div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {hindsightStats.last_recall ? formatDateTime(hindsightStats.last_recall) : 'Never'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search */}
            <div style={{ position: "relative", marginBottom: "24px" }}>
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
                placeholder="Buscar en memoria semántica..."
                value={hindsightQuery}
                onChange={(e) => handleHindsightSearch(e.target.value)}
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
            </div>
            
            {/* Results */}
            {isHindsightLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px", color: "var(--text-secondary)" }}>
                Buscando en memoria semántica...
              </div>
            ) : hindsightResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {hindsightResults.map((memory) => (
                  <div
                    key={memory.id}
                    style={{
                      padding: "16px",
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedMemory(memory)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--card)"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                        {memory.text.slice(0, 80)}{memory.text.length > 80 ? '...' : ''}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "var(--text-muted)" }}>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "10px",
                          backgroundColor: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontWeight: 500,
                        }}>
                          {memory.score || 0}%
                        </span>
                        <span style={{ backgroundColor: "var(--surface-soft)", padding: "2px 4px", borderRadius: "4px" }}>
                          {memory.fact_type}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      {memory.text.slice(0, 200)}{memory.text.length > 200 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      {formatDateTime(memory.date)} | {memory.entities.split(",").slice(0, 3).join(", ")}{memory.entities.split(",").length > 3 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : hindsightQuery.length >= 2 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
                No se encontraron recuerdos para esta búsqueda
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
                <Brain style={{ width: "64px", height: "64px", margin: "0 auto 16px", opacity: 0.3 }} />
                <p>Realiza una búsqueda semántica en la memoria de Alfred</p>
                <p style={{ fontSize: "12px", marginTop: "8px" }}>Utiliza búsqueda vectorial para encontrar relaciones semánticas</p>
              </div>
            )}
            
            {/* Memory Detail Modal */}
            {selectedMemory && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 50,
                }}
                onClick={() => setSelectedMemory(null)}
              >
                <div
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    maxWidth: "640px",
                    width: "90%",
                    maxHeight: "80vh",
                    overflowY: "auto",
                    padding: "24px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        backgroundColor: "var(--accent-soft)",
                        color: "var(--accent)",
                        fontWeight: 500,
                        fontSize: "11px",
                      }}>{selectedMemory.score}%</span>
                      <span style={{ backgroundColor: "var(--surface-soft)", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", color: "var(--text-secondary)" }}>
                        {selectedMemory.fact_type}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMemory(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "18px" }}
                    >✕</button>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.6, marginBottom: "16px" }}>
                    {selectedMemory.text}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                    <div style={{ marginBottom: "4px" }}>
                      <strong>Fecha:</strong> {formatDateTime(selectedMemory.date)}
                    </div>
                    {selectedMemory.entities && (
                      <div style={{ marginBottom: "4px" }}>
                        <strong>Entidades:</strong> {selectedMemory.entities}
                      </div>
                    )}
                    {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                      <div>
                        <strong>Tags:</strong> {selectedMemory.tags.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Graph Tab Content */}
        {activeTab === 'graph' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <WikiGraphView onNodeClick={(path) => {
              setSelectedPath(path);
              setActiveTab('wiki');
            }} />
          </div>
        )}
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
