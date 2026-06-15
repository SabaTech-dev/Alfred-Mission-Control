/**
 * Webhooks Store — Outbound webhook management with SQLite persistence.
 *
 * Allows AMC to send HTTP POST notifications to external services
 * when events happen (activities, cron executions, errors, etc.)
 */
import Database from "@/lib/sqlite-wrapper";
import path from "path";
import fs from "fs";

export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];      // e.g. ["activity.created", "cron.failed", "agent.error"]
  secret: string;        // HMAC signing secret
  enabled: boolean;
  headers: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  lastTriggered?: string;
  lastStatus?: number;   // last HTTP response status
  deliveryCount: number;
  failureCount: number;
}

const DB_PATH =
  process.env.VITEST === "true" || process.env.NODE_ENV === "test"
    ? ":memory:"
    : path.join(process.cwd(), "data", "kanban.db");

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;
  const dbPath = path.dirname(DB_PATH);
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
  _db = new Database(DB_PATH);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT DEFAULT '[]',
      secret TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      headers TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      last_triggered TEXT,
      last_status INTEGER,
      delivery_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0
    )
  `);

  return _db;
}

function rowToWebhook(row: Record<string, unknown>): WebhookEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    events: JSON.parse((row.events as string) || "[]"),
    secret: (row.secret as string) || "",
    enabled: Boolean(row.enabled),
    headers: JSON.parse((row.headers as string) || "{}"),
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || undefined,
    lastTriggered: (row.last_triggered as string) || undefined,
    lastStatus: row.last_status != null ? (row.last_status as number) : undefined,
    deliveryCount: (row.delivery_count as number) || 0,
    failureCount: (row.failure_count as number) || 0,
  };
}

export const webhooksStore = {
  list(): WebhookEntry[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all();
    return rows.map(rowToWebhook);
  },

  findById(id: string): WebhookEntry | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
    return row ? rowToWebhook(row) : null;
  },

  findByEvent(event: string): WebhookEntry[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM webhooks WHERE enabled = 1").all();
    return rows
      .map(rowToWebhook)
      .filter((w) => w.events.includes(event) || w.events.includes("*"));
  },

  create(data: Omit<WebhookEntry, "id" | "deliveryCount" | "failureCount">): WebhookEntry {
    const db = getDb();
    const id = `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const webhook: WebhookEntry = {
      ...data,
      id,
      deliveryCount: 0,
      failureCount: 0,
    };

    db.prepare(`
      INSERT INTO webhooks (id, name, url, events, secret, enabled, headers, created_at, updated_at, last_triggered, last_status, delivery_count, failure_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.url,
      JSON.stringify(data.events),
      data.secret || "",
      data.enabled ? 1 : 0,
      JSON.stringify(data.headers || {}),
      data.createdAt,
      data.updatedAt || null,
      data.lastTriggered || null,
      data.lastStatus ?? null,
      0,
      0
    );

    return webhook;
  },

  update(id: string, data: Partial<WebhookEntry>): WebhookEntry | null {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const merged: WebhookEntry = { ...current, ...data, updatedAt: new Date().toISOString() };

    db.prepare(`
      UPDATE webhooks
      SET name = ?, url = ?, events = ?, secret = ?, enabled = ?, headers = ?,
          updated_at = ?, last_triggered = ?, last_status = ?,
          delivery_count = ?, failure_count = ?
      WHERE id = ?
    `).run(
      merged.name,
      merged.url,
      JSON.stringify(merged.events),
      merged.secret,
      merged.enabled ? 1 : 0,
      JSON.stringify(merged.headers),
      merged.updatedAt,
      merged.lastTriggered || null,
      merged.lastStatus ?? null,
      merged.deliveryCount,
      merged.failureCount,
      id
    );

    return merged;
  },

  remove(id: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
    return result.changes > 0;
  },

  async deliver(webhookId: string, event: string, payload: unknown): Promise<boolean> {
    const webhook = this.findById(webhookId);
    if (!webhook || !webhook.enabled) return false;

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    // HMAC signature for security
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", webhook.secret || "amc-webhook-secret")
      .update(body)
      .digest("hex");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-AMC-Event": event,
      "X-AMC-Signature": `sha256=${signature}`,
      ...webhook.headers,
    };

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      const success = response.ok;
      this.update(webhookId, {
        lastTriggered: new Date().toISOString(),
        lastStatus: response.status,
        deliveryCount: webhook.deliveryCount + 1,
        failureCount: success ? webhook.failureCount : webhook.failureCount + 1,
      });

      return success;
    } catch (err) {
      this.update(webhookId, {
        lastTriggered: new Date().toISOString(),
        lastStatus: 0,
        deliveryCount: webhook.deliveryCount + 1,
        failureCount: webhook.failureCount + 1,
      });
      return false;
    }
  },
};
