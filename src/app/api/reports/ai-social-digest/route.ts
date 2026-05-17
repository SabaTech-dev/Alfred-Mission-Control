import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";

export const dynamic = "force-dynamic";

const WORKSPACE = path.resolve(OPENCLAW_WORKSPACE);
const DIGEST_DIR = path.join(WORKSPACE, "reports/cron/ai-social-digest");

interface DigestEntry {
  date: string;
  filename: string;
  title: string;
  summary: string;
  categories: string[];
  itemCounts: Record<string, number>;
  content: string;
}

// Known section headings and their category labels
const SECTION_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /ai\s*digest/i, category: "AI" },
  { pattern: /reddit/i, category: "Reddit" },
  { pattern: /youtube/i, category: "YouTube" },
  { pattern: /startups/i, category: "Startups" },
  { pattern: /social/i, category: "Social" },
  { pattern: /sección\s*1/i, category: "AI" },
  { pattern: /sección\s*2/i, category: "Reddit" },
  { pattern: /sección\s*3/i, category: "YouTube" },
  { pattern: /sección\s*4/i, category: "Startups" },
];

function extractDateFromFilename(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Digest";
}

function extractSummary(content: string): string {
  // First non-heading, non-empty, non-divider paragraph
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("---") &&
      !trimmed.startsWith("```") &&
      !trimmed.startsWith("*No se encontraron")
    ) {
      return trimmed.slice(0, 250);
    }
  }
  return "";
}

function parseCategories(content: string): {
  categories: string[];
  itemCounts: Record<string, number>;
} {
  const categoriesSet = new Set<string>();
  const itemCounts: Record<string, number> = {};
  const lines = content.split("\n");

  let currentCategory = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headings (## or ###)
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[1];
      // Try to match known section patterns
      let matched = false;
      for (const sp of SECTION_PATTERNS) {
        if (sp.pattern.test(headingText)) {
          currentCategory = sp.category;
          categoriesSet.add(currentCategory);
          if (!itemCounts[currentCategory]) itemCounts[currentCategory] = 0;
          matched = true;
          break;
        }
      }
      // Count numbered sub-items (### 1. Title) as items for current category
      if (matched) continue;
      if (currentCategory) {
        const numberedMatch = headingText.match(/^\d+[\.\s]/);
        if (numberedMatch) {
          itemCounts[currentCategory] = (itemCounts[currentCategory] || 0) + 1;
        }
      }
      continue;
    }

    // Count items (list items under a category)
    if (currentCategory && (trimmed.startsWith("- ") || trimmed.startsWith("* "))) {
      // Only count substantive items (not "No se encontraron" messages)
      if (!trimmed.includes("No se encontraron") && trimmed.length > 10) {
        itemCounts[currentCategory] = (itemCounts[currentCategory] || 0) + 1;
      }
    }

    // Count bare numbered items (1. Title or N. Title)
    if (currentCategory && trimmed.match(/^\d+[\.\s].+/)) {
      itemCounts[currentCategory] = (itemCounts[currentCategory] || 0) + 1;
    }
  }

  return {
    categories: Array.from(categoriesSet),
    itemCounts,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category"); // AI, Reddit, YouTube, Startups, Social
  const dateFilter = searchParams.get("date"); // YYYY-MM-DD or YYYY-MM
  const search = searchParams.get("search");
  const fileParam = searchParams.get("file"); // specific filename to read full content

  try {
    // If requesting a specific file
    if (fileParam) {
      // Validate filename to prevent path traversal
      const sanitized = fileParam.replace(/[^a-zA-Z0-9._-]/g, "");
      const fullPath = path.join(DIGEST_DIR, sanitized);
      if (!fullPath.startsWith(DIGEST_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        return NextResponse.json({ content, filename: sanitized });
      } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    let files: string[];
    try {
      files = await fs.readdir(DIGEST_DIR);
    } catch {
      return NextResponse.json({ digests: [], stats: { total: 0, categories: [], dateRange: { earliest: null, latest: null } } });
    }

    const entries: DigestEntry[] = [];

    for (const file of files.sort().reverse()) {
      if (!file.endsWith(".md")) continue;

      const fullPath = path.join(DIGEST_DIR, file);
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const date = extractDateFromFilename(file);
        const title = extractTitle(content);
        const summary = extractSummary(content);
        const { categories, itemCounts } = parseCategories(content);

        entries.push({
          date,
          filename: file,
          title,
          summary,
          categories,
          itemCounts,
          content, // full content for detail view
        });
      } catch {
        // skip unreadable files
      }
    }

    // Apply filters
    let filtered = entries;

    if (category) {
      filtered = filtered.filter((e) =>
        e.categories.some((c) => c.toLowerCase() === category.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter((e) => e.date.startsWith(dateFilter));
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q)
      );
    }

    // Stats
    const allCategories = new Set<string>();
    let totalItems = 0;
    for (const e of entries) {
      e.categories.forEach((c) => allCategories.add(c));
      Object.values(e.itemCounts).forEach((n) => { totalItems += n; });
    }

    const stats = {
      total: entries.length,
      categories: Array.from(allCategories).sort(),
      totalItems,
      dateRange: {
        earliest: entries.length > 0 ? entries[entries.length - 1].date : null,
        latest: entries.length > 0 ? entries[0].date : null,
      },
      availableMonths: [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse(),
    };

    // For list view, strip full content to reduce payload
    const digests = filtered.map(({ content: _, ...rest }) => rest);

    return NextResponse.json({ digests, stats });
  } catch (error) {
    console.error("Error in ai-social-digest API:", error);
    return NextResponse.json({ error: "Failed to load AI & Social Digest data" }, { status: 500 });
  }
}
