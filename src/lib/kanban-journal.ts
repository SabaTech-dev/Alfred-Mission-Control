/**
 * Kanban Operations Journal CRUD Operations
 * Daily narratives and highlights for Mission Control.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/kanban-db";
import type {
  OperationsJournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  ListJournalEntriesFilters,
} from "@/lib/mission-types";

// ============================================================================
// Row Parser
// ============================================================================

function parseJournalEntryRow(row: Record<string, unknown>): OperationsJournalEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    narrative: row.narrative as string,
    highlights: row.highlights ? JSON.parse(row.highlights as string) : [],
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// Journal CRUD
// ============================================================================

/** Create a new journal entry */
export function createJournalEntry(input: CreateJournalEntryInput): OperationsJournalEntry {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const highlights = input.highlights ?? [];

  db.prepare(`
    INSERT INTO operations_journal (id, date, narrative, highlights, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id,
    input.date,
    input.narrative,
    JSON.stringify(highlights),
    now
  );

  return {
    id,
    date: input.date,
    narrative: input.narrative,
    highlights,
    createdAt: now,
  };
}

/** Get a journal entry by ID */
export function getJournalEntry(id: string): OperationsJournalEntry | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM operations_journal WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? parseJournalEntryRow(row) : null;
}

/** Update a journal entry */
export function updateJournalEntry(id: string, updates: UpdateJournalEntryInput): OperationsJournalEntry | null {
  const db = getDb();
  const existing = getJournalEntry(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.narrative !== undefined) { fields.push("narrative = ?"); values.push(updates.narrative); }
  if (updates.highlights !== undefined) { fields.push("highlights = ?"); values.push(JSON.stringify(updates.highlights)); }

  if (fields.length === 0) return existing;

  values.push(id);

  db.prepare(`UPDATE operations_journal SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return getJournalEntry(id);
}

/** List journal entries with optional date range filter */
export function listJournalEntries(filters?: ListJournalEntriesFilters): OperationsJournalEntry[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.startDate) {
    conditions.push("date >= ?");
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    conditions.push("date <= ?");
    params.push(filters.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM operations_journal ${where} ORDER BY date DESC`).all(...params) as Record<string, unknown>[];

  return rows.map(parseJournalEntryRow);
}

/** Delete a journal entry */
export function deleteJournalEntry(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM operations_journal WHERE id = ?").run(id);
  return result.changes > 0;
}
