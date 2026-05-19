"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Tag,
  BarChart3,
} from "lucide-react";

import type { FeatureTrackerData } from "@/lib/learning-types";
import {
  ftStatusConfig,
  priorityConfig,
  categoryColors,
} from "@/lib/learning-types";

import { EmptyState } from "./shared";

// ── Feature Tracker View ────────────────────────────────────────────────────

interface FeatureTrackerViewProps {
  data: FeatureTrackerData | null;
  loading: boolean;
  onStatusChange: () => void;
}

export function FeatureTrackerView({ data, loading, onStatusChange }: FeatureTrackerViewProps) {
  const [filter, setFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setChangingStatus(id);
    try {
      await fetch("/api/learning/feature-tracker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      onStatusChange();
    } catch (e) {
      console.error("Failed to update status:", e);
    }
    setChangingStatus(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading feature tracker...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tracker data available</p>
      </div>
    );
  }

  const { features, stats } = data;

  const filtered = features.filter(f => {
    if (filter !== "all" && f.status !== filter) return false;
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.tags.some(t => t.includes(q));
    }
    return true;
  });

  const categories = Object.keys(stats.byCategory).sort();

  return (
    <div>
      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {(["open", "in-progress", "done", "rejected"] as const).map(status => {
          const cfg = ftStatusConfig[status];
          const count = stats.byStatus[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                backgroundColor: filter === status ? cfg.bg : "var(--card)",
                border: `1px solid ${filter === status ? cfg.color + "66" : "var(--border)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
            </button>
          );
        })}
        {/* Priority quick summary */}
        <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>By Priority</span>
          </div>
          <div className="flex gap-2 mt-1">
            {(["high", "medium", "low"] as const).map(p => (
              <span key={p} className="text-xs font-bold" style={{ color: priorityConfig[p].color }}>
                {stats.byPriority[p] || 0} {priorityConfig[p].label[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search features, tags..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1 flex-wrap items-center">
          <Filter className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                backgroundColor: categoryFilter === cat ? (categoryColors[cat] || "#6b7280") + "22" : "var(--card)",
                color: categoryFilter === cat ? categoryColors[cat] || "#6b7280" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {cat} ({stats.byCategory[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Showing {filtered.length} of {stats.total} features
        </span>
        {(filter !== "all" || categoryFilter !== "all" || searchQuery) && (
          <button
            onClick={() => { setFilter("all"); setCategoryFilter("all"); setSearchQuery(""); }}
            className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--accent)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Feature List */}
      <div className="space-y-2">
        {filtered.map(f => {
          const statusCfg = ftStatusConfig[f.status];
          const priCfg = priorityConfig[f.priority];
          const catColor = categoryColors[f.category] || "#6b7280";
          const expanded = expandedItems.has(f.id);
          const isChanging = changingStatus === f.id;

          return (
            <div key={f.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <button onClick={() => toggleExpand(f.id)} className="w-full flex items-center gap-3 p-4 text-left">
                {/* Status indicator */}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusCfg.color, boxShadow: `0 0 6px ${statusCfg.color}44` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                    {f.stateOverride && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>overridden</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: priCfg.color + "15", color: priCfg.color }}>{priCfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: catColor + "15", color: catColor }}>{f.category}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{f.date}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {f.source === "feature_requests" ? "FR" : "AR"}</span>
                    {f.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>#{t}</span>
                    ))}
                  </div>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              </button>
              {expanded && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  {/* Description */}
                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{f.description}</p>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {f.complexity && (
                      <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Complexity</span>
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.complexity}</p>
                      </div>
                    )}
                    {f.metricGoal && (
                      <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Metric Goal</span>
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.metricGoal}</p>
                      </div>
                    )}
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Source</span>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.source === "feature_requests" ? "Feature Requests.md" : "AutoResearch Ideas.md"}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>ID</span>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.id}</p>
                    </div>
                  </div>

                  {/* Outcome */}
                  {f.outcome && (
                    <div className="text-sm p-3 rounded-lg mb-3" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <span className="font-medium" style={{ color: "#22c55e" }}>✅ Result: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{f.outcome}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {f.tags.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <Tag className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                      {f.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Status change dropdown */}
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Change status:</span>
                    {(["open", "in-progress", "done", "rejected"] as const).map(s => {
                      const sCfg = ftStatusConfig[s];
                      const isActive = f.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(f.id, s)}
                          disabled={isChanging}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            backgroundColor: isActive ? sCfg.bg : "var(--card-elevated)",
                            color: isActive ? sCfg.color : "var(--text-muted)",
                            border: isActive ? `1px solid ${sCfg.color}44` : "1px solid var(--border)",
                            opacity: isChanging ? 0.5 : 1,
                          }}
                        >
                          <sCfg.icon className="w-3 h-3" />
                          {sCfg.label}
                          {isChanging && <span className="animate-pulse">...</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState message="No features match your filters" />}
      </div>
    </div>
  );
}
