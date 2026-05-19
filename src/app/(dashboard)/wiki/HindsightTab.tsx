"use client";

import { Search, Brain, TrendingUp, Calendar } from "lucide-react";
import { HindsightStats, HindsightMemory } from "./types";
import { formatDateTime } from "./utils";

interface HindsightTabProps {
  stats: HindsightStats | null;
  query: string;
  onSearch: (query: string) => void;
  results: HindsightMemory[];
  isLoading: boolean;
  selectedMemory: HindsightMemory | null;
  onMemoryClick: (memory: HindsightMemory) => void;
  onMemoryClose: () => void;
}

export function HindsightTab({
  stats,
  query,
  onSearch,
  results,
  isLoading,
  selectedMemory,
  onMemoryClick,
  onMemoryClose,
}: HindsightTabProps) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px" }}>
      {/* Stats Bar */}
      {stats && <StatsBar stats={stats} />}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
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
          placeholder="Buscar en memoria semántica..."
          value={query}
          onChange={(e) => onSearch(e.target.value)}
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
      </div>

      {/* Results */}
      <ResultsList
        results={results}
        isLoading={isLoading}
        query={query}
        onClick={onMemoryClick}
      />

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal memory={selectedMemory} onClose={onMemoryClose} />
      )}
    </div>
  );
}

function StatsBar({ stats }: { stats: HindsightStats }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Brain size={16} />
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Memories</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{stats.total_nodes}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <TrendingUp size={16} />
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Relations</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{stats.total_links}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Calendar size={16} />
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Last Recall</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            {stats.last_recall ? formatDateTime(stats.last_recall) : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResultsListProps {
  results: HindsightMemory[];
  isLoading: boolean;
  query: string;
  onClick: (memory: HindsightMemory) => void;
}

function ResultsList({ results, isLoading, query, onClick }: ResultsListProps) {
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px", color: "var(--text-secondary)" }}>
        Buscando en memoria semántica...
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {results.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onClick={onClick} />
        ))}
      </div>
    );
  }

  if (query.length >= 2) {
    return (
      <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
        No se encontraron recuerdos para esta búsqueda
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
      <Brain style={{ width: "64px", height: "64px", margin: "0 auto 16px", opacity: 0.3 }} />
      <p>Realiza una búsqueda semántica en la memoria de Alfred</p>
      <p style={{ fontSize: "12px", marginTop: "8px" }}>Utiliza búsqueda vectorial para encontrar relaciones semánticas</p>
    </div>
  );
}

function MemoryCard({ memory, onClick }: { memory: HindsightMemory; onClick: (memory: HindsightMemory) => void }) {
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        cursor: "pointer",
      }}
      onClick={() => onClick(memory)}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--card)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          {memory.text.slice(0, 80)}{memory.text.length > 80 ? '...' : ''}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "var(--text-muted)" }}>
          <span style={{
            padding: "2px 6px",
            borderRadius: "10px",
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
            fontWeight: 500,
          }}>
            {memory.score || 0}%
          </span>
          <span style={{ backgroundColor: "var(--surface-soft)", padding: "2px 4px", borderRadius: "4px" }}>
            {memory.fact_type}
          </span>
        </div>
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
        {memory.text.slice(0, 200)}{memory.text.length > 200 ? '...' : ''}
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
        {formatDateTime(memory.date)} | {memory.entities.split(",").slice(0, 3).join(", ")}{memory.entities.split(",").length > 3 ? '...' : ''}
      </div>
    </div>
  );
}

function MemoryDetailModal({ memory, onClose }: { memory: HindsightMemory; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          maxWidth: "640px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{
              padding: "2px 8px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
              fontWeight: 500,
              fontSize: "11px",
            }}>{memory.score}%</span>
            <span style={{ backgroundColor: "var(--surface-soft)", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", color: "var(--text-secondary)" }}>
              {memory.fact_type}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "18px" }}
          >✕</button>
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.6, marginBottom: "16px" }}>
          {memory.text}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <div style={{ marginBottom: "4px" }}>
            <strong>Fecha:</strong> {formatDateTime(memory.date)}
          </div>
          {memory.entities && (
            <div style={{ marginBottom: "4px" }}>
              <strong>Entidades:</strong> {memory.entities}
            </div>
          )}
          {memory.tags && memory.tags.length > 0 && (
            <div>
              <strong>Tags:</strong> {memory.tags.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}