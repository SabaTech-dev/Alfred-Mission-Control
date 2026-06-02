"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, FileText, Activity, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ALL_COMMANDS,
  type Command,
  type CommandGroup,
} from "@/lib/command-registry";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useDebounce } from "@/hooks/useDebounce";
import { authFetch } from "@/lib/auth-fetch";

/**
 * Search result from /api/search
 */
interface SearchResult {
  type: "memory" | "activity" | "task";
  title: string;
  snippet: string;
  path?: string;
  timestamp?: string;
}

/**
 * Transform search results to Command objects
 */
function searchResultsToCommands(results: SearchResult[]): Command[] {
  return results.map((result, index) => {
    let icon = FileText;
    let href: string | undefined;

    if (result.type === "memory") {
      icon = FileText;
      href = "/memory";
    } else if (result.type === "activity") {
      icon = Activity;
      href = "/activity";
    } else if (result.type === "task") {
      icon = CheckCircle;
      href = "/kanban";
    }

    return {
      id: `search-${index}`,
      label: result.title,
      icon,
      href,
      group: "Search Results" as CommandGroup,
      keywords: [result.snippet.substring(0, 50)],
    };
  });
}

/**
 * Filter and score commands based on query
 * Scoring: exact match (100) > starts-with (75) > contains (50) > keyword match (25)
 */
function filterCommands(query: string, commands: Command[]): Command[] {
  if (!query.trim()) {
    return commands;
  }

  const normalizedQuery = query.toLowerCase().trim();

  const scored = commands
    .map((command) => {
      const label = command.label.toLowerCase();
      const keywords = command.keywords?.map((k) => k.toLowerCase()) || [];

      let score = 0;

      // Exact match
      if (label === normalizedQuery) {
        score = 100;
      }
      // Starts with
      else if (label.startsWith(normalizedQuery)) {
        score = 75;
      }
      // Contains
      else if (label.includes(normalizedQuery)) {
        score = 50;
      }
      // Keyword match
      else if (keywords.some((k) => k.includes(normalizedQuery))) {
        score = 25;
      }

      return { command, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      // Sort by score first, then alphabetically by label
      if (b.score !== a.score) return b.score - a.score;
      return a.command.label.localeCompare(b.command.label);
    })
    .map((item) => item.command);

  return scored;
}

/**
 * Group commands by their group property, preserving order
 */
function groupCommands(commands: Command[]): Map<CommandGroup, Command[]> {
  const groups = new Map<CommandGroup, Command[]>();

  for (const command of commands) {
    const existing = groups.get(command.group) || [];
    existing.push(command);
    groups.set(command.group, existing);
  }

  return groups;
}

interface CommandPaletteProps {
  /** Optional callback when a command is executed */
  onCommand?: (command: Command) => void;
}

export function CommandPalette({ onCommand }: CommandPaletteProps) {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce query for search API (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const fetchSearchResults = async () => {
      setIsSearching(true);
      try {
        const response = await authFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSearchResults();
  }, [debouncedQuery]);

  // Transform search results to commands
  const searchCommands = useMemo(() => {
    return searchResultsToCommands(searchResults);
  }, [searchResults]);

  // Filter local commands based on query
  const filteredLocalCommands = useMemo(() => {
    return filterCommands(query, ALL_COMMANDS);
  }, [query]);

  // Merge local commands with search results (local first, then search)
  const allFilteredCommands = useMemo(() => {
    if (searchCommands.length === 0) {
      return filteredLocalCommands;
    }
    return [...filteredLocalCommands, ...searchCommands];
  }, [filteredLocalCommands, searchCommands]);

  // Group merged commands
  const groupedCommands = useMemo(() => {
    return groupCommands(allFilteredCommands);
  }, [allFilteredCommands]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Execute a command (navigate or perform action)
  const executeCommand = useCallback(
    (command: Command) => {
      onCommand?.(command);

      if (command.href) {
        router.push(command.href);
      } else if (command.action === "refresh") {
        router.refresh();
      }

      close();
    },
    [router, close, onCommand]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const totalItems = allFilteredCommands.length;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;

        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;

        case "Enter":
          event.preventDefault();
          if (allFilteredCommands[selectedIndex]) {
            executeCommand(allFilteredCommands[selectedIndex]);
          }
          break;

        case "Escape":
          event.preventDefault();
          close();
          break;
      }
    },
    [allFilteredCommands, selectedIndex, close, executeCommand]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        close();
      }
    },
    [close]
  );

  if (!isOpen) return null;

  // Build flat list of commands with their visual indices
  let visualIndex = 0;
  const commandElements: React.ReactNode[] = [];

  groupedCommands.forEach((commands, group) => {
    // Group header
    commandElements.push(
      <div
        key={`header-${group}`}
        className="px-3 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {group}
      </div>
    );

    // Commands in group
    commands.forEach((command) => {
      const currentIndex = visualIndex;
      const isSelected = selectedIndex === currentIndex;

      commandElements.push(
        <button
          key={command.id}
          data-index={currentIndex}
          onClick={() => executeCommand(command)}
          onMouseEnter={() => setSelectedIndex(currentIndex)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
          style={{
            backgroundColor: isSelected ? "var(--accent)" : "transparent",
            color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {command.icon && (
            <command.icon
              className="w-4 h-4 flex-shrink-0"
              style={{
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
              }}
            />
          )}
          <span className="flex-1 text-sm font-medium">{command.label}</span>
          {command.href && (
            <ArrowRight
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
              }}
            />
          )}
        </button>
      );

      visualIndex++;
    });
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Search Input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Search
                className="w-5 h-5 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{
                  color: "var(--text-primary)",
                }}
              />
              <kbd
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Command List */}
            <div
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
              }}
            >
              {isSearching ? (
                <div
                  className="flex items-center justify-center gap-2 px-4 py-8 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </div>
              ) : allFilteredCommands.length === 0 ? (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No results found for &quot;{query}&quot;
                </div>
              ) : (
                commandElements
              )}
            </div>

            {/* Footer hint */}
            <div
              className="flex items-center justify-between px-4 py-2 text-xs"
              style={{
                color: "var(--text-muted)",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd
                    className="px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--border)" }}
                  >
                    ↑
                  </kbd>
                  <kbd
                    className="px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--border)" }}
                  >
                    ↓
                  </kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd
                    className="px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--border)" }}
                  >
                    ↵
                  </kbd>
                  to select
                </span>
              </div>
              <span className="opacity-60">
                {allFilteredCommands.length} results
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
