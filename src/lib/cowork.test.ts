import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  STORAGE_KEY,
  loadLayout,
  saveLayout,
  DEFAULT_LAYOUT,
  type CoworkLayout,
} from "./cowork";

describe("cowork layout storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("exposes the documented localStorage key", () => {
    expect(STORAGE_KEY).toBe("amc_cowork_layout");
  });

  it("exposes a sensible default layout", () => {
    expect(DEFAULT_LAYOUT.panels).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_LAYOUT.panels).toBeLessThanOrEqual(4);
    expect(DEFAULT_LAYOUT.agents).toEqual([]);
  });

  it("loadLayout returns default when nothing is stored", () => {
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it("loadLayout gracefully ignores corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it("loadLayout ignores storage that is not a valid layout object", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ panels: "bad" }));
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it("saveLayout then loadLayout round-trips a layout", () => {
    const layout: CoworkLayout = { panels: 3, agents: ["dev", "qa", "docs"] };
    saveLayout(layout);

    const loaded = loadLayout();
    expect(loaded.panels).toBe(3);
    expect(loaded.agents).toEqual(["dev", "qa", "docs"]);
  });

  it("saveLayout clamps panel count into the 2-4 range", () => {
    saveLayout({ panels: 1, agents: [] });
    expect(loadLayout().panels).toBe(2);

    saveLayout({ panels: 99, agents: [] });
    expect(loadLayout().panels).toBe(4);
  });

  it("saveLayout trims the agent list to the panel count", () => {
    saveLayout({ panels: 2, agents: ["a", "b", "c", "d"] });
    expect(loadLayout().agents).toHaveLength(2);
  });
});
