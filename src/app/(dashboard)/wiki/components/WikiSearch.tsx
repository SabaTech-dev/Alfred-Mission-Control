/**
 * Wiki search component
 */
import { Search } from "lucide-react";
import type { SearchResult } from "../types";

interface WikiSearchProps {
  show: boolean;
  query: string;
  results: SearchResult[];
  onSearch: (query: string) => void;
  onResultClick: (path: string) => void;
  onClose: () => void;
}

export function WikiSearch({ show, query, results, onSearch, onResultClick, onClose }: WikiSearchProps) {
  if (!show) return null;

  return (
    <div style={{ marginTop: "12px", position: "relative" }}>
      <Search
        style={{
          position: "absolute",
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          width: "14px",
          height: "14px",
        }}
      />
      <input
        type="text"
        placeholder="Buscar notas..."
        value={query}
        onChange={(e) => onSearch(e.target.value)}
        autoFocus
        style={{
          width: "100%",
          padding: "8px 10px 8px 32px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          color: "var(--text-primary)",
          fontSize: "13px",
          outline: "none",
        }}
      />
      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 10,
            padding: "4px 0",
          }}
        >
          {results.map((result) => (
            <button
              key={result.path}
              onClick={() => {
                onResultClick(result.path);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                {result.title}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.preview}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}