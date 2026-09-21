/**
 * Resolve the OpenClaw binary to invoke.
 * OPENCLAW_BIN env var wins; otherwise rely on PATH lookup ("openclaw").
 */
export const OPENCLAW_BIN = process.env.OPENCLAW_BIN ?? "openclaw";
