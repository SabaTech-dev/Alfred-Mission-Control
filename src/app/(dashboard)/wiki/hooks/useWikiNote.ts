/**
 * Custom hook for Wiki note operations
 */
import { useState, useCallback } from "react";
import { NoteData, BacklinkResult } from "../types";

interface UseWikiNoteResult {
  noteData: NoteData | null;
  backlinks: BacklinkResult[];
  loadNote: (path: string) => Promise<void>;
}

export function useWikiNote(): UseWikiNoteResult {
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);

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

  return {
    noteData,
    backlinks,
    loadNote,
  };
}