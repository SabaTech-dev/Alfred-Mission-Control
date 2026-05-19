/**
 * Custom hook for Hindsight memory operations
 */
import { useState, useCallback } from "react";
import { HindsightStats, HindsightMemory } from "../types";
import { formatDateTime } from "../utils/wikiUtils";

interface UseHindsightResult {
  hindsightQuery: string;
  hindsightResults: HindsightMemory[];
  hindsightStats: HindsightStats | null;
  isHindsightLoading: boolean;
  handleHindsightSearch: (query: string) => Promise<void>;
  loadHindsightStats: () => Promise<void>;
  formatDateTime: (isoString: string) => string;
}

export function useHindsight(): UseHindsightResult {
  const [hindsightQuery, setHindsightQuery] = useState("");
  const [hindsightResults, setHindsightResults] = useState<HindsightMemory[]>([]);
  const [hindsightStats, setHindsightStats] = useState<HindsightStats | null>(null);
  const [isHindsightLoading, setIsHindsightLoading] = useState(false);

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

  return {
    hindsightQuery,
    hindsightResults,
    hindsightStats,
    isHindsightLoading,
    handleHindsightSearch,
    loadHindsightStats,
    formatDateTime,
  };
}