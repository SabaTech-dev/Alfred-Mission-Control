/**
 * Hindsight memory integration section — stats, semantic search, results list,
 * and detail modal.
 */
"use client";

import { useState } from "react";
import { Brain, Clock, Search } from "lucide-react";

import { formatDateTime } from "../utils/wikiUtils";
import type { HindsightStats, HindsightMemory } from "../types";
import { HindsightMemoryModal } from "./HindsightMemoryModal";

interface HindsightSectionProps {
  hindsightQuery: string;
  hindsightResults: HindsightMemory[];
  hindsightStats: HindsightStats | null;
  isHindsightLoading: boolean;
  onSearch: (query: string) => void;
}

export function HindsightSection({
  hindsightQuery,
  hindsightResults,
  hindsightStats,
  isHindsightLoading,
  onSearch,
}: HindsightSectionProps) {
  const [selectedMemory, setSelectedMemory] = useState<HindsightMemory | null>(
    null
  );

  return (
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px" }}
    >
      {/* Stats Bar */}
      {hindsightStats && (
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
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Brain size={16} />
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Memories
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {hindsightStats.total_nodes}
              </div>
            </div>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Brain size={16} />
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Relations
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {hindsightStats.total_links}
              </div>
            </div>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Clock size={16} />
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Last Recall
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {hindsightStats.last_recall
                  ? formatDateTime(hindsightStats.last_recall)
                  : "Never"}
              </div>
            </div>
          </div>
        </div>
      )}

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
          value={hindsightQuery}
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
      {isHindsightLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px",
            color: "var(--text-secondary)",
          }}
        >
          Buscando en memoria semántica...
        </div>
      ) : hindsightResults.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {hindsightResults.map((memory) => (
            <div
              key={memory.id}
              style={{
                padding: "16px",
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => setSelectedMemory(memory)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--card)")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    flex: 1,
                  }}
                >
                  {memory.text.slice(0, 80)}
                  {memory.text.length > 80 ? "..." : ""}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "10px",
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontWeight: 500,
                    }}
                  >
                    {memory.score || 0}%
                  </span>
                  <span
                    style={{
                      backgroundColor: "var(--surface-soft)",
                      padding: "2px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    {memory.fact_type}
                  </span>
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                }}
              >
                {memory.text.slice(0, 200)}
                {memory.text.length > 200 ? "..." : ""}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                {formatDateTime(memory.date)} |{" "}
                {memory.entities
                  .split(",")
                  .slice(0, 3)
                  .join(", ")}
                {memory.entities.split(",").length > 3 ? "..." : ""}
              </div>
            </div>
          ))}
        </div>
      ) : hindsightQuery.length >= 2 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-secondary)",
          }}
        >
          No se encontraron recuerdos para esta búsqueda
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-secondary)",
          }}
        >
          <Brain
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 16px",
              opacity: 0.3,
            }}
          />
          <p>Realiza una búsqueda semántica en la memoria de Alfred</p>
          <p style={{ fontSize: "12px", marginTop: "8px" }}>
            Utiliza búsqueda vectorial para encontrar relaciones semánticas
          </p>
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <HindsightMemoryModal
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
        />
      )}
    </div>
  );
}
