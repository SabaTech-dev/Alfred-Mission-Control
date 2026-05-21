import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

interface GraphNode {
  id: string;
  title: string;
  path: string;
  category: string;
  linkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  categories: string[];
}

function parseTitle(content: string): string {
  const match = content.match(/^---\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?/);
  if (match) return match[1];
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1];
  return "";
}

function getCategory(filePath: string): string {
  const parts = filePath.split("/");
  return parts.length > 1 ? parts[0] : "root";
}

function extractWikilinks(content: string): string[] {
  const links: string[] = [];
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return links;
}

async function buildGraphData(): Promise<GraphData> {
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  const categorySet = new Set<string>();

  // First pass: collect all notes
  async function scanDirectory(dirPath: string, relativePath: string = ""): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === ".git") continue;

      const fullPath = path.join(dirPath, entry.name);
      const entryPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, entryPath);
      } else if (entry.name.endsWith(".md")) {
        const content = await fs.readFile(fullPath, "utf-8");
        const noteName = entry.name.replace(".md", "");
        const title = parseTitle(content) || noteName;
        const category = getCategory(entryPath);

        categorySet.add(category);
        nodeMap.set(noteName, {
          id: noteName,
          title,
          path: entryPath,
          category,
          linkCount: 0,
        });
      }
    }
  }

  await scanDirectory(VAULT_PATH);

  // Second pass: extract edges from wikilinks
  async function extractEdges(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === ".git") continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await extractEdges(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const content = await fs.readFile(fullPath, "utf-8");
        const sourceName = entry.name.replace(".md", "");
        const wikilinks = extractWikilinks(content);

        for (const link of wikilinks) {
          // Normalize link to match note IDs
          const linkName = link.replace(/\.md$/, "");
          if (nodeMap.has(linkName) && linkName !== sourceName) {
            const edgeKey = `${sourceName}→${linkName}`;
            if (!edgeSet.has(edgeKey)) {
              edgeSet.add(edgeKey);
              edges.push({ source: sourceName, target: linkName });

              // Update link counts
              const srcNode = nodeMap.get(sourceName)!;
              const tgtNode = nodeMap.get(linkName)!;
              srcNode.linkCount++;
              tgtNode.linkCount++;
            }
          }
        }
      }
    }
  }

  await extractEdges(VAULT_PATH);

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    categories: Array.from(categorySet).sort(),
  };
}

// Cache graph data for 5 minutes
let cachedData: { data: GraphData; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const _auth = await requireAgentOrSessionAuth(request); if (!_auth.authorized) return _auth.error;

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data);
    }

    const data = await buildGraphData();
    cachedData = { data, timestamp: Date.now() };

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to build wiki graph:", error);
    return NextResponse.json({ error: "Failed to build graph data" }, { status: 500 });
  }
}
