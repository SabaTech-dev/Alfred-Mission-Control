"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { LearningEntry } from "@/lib/learning-types";
import { categoryConfig } from "@/lib/learning-types";

import { EmptyState } from "./shared";

interface LearningsTabProps {
  learnings: LearningEntry[];
}

export function LearningsTab({ learnings }: LearningsTabProps) {
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

  const filteredLearnings = learnings.filter(l => {
    if (filter !== "all" && l.category !== filter) return false;
    if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase()) && !l.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1">
          {(["all", "golden", "rule", "pattern", "adoption"] as const).map(f => (
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
              {f === "all" ? "Todos" : categoryConfig[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Card List */}
      <div className="space-y-2">
        {filteredLearnings.map(l => {
          const cfg = categoryConfig[l.category];
          const expanded = expandedItems.has(l.id);
          return (
            <div key={l.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <button onClick={() => toggleExpand(l.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <cfg.icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{l.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.date}</span>
                  </div>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              </button>
              {expanded && (
                <div className="px-4 pb-4 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  {l.content}
                </div>
              )}
            </div>
          );
        })}
        {filteredLearnings.length === 0 && <EmptyState message="No hay lecciones que coincidan" />}
      </div>
    </>
  );
}
