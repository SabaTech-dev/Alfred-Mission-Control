/**
 * Shared types for the SEO module.
 *
 * These types describe the contracts between the pure analysis logic in
 * `src/lib/seo/*` and the API routes that expose them, plus the dashboard UI
 * that consumes them. Keeping them centralized avoids drift between layers.
 */

/** Competition level for a keyword or content target. */
export type Competition = "low" | "medium" | "high";

/** Direction of a keyword's search interest trend. */
export type TrendDirection = "up" | "down" | "stable";

/** A single keyword suggestion with estimated metrics. */
export interface KeywordSuggestion {
  /** The suggested keyword/phrase. */
  keyword: string;
  /** Estimated monthly search volume (proxy-based). */
  volumeEstimate: number;
  /** Estimated competition level. */
  competition: Competition;
  /** Aggregated trend direction over the sampled window. */
  trend: TrendDirection;
}

/** On-page metadata extracted from a fetched HTML document. */
export interface OnPageMeta {
  /** Page <title> text. */
  title: string;
  /** Meta description content. */
  description: string;
  /** Canonical URL if present. */
  canonical: string;
  /** Headings, grouped by level. */
  h1: string[];
  h2: string[];
  h3: string[];
  /** All <img> elements found. */
  images: ImageInfo[];
  /** Anchor links found on the page. */
  links: LinkInfo[];
  /** Word count of visible body text. */
  wordCount: number;
}

export interface ImageInfo {
  src: string;
  alt: string;
}

export interface LinkInfo {
  href: string;
  text: string;
  /** Whether the link resolves (always false until verified). */
  broken: boolean;
}

/** A single scored recommendation produced by the analyzer. */
export interface Recommendation {
  /** Short label shown in the UI. */
  title: string;
  /** What to do about it. */
  detail: string;
  /** Severity drives color and priority ordering. */
  severity: "critical" | "warning" | "info";
}

/** Full on-page analysis result. */
export interface AnalysisResult {
  /** URL that was analyzed. */
  url: string;
  /** Overall 0-100 score. */
  score: number;
  /** Extracted metadata used to compute the score. */
  meta: OnPageMeta;
  /** Flesch reading-ease score (0-100, higher = easier). */
  readability: number;
  /** Count of images missing alt text. */
  imagesWithoutAlt: number;
  /** Count of links detected as broken. */
  brokenLinks: number;
  /** Actionable, ordered recommendations. */
  recommendations: Recommendation[];
}

/** Search intent classification. */
export type SearchIntent =
  | "informational"
  | "commercial"
  | "navigational"
  | "transactional";

/** A generated content idea. */
export interface ContentIdea {
  /** Suggested article/post title. */
  title: string;
  /** Primary keyword the idea targets. */
  keyword: string;
  /** Detected search intent. */
  intent: SearchIntent;
  /** Estimated ranking difficulty. */
  difficulty: Competition;
}
