import { describe, expect, it } from "vitest";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

/**
 * next@16 verifies the TypeScript toolchain by probing the file
 * `typescript/lib/typescript.js` (next/dist/lib/verify-typescript-setup.js ->
 * has-necessary-dependencies.js performs fs.existsSync on it).
 *
 * typescript@7 (Go-native port) no longer ships that file, so
 * scripts/fix-typescript-detection.sh creates a compatibility shim during
 * postinstall. Without it, `next build` treats typescript as missing and
 * tries to auto-install it, which fails with ERR_PNPM_ADDING_TO_ROOT under
 * pnpm workspaces (or throws directly in CI).
 *
 * This test guards that contract for both Docker and CI environments.
 */
describe("Next.js TypeScript detection contract", () => {
  const pkgJsonPath = nodeRequire.resolve("typescript/package.json");
  const pkgDir = path.dirname(realpathSync(pkgJsonPath));
  const probePath = path.join(pkgDir, "lib", "typescript.js");

  it("provides the lib/typescript.js file that next build probes", () => {
    expect(existsSync(probePath)).toBe(true);
  });

  it("shim is loadable and reports the installed TypeScript version", () => {
    const shim = nodeRequire(probePath) as { version: string };
    const installed = nodeRequire("typescript/package.json") as { version: string };
    expect(shim.version).toBe(installed.version);
  });
});
