/**
 * In-memory mini-SQL engine for unit-testing DB-backed modules.
 *
 * Production code in this repo uses `better-sqlite3` (native binding).
 * The native binding cannot always be loaded in test environments
 * (Node ABI mismatch, jsdom, worker pools). This mock provides a
 * deterministic, dependency-free SQLite stand-in that understands the
 * small subset of SQL used by the pipeline/kanban modules.
 *
 * Supported:
 *   - CREATE TABLE [IF NOT EXISTS] (no-op, schema inferred from first INSERT)
 *   - ALTER TABLE ... ADD COLUMN (extends registered columns)
 *   - INSERT INTO t (cols) VALUES (?, ?, ...)
 *   - SELECT * FROM t [WHERE ...] [ORDER BY col DESC|ASC] [LIMIT n]
 *   - UPDATE t SET col = ?, ... WHERE ...
 *   - DELETE FROM t WHERE ...
 *   - PRAGMA ... (no-op, returns [])
 *   - SELECT 1 FROM pragma_table_info('t') WHERE name = ? (column existence)
 *
 * Limitations: only the SQL patterns emitted by the modules under test are
 * supported; arbitrary SQL will throw so misuse is detected loudly.
 */
type Row = Record<string, unknown>;

interface Prepared {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): Row | undefined;
  all(...params: unknown[]): Row[];
}

interface Table {
  columns: Set<string>;
  notNullColumns: Set<string>;
  rows: Row[];
}

interface PragmaTableInfoRow {
  name: string;
  type?: string;
}

class MockStatement implements Prepared {
  constructor(
    private readonly engine: SqliteMock,
    private readonly sql: string
  ) {}

  private exec(params: unknown[]): Row[] {
    return this.engine.runSql(this.sql, params);
  }

  run(...params: unknown[]) {
    const before = this.engine.lastMutationCount;
    const rows = this.exec(params);
    const changes = this.engine.lastMutationCount - before;
    return { changes, lastInsertRowid: this.engine.lastInsertRowid };
  }

  get(...params: unknown[]) {
    const rows = this.exec(params);
    return rows[0];
  }

  all(...params: unknown[]) {
    return this.exec([]);
  }
}

export class SqliteMock {
  private tables = new Map<string, Table>();
  /** Track mutations during the most recent runSql call. */
  public lastMutationCount = 0;
  public lastInsertRowid: number | bigint = 0;
  private totalMutations = 0;
  private nextRowid = 1;
  public isOpen = true;

  prepare(sql: string): Prepared {
    return new MockStatement(this, sql.trim().replace(/\s+/g, " "));
  }

  exec(sql: string): void {
    const trimmed = sql.trim().replace(/\s+/g, " ");
    // Split on ';' but ignore trailing empty statements.
    for (const stmt of trimmed.split(/;\s*(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/)) {
      const s = stmt.trim();
      if (!s) continue;
      this.runSql(s, []);
    }
  }

  pragma(_sql: string): unknown {
    // PRAGMAs (journal_mode, synchronous, busy_timeout) are no-ops here.
    return [];
  }

  close(): void {
    this.isOpen = false;
  }

  // -------------------------------------------------------------------
  // SQL interpreter
  // -------------------------------------------------------------------

  private getTable(name: string): Table {
    let t = this.tables.get(name);
    if (!t) {
      t = { columns: new Set<string>(), notNullColumns: new Set<string>(), rows: [] };
      this.tables.set(name, t);
    }
    return t;
  }

  /**
   * Execute one SQL statement and return the resulting rows (for SELECT),
   * or empty array for INSERT/UPDATE/DELETE.
   */
  runSql(sql: string, params: unknown[]): Row[] {
    const upper = sql.toUpperCase();

    if (upper.startsWith("CREATE TABLE")) {
      // Capture NOT NULL columns from the column definitions so the engine
      // can enforce the same constraint as real SQLite.
      const nameMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)/i);
      if (nameMatch) {
        const table = this.getTable(nameMatch[1]);
        // Walk column definitions: simple "name TYPE [NOT NULL] [DEFAULT ...]"
        const bodyMatch = sql.match(/\(([\s\S]*)\)\s*$/);
        if (bodyMatch) {
          const defs = this.splitOnTopLevelCommas(bodyMatch[1]);
          for (const def of defs) {
            const trimmed = def.trim();
            const colMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+/);
            if (!colMatch) continue;
            const colName = colMatch[1];
            table.columns.add(colName);
            if (/\bNOT\s+NULL\b/i.test(trimmed)) {
              table.notNullColumns.add(colName);
            }
          }
        }
      }
      return [];
    }

    if (upper.startsWith("ALTER TABLE")) {
      const m = sql.match(/ALTER\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+COLUMN\s+([A-Za-z_][A-Za-z0-9_]*)/i);
      if (m) this.getTable(m[1]).columns.add(m[2]);
      return [];
    }

    if (upper.startsWith("INSERT")) {
      return this.execInsert(sql, params);
    }

    if (upper.startsWith("SELECT")) {
      // Special-case: column existence probe via pragma_table_info
      if (upper.includes("PRAGMA_TABLE_INFO")) {
        return this.execPragmaTableInfo(sql, params);
      }
      return this.execSelect(sql, params);
    }

    if (upper.startsWith("UPDATE")) {
      return this.execUpdate(sql, params);
    }

    if (upper.startsWith("DELETE")) {
      return this.execDelete(sql, params);
    }

    throw new Error(`[SqliteMock] Unsupported statement: ${sql.slice(0, 80)}`);
  }

  private execInsert(sql: string, params: unknown[]): Row[] {
    const m = sql.match(
      /INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
    );
    if (!m) throw new Error(`[SqliteMock] Bad INSERT: ${sql.slice(0, 80)}`);
    const [, tableRaw, colsRaw] = m;
    const table = this.getTable(tableRaw);
    const cols = colsRaw.split(",").map((c) => c.trim());
    if (cols.length !== params.length) {
      throw new Error(
        `[SqliteMock] INSERT arity mismatch: ${cols.length} cols vs ${params.length} params`
      );
    }
    const row: Row = {};
    for (let i = 0; i < cols.length; i++) {
      row[cols[i]] = params[i];
      table.columns.add(cols[i]);
    }
    // Enforce NOT NULL constraints declared on the table.
    for (const notNullCol of table.notNullColumns) {
      if (row[notNullCol] === null || row[notNullCol] === undefined) {
        throw new Error(
          `[SqliteMock] NOT NULL constraint failed: ${tableRaw}.${notNullCol}`
        );
      }
    }
    table.rows.push(row);
    this.totalMutations++;
    this.lastMutationCount = this.totalMutations;
    this.nextRowid++;
    this.lastInsertRowid = this.nextRowid;
    return [];
  }

  private execSelect(sql: string, params: unknown[]): Row[] {
    const fromMatch = sql.match(/FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i);
    if (!fromMatch) return [];
    const table = this.getTable(fromMatch[1]);
    let rows = table.rows.slice();

    // WHERE clause — supports AND of simple predicates: col OP ? or fn(col) OP fn(?)
    const whereMatch = sql.match(/\bWHERE\b(.+?)(\bORDER\s+BY\b|\bLIMIT\b|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      rows = this.applyWhere(rows, whereClause, params);
    }

    // ORDER BY col DESC|ASC
    const orderMatch = sql.match(/\bORDER\s+BY\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(DESC|ASC))?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = (orderMatch[2] || "ASC").toUpperCase();
      rows.sort((a, b) => {
        const av = String(a[col] ?? "");
        const bv = String(b[col] ?? "");
        if (av < bv) return dir === "DESC" ? 1 : -1;
        if (av > bv) return dir === "DESC" ? -1 : 1;
        return 0;
      });
    }

    // LIMIT n
    const limitMatch = sql.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch) {
      rows = rows.slice(0, parseInt(limitMatch[1], 10));
    }

    return rows;
  }

  private execUpdate(sql: string, params: unknown[]): Row[] {
    const m = sql.match(/UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i);
    if (!m) throw new Error(`[SqliteMock] Bad UPDATE: ${sql.slice(0, 80)}`);
    const [, tableRaw, setClauseRaw, whereClauseRaw] = m;
    const table = this.getTable(tableRaw);

    // Split SET assignments on commas that are not inside parentheses.
    const assignments = this.splitOnTopLevelCommas(setClauseRaw);
    // Count bind params consumed by SET
    let setParamCount = 0;
    const setOps: Array<{ col: string; literal: unknown; isParam: boolean; paramIndex: number }> = [];
    for (const a of assignments) {
      const am = a.match(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!am) continue;
      const col = am[1];
      const valPart = am[2].trim();
      if (valPart === "?") {
        setOps.push({ col, literal: undefined, isParam: true, paramIndex: setParamCount });
        setParamCount++;
      } else if (/^NULL$/i.test(valPart)) {
        setOps.push({ col, literal: null, isParam: false, paramIndex: -1 });
      } else {
        setOps.push({ col, literal: valPart, isParam: false, paramIndex: -1 });
      }
      table.columns.add(col);
    }

    // The remaining params belong to WHERE
    const whereParams = params.slice(setParamCount);
    const matching = this.applyWhere(table.rows.slice(), whereClauseRaw, whereParams);

    const ids = new Set(matching.map((r) => r.id));
    for (const row of table.rows) {
      if (!ids.has(row.id)) continue;
      for (const op of setOps) {
        if (op.isParam) {
          row[op.col] = params[op.paramIndex];
        } else {
          row[op.col] = op.literal;
        }
      }
      this.totalMutations++;
    }
    this.lastMutationCount = this.totalMutations;
    return [];
  }

  private execDelete(sql: string, params: unknown[]): Row[] {
    const m = sql.match(/DELETE\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)\s+WHERE\s+(.+)$/i);
    if (!m) throw new Error(`[SqliteMock] Bad DELETE: ${sql.slice(0, 80)}`);
    const [, tableRaw, whereClauseRaw] = m;
    const table = this.getTable(tableRaw);
    const matching = this.applyWhere(table.rows.slice(), whereClauseRaw, params);
    const ids = new Set(matching.map((r) => r.id));
    const before = table.rows.length;
    table.rows = table.rows.filter((r) => !ids.has(r.id));
    this.totalMutations += before - table.rows.length;
    this.lastMutationCount = this.totalMutations;
    return [];
  }

  private execPragmaTableInfo(sql: string, params: unknown[]): Row[] {
    // Pattern: SELECT 1 FROM pragma_table_info('table') WHERE name = ?
    const tableMatch = sql.match(/pragma_table_info\(\s*'([^']+)'\s*\)/i);
    if (!tableMatch) return [];
    const table = this.tables.get(tableMatch[1]);
    if (!table) return [];
    const colName = String(params[0]);
    if (table.columns.has(colName)) {
      return [{ "1": 1, name: colName } as Row];
    }
    return [];
  }

  // -------------------------------------------------------------------
  // WHERE evaluator — supports AND of: col = ? | LOWER(TRIM(col)) = LOWER(TRIM(?)) | col IS NULL
  // -------------------------------------------------------------------

  private applyWhere(rows: Row[], whereClause: string, params: unknown[]): Row[] {
    const clauses = this.splitOnTopLevel(whereClause, /\s+AND\s+/i);
    let consumed = 0;
    return rows.filter((row) => {
      for (const clause of clauses) {
        const c = clause.trim();
        // LOWER(TRIM(col)) = LOWER(TRIM(?))
        let m = c.match(/LOWER\(TRIM\(([A-Za-z_][A-Za-z0-9_]*)\)\)\s*=\s*LOWER\(TRIM\(\?\)\)/i);
        if (m) {
          const colVal = String(row[m[1]] ?? "").trim().toLowerCase();
          const paramVal = String(params[consumed] ?? "").trim().toLowerCase();
          consumed++;
          if (colVal !== paramVal) return false;
          continue;
        }
        // col = ?
        m = c.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\?$/i);
        if (m) {
          if (String(row[m[1]] ?? "") !== String(params[consumed] ?? "")) {
            consumed++;
            return false;
          }
          consumed++;
          continue;
        }
        // col IS NULL
        m = c.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+IS\s+NULL$/i);
        if (m) {
          if (row[m[1]] !== null && row[m[1]] !== undefined) return false;
          continue;
        }
        // Anything else: ignore (fail open). Throw to surface new patterns.
        throw new Error(`[SqliteMock] Unsupported WHERE clause: "${c}"`);
      }
      return true;
    });
  }

  private splitOnTopLevel(input: string, separator: RegExp): string[] {
    return input.split(separator);
  }

  private splitOnTopLevelCommas(input: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let cur = "";
    let inStr: string | null = null;
    for (const ch of input) {
      if (inStr) {
        cur += ch;
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === "'" || ch === '"') {
        inStr = ch;
        cur += ch;
        continue;
      }
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
}

/**
 * Vitest mock factory for `@/lib/sqlite-wrapper`.
 *
 * Usage at the top of a test file:
 *
 *   vi.mock("@/lib/sqlite-wrapper", () => {
 *     const { SqliteMock } = require("./tests/helpers/sqlite-mock");
 *     return { Database: SqliteMock };
 *   });
 *
 * Each `new Database(path)` creates a fresh isolated mock instance so tests
 * never share state.
 */
export function createSqliteWrapperMock() {
  return {
    Database: SqliteMock,
    DatabaseConstructor: SqliteMock,
    default: SqliteMock,
    __esModule: true,
  };
}
