/**
 * Detail modal for a selected Hindsight memory.
 */
"use client";

import { formatDateTime } from "../utils/wikiUtils";
import type { HindsightMemory } from "../types";

interface HindsightMemoryModalProps {
  memory: HindsightMemory;
  onClose: () => void;
}

export function HindsightMemoryModal({
  memory,
  onClose,
}: HindsightMemoryModalProps) {
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            marginBottom: "16px",
          }}
        >
          <div
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "10px",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
                fontWeight: 500,
                fontSize: "11px",
              }}
            >
              {memory.score}%
            </span>
            <span
              style={{
                backgroundColor: "var(--surface-soft)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                color: "var(--text-secondary)",
              }}
            >
              {memory.fact_type}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-primary)",
            lineHeight: 1.6,
            marginBottom: "16px",
          }}
        >
          {memory.text}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border)",
            paddingTop: "12px",
          }}
        >
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
              <strong>Tags:</strong> {memory.tags.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
