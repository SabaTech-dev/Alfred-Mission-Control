"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Columns,
  Download,
  FileText,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";
import {
  createNote,
  deleteNote as removeNote,
  filterNotes,
  loadNotes,
  renderMarkdown,
  upsertNote,
  type NotebookNote,
} from "@/lib/notebook";

interface AgentOption {
  id: string;
  name: string;
}

type ViewMode = "edit" | "preview" | "split";

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export default function NotebookPage() {
  const { t } = useI18n();
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load notes from localStorage once on mount.
  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded.length > 0) setSelectedId(loaded[0].id);
  }, []);

  // Load agents for the linking dropdown (shared with chat).
  useEffect(() => {
    authFetch("/api/openclaw/agents")
      .then((res) => (res.ok ? res.json() : { agents: [] }))
      .then((data: { agents?: AgentOption[] }) => setAgents(data.agents ?? []))
      .catch(() => setAgents([]));
  }, []);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const filteredNotes = useMemo(
    () => filterNotes(notes, searchQuery),
    [notes, searchQuery],
  );

  const persist = useCallback((next: NotebookNote[]) => {
    setNotes(next);
  }, []);

  const handleNewNote = () => {
    const note = createNote({ title: "", content: "" });
    const next = upsertNote(note);
    persist(next);
    setSelectedId(note.id);
    setViewMode("edit");
  };

  const handleUpdate = (updates: Partial<NotebookNote>) => {
    if (!selectedNote) return;
    const updated: NotebookNote = {
      ...selectedNote,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const next = upsertNote(updated);
    persist(next);
  };

  const handleSelectAgent = (agentId: string) => {
    if (!selectedNote) return;
    const agent = agents.find((a) => a.id === agentId);
    handleUpdate({
      agentId: agentId || undefined,
      agentName: agent?.name ?? undefined,
    });
  };

  const handleDelete = (id: string) => {
    const next = removeNote(id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    setDeleteConfirmId(null);
  };

  const handleExport = (note: NotebookNote) => {
    const body = `# ${note.title || t("notebook.untitled")}\n\n${note.content}`;
    const blob = new Blob([body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${note.title || "note"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const showEditor = viewMode === "edit" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1
            className="mb-1 text-2xl font-bold md:text-3xl"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              letterSpacing: "-1.5px",
            }}
          >
            <Pencil className="mr-2 inline-block h-6 w-6 align-text-bottom" style={{ color: "var(--accent)" }} />
            {t("notebook.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {t("notebook.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 transition-all md:hidden"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Notes list */}
        <aside
          className={`${sidebarOpen ? "w-64" : "w-0"} flex-shrink-0 overflow-hidden transition-all duration-300`}
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
          }}
        >
          <div className="flex h-full w-64 flex-col">
            <div className="space-y-2 p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("notebook.searchPlaceholder")}
                  className="w-full rounded-lg py-2 pl-9 pr-3 text-sm"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <button
                onClick={handleNewNote}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--text-primary)",
                }}
              >
                <Plus className="h-4 w-4" />
                {t("notebook.newNote")}
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {filteredNotes.map((note) => {
                const isActive = note.id === selectedId;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedId(note.id)}
                    className="group cursor-pointer rounded-lg p-3 transition-all"
                    style={{
                      backgroundColor: isActive ? "var(--accent)" : "var(--card-elevated)",
                      outline: isActive ? "2px solid var(--accent)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {note.title || t("notebook.untitled")}
                        </p>
                        <p
                          className="mt-1 truncate text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {note.content.slice(0, 60) || "…"}
                        </p>
                        <div
                          className="mt-1 flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {note.agentName ? (
                            <span className="inline-flex items-center gap-1">
                              <Pin className="h-3 w-3" />
                              {note.agentName}
                            </span>
                          ) : null}
                          <span>· {formatRelative(note.updatedAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(note.id);
                        }}
                        className="rounded p-1 opacity-0 transition-all hover:bg-red-500/20 group-hover:opacity-100"
                        style={{ color: "var(--error)" }}
                        title={t("notebook.deleteConfirm")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {deleteConfirmId === note.id ? (
                      <div
                        className="mt-2 flex items-center justify-between gap-2 rounded p-2"
                        style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs" style={{ color: "var(--error)" }}>
                          {t("notebook.deleteConfirm")}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="rounded px-2 py-1 text-xs"
                            style={{ backgroundColor: "var(--error)", color: "white" }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded px-2 py-1 text-xs"
                            style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)" }}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {filteredNotes.length === 0 ? (
                <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">{t("notebook.empty")}</p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Editor */}
        <section
          className="flex flex-1 flex-col overflow-hidden rounded-xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          {selectedNote ? (
            <>
              <div
                className="flex flex-wrap items-center gap-2 px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdate({ title: e.target.value })}
                  placeholder={t("notebook.titlePlaceholder")}
                  className="flex-1 border-none bg-transparent text-lg font-semibold outline-none"
                  style={{ color: "var(--text-primary)" }}
                />

                {/* View mode toggle */}
                <div
                  className="flex items-center gap-1 rounded-lg p-1"
                  style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}
                >
                  <ModeButton active={viewMode === "edit"} onClick={() => setViewMode("edit")} title={t("notebook.edit")}>
                    <Pencil className="h-4 w-4" />
                  </ModeButton>
                  <ModeButton active={viewMode === "split"} onClick={() => setViewMode("split")} title={t("notebook.split")}>
                    <Columns className="h-4 w-4" />
                  </ModeButton>
                  <ModeButton active={viewMode === "preview"} onClick={() => setViewMode("preview")} title={t("notebook.preview")}>
                    <Eye className="h-4 w-4" />
                  </ModeButton>
                </div>

                {/* Agent linking */}
                <select
                  value={selectedNote.agentId ?? ""}
                  onChange={(e) => handleSelectAgent(e.target.value)}
                  className="rounded-md px-2 py-1.5 text-sm"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  title={t("notebook.agent")}
                >
                  <option value="">{t("notebook.noAgent")}</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name ?? agent.id}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleExport(selectedNote)}
                  className="rounded-lg p-2 transition-all hover:bg-green-500/20"
                  style={{ color: "var(--success)" }}
                  title={t("notebook.updated")}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>

              {/* Editor / preview body */}
              <div className="flex flex-1 overflow-hidden">
                {showEditor ? (
                  <textarea
                    value={selectedNote.content}
                    onChange={(e) => handleUpdate({ content: e.target.value })}
                    placeholder={t("notebook.contentPlaceholder")}
                    className={`resize-none bg-transparent p-4 outline-none ${showPreview ? "w-1/2 border-r" : "w-full"}`}
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-body)",
                    }}
                  />
                ) : null}
                {showPreview ? (
                  <div
                    className={`${showEditor ? "w-1/2" : "w-full"} overflow-y-auto p-4 markdown-preview`}
                    // Markdown is sanitized by renderMarkdown (raw HTML is escaped)
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }}
                  />
                ) : null}
              </div>

              <div
                className="flex items-center justify-between px-4 py-2 text-xs"
                style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                <span>
                  {t("notebook.created")}: {new Date(selectedNote.createdAt).toLocaleString()}
                </span>
                <span>
                  {t("notebook.updated")}: {formatRelative(selectedNote.updatedAt)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center" style={{ color: "var(--text-muted)" }}>
              <div className="text-center">
                <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p className="text-sm">{t("notebook.empty")}</p>
                <button
                  onClick={handleNewNote}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg px-4 py-2 font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}
                >
                  <Plus className="h-4 w-4" />
                  {t("notebook.emptyHint")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ModeButton({ active, onClick, title, children }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-md p-1.5 transition-all"
      style={{
        backgroundColor: active ? "var(--accent)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
