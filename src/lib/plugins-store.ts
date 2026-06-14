/**
 * Plugins Store — In-memory plugin registry with SQLite persistence
 *
 * Manages third-party plugin lifecycle: install, enable/disable, configure, remove.
 * Plugins are extensions that add functionality to AMC (integrations, UI widgets, etc.)
 */

import Database from "@/lib/sqlite-wrapper";
import path from "path";
import fs from "fs";

// ============================================================================
// Types
// ============================================================================

export interface PluginEntry {
  id: string;
  name: string;
  url: string | null;
  type: string; // "third-party" | "integration" | "ui-widget" | "mcp"
  status: string; // "installed" | "error" | "disabled"
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: string;
  updatedAt?: string;
}

// ============================================================================
// Database
// ============================================================================

const DB_PATH = process.env.VITEST === "true" || process.env.NODE_ENV === "test"
  ? ":memory:"
  : path.join(process.cwd(), "data", "kanban.db");

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;

  const dbPath = path.dirname(DB_PATH);
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // Create plugins table if not exists
  _db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      url TEXT,
      type TEXT DEFAULT 'third-party',
      status TEXT DEFAULT 'installed',
      enabled INTEGER DEFAULT 1,
      config TEXT DEFAULT '{}',
      installed_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  return _db;
}

// ============================================================================
// Store Operations
// ============================================================================

function rowToPlugin(row: Record<string, unknown>): PluginEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    url: (row.url as string) || null,
    type: (row.type as string) || "third-party",
    status: (row.status as string) || "installed",
    enabled: row.enabled === 1 || row.enabled === true,
    config: JSON.parse((row.config as string) || "{}"),
    installedAt: (row.installed_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || undefined,
  };
}

export const pluginsStore = {
  list(): PluginEntry[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM plugins ORDER BY installed_at DESC").all() as Record<string, unknown>[];
    return rows.map(rowToPlugin);
  },

  findById(id: string): PluginEntry | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM plugins WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? rowToPlugin(row) : null;
  },

  findByName(name: string): PluginEntry | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM plugins WHERE name = ?").get(name) as Record<string, unknown> | undefined;
    return row ? rowToPlugin(row) : null;
  },

  create(data: Omit<PluginEntry, "id">): PluginEntry {
    const db = getDb();
    const id = `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const plugin: PluginEntry = { ...data, id };

    db.prepare(`
      INSERT INTO plugins (id, name, url, type, status, enabled, config, installed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.url,
      data.type,
      data.status,
      data.enabled ? 1 : 0,
      JSON.stringify(data.config),
      data.installedAt,
      data.updatedAt || null
    );

    return plugin;
  },

  update(id: string, data: Partial<PluginEntry>): PluginEntry {
    const db = getDb();
    const current = this.findById(id);
    if (!current) throw new Error(`Plugin ${id} not found`);

    const merged: PluginEntry = { ...current, ...data };
    db.prepare(`
      UPDATE plugins
      SET name = ?, url = ?, type = ?, status = ?, enabled = ?, config = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.name,
      merged.url,
      merged.type,
      merged.status,
      merged.enabled ? 1 : 0,
      JSON.stringify(merged.config),
      merged.updatedAt || new Date().toISOString(),
      id
    );

    return merged;
  },

  remove(id: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM plugins WHERE id = ?").run(id);
    return result.changes > 0;
  },
};
