/**
 * Ambient type declarations for Node's built-in `node:sqlite` module.
 *
 * The project currently ships `@types/node@20.x`, which predates `node:sqlite`
 * (stabilized in the Node 22.5+ / 24+ line). Rather than bump `@types/node`
 * project-wide (which is stricter and would surface unrelated type errors),
 * we declare just the surface area our `sqlite-wrapper` consumes.
 *
 * This mirrors the real `node:sqlite` API; if `@types/node` is later upgraded
 * to a version that ships `node:sqlite` typings, this file can be deleted.
 */
declare module "node:sqlite" {
  /** Options accepted by `new DatabaseSync(location, options)`. */
  export interface DatabaseSyncOptions {
    /** Open the database read-only. (node:sqlite key; we map `readonly` → this.) */
    readOnly?: boolean;
    /** Throw if the database file does not already exist. */
    fileMustExist?: boolean;
    /** Open the database in the constructor. Defaults to true. */
    open?: boolean;
    /** Whether foreign-key constraints are enabled. */
    enableForeignKeyConstraints?: boolean;
    /** Allow double-quoted string literals. */
    enableDoubleQuotedStringLiterals?: boolean;
    /** Whether the `loadExtension()` API is allowed. */
    allowExtension?: boolean;
  }

  /** Result of a write/insert operation. */
  export interface StatementResultingChanges {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  /** A prepared statement. Bind with positional args or a named-params object. */
  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    run(namedParameters: object): StatementResultingChanges;
    get(...params: unknown[]): unknown;
    get(namedParameters: object): unknown;
    all(...params: unknown[]): unknown[];
    all(namedParameters: object): unknown[];
    iterate(...params: unknown[]): Iterator<unknown>;
    iterate(namedParameters: object): Iterator<unknown>;
    setAllowBareNamedParameters(enabled: boolean): void;
    setReadBigInts(enabled: boolean): void;
    sourceURL(): string | null;
    expandedSQL(): string;
    reset(): void;
    finalize(): void;
  }

  /** A synchronous connection to a SQLite database. */
  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
    loadExtension(left: string): void;
    enableLoadExtension(enabled: boolean): void;
    applySqliteExtension(prefix: string, ...args: unknown[]): void;
    createFunction(name: string, cb: (...args: unknown[]) => unknown): void;
    createAggregate(name: string, options: object): void;
    createWindowFunction(name: string, options: object): void;
    open(): void;
    getSourceURL(sql: string): string | null;
  }
}
