/**
 * Custom hook for Wiki tree operations
 */
import { useState, useCallback } from "react";
import { TreeFileNode, processTreeWithModified, isModifiedToday } from "../utils/wikiUtils";
import { FileNode } from "../utils/wikiUtils";
import { WikiStats } from "../types";

interface UseWikiTreeResult {
  files: TreeFileNode[];
  loadError: string | null;
  isLoading: boolean;
  stats: WikiStats | null;
  loadFileTree: () => Promise<void>;
  toggleFolder: (path: string) => void;
}

export function useWikiTree(): UseWikiTreeResult {
  const [files, setFiles] = useState<TreeFileNode[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<WikiStats | null>(null);

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

        setFiles(processTreeWithModified(data as FileNode[], allNotes));
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

  return {
    files,
    loadError,
    isLoading,
    stats,
    loadFileTree,
    toggleFolder,
  };
}