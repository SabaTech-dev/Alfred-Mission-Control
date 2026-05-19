"use client";

import { Search } from "lucide-react";

interface SkillsFilterBarProps {
  searchQuery: string;
  filterSource: "all" | "workspace" | "system";
  skillsCount: number;
  workspaceCount: number;
  systemCount: number;
  onSearchChange: (query: string) => void;
  onFilterChange: (source: "all" | "workspace" | "system") => void;
}

export function SkillsFilterBar({
  searchQuery,
  filterSource,
  skillsCount,
  workspaceCount,
  systemCount,
  onSearchChange,
  onFilterChange,
}: SkillsFilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        marginBottom: "24px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
        <Search
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "16px",
            height: "16px",
            color: "var(--text-muted)",
          }}
        />
        <input
          type="text"
          placeholder="Buscar skills..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            paddingLeft: "40px",
            paddingRight: "16px",
            paddingTop: "12px",
            paddingBottom: "12px",
            borderRadius: "6px",
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => onFilterChange("all")}
          style={{
            padding: "12px 20px",
            borderRadius: "6px",
            backgroundColor: filterSource === "all" ? "var(--accent-soft)" : "var(--surface)",
            color: filterSource === "all" ? "var(--accent)" : "var(--text-secondary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          Todas ({skillsCount})
        </button>
        <button
          onClick={() => onFilterChange("workspace")}
          style={{
            padding: "12px 20px",
            borderRadius: "6px",
            backgroundColor: filterSource === "workspace" ? "var(--accent-soft)" : "var(--surface)",
            color: filterSource === "workspace" ? "var(--accent)" : "var(--text-secondary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          Workspace ({workspaceCount})
        </button>
        <button
          onClick={() => onFilterChange("system")}
          style={{
            padding: "12px 20px",
            borderRadius: "6px",
            backgroundColor: filterSource === "system" ? "var(--accent-soft)" : "var(--surface)",
            color: filterSource === "system" ? "var(--accent)" : "var(--text-secondary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          System ({systemCount})
        </button>
      </div>
    </div>
  );
}