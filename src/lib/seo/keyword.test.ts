import { describe, it, expect } from "vitest";

import {
  parseGoogleSuggest,
  estimateVolume,
  classifyCompetition,
  detectTrend,
  trendsRssToPoints,
} from "./keyword";

describe("parseGoogleSuggest", () => {
  it("parses a valid Google Suggest response", () => {
    const response = ["seed", ["seed keyword", "seed keyword tool", "seed keywords list"]];
    expect(parseGoogleSuggest(response)).toEqual([
      "seed keyword",
      "seed keyword tool",
      "seed keywords list",
    ]);
  });

  it("returns empty array for non-array input", () => {
    expect(parseGoogleSuggest(null)).toEqual([]);
    expect(parseGoogleSuggest(undefined)).toEqual([]);
    expect(parseGoogleSuggest({})).toEqual([]);
  });

  it("returns empty array when suggestions slot is missing", () => {
    expect(parseGoogleSuggest(["seed"])).toEqual([]);
  });

  it("ignores non-string entries in suggestions", () => {
    const response = ["seed", ["valid one", 42, null, "valid two"]];
    expect(parseGoogleSuggest(response)).toEqual(["valid one", "valid two"]);
  });

  it("deduplicates and trims suggestions", () => {
    const response = ["seed", ["  a  ", "a", "b"]];
    expect(parseGoogleSuggest(response)).toEqual(["a", "b"]);
  });

  it("caps the number of suggestions to 10", () => {
    const many = Array.from({ length: 25 }, (_, i) => `suggestion ${i}`);
    const result = parseGoogleSuggest(["seed", many]);
    expect(result).toHaveLength(10);
  });
});

describe("estimateVolume", () => {
  it("returns a positive integer for any keyword", () => {
    expect(estimateVolume("seo")).toBeGreaterThan(0);
    expect(Number.isInteger(estimateVolume("seo"))).toBe(true);
  });

  it("estimates higher volume for shorter head terms than long-tail", () => {
    const head = estimateVolume("seo");
    const longTail = estimateVolume("best free seo analysis tool for small blogs");
    expect(head).toBeGreaterThan(longTail);
  });

  it("scales up when trend points are high", () => {
    const low = estimateVolume("seo", [10, 12, 11, 13]);
    const high = estimateVolume("seo", [80, 85, 90, 88]);
    expect(high).toBeGreaterThan(low);
  });

  it("returns 0 for empty keyword", () => {
    expect(estimateVolume("")).toBe(0);
  });
});

describe("classifyCompetition", () => {
  it("classifies single short words as high competition", () => {
    expect(classifyCompetition("seo")).toBe("high");
    expect(classifyCompetition("marketing")).toBe("high");
  });

  it("classifies long-tail phrases as low competition", () => {
    expect(classifyCompetition("how to do keyword research for a brand new blog")).toBe("low");
  });

  it("classifies medium-length phrases as medium", () => {
    expect(classifyCompetition("keyword research tool")).toBe("medium");
  });

  it("treats commercial words as higher competition", () => {
    // A longer phrase that would normally be low but contains "buy"
    const phrase = "buy best enterprise seo platform software license";
    // Should not be "low" because of commercial intent
    expect(classifyCompetition(phrase)).not.toBe("low");
  });
});

describe("detectTrend", () => {
  it("returns 'up' when interest is rising", () => {
    expect(detectTrend([10, 12, 14, 18, 25, 40])).toBe("up");
  });

  it("returns 'down' when interest is falling", () => {
    expect(detectTrend([40, 35, 30, 20, 15, 10])).toBe("down");
  });

  it("returns 'stable' when interest is flat", () => {
    expect(detectTrend([20, 21, 20, 19, 20, 21])).toBe("stable");
  });

  it("returns 'stable' for empty or single-point series", () => {
    expect(detectTrend([])).toBe("stable");
    expect(detectTrend([50])).toBe("stable");
  });
});

describe("trendsRssToPoints", () => {
  it("extracts numeric values from a trends-like XML payload", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>2026-06-01 - 2026-06-30</title>
            <description>
              &lt;img src="..."&gt;&lt;table&gt;
              &lt;tr&gt;&lt;td&gt;2026-06-01&lt;/td&gt;&lt;td&gt;45&lt;/td&gt;&lt;/tr&gt;
              &lt;tr&gt;&lt;td&gt;2026-06-15&lt;/td&gt;&lt;td&gt;80&lt;/td&gt;&lt;/tr&gt;
              &lt;/table&gt;
            </description>
          &lt;/item&gt;
        &lt;/channel&gt;
      &lt;/rss&gt;
    `;
    const points = trendsRssToPoints(xml);
    expect(points).toEqual([45, 80]);
  });

  it("returns empty array when no numeric values found", () => {
    expect(trendsRssToPoints("no numbers here")).toEqual([]);
    expect(trendsRssToPoints("")).toEqual([]);
  });
});
