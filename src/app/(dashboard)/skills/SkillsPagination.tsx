"use client";

interface SkillsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  searchQuery: string;
  filterSource: string;
  onFetchPage: (page: number, search?: string, source?: string) => void;
}

export function SkillsPagination({
  page,
  totalPages,
  total,
  loading,
  searchQuery,
  filterSource,
  onFetchPage,
}: SkillsPaginationProps) {
  if (totalPages <= 1 || loading) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginTop: "16px",
        padding: "12px",
        backgroundColor: "var(--surface)",
        borderRadius: "12px",
      }}
    >
      <button
        onClick={() => onFetchPage(page - 1, searchQuery, filterSource)}
        disabled={page <= 1}
        style={{
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: page <= 1 ? "var(--card-elevated)" : "var(--accent)",
          color: page <= 1 ? "var(--text-muted)" : "white",
          border: "none",
          cursor: page <= 1 ? "not-allowed" : "pointer",
          opacity: page <= 1 ? 0.5 : 1,
          fontSize: "13px",
        }}
      >
        ← Prev
      </button>
      <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
        {page} / {totalPages} ({total} skills)
      </span>
      <button
        onClick={() => onFetchPage(page + 1, searchQuery, filterSource)}
        disabled={page >= totalPages}
        style={{
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: page >= totalPages ? "var(--card-elevated)" : "var(--accent)",
          color: page >= totalPages ? "var(--text-muted)" : "white",
          border: "none",
          cursor: page >= totalPages ? "not-allowed" : "pointer",
          opacity: page >= totalPages ? 0.5 : 1,
          fontSize: "13px",
        }}
      >
        Next →
      </button>
    </div>
  );
}