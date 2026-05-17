"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain, Search, Filter, Calendar, Download, RefreshCw,
  Loader2, ChevronDown, Hash, ExternalLink, Newspaper,
  MessageSquare, Play, TrendingUp, X
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { useToast } from "@/components/Toast";

interface DigestEntry {
  date: string;
  filename: string;
  title: string;
  summary: string;
  categories: string[];
  itemCounts: Record<string, number>;
}

interface DigestStats {
  total: number;
  categories: string[];
  totalItems: number;
  dateRange: { earliest: string | null; latest: string | null };
  availableMonths: string[];
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  AI: { icon: Brain, color: "#8b5cf6", label: "AI" },
  Reddit: { icon: MessageSquare, color: "#ff4500", label: "Reddit" },
  YouTube: { icon: Play, color: "#ff0000", label: "YouTube" },
  Startups: { icon: TrendingUp, color: "#10b981", label: "Startups" },
  Social: { icon: Hash, color: "#3b82f6", label: "Social" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function AiSocialDigestView() {
  const [digests, setDigests] = useState<DigestEntry[]>([]);
  const [stats, setStats] = useState<DigestStats | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [detailContent, setDetailContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { showError } = useToast();

  const loadList = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterMonth !== "all") params.set("date", filterMonth);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/reports/ai-social-digest?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setDigests(data.digests);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
      showError("Failed to load AI & Social Digests");
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterMonth, searchQuery, showError]);

  const loadDetail = useCallback(async (filename: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setIsLoadingDetail(true);
      const res = await fetch(
        `/api/reports/ai-social-digest?file=${encodeURIComponent(filename)}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setDetailContent(data.content);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error(err);
      setDetailContent("# Error\n\nFailed to load digest content.");
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleSelect = useCallback(
    (digest: DigestEntry) => {
      setSelectedFilename(digest.filename);
      loadDetail(digest.filename);
    },
    [loadDetail]
  );

  const handleDownload = useCallback((digest: DigestEntry) => {
    const blob = new Blob([detailContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = digest.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [detailContent]);

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterMonth("all");
    setSelectedFilename(null);
    setDetailContent("");
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const selectedDigest = digests.find((d) => d.filename === selectedFilename);
  const totalItems = digests.reduce((sum, d) => sum + Object.values(d.itemCounts).reduce((s, n) => s + n, 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 md:p-4 flex-shrink-0"
        style={{
          backgroundColor: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Newspaper className="w-5 h-5 md:w-6 md:h-6" style={{ color: "#8b5cf6" }} />
          <div>
            <h1
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              AI & Social Digest
            </h1>
            <p className="text-xs md:text-sm hidden sm:block" style={{ color: "var(--text-secondary)" }}>
              {stats
                ? `${stats.total} digests · ${stats.totalItems} items · ${stats.categories.join(", ")}`
                : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: showFilters ? "#8b5cf6" : "var(--card-elevated)",
              border: "1px solid var(--border)",
              color: showFilters ? "white" : "var(--text-primary)",
            }}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
            title="Reset filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <div
          className="flex flex-wrap items-center gap-2 p-3 flex-shrink-0"
          style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search digests..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All Categories</option>
            {stats?.categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {stats && stats.availableMonths.length > 0 && (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">All Months</option>
              {stats.availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Quick category pills */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 overflow-x-auto"
        style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={() => setFilterCategory("all")}
          className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
          style={{
            backgroundColor: filterCategory === "all" ? "#8b5cf6" : "var(--card-elevated)",
            color: filterCategory === "all" ? "white" : "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          All ({stats?.total || 0})
        </button>
        {stats?.categories.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const count = digests.filter((d) => d.categories.includes(cat)).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: filterCategory === cat ? cfg?.color || "#6b7280" : "var(--card-elevated)",
                color: filterCategory === cat ? "white" : "var(--text-secondary)",
                border: `1px solid ${filterCategory === cat ? cfg?.color || "#6b7280" : "var(--border)"}`,
              }}
            >
              {cfg && <cfg.icon className="w-3 h-3" />}
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Digest list */}
        <div
          className="w-full md:w-80 lg:w-96 overflow-y-auto flex-shrink-0"
          style={{
            backgroundColor: "var(--card)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {isLoading ? "Loading..." : `${digests.length} Digests · ${totalItems} items`}
            </h2>
          </div>

          {!isLoading && digests.length === 0 && (
            <div className="p-6 text-center" style={{ color: "var(--text-muted)" }}>
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No digests found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}

          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center p-6" style={{ color: "var(--text-secondary)" }}>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading digests...
              </div>
            )}
            {digests.map((digest) => {
              const isSelected = selectedFilename === digest.filename;
              return (
                <button
                  key={digest.filename}
                  onClick={() => handleSelect(digest)}
                  className="w-full text-left rounded-lg p-3 transition-all"
                  style={{
                    backgroundColor: isSelected ? "#8b5cf6" : "transparent",
                    border: `1px solid ${isSelected ? "#8b5cf6" : "transparent"}`,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "var(--card-elevated, var(--background))";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Calendar
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: isSelected ? "white" : "#8b5cf6" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatDate(digest.date)}
                      </p>
                      <p
                        className="text-xs mt-0.5 line-clamp-2"
                        style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}
                      >
                        {digest.summary}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {digest.categories.map((cat) => {
                          const cfg = CATEGORY_CONFIG[cat];
                          const count = digest.itemCounts[cat] || 0;
                          return (
                            <span
                              key={cat}
                              className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.15)"
                                  : cfg
                                    ? cfg.color + "15"
                                    : "var(--background)",
                                color: isSelected ? "white" : cfg?.color || "var(--text-secondary)",
                              }}
                            >
                              {cfg && <cfg.icon className="w-2.5 h-2.5" />}
                              {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col" style={{ backgroundColor: "var(--background)" }}>
          {selectedFilename ? (
            <>
              <div
                className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Newspaper className="w-4 h-4 flex-shrink-0" style={{ color: "#8b5cf6" }} />
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {selectedDigest ? formatDate(selectedDigest.date) : selectedFilename}
                  </span>
                  {selectedDigest && (
                    <div className="flex items-center gap-1">
                      {selectedDigest.categories.map((cat) => {
                        const cfg = CATEGORY_CONFIG[cat];
                        return (
                          <span
                            key={cat}
                            className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: cfg ? cfg.color + "15" : "var(--background)",
                              color: cfg?.color || "var(--text-secondary)",
                            }}
                          >
                            {cat}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedFilename(null); setDetailContent(""); }}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => selectedDigest && handleDownload(selectedDigest)}
                    disabled={!detailContent}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: "var(--card-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      opacity: detailContent ? 1 : 0.5,
                    }}
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center h-full" style={{ color: "var(--text-secondary)" }}>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading digest...
                  </div>
                ) : (
                  <MarkdownPreview content={detailContent} />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
              <div className="text-center">
                <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a digest to preview</p>
                <p className="text-sm mt-1">
                  {stats
                    ? `${stats.total} digests available from ${stats.dateRange.earliest || "..."} to ${stats.dateRange.latest || "..."}`
                    : "Loading..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
