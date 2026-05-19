"use client";

import { Search } from "lucide-react";

interface SkillsFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterSource: "all" | "workspace" | "system";
  onFilterChange: (source: "all" | "workspace" | "system") => void;
  workspaceCount: number;
  systemCount: number;
  totalCount: number;
  t: (key: string) => string;
}

export function SkillsFilter({
  searchQuery,
  onSearchChange,
  filterSource,
  onFilterChange,
  workspaceCount,
  systemCount,
  totalCount,
  t,
}: SkillsFilterProps) {
  return (
    <>
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
        <FilterButton
          label="Todas"
          count={totalCount}
          active={filterSource === "all"}
          onClick={() => onFilterChange("all")}
        />
        <FilterButton
          label="Workspace"
          count={workspaceCount}
          active={filterSource === "workspace"}
          onClick={() => onFilterChange("workspace")}
        />
        <FilterButton
          label="System"
          count={systemCount}
          active={filterSource === "system"}
          onClick={() => onFilterChange("system")}
        />
      </div>
    </>
  );
}

interface FilterButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ label, count, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 20px",
        borderRadius: "6px",
        backgroundColor: active ? "var(--accent-soft)" : "var(--surface)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        border: "1px solid var(--border)",
        fontFamily: "var(--font-body)",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 150ms ease",
      }}
    >
      {label} ({count})
    </button>
  );
}