/**
 * Content plan generator for the SEO module.
 *
 * Produces content ideas from a seed keyword, optionally enriched by
 * "People Also Ask" (PAA) questions scraped from Google. Intent and
 * difficulty are inferred with keyless heuristics.
 */

import type { Competition, ContentIdea, SearchIntent } from "./types";

/** Injectable fetcher signature — matches a subset of global `fetch`. */
export type ContentFetcher = (url: string, init?: RequestInit) => Promise<Response>;

const GOOGLE_SEARCH_URL = "https://www.google.com/search";

/** Words that signal commercial (investigation) intent. */
const COMMERCIAL_WORDS = [
  "best",
  "top",
  "vs",
  "versus",
  "review",
  "reviews",
  "alternative",
  "alternatives",
  "compare",
  "comparison",
];

/** Words that signal transactional intent. */
const TRANSACTIONAL_WORDS = [
  "buy",
  "purchase",
  "order",
  "shop",
  "deal",
  "deals",
  "discount",
  "coupon",
  "cheap",
  "subscribe",
  "download",
  "hire",
  "pricing",
  "price",
];

/** Words that signal navigational intent (brands / destinations). */
const NAVIGATIONAL_WORDS = [
  "login",
  "log in",
  "sign in",
  "signin",
  "dashboard",
  "account",
  "official",
  "website",
  "homepage",
];

/** Words that signal informational intent. */
const INFORMATIONAL_WORDS = [
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "which",
  "guide",
  "tutorial",
  "examples",
  "tips",
  "learn",
  "explained",
  "meaning",
  "definition",
];

/**
 * Classify the dominant search intent of a keyword.
 * Priority: transactional > navigational > commercial > informational.
 */
export function classifyIntent(keyword: string): SearchIntent {
  const lower = keyword.toLowerCase();
  if (TRANSACTIONAL_WORDS.some((w) => lower.includes(w))) return "transactional";
  if (NAVIGATIONAL_WORDS.some((w) => lower.includes(w))) return "navigational";
  if (COMMERCIAL_WORDS.some((w) => lower.includes(w))) return "commercial";
  if (INFORMATIONAL_WORDS.some((w) => lower.includes(w))) return "informational";
  return "informational";
}

/**
 * Estimate ranking difficulty for a keyword.
 * Head terms are harder; long-tail is easier.
 */
export function estimateDifficulty(keyword: string): Competition {
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const count = words.length;
  if (count <= 1) return "high";
  if (count <= 3) return "medium";
  return "low";
}

/**
 * Generate up to 10 content ideas for a seed keyword.
 *
 * Combines PAA questions (when available) with a set of proven content
 * templates so the result is always actionable, even if scraping fails.
 */
export function generateContentIdeas(keyword: string, paa: string[] = []): ContentIdea[] {
  const seed = keyword.trim();
  if (!seed) return [];

  const ideas: ContentIdea[] = [];

  // 1. PAA-derived ideas first (high intent signal).
  for (const question of paa.slice(0, 5)) {
    const clean = question.trim();
    if (!clean) continue;
    ideas.push({
      title: clean,
      keyword: seed,
      intent: classifyIntent(clean),
      difficulty: estimateDifficulty(clean),
    });
  }

  // 2. Template-based ideas to guarantee a full plan.
  const templates = [
    { title: `The Complete Guide to ${seed} in 2026`, intent: "informational" as const },
    { title: `${capitalize(seed)}: What It Is and Why It Matters`, intent: "informational" as const },
    { title: `Top 10 ${seed} Tips for Beginners`, intent: "informational" as const },
    { title: `How to Master ${seed} (Step by Step)`, intent: "informational" as const },
    { title: `Common ${capitalize(seed)} Mistakes to Avoid`, intent: "informational" as const },
    { title: `Best Tools for ${seed} in 2026`, intent: "commercial" as const },
    { title: `${capitalize(seed)} Examples and Case Studies`, intent: "informational" as const },
    { title: `${capitalize(seed)} vs Alternatives: Which Is Right for You?`, intent: "commercial" as const },
    { title: `Free ${seed} Checklist You Can Use Today`, intent: "transactional" as const },
    { title: `${capitalize(seed)} Trends to Watch This Year`, intent: "informational" as const },
  ];

  const existing = new Set(ideas.map((i) => i.title.toLowerCase()));
  for (const tpl of templates) {
    if (ideas.length >= 10) break;
    if (existing.has(tpl.title.toLowerCase())) continue;
    existing.add(tpl.title.toLowerCase());
    ideas.push({
      title: tpl.title,
      keyword: seed,
      intent: tpl.intent,
      difficulty: estimateDifficulty(`${seed} ${tpl.intent}`),
    });
  }

  return ideas.slice(0, 10);
}

/** Capitalize the first letter of each word. */
function capitalize(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Extract "People Also Ask"-style questions from an HTML/JSON payload.
 *
 * Looks for question-shaped strings (ending in "?") in JSON arrays first,
 * then in <span>/<h3> text nodes. Non-questions are filtered out.
 */
export function parsePaa(html: string): string[] {
  if (!html) return [];
  const questions = new Set<string>();

  // 1. JSON array of strings (Google sometimes embeds these inline).
  const jsonRe = /\[((?:[^[\]]*?,)*[^[\]]*)\]/g;
  let jm: RegExpExecArray | null;
  while ((jm = jsonRe.exec(html)) !== null) {
    const inner = jm[1];
    const strRe = /"([^"]{4,120}\?)"/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRe.exec(inner)) !== null) {
      questions.add(sm[1].trim());
    }
  }

  // 2. Tagged text nodes that look like questions.
  const tagRe = /<(?:span|h3|div)[^>]*>([^<>]{4,140})<\/(?:span|h3|div)>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tagRe.exec(html)) !== null) {
    const text = decodeEntities(tm[1]).trim();
    if (/\?\s*$/.test(text)) {
      questions.add(text);
    }
  }

  return Array.from(questions);
}

/** Decode the small set of HTML entities we care about. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Build a content plan for a seed keyword, scraping PAA when possible.
 * `fetcher` defaults to global `fetch` and is exposed for testing.
 */
export async function fetchContentPlan(
  keyword: string,
  options: { fetcher?: ContentFetcher } = {},
): Promise<ContentIdea[]> {
  const seed = keyword.trim();
  if (!seed) return [];

  const fetcher = options.fetcher ?? globalThis.fetch;

  let paa: string[] = [];
  try {
    const res = await fetcher(
      `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(seed)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AlfredMissionControl/1.0; +https://example.com/bot)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      } as RequestInit,
    );
    if (res.ok) {
      paa = parsePaa(await res.text());
    }
  } catch (error) {
    console.error("[seo] PAA scrape failed:", error);
  }

  return generateContentIdeas(seed, paa);
}
