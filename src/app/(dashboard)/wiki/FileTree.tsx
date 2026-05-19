"use client";

import { BookMarked, ChevronRight, ChevronDown } from "lucide-react";
import { TreeFileNode } from "./types";
import { isModifiedToday } from "./utils";

interface FileTreeProps {
  files: TreeFileNode[];
  selectedPath: string | null;
  isLoading: boolean;
  loadError: string | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export function FileTree({ files, selectedPath, isLoading, loadError, onToggleFolder, onSelectFile }: FileTreeProps) {
  if (loadError) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ marginBottom: "8px", fontSize: "24px" }}>⚠️</div>
        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Error al cargar el vault</div>
        <div style={{ fontSize: "12px" }}>{loadError}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: "0 8px" }}>
      {files.map((file) => (
        <div key={file.path}>
          {file.type === "directory" ? (
            <DirectoryNode
              node={file}
              selectedPath={selectedPath}
              onToggle={onToggleFolder}
              onSelect={onSelectFile}
            />
          ) : (
            <FileNode
              node={file}
              selectedPath={selectedPath}
              onSelect={onSelectFile}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface FileNodeProps {
  node: TreeFileNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function FileNode({ node, selectedPath, onSelect }: FileNodeProps) {
  return (
    <button
      onClick={() => onSelect(node.path)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 8px",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        backgroundColor: selectedPath === node.path ? "var(--accent-soft)" : "transparent",
        borderLeft: selectedPath === node.path ? "2px solid var(--accent)" : "2px solid transparent",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
      onMouseLeave={(e) =>
        e.currentTarget.style.backgroundColor =
          selectedPath === node.path ? "var(--accent-soft)" : "transparent"
      }
    >
      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{node.name}</span>
      {node.modified && isModifiedToday(node.modified) && (
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "var(--accent)",
            marginLeft: "auto",
          }}
        />
      )}
    </button>
  );
}

interface DirectoryNodeProps {
  node: TreeFileNode;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function DirectoryNode({ node, selectedPath, onToggle, onSelect }: DirectoryNodeProps) {
  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 8px",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          backgroundColor: "transparent",
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
      >
        {node.expanded ? (
          <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
        )}
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
          {node.name}
        </span>
      </button>
      {node.expanded && node.children && (
        <div style={{ marginLeft: "12px" }}>
          {node.children.map((child) => (
            <div key={child.path}>
              {child.type === "file" ? (
                <FileNode node={child} selectedPath={selectedPath} onSelect={onSelect} />
              ) : (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 8px" }}>
                  {child.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}