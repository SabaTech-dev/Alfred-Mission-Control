/**
 * Compositing hook for all Wiki data fetching, sync, and state management.
 * Aggregates the individual wiki hooks plus layout-level state and effects.
 */
import { useState, useEffect, useCallback } from "react";

import { useWikiTree } from "@/app/(dashboard)/wiki/hooks/useWikiTree";
import { useWikiNote } from "@/app/(dashboard)/wiki/hooks/useWikiNote";
import { useWikiSearch } from "@/app/(dashboard)/wiki/hooks/useWikiSearch";
import { useWikiSync } from "@/app/(dashboard)/wiki/hooks/useWikiSync";
import { useHindsight } from "@/app/(dashboard)/wiki/hooks/useHindsight";

export type WikiTab = "wiki" | "hindsight" | "graph";

export interface UseWikiDataResult {
  // Layout state
  selectedPath: string | null;
  showSearch: boolean;
  activeTab: WikiTab;
  setSelectedPath: (path: string | null) => void;
  setShowSearch: (show: boolean) => void;
  setActiveTab: (tab: WikiTab) => void;

  // Tree
  files: ReturnType<typeof useWikiTree>["files"];
  loadError: string | null;
  isLoading: boolean;
  stats: ReturnType<typeof useWikiTree>["stats"];
  toggleFolder: (path: string) => void;

  // Note
  noteData: ReturnType<typeof useWikiNote>["noteData"];
  backlinks: ReturnType<typeof useWikiNote>["backlinks"];

  // Search
  searchQuery: string;
  searchResults: ReturnType<typeof useWikiSearch>["searchResults"];
  handleSearch: (query: string) => Promise<void>;

  // Sync
  syncStatus: ReturnType<typeof useWikiSync>["syncStatus"];
  isSyncing: boolean;
  handleSyncWithReload: () => Promise<void>;

  // Hindsight
  hindsightQuery: string;
  hindsightResults: ReturnType<typeof useHindsight>["hindsightResults"];
  hindsightStats: ReturnType<typeof useHindsight>["hindsightStats"];
  isHindsightLoading: boolean;
  handleHindsightSearch: (query: string) => Promise<void>;
  formatDateTime: (isoString: string) => string;

  // Shared handlers
  handleSelectFile: (path: string) => Promise<void>;
}

export function useWikiData(): UseWikiDataResult {
  // Layout state
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<WikiTab>("wiki");

  // Individual domain hooks
  const {
    files,
    loadError,
    isLoading,
    stats,
    loadFileTree,
    toggleFolder,
  } = useWikiTree();

  const {
    noteData,
    backlinks,
    loadNote,
  } = useWikiNote();

  const {
    searchQuery,
    searchResults,
    handleSearch,
  } = useWikiSearch();

  const {
    syncStatus,
    isSyncing,
    handleSync,
    handleSyncStatus,
  } = useWikiSync();

  const {
    hindsightQuery,
    hindsightResults,
    hindsightStats,
    isHindsightLoading,
    handleHindsightSearch,
    loadHindsightStats,
    formatDateTime,
  } = useHindsight();

  // Derived handlers
  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      await loadNote(path);
    },
    [loadNote]
  );

  const handleSyncWithReload = useCallback(async () => {
    await handleSync(loadFileTree);
  }, [handleSync, loadFileTree]);

  // Initial data load
  useEffect(() => {
    loadFileTree();
    handleSyncStatus();
    loadHindsightStats();
  }, [loadFileTree, handleSyncStatus, loadHindsightStats]);

  // Auto-select index.md on first load
  useEffect(() => {
    const indexNote = files.find(
      (f) => f.name === "index.md" && f.type === "file"
    );
    if (indexNote && !selectedPath) {
      handleSelectFile(indexNote.path);
    }
  }, [files, selectedPath, handleSelectFile]);

  return {
    // Layout state
    selectedPath,
    showSearch,
    activeTab,
    setSelectedPath,
    setShowSearch,
    setActiveTab,

    // Tree
    files,
    loadError,
    isLoading,
    stats,
    toggleFolder,

    // Note
    noteData,
    backlinks,

    // Search
    searchQuery,
    searchResults,
    handleSearch,

    // Sync
    syncStatus,
    isSyncing,
    handleSyncWithReload,

    // Hindsight
    hindsightQuery,
    hindsightResults,
    hindsightStats,
    isHindsightLoading,
    handleHindsightSearch,
    formatDateTime,

    // Shared handlers
    handleSelectFile,
  };
}
