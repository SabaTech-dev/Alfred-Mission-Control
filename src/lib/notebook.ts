/**
 * Notebook helpers — localStorage-backed notes with agent linking and a
 * minimal, dependency-free Markdown renderer.
 *
 * Storage key is fixed (`amc_notebook_notes`) per the feature spec.
 *
 * @module notebook
 */

export const STORAGE_KEY = "amc_notebook_notes";

export interface NotebookNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** Optional agent this note is linked to. */
  agentId?: string;
  agentName?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Read all notes from localStorage. Returns [] when missing or corrupt. */
export function loadNotes(): NotebookNote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotebookNote[]) : [];
  } catch {
    return [];
  }
}

/** Persist the full notes array. */
export function saveNotes(notes: NotebookNote[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/** Create a new note with id + timestamps. */
export function createNote(input: {
  title?: string;
  content?: string;
  agentId?: string;
  agentName?: string;
}): NotebookNote {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: input.title ?? "",
    content: input.content ?? "",
    createdAt: now,
    updatedAt: now,
    agentId: input.agentId,
    agentName: input.agentName,
  };
}

/** Insert or update a note by id. New notes are prepended. */
export function upsertNote(note: NotebookNote): NotebookNote[] {
  const notes = loadNotes();
  const existingIndex = notes.findIndex((n) => n.id === note.id);
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.unshift(note);
  }
  saveNotes(notes);
  return notes;
}

/** Remove a note by id. */
export function deleteNote(id: string): NotebookNote[] {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
  return notes;
}

/** Filter notes by a free-text query across title, content and agent name. */
export function filterNotes(notes: NotebookNote[], query: string): NotebookNote[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((note) => {
    const haystack = [note.title, note.content, note.agentName ?? ""].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

/* ------------------------------------------------------------------ *
 * Minimal Markdown renderer
 *
 * Intentionally small: covers headings, bold, italic, inline code,
 * fenced code blocks, and links. Raw HTML is escaped to prevent XSS.
 * No external dependency — keeps the bundle lean (YAGNI).
 * ------------------------------------------------------------------ */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // inline code first so its content isn't re-processed
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic (single _ or *)
  out = out.replace(/(^|[^\w])_([^_]+)_/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w])\*([^*]+)\*/g, "$1<em>$2</em>");
  // links [text](href)
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return out;
}

/** Render a Markdown string to an HTML string. */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    // fenced code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (line.trim() === "") {
      html.push("");
      continue;
    }

    html.push(`<p>${renderInline(line)}</p>`);
  }

  // flush an open code block
  if (inCodeBlock && codeBuffer.length > 0) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
}
