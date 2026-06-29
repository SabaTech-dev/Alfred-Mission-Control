import { describe, expect, it } from "vitest";

import { computeUnifiedDiff, summarizeDiff, type DiffLine } from "./code-diff";

describe("computeUnifiedDiff", () => {
  it("returns only context lines for identical input", () => {
    const result = computeUnifiedDiff("a\nb\nc", "a\nb\nc");
    expect(result.every((l) => l.type === "context")).toBe(true);
    expect(result.map((l) => l.text)).toEqual(["a", "b", "c"]);
  });

  it("marks fully added content as add lines", () => {
    const result = computeUnifiedDiff("", "x\ny");
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.type === "add")).toBe(true);
    expect(result.map((l) => l.text)).toEqual(["x", "y"]);
  });

  it("marks removed content as remove lines", () => {
    const result = computeUnifiedDiff("x\ny", "");
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.type === "remove")).toBe(true);
    expect(result.map((l) => l.text)).toEqual(["x", "y"]);
  });

  it("detects a pure insertion at the end", () => {
    const result = computeUnifiedDiff("a\nb", "a\nb\nc");
    const types = result.map((l) => l.type);
    expect(types).toEqual(["context", "context", "add"]);
    expect(result[2].text).toBe("c");
  });

  it("detects a pure removal at the end", () => {
    const result = computeUnifiedDiff("a\nb\nc", "a\nb");
    const types = result.map((l) => l.type);
    expect(types).toEqual(["context", "context", "remove"]);
    expect(result[2].text).toBe("c");
  });

  it("handles a mixed change with replacement", () => {
    const result = computeUnifiedDiff("a\nold\nc", "a\nnew\nc");
    const types = result.map((l) => l.type);
    // a (context), old (remove), new (add), c (context)
    expect(types).toEqual(["context", "remove", "add", "context"]);
    expect(result[1].text).toBe("old");
    expect(result[2].text).toBe("new");
  });

  it("treats empty strings as no lines", () => {
    const result = computeUnifiedDiff("", "");
    expect(result).toEqual([]);
  });

  it("preserves line content without the trailing newline", () => {
    const result = computeUnifiedDiff("keep\n", "keep\nadded\n");
    const added = result.filter((l) => l.type === "add");
    expect(added.map((l) => l.text)).toEqual(["added"]);
  });
});

describe("summarizeDiff", () => {
  it("counts add and remove lines", () => {
    const lines: DiffLine[] = [
      { type: "context", text: "a" },
      { type: "remove", text: "old" },
      { type: "add", text: "new" },
      { type: "add", text: "extra" },
    ];
    expect(summarizeDiff(lines)).toEqual({ added: 2, removed: 1 });
  });

  it("returns zeros for an empty diff", () => {
    expect(summarizeDiff([])).toEqual({ added: 0, removed: 0 });
  });
});
