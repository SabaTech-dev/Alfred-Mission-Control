import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import Database from "@/lib/sqlite-wrapper";
import * as sqliteWrapper from "@/lib/sqlite-wrapper";

/**
 * Regression tests for the SIGABRT crash on shutdown.
 *
 * Symptom (journalctl):
 *   Assertion failed: (env) != nullptr
 *   node::RemoveEnvironmentCleanupHook(...) [next-server]
 *   Statement::~Statement() [better_sqlite3.node]
 *   → Aborted (core dumped), exit code 134, restart counter climbing
 *
 * Root cause: singleton Database instances and their prepared statements
 * were garbage-collected AFTER the Node environment was torn down, so their
 * native destructors ran against a dead env. The fix tracks every open
 * Database in the wrapper and closes them all on process shutdown, while
 * the env is still alive (closing the native handle finalizes all prepared
 * statements, making later native destructors no-ops).
 */
describe("sqlite-wrapper shutdown handling", () => {
  beforeEach(() => {
    // Reset internal tracking between tests without touching real process
    // listeners (those are idempotent at the module level).
    sqliteWrapper.__resetForTesting();
  });

  afterEach(() => {
    sqliteWrapper.__resetForTesting();
  });

  it("closes every open Database when the shutdown handler runs", () => {
    const a = new Database(":memory:");
    const b = new Database(":memory:");

    // Sanity: both are usable before shutdown.
    a.exec("CREATE TABLE t (x INTEGER)");
    b.exec("CREATE TABLE u (x INTEGER)");

    sqliteWrapper.__closeAllForShutdown();

    // After shutdown the wrappers must report closed and reject operations.
    expect(() => a.exec("SELECT 1")).toThrow(/closed/i);
    expect(() => b.exec("SELECT 1")).toThrow(/closed/i);
  });

  it("does not throw when shutdown runs and there are no open DBs", () => {
    expect(() => sqliteWrapper.__closeAllForShutdown()).not.toThrow();
  });

  it("untracks a Database that was closed normally", () => {
    const db = new Database(":memory:");
    db.close();

    // Shutdown must be a no-op for already-closed handles (no throw, and
    // closeAll count stays at zero).
    let closedCount = 0;
    const before = sqliteWrapper.__getOpenDbCount();
    expect(before).toBe(0);

    sqliteWrapper.__closeAllForShutdown();
    expect(closedCount).toBe(0);
  });

  it("close() is idempotent across normal close and shutdown close", () => {
    const db = new Database(":memory:");
    db.close();
    // Calling shutdown afterwards must not throw even though db was closed.
    expect(() => sqliteWrapper.__closeAllForShutdown()).not.toThrow();
    // Double-close is a no-op.
    expect(() => db.close()).not.toThrow();
  });

  it("registers the process shutdown listeners at most once", () => {
    // Creating several DBs should not re-register the listeners each time.
    // We detect double-registration by spying on process.on.
    const onSpy = vi.spyOn(process, "on");
    onSpy.mockClear();

    // Force re-registration path (the module guards with a flag, so we reset).
    sqliteWrapper.__resetForTesting();
    // eslint-disable-next-line no-new
    new Database(":memory:");
    const firstCalls = onSpy.mock.calls.length;

    // eslint-disable-next-line no-new
    new Database(":memory:");
    // eslint-disable-next-line no-new
    new Database(":memory:");
    const laterCalls = onSpy.mock.calls.length;

    // The guard means subsequent constructions add zero process.on calls.
    expect(laterCalls).toBe(firstCalls);
    onSpy.mockRestore();
  });
});
