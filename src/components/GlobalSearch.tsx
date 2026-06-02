"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";

interface SearchResult {
  type: "memory" | "activity" | "task";
  title: string;
  snippet: string;
}

function resultHref(type: SearchResult["type"]): string {
  switch (type) {
    case "memory":
      return "/memory";
    case "activity":
      return "/activity";
    case "task":
      return "/kanban";
    default:
      return "/";
  }
}

export function GlobalSearch() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    let active = true;

    async function runSearch() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        const response = await authFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (!response.ok) {
          throw new Error(`Global search request failed: ${response.status}`);
        }

        const data = await response.json();
        const nextResults = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : [];

        if (active) {
          setResults(nextResults);
        }
      } catch (error) {
        console.error("Global search failed:", error);
        if (active) {
          setResults([]);
        }
      }
    }

    runSearch();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("topbar.search")}
          className="w-full bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {results.length === 0 ? (
          <div className="px-4 py-8 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            {debouncedQuery ? "—" : t("topbar.search")}
          </div>
        ) : (
          results.map((result, index) => (
            <Link
              key={`${result.type}-${result.title}-${index}`}
              href={resultHref(result.type)}
              className="block px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {result.title}
              </p>
              <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                {result.snippet}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}