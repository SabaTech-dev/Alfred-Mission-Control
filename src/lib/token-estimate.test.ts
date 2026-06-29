import { describe, expect, it } from "vitest";

import { estimateTokens } from "./token-estimate";

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("approximates tokens as chars / 4 (rounded up)", () => {
    // 8 chars -> 2 tokens
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("rounds a partial token up", () => {
    // 5 chars -> 1.25 -> 2
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("handles a small token as 1", () => {
    expect(estimateTokens("hi")).toBe(1);
  });
});
