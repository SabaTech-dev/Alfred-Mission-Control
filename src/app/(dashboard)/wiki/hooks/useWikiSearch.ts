/**
 * Custom hook for Wiki search
 */
import { useState, useCallback } from "react";
import { SearchResult } from "../types";

interface UseWikiSearchResult {
  searchQuery: string;
  searchResults: SearchResult[];
  handleSearch: (query: string) => Promise<void>;
}

export function useWikiSearch(): UseWikiSearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

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

  return {
    searchQuery,
    searchResults,
    handleSearch,
  };
}