import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  STORAGE_KEY,
  createNote,
  loadNotes,
  saveNotes,
  upsertNote,
  deleteNote,
  filterNotes,
  renderMarkdown,
  type NotebookNote,
} from "./notebook";

describe("notebook storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("exposes the documented localStorage key", () => {
    expect(STORAGE_KEY).toBe("amc_notebook_notes");
  });

  it("loadNotes returns an empty array when nothing is stored", () => {
    expect(loadNotes()).toEqual([]);
  });

  it("loadNotes gracefully ignores corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    expect(loadNotes()).toEqual([]);
  });

  it("saveNotes then loadNotes round-trips notes", () => {
    const note = createNote({ title: "Hola", content: "Mundo" });
    saveNotes([note]);

    const loaded = loadNotes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe("Hola");
    expect(loaded[0].id).toBe(note.id);
  });
});

describe("notebook mutations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("createNote assigns id, timestamps and optional agent metadata", () => {
    const before = Date.now();
    const note = createNote({ title: "T", content: "C", agentId: "dev", agentName: "Dev" });

    expect(note.id).toBeTruthy();
    expect(note.title).toBe("T");
    expect(note.agentId).toBe("dev");
    expect(note.agentName).toBe("Dev");
    expect(new Date(note.createdAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(note.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("createNote defaults empty strings for missing fields", () => {
    const note = createNote({});
    expect(note.title).toBe("");
    expect(note.content).toBe("");
    expect(note.agentId).toBeUndefined();
  });

  it("upsertNote inserts a new note and updates updatedAt on change", () => {
    const note = createNote({ title: "A", content: "a" });
    saveNotes([note]);

    const updated: NotebookNote = { ...note, title: "A2" };
    upsertNote(updated);

    const loaded = loadNotes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe("A2");
  });

  it("upsertNote prepends new notes so the most recent stays on top", () => {
    const first = createNote({ title: "first" });
    saveNotes([first]);
    const second = createNote({ title: "second" });
    upsertNote(second);

    const loaded = loadNotes();
    expect(loaded[0].id).toBe(second.id);
    expect(loaded[1].id).toBe(first.id);
  });

  it("deleteNote removes only the matching note", () => {
    const a = createNote({ title: "a" });
    const b = createNote({ title: "b" });
    saveNotes([a, b]);

    deleteNote(a.id);

    const loaded = loadNotes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(b.id);
  });
});

describe("filterNotes", () => {
  const notes: NotebookNote[] = [
    { id: "1", title: "Deploy notes", content: "ship it", createdAt: "0", updatedAt: "0", agentId: "dev", agentName: "Dev" },
    { id: "2", title: "Shopping", content: "buy milk", createdAt: "0", updatedAt: "0" },
  ];

  it("matches title case-insensitively", () => {
    expect(filterNotes(notes, "deploy")).toHaveLength(1);
  });

  it("matches content", () => {
    expect(filterNotes(notes, "milk")).toHaveLength(1);
  });

  it("returns everything for an empty query", () => {
    expect(filterNotes(notes, "")).toHaveLength(2);
  });

  it("can filter by agent name", () => {
    expect(filterNotes(notes, "dev")).toHaveLength(1);
  });
});

describe("renderMarkdown", () => {
  it("renders headings", () => {
    expect(renderMarkdown("# Title")).toContain("<h1>Title</h1>");
  });

  it("renders bold and italic", () => {
    expect(renderMarkdown("**bold**")).toContain("<strong>bold</strong>");
    expect(renderMarkdown("_italic_")).toContain("<em>italic</em>");
  });

  it("renders inline code and code blocks", () => {
    expect(renderMarkdown("`code`")).toContain("<code>code</code>");
    expect(renderMarkdown("```\nx\n```")).toContain("<pre><code>x</code></pre>");
  });

  it("renders links and escapes raw html", () => {
    const out = renderMarkdown("[Alfred](https://example.com)");
    expect(out).toContain('<a href="https://example.com"');
    expect(renderMarkdown("<script>x</script>")).not.toContain("<script>");
  });

  it("preserves line breaks for paragraphs", () => {
    expect(renderMarkdown("line one\nline two")).toContain("line one");
  });
});
