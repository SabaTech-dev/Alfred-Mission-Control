import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Regression guard for the Service Worker incident.
 *
 * A previously-shipped service worker intercepted every fetch (including
 * /api/*). On network failure it fell back to caches.match(), which resolved
 * to undefined and broke all API calls, and it cached navigations cache-first,
 * which made every sidebar link render the cached "/" page. The SW was removed
 * entirely; these tests keep it from sneaking back in.
 */
describe("service worker safety", () => {
  const repoRoot = process.cwd();
  const publicSw = path.join(repoRoot, "public", "sw.js");
  const srcRoot = path.join(repoRoot, "src");

  it("does not ship a public/sw.js service worker", () => {
    expect(fs.existsSync(publicSw)).toBe(false);
  });

  it("never registers a service worker from app code", () => {
    const offenders: string[] = [];
    const stack = [srcRoot];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
        const content = fs.readFileSync(full, "utf-8");
        // Allow unregistration / cleanup; forbid installation.
        if (/navigator\.serviceWorker\.register\s*\(/.test(content)) {
          offenders.push(full);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the self-heal (unregister) snippet in the root layout", () => {
    const layout = fs.readFileSync(
      path.join(srcRoot, "app", "layout.tsx"),
      "utf-8",
    );
    // The self-heal must unregister any pre-existing registration and wipe
    // CacheStorage so stale /api/* and RSC entries can't be re-served.
    expect(layout).toContain("getRegistrations");
    expect(layout).toContain("unregister");
    expect(layout).toContain("caches.delete");
  });
});
