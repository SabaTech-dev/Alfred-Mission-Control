"use client";

import { Clock, FileText, Tag, Link2, BookMarked } from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { NoteData, BacklinkResult } from "./types";
import { formatDate, formatSize } from "./utils";

interface NotePreviewProps {
  noteData: NoteData | null;
  selectedPath: string | null;
  backlinks: BacklinkResult[];
  onSelectBacklink: (path: string) => void;
}

export function NotePreview({ noteData, selectedPath, backlinks, onSelectBacklink }: NotePreviewProps) {
  if (!noteData) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <BookMarked style={{ width: "64px", height: "64px", margin: "0 auto 16px", opacity: 0.3 }} />
          <p>Selecciona una nota para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Note Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "4px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {noteData.frontmatter.title || selectedPath || "Untitled"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={10} />
                <span>{noteData.modified ? formatDate(noteData.modified) : "Unknown"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <FileText size={10} />
                <span>{formatSize(noteData.size)}</span>
              </div>
            </div>
          </div>

          {noteData.frontmatter.tags && noteData.frontmatter.tags.length > 0 && (
            <div style={{ display: "flex", gap: "4px", marginLeft: "16px" }}>
              {noteData.frontmatter.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  <Tag size={10} style={{ width: "10px", display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--surface-soft)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
            <Link2 size={12} />
            <span>
              <strong>{backlinks.length}</strong> notas enlazan aquí
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
            {backlinks.map((backlink) => (
              <button
                key={backlink.path}
                onClick={() => onSelectBacklink(backlink.path)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--card)"}
              >
                {backlink.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <MarkdownPreview content={noteData.content} withContainer={false} />
      </div>
    </div>
  );
}