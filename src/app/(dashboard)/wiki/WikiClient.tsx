"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

import { WikiHeader } from "./WikiHeader";
import { FileTree } from "./FileTree";
import { NotePreview } from "./NotePreview";
import { HindsightTab } from "./HindsightTab";
import { GraphTab } from "./GraphTab";

import {
  TreeFileNode,
  NoteData,
  SearchResult,
  BacklinkResult,
  WikiStats,
  SyncStatus,
  FileNode,
  HindsightStats,
  HindsightMemory,
} from "./types";
import { formatDate, isModifiedToday } from "./utils";

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

  const handleSelectBacklink = useCallback((path: string) => {
    handleSelectFile(path);
  }, [handleSelectFile]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <WikiHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        handleSearch={handleSearch}
        handleSelectFile={handleSelectFile}
        stats={stats}
        syncStatus={syncStatus}
        handleSync={handleSync}
      />

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", height: "100%" }}>
          {/* Wiki Tab Content */}
          {activeTab === 'wiki' && (
            <>
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
                <FileTree
                  files={files}
                  selectedPath={selectedPath}
                  isLoading={isLoading}
                  loadError={loadError}
                  onToggleFolder={toggleFolder}
                  onSelectFile={handleSelectFile}
                />
              </div>

              {/* Note Preview */}
              <NotePreview
                noteData={noteData}
                selectedPath={selectedPath}
                backlinks={backlinks}
                onSelectBacklink={handleSelectBacklink}
              />
            </>
          )}

          {/* Hindsight Tab Content */}
          {activeTab === 'hindsight' && (
            <HindsightTab
              stats={hindsightStats}
              query={hindsightQuery}
              onSearch={handleHindsightSearch}
              results={hindsightResults}
              isLoading={isHindsightLoading}
              selectedMemory={selectedMemory}
              onMemoryClick={setSelectedMemory}
              onMemoryClose={() => setSelectedMemory(null)}
            />
          )}

          {/* Graph Tab Content */}
          {activeTab === 'graph' && (
            <GraphTab
              onNodeClick={(path) => {
                setSelectedPath(path);
                setActiveTab('wiki');
              }}
            />
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