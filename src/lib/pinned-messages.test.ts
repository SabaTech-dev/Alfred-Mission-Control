import { describe, expect, it } from "vitest";

import { MAX_PINS, togglePin } from "./pinned-messages";

describe("pinned-messages", () => {
  it("enforces a maximum of 10 pinned messages", () => {
    expect(MAX_PINS).toBe(10);
  });

  it("adds an id when not present", () => {
    expect(togglePin([], "m1")).toEqual(["m1"]);
  });

  it("removes an id when already present", () => {
    expect(togglePin(["m1", "m2"], "m1")).toEqual(["m2"]);
  });

  it("never exceeds the maximum when adding beyond the cap", () => {
    // newest-first: index 0 is the most recently pinned, last is the oldest
    const full = Array.from({ length: MAX_PINS }, (_, i) => `m${i}`);
    // adding a new id should stay at MAX_PINS and evict the oldest (last)
    const next = togglePin(full, "new");
    expect(next).toHaveLength(MAX_PINS);
    expect(next).toContain("new");
    expect(next[0]).toBe("new"); // newest first
    expect(next).not.toContain("m9"); // oldest evicted
  });

  it("preserves order with newest first when within the cap", () => {
    expect(togglePin(["m2", "m1"], "m3")).toEqual(["m3", "m2", "m1"]);
  });
});
