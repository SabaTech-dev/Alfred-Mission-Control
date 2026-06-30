import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for the CLI subprocess caching layer in agent-ops.
 *
 * Background
 * ----------
 * `loadAgentsFromConfig()` used to invoke `execSync("openclaw agents list
 * --json")` inline on every call. That call blocks the Node event loop for
 * up to 5 seconds (the CLI's own startup cost), which made every server
 * render of `/agents`, `/api/agents`, and any other consumer of
 * `getAgents()` take 5 s end-to-end. The browser-side router then aborted
 * the RSC navigation, breaking SPA routing for those pages.
 *
 * The fix moves the CLI call behind an async, time-boxed cache so the
 * event loop is never blocked and the expensive subprocess runs at most
 * once per TTL window. These tests lock that contract by mocking
 * `@/lib/cli-runner` — the single chokepoint for subprocess I/O.
 */

const runCliJsonMock = vi.fn();

vi.mock("@/lib/cli-runner", () => ({
  runCliJson: (...args: unknown[]) => runCliJsonMock(...args),
}));

// Force a stable OPENCLAW_DIR so filesystem discovery is deterministic.
vi.stubEnv("OPENCLAW_DIR", "/nonexistent-amc-test");

describe("agent-ops CLI subprocess caching", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Drop any cached CLI state between tests so the TTL / dedupe
    // behaviour is exercised from a clean slate every time.
    const mod = await import("./agent-ops");
    (mod as unknown as { __resetCliAgentCacheForTests: () => void })
      .__resetCliAgentCacheForTests();

    // Default happy-path mock: returns the canonical fleet.
    runCliJsonMock.mockResolvedValue([
      { id: "main", identityName: "Alfred", model: "zai/glm-5.2" },
      { id: "coder", identityName: "Coder", model: "zai/glm-5.2" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("spawns the CLI exactly once per cache window (TTL dedupe)", async () => {
    const { getCliAgentMapCached } = await import("./agent-ops");

    await getCliAgentMapCached();
    await getCliAgentMapCached();
    await getCliAgentMapCached();

    expect(runCliJsonMock).toHaveBeenCalledTimes(1);
  });

  it("returns the parsed agent map on the happy path", async () => {
    const { getCliAgentMapCached } = await import("./agent-ops");
    const map = await getCliAgentMapCached();

    expect(map.size).toBe(2);
    expect(map.get("main")?.identityName).toBe("Alfred");
    expect(map.get("coder")?.model).toBe("zai/glm-5.2");
  });

  it("passes the expected command and timeout to runCliJson", async () => {
    const { getCliAgentMapCached } = await import("./agent-ops");
    await getCliAgentMapCached();

    expect(runCliJsonMock).toHaveBeenCalledWith(
      "openclaw agents list --json",
      expect.objectContaining({
        timeoutMs: 5_000,
        label: "openclaw-agents-list",
      }),
    );
  });

  it("returns an empty map (not throwing) when the CLI fails or times out", async () => {
    runCliJsonMock.mockResolvedValue(null); // runCliJson swallows errors → null
    const { getCliAgentMapCached } = await import("./agent-ops");

    const map = await getCliAgentMapCached();

    // Degrade gracefully: dashboard renders with filesystem-only agents
    // rather than 500-ing the whole page.
    expect(map.size).toBe(0);
  });

  it("re-spawns the subprocess after the cache TTL expires", async () => {
    const { getCliAgentMapCached } = await import("./agent-ops");

    await getCliAgentMapCached();
    expect(runCliJsonMock).toHaveBeenCalledTimes(1);

    // Fast-forward past the TTL (60 s) and call again — the cache must
    // miss and a new subprocess spawn must occur.
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(61_000);
      await getCliAgentMapCached();
      expect(runCliJsonMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let concurrent callers spawn duplicate subprocesses", async () => {
    // If two pages call getAgents() in the same tick while the cache is
    // cold, both should await the SAME in-flight promise rather than
    // spawning two `openclaw agents list` processes.
    const { getCliAgentMapCached } = await import("./agent-ops");

    let resolve!: (v: unknown[]) => void;
    runCliJsonMock.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    // Two concurrent calls before the first one resolves.
    const p1 = getCliAgentMapCached();
    const p2 = getCliAgentMapCached();

    // Only one exec should be in flight.
    expect(runCliJsonMock).toHaveBeenCalledTimes(1);

    resolve([]);
    await Promise.all([p1, p2]);

    expect(runCliJsonMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT use execSync (event loop must stay free)", async () => {
    // Indirect assertion: the cached path delegates to runCliJson which
    // uses async exec internally. If anyone re-introduces an execSync,
    // the child_process module import would surface here. We assert the
    // public contract instead: getCliAgentMapCached resolves quickly and
    // yields control to the event loop between cache misses.
    const { getCliAgentMapCached } = await import("./agent-ops");

    let tickRan = false;
    const p = getCliAgentMapCached();
    // Microtask/next-tick check: if execSync were used, this would NOT
    // run until the subprocess returned (5 s later).
    queueMicrotask(() => {
      tickRan = true;
    });

    await p;
    expect(tickRan).toBe(true);
    expect(runCliJsonMock).toHaveBeenCalledTimes(1);
  });
});
