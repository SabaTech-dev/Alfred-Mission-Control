/**
 * SQLite Wrapper for node-sqlite3-wasm with lock retry
 */
import { Database as WASMDatabase, SQLite3Error } from 'node-sqlite3-wasm';

export { SQLite3Error };

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 100;

function sleepMs(ms: number): void {
  // Use Atomics.wait for true sleep without CPU spin (sync context)
  const buf = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buf, 0, 0, ms);
}

function withRetry<T>(fn: () => T): T {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return fn();
    } catch (error: any) {
      const msg = error?.message || '';
      if ((msg.includes('locked') || msg.includes('busy')) && i < MAX_RETRIES - 1) {
        sleepMs(RETRY_DELAY_MS * (i + 1));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export class Database {
  private db: WASMDatabase;
  private _isOpen: boolean = true;
  private readonly stmts: Set<any> = new Set();

  constructor(path: string, options?: { readonly?: boolean; fileMustExist?: boolean }) {
    this.db = new WASMDatabase(path, options);
  }

  exec(sql: string): void {
    this.ensureOpen();
    withRetry(() => this.db.exec(sql));
  }

  pragma(sql: string): any {
    this.ensureOpen();
    try {
      if (sql.includes('=')) {
        const name = sql.split('=')[0].trim();
        withRetry(() => this.db.exec('PRAGMA ' + sql));
        return this._rawGet('PRAGMA ' + name);
      }
      return this._rawGet('PRAGMA ' + sql);
    } catch (error) { throw error; }
  }

  private _rawGet(sql: string): any {
    const stmt = this.db.prepare(sql);
    try { return stmt.get(); } finally { stmt.finalize(); }
  }

  prepare(sql: string): any {
    this.ensureOpen();
    const wasmStmt = withRetry(() => this.db.prepare(sql));
    const self = this;
    const wrapper = {
      run: function(...params: any[]) {
        if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          return withRetry(() => wasmStmt.run(params[0]));
        }
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return withRetry(() => wasmStmt.run(args));
      },
      get: function(...params: any[]) {
        if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          return withRetry(() => wasmStmt.get(params[0]));
        }
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return withRetry(() => wasmStmt.get(args));
      },
      all: function(...params: any[]) {
        if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          return withRetry(() => wasmStmt.all(params[0]));
        }
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return withRetry(() => wasmStmt.all(args));
      },
      finalize: () => { self.stmts.delete(wasmStmt); try { wasmStmt.finalize(); } catch {} },
    };
    this.stmts.add(wrapper);
    return wrapper;
  }

  transaction<T extends any[]>(fn: (...args: T) => any): (...args: T) => ReturnType<typeof fn> {
    return (...args: T) => {
      this.exec('BEGIN');
      try { const r = fn(...args); this.exec('COMMIT'); return r; }
      catch (e) { try { this.exec('ROLLBACK'); } catch {} throw e; }
    };
  }

  get(sql: string, ...params: any[]): any {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      const stmt = withRetry(() => this.db.prepare(sql));
      try { return withRetry(() => stmt.get(params[0])); } finally { stmt.finalize(); }
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = withRetry(() => this.db.prepare(sql));
    try { return withRetry(() => stmt.get(args)); } finally { stmt.finalize(); }
  }

  all(sql: string, ...params: any[]): any[] {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      const stmt = withRetry(() => this.db.prepare(sql));
      try { return withRetry(() => stmt.all(params[0])); } finally { stmt.finalize(); }
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = withRetry(() => this.db.prepare(sql));
    try { return withRetry(() => stmt.all(args)); } finally { stmt.finalize(); }
  }

  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number | bigint } {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      const stmt = withRetry(() => this.db.prepare(sql));
      try { return withRetry(() => stmt.run(params[0])); } finally { stmt.finalize(); }
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = withRetry(() => this.db.prepare(sql));
    try { return withRetry(() => stmt.run(args)); } finally { stmt.finalize(); }
  }

  close(): void {
    if (!this._isOpen) return;
    for (const s of this.stmts) { try { s.finalize(); } catch {} }
    this.stmts.clear();
    try { this.db.close(); } catch {}
    this._isOpen = false;
  }

  private ensureOpen() {
    if (!this._isOpen) throw new SQLite3Error('Database is closed');
  }
}

export default Database;
