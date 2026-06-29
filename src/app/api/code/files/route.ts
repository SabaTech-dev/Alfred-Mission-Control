import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface DirEntry {
  name: string;
  type: "file" | "dir";
}

/**
 * Resolve a relative path against the configured root and ensure the result
 * stays inside the root. Returns null when the path is unsafe (absolute,
 * parent traversal, or escapes the root boundary).
 */
export function resolveSafePath(
  relativePath: string,
  root: string,
): string | null {
  if (!relativePath) return null;
  // Reject absolute paths outright.
  if (path.isAbsolute(relativePath)) return null;
  // Reject Windows drive letters too.
  if (/^[a-zA-Z]:[\\/]/.test(relativePath)) return null;

  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, relativePath);

  // Ensure target is within root (prevent traversal via ".." or symlinks-as-written).
  const rel = path.relative(rootResolved, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;

  return target;
}

function getRoot(): string {
  return process.env.CODE_FILES_ROOT || process.cwd();
}

export async function GET(request: NextRequest) {
  try {
    const relativePath = request.nextUrl.searchParams.get("path");
    if (!relativePath || relativePath.trim() === "") {
      return NextResponse.json(
        { error: "Missing required 'path' query parameter." },
        { status: 400 },
      );
    }

    const root = getRoot();
    const target = resolveSafePath(relativePath, root);
    if (!target) {
      return NextResponse.json(
        { error: "Invalid or unsafe path." },
        { status: 400 },
      );
    }

    let stats;
    try {
      stats = statSync(target);
    } catch {
      return NextResponse.json(
        { error: "Path does not exist." },
        { status: 404 },
      );
    }

    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: "Path is not a directory." },
        { status: 400 },
      );
    }

    const entries: DirEntry[] = readdirSync(target).map((name) => {
      const full = path.join(target, name);
      try {
        const isDir = statSync(full).isDirectory();
        return { name, type: isDir ? "dir" : "file" };
      } catch {
        return { name, type: "file" as const };
      }
    });

    // Directories first, then files, each group alphabetical.
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const rootResolved = path.resolve(root);
    const displayPath = path.relative(rootResolved, target) || ".";

    return NextResponse.json({
      path: displayPath,
      entries,
    });
  } catch (error) {
    console.error("[api/code/files] GET error:", error);
    return NextResponse.json(
      { error: "Failed to list directory." },
      { status: 500 },
    );
  }
}
