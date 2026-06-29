/**
 * Keyword research logic for the SEO module.
 *
 * Pure functions are exported so they can be unit-tested without network
 * access. The network-fetching entry point (`fetchKeywordSuggestions`) is a
 * thin wrapper that injects the fetcher, keeping it trivial to mock.
 *
 * Data sources used (all keyless):
 *   - Google Suggest (client=firefox) — autocomplete suggestions
 *   - Google Trends RSS — interest-over-time proxy for volume/trend
 */

import type { Competition, KeywordSuggestion, TrendDirection } from "./types";

/** Injectable fetcher signature — matches a subset of global `fetch`. */
export type SeoFetcher = (url: string) => Promise<Response>;

const GOOGLE_SUGGEST_URL = "https://suggestqueries.google.com/complete/search";
const GOOGLE_TRENDS_RSS_URL = "https://trends.google.com/trends/trendingsearches/daily/rss";

/** Words that signal commercial/transactional intent (raise competition). */
const COMMERCIAL_WORDS = [
  "buy",
  "price",
  "pricing",
  "cost",
  "cheap",
  "deal",
  "discount",
  "best",
  "enterprise",
  "software",
  "platform",
  "service",
  "agency",
  "professional",
];

const MAX_SUGGESTIONS = 10;

/**
 * Parse the Google Suggest (client=firefox) JSON response.
 * Response shape: `[ "<query>", ["<suggestion>", ...] ]`.
 */
export function parseGoogleSuggest(response: unknown): string[] {
  if (!Array.isArray(response) || response.length < 2) {
    return [];
  }
  const suggestions = response[1];
  if (!Array.isArray(suggestions)) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of suggestions) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/**
 * Estimate monthly search volume for a keyword.
 *
 * Heuristic (no API keys):
 *   - Head terms (short, common) get a high base estimate.
 *   - Long-tail terms get progressively less.
 *   - Trend points (0-100 scale) scale the estimate up/down.
 *
 * This is intentionally a *rough* proxy — it produces consistent, comparable
 * numbers suitable for ranking suggestions, not for budget planning.
 */
export function estimateVolume(keyword: string, trendsPoints?: number[]): number {
  if (!keyword) return 0;
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = keyword.trim().length;

  // Base estimate: single words get the most, long-tail gets less.
  let base: number;
  if (wordCount === 1) {
    base = 18000 - charCount * 200;
  } else if (wordCount === 2) {
    base = 9000;
  } else if (wordCount === 3) {
    base = 4500;
  } else if (wordCount === 4) {
    base = 2200;
  } else {
    base = 800;
  }
  if (base < 100) base = 100;

  // Adjust by trend signal when available (0-100 scale).
  if (trendsPoints && trendsPoints.length > 0) {
    const avg = trendsPoints.reduce((a, b) => a + b, 0) / trendsPoints.length;
    // avg ~50 is neutral; scale factor ranges roughly 0.4x..2x.
    const factor = 0.4 + (avg / 50) * 0.8;
    base = base * factor;
  }

  return Math.max(50, Math.round(base));
}

/**
 * Classify competition level for a keyword using simple heuristics.
 *
 *   - Short head terms and phrases with commercial vocabulary -> high
 *   - 3-4 word informational phrases -> medium
 *   - Long-tail (5+ words) without commercial words -> low
 */
export function classifyCompetition(keyword: string): Competition {
  const lower = keyword.toLowerCase();
  const words = lower.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hasCommercial = COMMERCIAL_WORDS.some((w) => lower.includes(w));

  if (hasCommercial) {
    return wordCount <= 3 ? "high" : "medium";
  }
  if (wordCount <= 1) return "high";
  if (wordCount <= 2) return "high";
  if (wordCount <= 4) return "medium";
  return "low";
}

/**
 * Determine the trend direction from a series of interest-over-time points.
 *
 * Compares the average of the first half to the average of the second half.
 * A change of less than 10% is treated as stable.
 */
export function detectTrend(trendsPoints: number[]): TrendDirection {
  if (trendsPoints.length < 2) return "stable";
  const mid = Math.floor(trendsPoints.length / 2);
  const firstHalf = trendsPoints.slice(0, mid);
  const secondHalf = trendsPoints.slice(mid);
  if (firstHalf.length === 0 || secondHalf.length === 0) return "stable";

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const a = avg(firstHalf);
  const b = avg(secondHalf);
  if (a === 0) return b > 0 ? "up" : "stable";
  const delta = (b - a) / a;
  if (delta > 0.1) return "up";
  if (delta < -0.1) return "down";
  return "stable";
}

/**
 * Extract numeric interest values from a Google Trends RSS/HTML payload.
 *
 * Trends RSS embeds an HTML table (HTML-escaped) in the <description> with
 * rows of `<td>YYYY-MM-DD</td><td>NN</td>`. We decode entities and then pull
 * out values from cells whose content is *purely* a 1-3 digit number — date
 * cells (which contain dashes) are naturally excluded.
 */
export function trendsRssToPoints(xml: string): number[] {
  if (!xml) return [];
  const decoded = decodeEntities(xml);
  const points: number[] = [];
  const re = /<td[^>]*>\s*(\d{1,3})\s*<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded)) !== null) {
    const val = parseInt(m[1], 10);
    if (!Number.isNaN(val)) points.push(val);
  }
  return points;
}

/** Decode the subset of HTML entities Trends RSS uses in <description>. */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Fetch keyword suggestions for a seed query.
 *
 * `fetcher` defaults to global `fetch` and is exposed for testing.
 * `targetUrl` is currently informational (kept for future SERP-based signals).
 */
export async function fetchKeywordSuggestions(
  seed: string,
  options: { targetUrl?: string; fetcher?: SeoFetcher } = {},
): Promise<KeywordSuggestion[]> {
  const query = seed.trim();
  if (!query) return [];

  const fetcher = options.fetcher ?? globalThis.fetch;
  const suggestUrl =
    `${GOOGLE_SUGGEST_URL}?client=firefox&q=${encodeURIComponent(query)}`;

  let suggestions: string[];
  try {
    const res = await fetcher(suggestUrl);
    suggestions = parseGoogleSuggest(await res.json());
  } catch (error) {
    console.error("[seo] Google Suggest fetch failed:", error);
    suggestions = [];
  }

  // Best-effort trend signal (network failure is non-fatal).
  let points: number[] = [];
  try {
    const trendsRes = await fetcher(
      `${GOOGLE_TRENDS_RSS_URL}?geo=US`,
    );
    if (trendsRes.ok) {
      points = trendsRssToPoints(await trendsRes.text());
    }
  } catch (error) {
    console.error("[seo] Google Trends RSS fetch failed:", error);
  }

  // Always include the seed itself as the top row.
  const unique = [query, ...suggestions.filter((s) => s.toLowerCase() !== query.toLowerCase())];

  return unique.map((keyword) => ({
    keyword,
    volumeEstimate: estimateVolume(keyword, points),
    competition: classifyCompetition(keyword),
    trend: detectTrend(points),
  }));
}
