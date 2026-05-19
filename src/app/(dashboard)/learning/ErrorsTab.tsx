"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ErrorEntry } from "@/lib/learning-types";
import { statusConfig } from "@/lib/learning-types";

import { EmptyState } from "./shared";

interface ErrorsTabProps {
  errors: ErrorEntry[];
}

export function ErrorsTab({ errors }: ErrorsTabProps) {
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

  const filteredErrors = errors.filter(e => {
    if (filter !== "all" && e.status !== filter) return false;
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
          {(["all", "open", "mitigated", "resolved", "verified"] as const).map(f => (
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
              {f === "all" ? "Todos" : statusConfig[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Card List */}
      <div className="space-y-2">
        {filteredErrors.map(e => {
          const cfg = statusConfig[e.status];
          const expanded = expandedItems.has(e.id);
          return (
            <div key={e.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <button onClick={() => toggleExpand(e.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <cfg.icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>[{e.id}]</p>
                  <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{e.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              </button>
              {expanded && (
                <div className="px-4 pb-4 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  {e.content}
                </div>
              )}
            </div>
          );
        })}
        {filteredErrors.length === 0 && <EmptyState message="No hay errores que coincidan" />}
      </div>
    </>
  );
}
