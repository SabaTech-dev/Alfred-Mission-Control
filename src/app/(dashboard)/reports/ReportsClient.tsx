"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileBarChart, FileText, RefreshCw, Clock, HardDrive, Download, Share2, Plus,
  Loader2, Search, Filter, FolderOpen, Folder, Calendar, CalendarDays, Newspaper
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n/provider";
import CierreDelDiaView from "./CierreDelDiaView";
import AiSocialDigestView from "./AiSocialDigestView";

interface ReportFile {
  name: string;
  path: string;
  title: string;
  category: string;
  sub: string;
  type: string;
  size: number;
  modified: string;
  created: string;
}

interface ReportStats {
  total: number;
  byCategory: { central: number; cron: number };
  byType: Record<string, number>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  "active": "Active",
  "archive": "Archive",
  "ai-digest": "AI Digest",
  "daily-close": "Daily Close",
  "evening-agenda": "Evening Agenda",
  "log-rotation": "Log Rotation",
  "nocturnal": "Nocturnal",
  "morning-summary": "Morning Summary",
  "learning": "Learning",
  "self-improvement": "Self-Improvement",
  "pdca": "PDCA",
  "security": "Security",
  "performance": "Performance",
  "report": "Report",
};

const CATEGORY_ICONS: Record<string, typeof FolderOpen> = {
  central: FolderOpen,
  cron: Calendar,
};

export default function ReportsClient() {
  const [activeTab, setActiveTab] = useState<"all" | "cierre" | "ai-social">("all");
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const contentControllerRef = useRef<AbortController | null>(null);
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterType !== "all") params.set("type", filterType);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/reports/files?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setReports(data.reports);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
      showError("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterType, searchQuery, showError]);

  const loadContent = useCallback(async (filePath: string) => {
    contentControllerRef.current?.abort();
    const controller = new AbortController();
    contentControllerRef.current = controller;
    try {
      setIsLoadingContent(true);
      const res = await fetch(
        `/api/reports/files?path=${encodeURIComponent(filePath)}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("Failed to load content");
      const data = await res.json();
      setContent(data.content);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error(err);
      setContent("# Error\n\nFailed to load report content.");
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  const handleSelect = useCallback(
    (report: ReportFile) => {
      setSelectedPath(report.path);
      loadContent(report.path);
    },
    [loadContent]
  );

  const handleDownload = useCallback((report: ReportFile) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = report.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    return () => {
      contentControllerRef.current?.abort();
    };
  }, []);

  const selectedReport = reports.find((r) => r.path === selectedPath);
  const availableTypes = stats?.byType ? Object.keys(stats.byType) : [];

  const tabs = [
    { key: "all" as const, label: "All Reports", icon: FileBarChart },
    { key: "cierre" as const, label: "Cierre & Agenda", icon: CalendarDays },
    { key: "ai-social" as const, label: "AI & Social Digest", icon: Newspaper },
  ];

  const tabBar = (
    <div
      className="flex items-center gap-1 px-3 pt-2 flex-shrink-0"
      style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all"
            style={{
              color: isActive ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  // If a dedicated view tab is active
  if (activeTab === "cierre") {
    return (
      <div className="h-screen flex flex-col">
        {tabBar}
        <div className="flex-1 min-h-0">
          <CierreDelDiaView />
        </div>
      </div>
    );
  }

  if (activeTab === "ai-social") {
    return (
      <div className="h-screen flex flex-col">
        {tabBar}
        <div className="flex-1 min-h-0">
          <AiSocialDigestView />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {tabBar}
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 md:p-4 flex-shrink-0"
        style={{
          backgroundColor: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <FileBarChart className="w-5 h-5 md:w-6 md:h-6" style={{ color: "var(--accent)" }} />
          <div>
            <h1
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              {t("reports.page.title")}
            </h1>
            <p className="text-xs md:text-sm hidden sm:block" style={{ color: "var(--text-secondary)" }}>
              {stats
                ? `${stats.total} reports · ${stats.byCategory.central} central · ${stats.byCategory.cron} cron`
                : t("common.loading")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: showFilters ? "var(--accent)" : "var(--card-elevated)",
              border: "1px solid var(--border)",
              color: showFilters ? "white" : "var(--text-primary)",
            }}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={() => { setSearchQuery(""); setFilterCategory("all"); setFilterType("all"); }}
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
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          {/* Category filter */}
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
            <option value="central">Central</option>
            <option value="cron">Cron</option>
          </select>
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All Types</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] || type} ({stats?.byType[type] || 0})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Report list */}
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
              {isLoading ? t("common.loading") : `${reports.length} Reports`}
            </h2>
          </div>

          {!isLoading && reports.length === 0 && (
            <div className="p-6 text-center" style={{ color: "var(--text-muted)" }}>
              <FileBarChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No reports found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}

          <div className="p-2 space-y-1">
            {reports.map((report) => {
              const isSelected = selectedPath === report.path;
              const CatIcon = CATEGORY_ICONS[report.category] || Folder;
              return (
                <button
                  key={report.path}
                  onClick={() => handleSelect(report)}
                  className="w-full text-left rounded-lg p-3 transition-all"
                  style={{
                    backgroundColor: isSelected ? "var(--accent)" : "transparent",
                    border: `1px solid ${isSelected ? "var(--accent)" : "transparent"}`,
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
                    <CatIcon
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: isSelected ? "white" : "var(--accent)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {report.title}
                      </p>
                      <div
                        className="flex items-center gap-2 mt-1 text-xs"
                        style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(report.modified)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatSize(report.size)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : "var(--background)",
                            color: isSelected ? "white" : "var(--text-secondary)",
                          }}
                        >
                          {report.category}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : "var(--background)",
                            color: isSelected ? "white" : "var(--text-secondary)",
                          }}
                        >
                          {TYPE_LABELS[report.type] || report.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col" style={{ backgroundColor: "var(--background)" }}>
          {selectedPath ? (
            <>
              {/* Preview header */}
              <div
                className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {selectedReport?.name || selectedPath.split("/").pop()}
                  </span>
                </div>
                <button
                  onClick={() => selectedReport && handleDownload(selectedReport)}
                  disabled={!content}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    opacity: content ? 1 : 0.5,
                  }}
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 min-h-0 overflow-auto">
                {isLoadingContent ? (
                  <div className="flex items-center justify-center h-full" style={{ color: "var(--text-secondary)" }}>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  <MarkdownPreview content={content} />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
              <div className="text-center">
                <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a report to preview</p>
                <p className="text-sm mt-1">Browse reports from central and cron directories</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
