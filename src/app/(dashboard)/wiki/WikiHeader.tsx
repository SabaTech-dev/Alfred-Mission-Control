"use client";

import { BookMarked, Search, RefreshCw, GitFork, FileText, Brain, Share2 } from "lucide-react";
import { formatDate } from "./utils";
import type { SyncStatus, WikiStats, SearchResult } from "./types";

export function WikiHeader({
  activeTab,
  setActiveTab,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  handleSearch,
  handleSelectFile,
  stats,
  syncStatus,
  handleSync,
}: {
  activeTab: "wiki" | "hindsight" | "graph";
  setActiveTab: (tab: "wiki" | "hindsight" | "graph") => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;
  handleSearch: (query: string) => void;
  handleSelectFile: (path: string) => void;
  stats: WikiStats | null;
  syncStatus: SyncStatus | null;
  handleSync: () => void;
}) {
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div style={{ padding: "24px 24px 16px 24px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
            <button
              onClick={() => setActiveTab('wiki')}
              style={{
                padding: "6px 12px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                backgroundColor: activeTab === 'wiki' ? 'var(--card)' : 'transparent',
                borderBottom: activeTab === 'wiki' ? '2px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === 'wiki' ? 600 : 400,
                color: activeTab === 'wiki' ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <BookMarked size={14} />
              Wiki Explorer
            </button>
            <button
              onClick={() => setActiveTab('hindsight')}
              style={{
                padding: "6px 12px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                backgroundColor: activeTab === 'hindsight' ? 'var(--card)' : 'transparent',
                borderBottom: activeTab === 'hindsight' ? '2px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === 'hindsight' ? 600 : 400,
                color: activeTab === 'hindsight' ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Hindsight Memory
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              style={{
                padding: "6px 12px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                backgroundColor: activeTab === 'graph' ? 'var(--card)' : 'transparent',
                borderBottom: activeTab === 'graph' ? '2px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === 'graph' ? 600 : 400,
                color: activeTab === 'graph' ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Graph
            </button>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "-1px",
              color: "var(--text-primary)",
              marginBottom: "4px",
            }}
          >
            {activeTab === 'wiki' && <BookMarked style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />}
            {activeTab === 'hindsight' && <Brain style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />}
            {activeTab === 'graph' && <Share2 style={{ width: "24px", height: "24px", color: "var(--accent)", marginRight: "8px", display: "inline", verticalAlign: "middle" }} />}
            {activeTab === 'wiki' ? 'Wiki Explorer' : activeTab === 'hindsight' ? 'Hindsight Memory' : 'Grafo de Conexiones'}
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
            {activeTab === 'wiki' ? 'Segundo cerebro - Obsidian Vault' : activeTab === 'hindsight' ? 'Memoria semántica - Búsqueda vectorial y relaciones' : 'Visualización interactiva de backlinks entre notas'}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {stats && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                fontSize: "11px",
                color: "var(--text-muted)",
                backgroundColor: "var(--card)",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <FileText size={12} />
                <span>{stats.totalNotes} notas</span>
              </div>
            </div>
          )}

          {syncStatus && (
            <button
              onClick={handleSync}
              title="Click to sync"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "12px",
                backgroundColor: `${colors[syncStatus.status]}20`,
                border: `1px solid ${colors[syncStatus.status]}`,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 500,
                color: `var(--${syncStatus.status === "green" ? "green" : syncStatus.status === "yellow" ? "yellow" : "red"}-400)`,
              }}
            >
              <GitFork size={12} style={{ color: `var(--${syncStatus.status === "green" ? "green" : syncStatus.status === "yellow" ? "yellow" : "red"}-400)` }} />
              <span>{syncStatus.lastSync ? formatDate(syncStatus.lastSync) : "Never"}</span>
            </button>
          )}

          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              padding: "6px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
            }}
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {showSearch && (
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
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
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
          {searchResults.length > 0 && (
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
              {searchResults.map((result) => (
                <button
                  key={result.path}
                  onClick={() => {
                    handleSelectFile(result.path);
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowSearch(false);
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
      )}
    </div>
  );
}