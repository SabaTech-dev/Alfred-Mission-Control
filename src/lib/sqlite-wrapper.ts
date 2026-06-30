/**
 * SQLite Wrapper backed by Node's built-in `node:sqlite` (DatabaseSync).
 *
 * History
 * --------
 * This wrapper originally targeted `better-sqlite3`. On Node 26 + Next.js 16
 * that native addon crashed the process under load: its `Statement::~Statement()`
 * destructor called `node::RemoveEnvironmentCleanupHook` with `env == nullptr`
 * during garbage collection, producing a SIGABRT / core dump and a climbing
 * systemd restart counter.
 *
 * `node:sqlite` ships inside the Node binary itself, so there is no
 * third-party `.node` addon whose native destructors can race with
 * environment teardown — the crash class is eliminated at the root.
 *
 * The public surface (class `Database`, named params `@x`, positional params,
 * `db.prepare().run/.get/.all`, `db.transaction()`, `db.pragma()`,
 * `db.exec()`, `readonly`, `rawDb`) is preserved verbatim so every consumer
 * (activities-db, kanban-db, agent-config-store, plugins-store, webhooks-store,
 * per-request readers, and the test mock) keeps working unchanged.
 *
 * Process-shutdown safety: every open Database is tracked and closed on
 * `beforeExit`/`exit`/`SIGTERM`/`SIGINT` while the env is still alive. This
 * is defensive hygiene rather than a crash workaround (node:sqlite has no
 * env-cleanup-hook problem), but deterministic close keeps WAL/SHM files tidy.
 */
import { DatabaseSync } from "node:sqlite";

// `DatabaseConstructor` is exported for backwards compatibility with the
// old better-sqlite3 surface and the test mock factory
// (tests/helpers/sqlite-mock.ts overrides it entirely). Point it at the
// concrete node:sqlite class.
export { DatabaseSync as DatabaseConstructor };

// Track every live Database so we can finalize them before the Node env is
// torn down. Defensive: node:sqlite does not suffer the better-sqlite3
// destructor crash, but closing deterministically on shutdown keeps the
// on-disk WAL/SHM files clean and avoids "database is locked" on the next boot.
const _openDbs = new Set<Database>();
let _shutdownRegistered = false;

/**
 * Close every tracked Database. Idempotent and synchronous — safe to call
 * from `process.on('exit')` (which disallows async work).
 *
 * Exposed for tests and for explicit shutdown orchestration; in normal
 * operation it is wired to process events by `_registerShutdown`.
 */
export function __closeAllForShutdown(): void {
  for (const db of _openDbs) {
    try {
      db.close();
    } catch {
      // Ignore — closing is best-effort during teardown.
    }
  }
  _openDbs.clear();
}

/**
 * Register the process shutdown listeners. Guarded so it runs at most once
 * per process, regardless of how many Database instances are created.
 */
function _registerShutdown(): void {
  if (_shutdownRegistered) return;
  _shutdownRegistered = true;

  // `beforeExit` fires when the event loop drains naturally; `exit` fires on
  // process.exit(). Both run synchronously while the env is alive.
  process.on("beforeExit", __closeAllForShutdown);
  process.on("exit", __closeAllForShutdown);

  // systemd sends SIGTERM on stop/restart; SIGINT covers Ctrl+C. The default
  // behavior for these signals terminates the process WITHOUT firing `exit`,
  // so we close DBs explicitly and then exit, which triggers `exit` too.
  const signalClose = () => {
    __closeAllForShutdown();
    // Guard against calling exit() during tests / worker threads where it
    // would tear down the test runner.
    if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") return;
    process.exit(0);
  };
  process.on("SIGTERM", signalClose);
  process.on("SIGINT", signalClose);
}

export class Database {
  private db: DatabaseSync;
  private _isOpen: boolean = true;

  constructor(path: string, options?: { readonly?: boolean; fileMustExist?: boolean }) {
    // Map the better-sqlite3 option name (`readonly`) to node:sqlite's (`readOnly`).
    const dbOptions: { readOnly?: boolean; fileMustExist?: boolean } = {};
    if (options?.readonly) dbOptions.readOnly = true;
    if (options?.fileMustExist) dbOptions.fileMustExist = true;
    this.db = new DatabaseSync(path, dbOptions);

    // Register this handle so it gets closed before env teardown.
    _registerShutdown();
    _openDbs.add(this);
  }

  exec(sql: string): void {
    this.ensureOpen();
    this.db.exec(sql);
  }

  pragma(sql: string): any {
    this.ensureOpen();
    // Assignment form ("journal_mode = WAL") sets then reads back the value;
    // bare form ("journal_mode") just reads it. node:sqlite exposes PRAGMAs
    // through the same exec/prepare path as any other statement.
    try {
      if (sql.includes("=")) {
        const name = sql.split("=")[0].trim();
        this.db.exec("PRAGMA " + sql);
        const stmt = this.db.prepare("PRAGMA " + name);
        return stmt.get();
      }
      const stmt = this.db.prepare("PRAGMA " + sql);
      return stmt.get();
    } catch (error) {
      throw error;
    }
  }

  prepare(sql: string): PreparedStatement {
    this.ensureOpen();
    const stmt = this.db.prepare(sql);
    return new PreparedStatement(stmt);
  }

  /**
   * Wrap `fn` in a BEGIN/COMMIT/ROLLBACK transaction. node:sqlite does not
   * ship a transaction helper like better-sqlite3's `db.transaction()`, so we
   * implement it directly. Synchronous + single-threaded, matching the
   * previous semantics; throws from `fn` propagate after a safe ROLLBACK.
   */
  transaction<T extends any[]>(fn: (...args: T) => any): (...args: T) => ReturnType<typeof fn> {
    return (...args: T) => {
      this.ensureOpen();
      this.db.exec("BEGIN");
      let committed = false;
      try {
        const result = fn(...args);
        this.db.exec("COMMIT");
        committed = true;
        return result;
      } finally {
        if (!committed) {
          try { this.db.exec("ROLLBACK"); } catch { /* best-effort */ }
        }
      }
    };
  }

  get(sql: string, ...params: any[]): any {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return this.db.prepare(sql).get(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.prepare(sql).get(...args);
  }

  all(sql: string, ...params: any[]): any[] {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return this.db.prepare(sql).all(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.prepare(sql).all(...args);
  }

  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number | bigint } {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return this.db.prepare(sql).run(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.prepare(sql).run(...args);
  }

  close(): void {
    // Always stop tracking, even if already closed (idempotent).
    _openDbs.delete(this);
    if (!this._isOpen) return;
    try { this.db.close(); } catch {}
    this._isOpen = false;
  }

  private ensureOpen() {
    if (!this._isOpen) throw new Error("Database is closed");
  }

  get rawDb(): DatabaseSync {
    return this.db;
  }
}

class PreparedStatement {
  private stmt: ReturnType<DatabaseSync["prepare"]>;

  constructor(stmt: ReturnType<DatabaseSync["prepare"]>) {
    this.stmt = stmt;
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint } {
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return this.stmt.run(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.stmt.run(...args);
  }

  get(...params: any[]): any {
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return this.stmt.get(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.stmt.get(...args);
  }

  all(...params: any[]): any[] {
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return this.stmt.all(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.stmt.all(...args);
  }

  finalize(): void {
    // node:sqlite finalizes statements on GC / db.close(); no-op here for
    // API parity with the old better-sqlite3 wrapper.
  }
}

// ----------------------------------------------------------------------------
// Test-only helpers. The `__` prefix signals "not for application code".
// ----------------------------------------------------------------------------

/** Number of Database instances currently tracked as open. Tests only. */
export function __getOpenDbCount(): number {
  return _openDbs.size;
}

/**
 * Reset internal tracking for test isolation. Closes anything still open and
 * resets the shutdown-registration guard so the next construction re-registers
 * process listeners (needed to assert "registers at most once" deterministically).
 * Tests only.
 */
export function __resetForTesting(): void {
  __closeAllForShutdown();
  _shutdownRegistered = false;
}

export default Database;
