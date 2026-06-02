/**
 * SQLite Wrapper for better-sqlite3 with WAL mode + concurrency safety.
 *
 * Replaces node-sqlite3-wasm which did NOT support WAL mode, causing
 * repeated database corruption under concurrent Next.js requests.
 *
 * Migration from node-sqlite3-wasm (2026-05-26):
 * - better-sqlite3 is native (C++ bindings), faster, supports WAL
 * - API is nearly identical: db.prepare().run/.get/.all/.finalize
 * - WAL mode enabled in kanban-db.ts via getDb()
 */
import DatabaseConstructor from 'better-sqlite3';
import type { Database as BetterSqliteDb } from 'better-sqlite3';

export { DatabaseConstructor };

export class Database {
  private db: BetterSqliteDb;
  private _isOpen: boolean = true;

  constructor(path: string, options?: { readonly?: boolean; fileMustExist?: boolean }) {
    const dbOptions: DatabaseConstructor.Options = {};
    if (options?.readonly) dbOptions.readonly = true;
    if (options?.fileMustExist) dbOptions.fileMustExist = true;
    this.db = new DatabaseConstructor(path, dbOptions);
  }

  exec(sql: string): void {
    this.ensureOpen();
    this.db.exec(sql);
  }

  pragma(sql: string): any {
    this.ensureOpen();
    try {
      if (sql.includes('=')) {
        const name = sql.split('=')[0].trim();
        this.db.exec('PRAGMA ' + sql);
        const stmt = this.db.prepare('PRAGMA ' + name);
        return stmt.get();
      }
      const stmt = this.db.prepare('PRAGMA ' + sql);
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

  transaction<T extends any[]>(fn: (...args: T) => any): (...args: T) => ReturnType<typeof fn> {
    return (...args: T) => {
      const transactionFn = this.db.transaction(fn);
      return transactionFn(...args);
    };
  }

  get(sql: string, ...params: any[]): any {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      return this.db.prepare(sql).get(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.prepare(sql).get(...args);
  }

  all(sql: string, ...params: any[]): any[] {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      return this.db.prepare(sql).all(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.prepare(sql).all(...args);
  }

  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number | bigint } {
    this.ensureOpen();
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      return this.db.prepare(sql).run(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.prepare(sql).run(...args);
  }

  close(): void {
    if (!this._isOpen) return;
    try { this.db.close(); } catch {}
    this._isOpen = false;
  }

  private ensureOpen() {
    if (!this._isOpen) throw new Error('Database is closed');
  }

  get rawDb(): BetterSqliteDb {
    return this.db;
  }
}

class PreparedStatement {
  private stmt: ReturnType<BetterSqliteDb['prepare']>;

  constructor(stmt: ReturnType<BetterSqliteDb['prepare']>) {
    this.stmt = stmt;
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint } {
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      return this.stmt.run(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.stmt.run(...args);
  }

  get(...params: any[]): any {
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      return this.stmt.get(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.stmt.get(...args);
  }

  all(...params: any[]): any[] {
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      return this.stmt.all(params[0]);
    }
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.stmt.all(...args);
  }

  finalize(): void {
    // better-sqlite3 doesn't require explicit finalize
  }
}

export default Database;
