/**
 * Wiki file tree component
 */
import { ChevronRight, ChevronDown, AlertCircle } from "lucide-react";
import type { TreeFileNode } from "../utils/wikiUtils";
import { isModifiedToday } from "../utils/wikiUtils";

interface WikiFileTreeProps {
  files: TreeFileNode[];
  loadError: string | null;
  isLoading: boolean;
  selectedPath: string | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
}

interface TreeNodeProps {
  node: TreeFileNode;
  selectedPath: string | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  level: number;
}

function TreeNode({ node, selectedPath, onToggleFolder, onSelectFile, level }: TreeNodeProps) {
  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
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
              <TreeNode
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
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

export function WikiFileTree({
  files,
  loadError,
  isLoading,
  selectedPath,
  onToggleFolder,
  onSelectFile,
}: WikiFileTreeProps) {
  return (
    <div
      style={{
        width: "clamp(200px, 25vw, 300px)",
        minWidth: "200px",
        maxWidth: "300px",
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        backgroundColor: "var(--card)",
        padding: "12px 0",
      }}
    >
      {loadError ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: "8px", fontSize: "24px" }}>⚠️</div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Error al cargar el vault</div>
          <div style={{ fontSize: "12px" }}>{loadError}</div>
        </div>
      ) : isLoading ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading...
        </div>
      ) : (
        <div style={{ padding: "0 8px" }}>
          {files.map((file) => (
            <TreeNode
              key={file.path}
              node={file}
              selectedPath={selectedPath}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              level={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}