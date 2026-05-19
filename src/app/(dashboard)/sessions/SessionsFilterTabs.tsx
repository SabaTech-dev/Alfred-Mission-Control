"use client";

import { useI18n } from "@/i18n/provider";
import { FilterType, FILTER_TABS } from "./SessionsTypes";

interface SessionsFilterTabsProps {
  filter: FilterType;
  counts: Record<string, number>;
  onFilterChange: (filter: FilterType) => void;
}

export function SessionsFilterTabs({ filter, counts, onFilterChange }: SessionsFilterTabsProps) {
  const { t } = useI18n();

  return (
    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
      {FILTER_TABS.map((tab) => {
        const count = counts[tab.id] || 0;
        const isActive = filter === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.8rem",
              fontWeight: isActive ? 700 : 500,
              backgroundColor: isActive ? "var(--accent)" : "var(--card-elevated)",
              color: isActive ? "var(--bg, #000)" : "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span>{tab.emoji}</span>
            <span>{t(tab.labelKey)}</span>
            {count > 0 && (
              <span
                style={{
                  backgroundColor: isActive ? "rgba(0,0,0,0.2)" : "var(--border)",
                  borderRadius: "9999px",
                  padding: "0 0.4rem",
                  fontSize: "0.7rem",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}