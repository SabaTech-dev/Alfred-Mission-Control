/**
 * On-page SEO analyzer.
 *
 * Uses regex-based HTML extraction (no DOM dependency) so it runs identically
 * on the Next.js server and inside Vitest. Heuristics are intentionally
 * simple and keyless — they produce a consistent 0-100 score plus
 * actionable recommendations.
 */

import type { OnPageMeta, Recommendation, ImageInfo, LinkInfo } from "./types";

/** Injectable fetcher used by the network entry point. */
export type HtmlFetcher = (url: string) => Promise<Response>;

/** Remove all HTML tags and collapse whitespace. */
export function stripTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract on-page SEO metadata from an HTML string.
 * Order-independent attribute matching via `getAttribute`.
 */
export function extractMeta(html: string): OnPageMeta {
  const empty: OnPageMeta = {
    title: "",
    description: "",
    canonical: "",
    h1: [],
    h2: [],
    h3: [],
    images: [],
    links: [],
    wordCount: 0,
  };
  if (!html) return empty;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : "";

  const description = extractMetaDescription(html);

  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]*>/i,
  );
  const canonical = canonicalMatch ? getAttribute(canonicalMatch[0], "href") : "";

  const h1 = collectHeadings(html, "h1");
  const h2 = collectHeadings(html, "h2");
  const h3 = collectHeadings(html, "h3");

  const images = collectImages(html);

  const links = collectLinks(html);

  // Visible-text word count: strip everything then split on whitespace.
  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
  const textSource = bodyMatch ? bodyMatch[0] : html;
  const text = stripTags(textSource);
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return { title, description, canonical, h1, h2, h3, images, links, wordCount };
}

/** Extract the meta description, handling attribute order. */
function extractMetaDescription(html: string): string {
  const metaRe = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    const name = getAttribute(tag, "name").toLowerCase();
    if (name === "description") {
      return getAttribute(tag, "content");
    }
  }
  return "";
}

/** Collect all text contents of a heading level (e.g. "h2"). */
function collectHeadings(html: string, level: string): string[] {
  const re = new RegExp(`<${level}[^>]*>([\\s\\S]*?)</${level}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(stripTags(m[1]));
  }
  return out;
}

/** Collect all <img> elements with their src and alt. */
function collectImages(html: string): ImageInfo[] {
  const re = /<img\b[^>]*>/gi;
  const out: ImageInfo[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({
      src: getAttribute(m[0], "src"),
      alt: getAttribute(m[0], "alt"),
    });
  }
  return out;
}

/** Collect all <a> elements that have an href. */
function collectLinks(html: string): LinkInfo[] {
  const re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  const out: LinkInfo[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const fullTag = m[0];
    const href = getAttribute(fullTag, "href");
    if (!href) continue;
    out.push({ href, text: stripTags(m[1]), broken: false });
  }
  return out;
}

/**
 * Read an attribute value from a single HTML tag string.
 * Returns "" when the attribute is absent.
 */
function getAttribute(tag: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  if (!m) return "";
  return m[2] ?? m[3] ?? "";
}

/**
 * Estimate the syllable count of an English word.
 * Uses a vowel-group heuristic with silent-e adjustment; floors at 1.
 */
export function countSyllables(word: string): number {
  if (!word) return 0;
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // Remove silent trailing e.
  const trimmed = w.replace(/e$/, "");
  const groups = trimmed.match(/[aeiouy]+/g);
  const count = groups ? groups.length : 0;
  return Math.max(1, count);
}

/**
 * Flesch Reading Ease score (0-100, higher = easier to read).
 *
 *   206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 */
export function calculateReadability(text: string): number {
  if (!text) return 0;
  const clean = stripTags(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const score =
    206.835 -
    1.015 * (words.length / sentenceCount) -
    84.6 * (syllables / words.length);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute an overall 0-100 SEO score and actionable recommendations
 * from extracted on-page metadata. Pure function — no I/O.
 */
export function scoreAnalysis(
  meta: OnPageMeta,
  options: { readability?: number; brokenLinks?: number } = {},
): { score: number; recommendations: Recommendation[] } {
  const readability = options.readability ?? 0;
  const brokenLinks = options.brokenLinks ?? 0;
  const recommendations: Recommendation[] = [];
  let score = 0;

  // Title — 15 pts
  if (meta.title) {
    if (meta.title.length >= 30 && meta.title.length <= 60) {
      score += 15;
    } else {
      score += 8;
      recommendations.push({
        title: "Optimize title length",
        detail: `Title is ${meta.title.length} characters. Aim for 30-60 characters for best SERP display.`,
        severity: "warning",
      });
    }
  } else {
    recommendations.push({
      title: "Missing page title",
      detail: "Every page needs a unique, descriptive <title> tag.",
      severity: "critical",
    });
  }

  // Meta description — 15 pts
  if (meta.description) {
    if (meta.description.length >= 120 && meta.description.length <= 160) {
      score += 15;
    } else {
      score += 7;
      recommendations.push({
        title: "Improve meta description length",
        detail: `Description is ${meta.description.length} characters. Aim for 120-160 characters.`,
        severity: "warning",
      });
    }
  } else {
    recommendations.push({
      title: "Missing meta description",
      detail: "Add a compelling meta description to improve click-through rate.",
      severity: "critical",
    });
  }

  // H1 — 10 pts
  if (meta.h1.length === 1) {
    score += 10;
  } else if (meta.h1.length > 1) {
    score += 5;
    recommendations.push({
      title: "Multiple H1 tags",
      detail: `Found ${meta.h1.length} H1 tags. Use a single H1 per page.`,
      severity: "warning",
    });
  } else {
    recommendations.push({
      title: "Missing H1 heading",
      detail: "Add exactly one H1 that includes your primary keyword.",
      severity: "critical",
    });
  }

  // H2 structure — 10 pts
  if (meta.h2.length >= 1) {
    score += Math.min(10, meta.h2.length * 3);
  } else {
    recommendations.push({
      title: "No H2 subheadings",
      detail: "Use H2 headings to structure content and target related keywords.",
      severity: "warning",
    });
  }

  // Images alt text — 10 pts
  const imagesWithoutAlt = meta.images.filter(
    (img) => !img.alt || img.alt.trim() === "",
  ).length;
  if (meta.images.length === 0) {
    score += 10;
  } else {
    const ratio = 1 - imagesWithoutAlt / meta.images.length;
    score += Math.round(10 * ratio);
    if (imagesWithoutAlt > 0) {
      recommendations.push({
        title: "Images missing alt text",
        detail: `${imagesWithoutAlt} of ${meta.images.length} images have no alt attribute. Add descriptive alt text.`,
        severity: "warning",
      });
    }
  }

  // Word count — 15 pts (scales up to 600 words)
  if (meta.wordCount >= 600) {
    score += 15;
  } else if (meta.wordCount >= 300) {
    score += Math.round(15 * (meta.wordCount / 600));
  } else {
    recommendations.push({
      title: "Thin content",
      detail: `Only ${meta.wordCount} words detected. Aim for at least 300-600 words of valuable content.`,
      severity: "warning",
    });
  }

  // Readability — 10 pts
  if (readability >= 60) {
    score += 10;
  } else if (readability >= 40) {
    score += 6;
    recommendations.push({
      title: "Improve readability",
      detail: `Flesch score ${readability}. Use shorter sentences and simpler words.`,
      severity: "info",
    });
  } else if (readability > 0) {
    recommendations.push({
      title: "Content is hard to read",
      detail: `Flesch score ${readability}. Simplify sentence structure and vocabulary.`,
      severity: "warning",
    });
  }

  // Broken links — 5 pts
  if (brokenLinks === 0) {
    score += 5;
  } else {
    recommendations.push({
      title: "Broken links detected",
      detail: `${brokenLinks} broken link(s) found. Fix or remove them.`,
      severity: "warning",
    });
  }

  // Internal linking presence — 5 pts
  if (meta.links.length >= 1) {
    score += 5;
  } else {
    recommendations.push({
      title: "No internal links",
      detail: "Add internal links to related content to improve crawlability.",
      severity: "info",
    });
  }

  // Canonical — 5 pts
  if (meta.canonical) {
    score += 5;
  } else {
    recommendations.push({
      title: "Missing canonical tag",
      detail: "Add a canonical link to prevent duplicate-content issues.",
      severity: "info",
    });
  }

  // Sort: critical first, then warning, then info.
  const order = { critical: 0, warning: 1, info: 2 };
  recommendations.sort((a, b) => order[a.severity] - order[b.severity]);

  return { score: Math.max(0, Math.min(100, score)), recommendations };
}

/**
 * Fetch a URL and run a full on-page analysis.
 *
 * `fetcher` defaults to global `fetch` and is exposed for testing. Broken-link
 * detection is best-effort: we HEAD each unique same-origin link with a short
 * timeout. External links are not probed (to avoid abuse).
 */
export async function fetchAndAnalyze(
  url: string,
  options: { fetcher?: HtmlFetcher } = {},
): Promise<import("./types").AnalysisResult> {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const res = await fetcher(url);
  const html = await res.text();
  const meta = extractMeta(html);
  const readability = calculateReadability(html);

  // Best-effort broken-link check (same-origin only).
  let origin: string | null = null;
  try {
    origin = new URL(url).origin;
  } catch {
    origin = null;
  }

  let brokenLinks = 0;
  if (origin) {
    const sameOrigin = meta.links.filter((l) => l.href.startsWith(origin) || l.href.startsWith("/"));
    const checked = new Set<string>();
    for (const link of sameOrigin) {
      const target = link.href.startsWith("/") ? `${origin}${link.href}` : link.href;
      if (checked.has(target)) continue;
      checked.add(target);
      try {
        const head = await fetcher(target);
        if (!head.ok) {
          brokenLinks += 1;
          link.broken = true;
        }
      } catch {
        brokenLinks += 1;
        link.broken = true;
      }
    }
  }

  const { score, recommendations } = scoreAnalysis(meta, { readability, brokenLinks });
  const imagesWithoutAlt = meta.images.filter((i) => !i.alt || !i.alt.trim()).length;

  return {
    url,
    score,
    meta,
    readability,
    imagesWithoutAlt,
    brokenLinks,
    recommendations,
  };
}
