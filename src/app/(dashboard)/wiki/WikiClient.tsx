"use client";

import { useState } from "react";

import { useWikiData } from "@/hooks/useWikiData";

import { WikiHeader } from "./WikiHeader";
import { FileTree } from "./FileTree";
import { NotePreview } from "./NotePreview";
import { GraphTab } from "./GraphTab";

export default function WikiClient() {
  const wiki = useWikiData();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <WikiHeader
        activeTab={wiki.activeTab}
        setActiveTab={wiki.setActiveTab}
        showSearch={wiki.showSearch}
        setShowSearch={wiki.setShowSearch}
        searchQuery={wiki.searchQuery}
        setSearchQuery={(q) => wiki.handleSearch(q)}
        searchResults={wiki.searchResults}
        setSearchResults={() => wiki.handleSearch("")}
        handleSearch={wiki.handleSearch}
        handleSelectFile={wiki.handleSelectFile}
        stats={wiki.stats}
        syncStatus={wiki.syncStatus}
        handleSync={wiki.handleSyncWithReload}
      />

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", height: "100%" }}>
          {/* Wiki Tab Content */}
          {wiki.activeTab === "wiki" && (
            <>
              {/* File Tree */}
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
                <FileTree
                  files={wiki.files}
                  selectedPath={wiki.selectedPath}
                  isLoading={wiki.isLoading}
                  loadError={wiki.loadError}
                  onToggleFolder={wiki.toggleFolder}
                  onSelectFile={wiki.handleSelectFile}
                />
              </div>

              {/* Note Preview */}
              <NotePreview
                noteData={wiki.noteData}
                selectedPath={wiki.selectedPath}
                backlinks={wiki.backlinks}
                onSelectBacklink={wiki.handleSelectFile}
              />
            </>
          )}

          {/* Graph Tab Content */}
          {wiki.activeTab === "graph" && (
            <GraphTab
              onNodeClick={(path) => {
                wiki.setSelectedPath(path);
                wiki.setActiveTab("wiki");
              }}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
