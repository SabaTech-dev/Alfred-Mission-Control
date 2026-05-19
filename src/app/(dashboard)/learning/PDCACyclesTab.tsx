"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { PDCAData } from "@/lib/learning-types";
import {
  pdcaStatusConfig,
  pdcaCategoryConfig,
  sourceIcons,
  BookOpen,
} from "@/lib/learning-types";

import { EmptyState } from "./shared";

interface PDCACyclesTabProps {
  data: PDCAData | null;
}

export function PDCACyclesTab({ data }: PDCACyclesTabProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  const { cycles, stats } = data;

  const filtered = cycles.filter(c => {
    if (filter !== "all" && c.status !== filter && c.category !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* PDCA Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {(["plan", "do", "check", "act", "done"] as const).map(status => {
          const cfg = pdcaStatusConfig[status];
          const count = stats.byStatus[status] || 0;
          return (
            <div key={status} className="rounded-xl p-3" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33` }}>
              <div className="flex items-center gap-2 mb-1">
                <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Category Summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(stats.byCategory).map(([cat, count]) => {
          const cfg = pdcaCategoryConfig[cat] || { color: "#888", label: cat };
          return (
            <span key={cat} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
              {cfg.label}: {count}
            </span>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar ciclos PDCA..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1 flex-wrap">
          {["all", "plan", "do", "check", "act", "done", "mejora", "investigacion", "fix", "aprendizaje"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? "var(--accent)" : "var(--card)",
                color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {f === "all" ? "Todos" : pdcaStatusConfig[f]?.label ?? pdcaCategoryConfig[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtered.map(cycle => {
          const statusCfg = pdcaStatusConfig[cycle.status];
          const catCfg = pdcaCategoryConfig[cycle.category] || { color: "#888", label: cycle.category };
          const SourceIcon = sourceIcons[cycle.source] || BookOpen;
          const expanded = expandedItems.has(cycle.id);

          return (
            <div key={cycle.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <button onClick={() => toggleExpand(cycle.id)} className="w-full flex items-center gap-3 p-4 text-left">
                {/* Timeline dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: statusCfg.color, boxShadow: `0 0 8px ${statusCfg.color}44` }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{cycle.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>{catCfg.label}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cycle.date}</span>
                    <SourceIcon className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cycle.source}</span>
                  </div>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              </button>
              {expanded && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  {cycle.description && (
                    <div className="text-sm whitespace-pre-wrap mb-3" style={{ color: "var(--text-secondary)" }}>{cycle.description}</div>
                  )}
                  {cycle.outcome && (
                    <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>Outcome: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{cycle.outcome}</span>
                    </div>
                  )}
                  {cycle.metrics && (
                    <div className="text-xs whitespace-pre-wrap mt-2 p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>{cycle.metrics}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState message="No hay ciclos PDCA que coincidan" />}
      </div>
    </div>
  );
}
