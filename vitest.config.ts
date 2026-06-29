import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";

// Force NODE_ENV=development BEFORE any imports that might load React.
// React 19's production build does not export act(), which breaks @testing-library/react.
process.env.NODE_ENV = "development";

/**
 * Fix React 19 act() under Vite 7 + Node 26.
 *
 * Problem: NODE_ENV=production (vitest default) → react/index.js loads
 * cjs/react.production.js which does NOT export act. This breaks
 * @testing-library/react which calls React.act().
 *
 * Fix 1: Patch react.react-server.js → redirect to browser build (index.js)
 * Fix 2: Remove "react-server" from react's package.json exports map
 *        so CJS require("react") resolves to the default (browser) build.
 * Fix 3: Set NODE_ENV=development below so react's dev build (with act) loads.
 */

// Fix 1: Patch react-server build to re-export from browser build
const reactServerPath = path.resolve(__dirname, "./node_modules/react/react.react-server.js");
const reactServerBackup = reactServerPath + ".vitest-bak";
if (existsSync(reactServerPath) && !existsSync(reactServerBackup)) {
  copyFileSync(reactServerPath, reactServerBackup);
  writeFileSync(
    reactServerPath,
    `"use strict";\n// Patched by vitest.config.ts for test compat\nmodule.exports = require("./index.js");\n`
  );
}

// Fix 2: Remove react-server condition from react's exports map
const reactPkgPath = path.resolve(__dirname, "./node_modules/react/package.json");
const reactPkgBackup = reactPkgPath + ".vitest-bak";
if (!existsSync(reactPkgBackup)) {
  const original = readFileSync(reactPkgPath, "utf-8");
  writeFileSync(reactPkgBackup, original);
  const pkg = JSON.parse(original);
  const exportsDot = pkg.exports?.["."];
  if (exportsDot && "react-server" in exportsDot) {
    delete (exportsDot as Record<string, string>)["react-server"];
    writeFileSync(reactPkgPath, JSON.stringify(pkg, null, 2));
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    // Fix 3: Force development mode so React's dev build (with act) is loaded
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://localhost",
      },
    },
    globals: true,
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**/*"],
    testTimeout: 30000,
    hookTimeout: 30000,
    deps: {
      inline: [/react/, /@testing-library/],
      fallbackCJS: true,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
    conditions: ["browser", "module", "jsdom"],
  },
});
