#!/bin/bash
# Fix Next.js 16 TypeScript detection with typescript@7 (native port) under pnpm.
#
# Root cause: `next build` verifies the TypeScript toolchain by probing the
# file `typescript/lib/typescript.js` (next/dist/lib/verify-typescript-setup.js
# -> has-necessary-dependencies.js performs fs.existsSync on that exact path).
# typescript@7 is the Go-native rewrite: its lib/ ships only tsc.js,
# version.cjs and getExePath.js — lib/typescript.js no longer exists.
# The failed probe makes Next treat typescript as missing and attempt an
# auto-install, which:
#   - in Docker/local builds: dies with ERR_PNPM_ADDING_TO_ROOT
#     (pnpm workspace root guard)
#   - in CI (isCI=true): throws missingDepsError -> `next build` exits 1
#
# Fix: create a tiny compatibility shim at the probed path. Build-time type
# checking stays disabled via typescript.ignoreBuildErrors (next.config.mjs),
# so the classic compiler API is never loaded; the shim re-exports the
# package version metadata as a safe loadable surface.
#
# Idempotent: skips when the file already exists (e.g. typescript@5 layout,
# which ships a real lib/typescript.js).

TS_LIB_DIR="node_modules/typescript/lib"
TS_SHIM="$TS_LIB_DIR/typescript.js"

if [ -d "$TS_LIB_DIR" ] && [ ! -f "$TS_SHIM" ]; then
  cat > "$TS_SHIM" <<'EOF'
// Compatibility shim for Next.js TypeScript detection.
// Created by scripts/fix-typescript-detection.sh — see root cause notes there.
// typescript@7 (native port) does not ship lib/typescript.js; next@16 probes
// this exact path to decide whether TypeScript is installed.
//
// The typescript@7 package.json declares "type": "module", so this file must
// use ESM syntax. Node >= 22 require(ESM) returns the module namespace, so
// consumers using require() still see `version` / `versionMajorMinor`.
// Build-time type checking is disabled (typescript.ignoreBuildErrors), so the
// classic compiler API is never required: re-export version metadata only.
import { version, versionMajorMinor } from "./version.cjs";

export { version, versionMajorMinor };
export default { version, versionMajorMinor };
EOF
  echo "[postinstall] Created $TS_SHIM (next@16 + typescript@7 detection compat)"
fi
