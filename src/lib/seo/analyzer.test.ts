import { describe, it, expect } from "vitest";

import {
  extractMeta,
  countSyllables,
  calculateReadability,
  scoreAnalysis,
  stripTags,
} from "./analyzer";

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Best SEO Tool for Small Businesses in 2026</title>
  <meta name="description" content="A complete guide to choosing the right SEO tool for your small business.">
  <link rel="canonical" href="https://example.com/seo-tools" />
</head>
<body>
  <h1>SEO Tools Guide</h1>
  <p>This is the intro paragraph with enough words to be meaningful for readers.</p>
  <h2>Top SEO Tools</h2>
  <p>Here we discuss the best tools available on the market today for search engine optimization.</p>
  <h2>How to Choose</h2>
  <h3>Pricing</h3>
  <img src="/img/a.png" alt="Dashboard screenshot" />
  <img src="/img/b.png" alt="" />
  <img src="/img/c.png" />
  <a href="https://example.com/home">Home</a>
  <a href="https://broken.example.com/x">Broken link</a>
  <a>Anchor without href</a>
</body>
</html>
`;

describe("stripTags", () => {
  it("removes HTML tags", () => {
    expect(stripTags("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("collapses whitespace", () => {
    expect(stripTags("<p>  Hello\n\n  world  </p>")).toBe("Hello world");
  });

  it("returns empty string for empty input", () => {
    expect(stripTags("")).toBe("");
  });
});

describe("extractMeta", () => {
  const meta = extractMeta(SAMPLE_HTML);

  it("extracts the title", () => {
    expect(meta.title).toBe("Best SEO Tool for Small Businesses in 2026");
  });

  it("extracts the meta description", () => {
    expect(meta.description).toBe(
      "A complete guide to choosing the right SEO tool for your small business.",
    );
  });

  it("extracts the canonical URL", () => {
    expect(meta.canonical).toBe("https://example.com/seo-tools");
  });

  it("counts H1 headings", () => {
    expect(meta.h1).toEqual(["SEO Tools Guide"]);
  });

  it("counts H2 headings", () => {
    expect(meta.h2).toHaveLength(2);
    expect(meta.h2[0]).toBe("Top SEO Tools");
  });

  it("captures H3 headings", () => {
    expect(meta.h3).toEqual(["Pricing"]);
  });

  it("extracts images with their alt text", () => {
    expect(meta.images).toHaveLength(3);
    expect(meta.images[0]).toEqual({ src: "/img/a.png", alt: "Dashboard screenshot" });
    expect(meta.images[1]).toEqual({ src: "/img/b.png", alt: "" });
    expect(meta.images[2]).toEqual({ src: "/img/c.png", alt: "" });
  });

  it("extracts links with href and text", () => {
    const withHref = meta.links.filter((l) => l.href);
    expect(withHref).toHaveLength(2);
    expect(withHref[0]).toEqual({
      href: "https://example.com/home",
      text: "Home",
      broken: false,
    });
  });

  it("computes a positive word count", () => {
    expect(meta.wordCount).toBeGreaterThan(20);
  });

  it("handles empty / malformed HTML gracefully", () => {
    const empty = extractMeta("");
    expect(empty.title).toBe("");
    expect(empty.description).toBe("");
    expect(empty.h1).toEqual([]);
    expect(empty.wordCount).toBe(0);
  });
});

describe("countSyllables", () => {
  it("counts simple words", () => {
    expect(countSyllables("the")).toBe(1);
    expect(countSyllables("seo")).toBe(1);
    expect(countSyllables("keyword")).toBe(2);
  });

  it("handles silent trailing e", () => {
    expect(countSyllables("guide")).toBe(1);
    expect(countSyllables("page")).toBe(1);
  });

  it("returns at least 1 for non-empty strings", () => {
    expect(countSyllables("a")).toBe(1);
    expect(countSyllables("rhythm")).toBe(1);
  });

  it("returns 0 for empty strings", () => {
    expect(countSyllables("")).toBe(0);
  });
});

describe("calculateReadability", () => {
  it("scores simple text highly", () => {
    const easy = "The cat sat on the mat. The dog ran fast. It was a good day.";
    expect(calculateReadability(easy)).toBeGreaterThan(60);
  });

  it("scores complex academic text lower", () => {
    const hard =
      "Notwithstanding the aforementioned methodological considerations, " +
      "the institutional framework demonstrates quantifiable operational efficacy.";
    expect(calculateReadability(hard)).toBeLessThan(50);
  });

  it("returns 0 for empty text", () => {
    expect(calculateReadability("")).toBe(0);
  });
});

describe("scoreAnalysis", () => {
  it("penalizes a missing title", () => {
    const result = scoreAnalysis({ ...extractMeta(SAMPLE_HTML), title: "" });
    expect(result.score).toBeLessThan(100);
    expect(result.recommendations.some((r) => r.title.toLowerCase().includes("title"))).toBe(true);
  });

  it("penalizes a short meta description", () => {
    const result = scoreAnalysis({
      ...extractMeta(SAMPLE_HTML),
      description: "short",
    });
    expect(result.recommendations.some((r) => r.severity === "warning")).toBe(true);
  });

  it("penalizes missing H1", () => {
    const result = scoreAnalysis({ ...extractMeta(SAMPLE_HTML), h1: [] });
    expect(result.recommendations.some((r) => /h1/i.test(r.title))).toBe(true);
  });

  it("penalizes images without alt text", () => {
    const result = scoreAnalysis(extractMeta(SAMPLE_HTML));
    expect(result.recommendations.some((r) => /alt/i.test(r.title))).toBe(true);
  });

  it("clamps the score within 0-100", () => {
    const minimal = scoreAnalysis(extractMeta(""));
    expect(minimal.score).toBeGreaterThanOrEqual(0);
    expect(minimal.score).toBeLessThanOrEqual(100);
  });

  it("produces a high score for a well-formed page", () => {
    // Generate enough substantive content (600+ words) so the page is not thin.
    const paragraph =
      "Write great content that helps your readers understand the topic deeply. " +
      "The cat sat on the mat. The dog ran fast. It was a good day for SEO work. " +
      "Search engines reward pages that answer questions clearly and completely.";
    const body = Array.from({ length: 8 }, () => `<p>${paragraph}</p>`).join("\n");
    const goodHtml = `
      <title>Great Page About SEO Best Practices And Tips</title>
      <meta name="description" content="Learn the best SEO practices, tips, and strategies to rank higher in search engines and grow your organic traffic month over month with proven methods.">
      <link rel="canonical" href="https://example.com/seo" />
      <body>
      <h1>SEO Best Practices</h1>
      <h2>On-Page SEO</h2>
      <img src="/a.png" alt="chart" />
      <img src="/b.png" alt="graph" />
      ${body}
      <a href="/related">Related guide</a>
      </body>
    `;
    const good = extractMeta(goodHtml);
    const readability = calculateReadability(goodHtml);
    const result = scoreAnalysis(good, { readability });
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});
