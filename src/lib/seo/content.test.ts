import { describe, it, expect } from "vitest";

import {
  classifyIntent,
  estimateDifficulty,
  generateContentIdeas,
  parsePaa,
} from "./content";

describe("classifyIntent", () => {
  it("classifies navigational intent for brand queries", () => {
    expect(classifyIntent("login")).toBe("navigational");
    expect(classifyIntent("facebook login")).toBe("navigational");
    expect(classifyIntent("github dashboard")).toBe("navigational");
  });

  it("classifies transactional intent for purchase queries", () => {
    expect(classifyIntent("buy seo tool")).toBe("transactional");
    expect(classifyIntent("subscribe newsletter")).toBe("transactional");
    expect(classifyIntent("download free ebook")).toBe("transactional");
  });

  it("classifies commercial intent for comparison queries", () => {
    expect(classifyIntent("best seo tools")).toBe("commercial");
    expect(classifyIntent("ahrefs vs semrush")).toBe("commercial");
    expect(classifyIntent("top 10 marketing tools")).toBe("commercial");
  });

  it("classifies informational intent for question queries", () => {
    expect(classifyIntent("how to do keyword research")).toBe("informational");
    expect(classifyIntent("what is seo")).toBe("informational");
    expect(classifyIntent("guide to content marketing")).toBe("informational");
  });

  it("defaults to informational", () => {
    expect(classifyIntent("keyword research")).toBe("informational");
  });
});

describe("estimateDifficulty", () => {
  it("rates single head terms as high difficulty", () => {
    expect(estimateDifficulty("seo")).toBe("high");
  });

  it("rates long-tail queries as low difficulty", () => {
    expect(estimateDifficulty("how to do seo for a local bakery in madrid")).toBe("low");
  });

  it("rates medium-length queries as medium difficulty", () => {
    expect(estimateDifficulty("seo audit checklist")).toBe("medium");
  });
});

describe("generateContentIdeas", () => {
  it("generates exactly 10 ideas", () => {
    const ideas = generateContentIdeas("keyword research");
    expect(ideas).toHaveLength(10);
  });

  it("includes the seed keyword in titles", () => {
    const ideas = generateContentIdeas("keyword research");
    expect(ideas.every((i) => i.title.toLowerCase().includes("keyword research"))).toBe(true);
  });

  it("assigns an intent and difficulty to each idea", () => {
    const ideas = generateContentIdeas("content marketing");
    for (const idea of ideas) {
      expect(["informational", "commercial", "navigational", "transactional"]).toContain(idea.intent);
      expect(["low", "medium", "high"]).toContain(idea.difficulty);
      expect(idea.keyword).toBeTruthy();
    }
  });

  it("returns empty array for an empty seed", () => {
    expect(generateContentIdeas("")).toEqual([]);
  });

  it("incorporates provided PAA questions", () => {
    const paa = [
      "What is keyword research?",
      "How long does keyword research take?",
    ];
    const ideas = generateContentIdeas("keyword research", paa);
    const titles = ideas.map((i) => i.title.toLowerCase());
    // At least one title should reference a PAA question.
    expect(titles.some((t) => t.includes("what is keyword research"))).toBe(true);
  });
});

describe("parsePaa", () => {
  it("extracts question-like strings from Google-related HTML", () => {
    const html = `
      <div class="related-question-pair">
        <span>What is keyword research?</span>
      </div>
      <div class="related-question-pair">
        <span>How do I find keywords?</span>
      </div>
    `;
    const result = parsePaa(html);
    expect(result).toContain("What is keyword research?");
    expect(result).toContain("How do I find keywords?");
  });

  it("extracts from inline JS/JSON data blocks", () => {
    const html = `["What is SEO?","How does SEO work?","Is SEO free?"]`;
    const result = parsePaa(html);
    expect(result).toContain("What is SEO?");
    expect(result).toContain("How does SEO work?");
  });

  it("filters out non-question strings", () => {
    const html = `["not a question", "What is SEO?", "also not", "Why use SEO?"]`;
    const result = parsePaa(html);
    expect(result).toContain("What is SEO?");
    expect(result).toContain("Why use SEO?");
    expect(result).not.toContain("not a question");
  });

  it("returns empty array for empty input", () => {
    expect(parsePaa("")).toEqual([]);
  });
});
