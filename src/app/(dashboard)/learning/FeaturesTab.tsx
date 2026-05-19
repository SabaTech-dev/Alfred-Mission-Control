"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

import type { FeatureRequest } from "@/lib/learning-types";

import { EmptyState } from "./shared";

interface FeaturesTabProps {
  features: FeatureRequest[];
}

export function FeaturesTab({ features }: FeaturesTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {features.map(f => {
        const expanded = expandedItems.has(f.id);
        return (
          <div key={f.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <button onClick={() => toggleExpand(f.id)} className="w-full flex items-center gap-3 p-4 text-left">
              <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: "#a78bfa" }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{f.title}</p>
              </div>
              {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
            </button>
            {expanded && (
              <div className="px-4 pb-4 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                {f.content}
              </div>
            )}
          </div>
        );
      })}
      {features.length === 0 && <EmptyState message="No hay feature requests" />}
    </div>
  );
}
