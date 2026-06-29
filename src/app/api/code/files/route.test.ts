import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { GET } from "./route";

function makeRequest(path: string): NextRequest {
  const url = new URL("/api/code/files", "http://localhost");
  if (path !== undefined) url.searchParams.set("path", path);
  return new NextRequest(url);
}

describe("/api/code/files", () => {
  let root: string;
  const previousRoot = process.env.CODE_FILES_ROOT;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "amc-code-"));
    // Fixture: a couple of dirs and files inside the root.
    mkdirSync(join(root, "src"));
    mkdirSync(join(root, "src", "lib"));
    writeFileSync(join(root, "src", "a.ts"), "export const a = 1;");
    writeFileSync(join(root, "README.md"), "# readme");
    process.env.CODE_FILES_ROOT = root;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (previousRoot === undefined) {
      delete process.env.CODE_FILES_ROOT;
    } else {
      process.env.CODE_FILES_ROOT = previousRoot;
    }
  });

  it("returns 400 when path is missing", async () => {
    const req = new NextRequest(new URL("/api/code/files", "http://localhost"));
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("returns 400 for a parent traversal path", async () => {
    const res = await GET(makeRequest("../etc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an absolute path", async () => {
    const res = await GET(makeRequest("/etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a nested traversal that escapes the root", async () => {
    const res = await GET(makeRequest("src/../../.."));
    expect(res.status).toBe(400);
  });

  it("returns a directory listing for a valid path", async () => {
    const res = await GET(makeRequest("src"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toBe("src");
    const names = data.entries.map((e: { name: string }) => e.name);
    expect(names).toContain("lib");
    expect(names).toContain("a.ts");
    const libEntry = data.entries.find((e: { name: string }) => e.name === "lib");
    expect(libEntry.type).toBe("dir");
    const fileEntry = data.entries.find((e: { name: string }) => e.name === "a.ts");
    expect(fileEntry.type).toBe("file");
  });

  it("lists the root when path is empty-ish", async () => {
    const res = await GET(makeRequest("."));
    expect(res.status).toBe(200);
    const data = await res.json();
    const names = data.entries.map((e: { name: string }) => e.name);
    expect(names).toContain("README.md");
    expect(names).toContain("src");
  });

  it("returns 404 for a nonexistent path", async () => {
    const res = await GET(makeRequest("does-not-exist"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when path points to a file rather than a directory", async () => {
    const res = await GET(makeRequest("README.md"));
    expect(res.status).toBe(400);
  });

  it("sorts entries with directories first", async () => {
    const res = await GET(makeRequest("."));
    const data = await res.json();
    const entries = data.entries as Array<{ name: string; type: string }>;
    const firstDirIdx = entries.findIndex((e) => e.type === "dir");
    const lastFileIdx = entries.length - 1 - entries.slice().reverse().findIndex((e) => e.type === "file");
    if (firstDirIdx !== -1 && lastFileIdx !== -1) {
      expect(firstDirIdx).toBeLessThan(lastFileIdx);
    }
  });
});
