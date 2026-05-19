/**
 * Opportunity Pipeline — SQLite Storage
 * Manages sales pipeline opportunities with stages and forecasting
 */
import Database from "@/lib/sqlite-wrapper";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import { logActivity } from "@/lib/activities-db";
import {
  PIPELINE_STAGES,
  STAGE_PROBABILITY,
  type PipelineStage,
  type Opportunity,
  type PipelineKPIs,
} from "@/lib/pipeline-types";
import {
  createTasksForWonOpportunity,
  createTasksForProposalStage,
  shouldCreateProposalTasks,
  shouldCreateTasksForOpportunity,
  syncStageToTaskStatuses,
  calculateOpportunityProgress,
} from "@/lib/pipeline-kanban-bridge";
import { updateTask as updateKanbanTask } from "@/lib/kanban-db";

export type { PipelineStage, Opportunity, PipelineKPIs };
export { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, STAGE_PROBABILITY } from "@/lib/pipeline-types";

export interface CreateOpportunityInput {
  company: string;
  contact_name?: string;
  contact_email?: string;
  contact_linkedin?: string;
  title: string;
  description?: string;
  stage?: PipelineStage;
  value: number;
  currency?: string;
  service_type?: Opportunity["service_type"];
  probability?: number;
  source?: string;
  next_action?: string;
  next_action_date?: string;
  notes?: string;
}

export interface UpdateOpportunityInput {
  company?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_linkedin?: string | null;
  title?: string;
  description?: string | null;
  stage?: PipelineStage;
  value?: number;
  currency?: string;
  service_type?: Opportunity["service_type"];
  probability?: number | null;
  source?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  notes?: string | null;
  progress?: number;
}



const DB_PATH = process.env.NODE_ENV === "test"
  ? ":memory:"
  : path.join(process.cwd(), "data", "kanban.db");

let _db: Database | null = null;

function getDb(): Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initPipelineTable(_db);
  }
  return _db;
}

function initPipelineTable(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_linkedin TEXT,
      title TEXT NOT NULL,
      description TEXT,
      stage TEXT NOT NULL DEFAULT 'lead',
      value REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      service_type TEXT NOT NULL DEFAULT 'other',
      probability REAL,
      source TEXT,
      next_action TEXT,
      next_action_date TEXT,
      notes TEXT,
      progress REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT
    )
  `);

  // Idempotent migration: Add progress column if it doesn't exist
  const progressColumnExists = db
    .prepare("SELECT 1 FROM pragma_table_info('opportunities') WHERE name = 'progress'")
    .get() as { "1": number } | undefined;

  if (!progressColumnExists) {
    db.exec(`ALTER TABLE opportunities ADD COLUMN progress REAL NOT NULL DEFAULT 0`);
    console.log("[pipeline-db] Added progress column to opportunities");
  }
}

export function createOpportunity(input: CreateOpportunityInput): Opportunity {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const opp: Opportunity = {
    id,
    company: input.company,
    contact_name: input.contact_name || null,
    contact_email: input.contact_email || null,
    contact_linkedin: input.contact_linkedin || null,
    title: input.title,
    description: input.description || null,
    stage: input.stage || "lead",
    value: input.value,
    currency: input.currency || "EUR",
    service_type: input.service_type || "other",
    probability: input.probability ?? null,
    source: input.source || null,
    next_action: input.next_action || null,
    next_action_date: input.next_action_date || null,
    notes: input.notes || null,
    progress: 0,
    created_at: now,
    updated_at: now,
    closed_at: null,
  };

  db.prepare(`
    INSERT INTO opportunities (id, company, contact_name, contact_email, contact_linkedin, title, description, stage, value, currency, service_type, probability, source, next_action, next_action_date, notes, progress, created_at, updated_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    opp.id, opp.company, opp.contact_name, opp.contact_email, opp.contact_linkedin,
    opp.title, opp.description, opp.stage, opp.value, opp.currency, opp.service_type,
    opp.probability, opp.source, opp.next_action, opp.next_action_date, opp.notes, opp.progress,
    opp.created_at, opp.updated_at, opp.closed_at
  );

  logActivity("opportunity_created", `Nueva oportunidad: ${opp.company} — ${opp.title}`, "pipeline");
  return opp;
}

export function listOpportunities(): Opportunity[] {
  const db = getDb();
  return db.prepare("SELECT * FROM opportunities ORDER BY created_at DESC").all() as Opportunity[];
}

export function getOpportunity(id: string): Opportunity | null {
  const db = getDb();
  return db.prepare("SELECT * FROM opportunities WHERE id = ?").get(id) as Opportunity | null;
}

export function updateOpportunity(id: string, input: UpdateOpportunityInput): Opportunity | null {
  const db = getDb();
  const existing = getOpportunity(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(input)) {
    if (val !== undefined) {
      updates.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (updates.length === 0) return existing;

  // Store previous stage for Pipeline-Kanban bridge
  const previousStage = existing.stage;

  // Auto-set closed_at when stage changes to won/lost
  if (input.stage === "won" || input.stage === "lost") {
    updates.push("closed_at = ?");
    values.push(new Date().toISOString());
  } else if (input.stage) {
    updates.push("closed_at = NULL");
  }

  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE opportunities SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  // Log activity
  logActivity("opportunity_updated", `Oportunidad actualizada: ${existing.company} — ${existing.title}`, "pipeline");

  // Fetch updated opportunity
  const updated = getOpportunity(id);
  if (!updated) return null;

  // Pipeline-Kanban bridge: create tasks if opportunity enters proposal stage
  if (shouldCreateProposalTasks(updated, previousStage)) {
    const taskIds = createTasksForProposalStage(updated, previousStage);
    console.log(`[Pipeline-Kanban Bridge] Created ${taskIds.length} proposal tasks for: ${updated.company}`);

    const progress = calculateOpportunityProgress(updated);
    db.prepare('UPDATE opportunities SET progress = ? WHERE id = ?').run(progress, updated.id);
  }

  // Pipeline-Kanban bridge: create tasks if opportunity is won (only if no existing tasks)
  if (shouldCreateTasksForOpportunity(updated, previousStage)) {
    const taskIds = createTasksForWonOpportunity(updated, previousStage);
    console.log(`[Pipeline-Kanban Bridge] Created ${taskIds.length} tasks for won opportunity: ${updated.company}`);

    const progress = calculateOpportunityProgress(updated);
    db.prepare('UPDATE opportunities SET progress = ? WHERE id = ?').run(progress, updated.id);
  }

  // Pipeline-Kanban bridge: sync stage change to linked Kanban task statuses
  if (updated.stage !== previousStage) {
    const syncedCount = syncStageToTaskStatuses(updated, previousStage, updateKanbanTask);
    if (syncedCount > 0) {
      console.log(`[Pipeline-Kanban Bridge] Synced ${syncedCount} task statuses for stage change: ${previousStage} → ${updated.stage}`);
    }
  }

  return updated;
}

export function deleteOpportunity(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM opportunities WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Find an opportunity by company and title (case-insensitive, whitespace-trimmed).
 * Used for exact deduplication during report sync.
 */
export function findOpportunityByCompanyTitle(
  company: string,
  title: string
): Opportunity | null {
  const db = getDb();
  return (
    (db
      .prepare(
        "SELECT * FROM opportunities WHERE LOWER(TRIM(company)) = LOWER(TRIM(?)) AND LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1"
      )
      .get(company.trim(), title.trim()) as Opportunity | null) ?? null
  );
}

/**
 * Find an opportunity by company alone (case-insensitive, whitespace-trimmed).
 * Used for broad deduplication: same company = same deal, regardless of title.
 */
export function findOpportunityByCompany(company: string): Opportunity | null {
  const db = getDb();
  return (
    (db
      .prepare(
        "SELECT * FROM opportunities WHERE LOWER(TRIM(company)) = LOWER(TRIM(?)) LIMIT 1"
      )
      .get(company.trim()) as Opportunity | null) ?? null
  );
}

/**
 * Clear all pipeline data — ONLY for testing.
 * Resets the in-memory DB so tests start clean.
 */
export function clearAllPipelineDataForTesting(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("clearAllPipelineDataForTesting is only for tests");
  }
  // Reset the DB singleton so next getDb() creates a fresh in-memory DB
  _db = null;
}

export function getPipelineKPIs(): PipelineKPIs {
  const db = getDb();
  const opps = listOpportunities();

  const byStage = {} as PipelineKPIs["by_stage"];
  let totalPipelineValue = 0;
  let weightedPipelineValue = 0;
  let wonValue = 0;
  let lostValue = 0;
  let wonCount = 0;
  let lostCount = 0;

  for (const stage of PIPELINE_STAGES) {
    byStage[stage] = { count: 0, value: 0, weighted: 0 };
  }

  for (const opp of opps) {
    const prob = opp.probability ?? STAGE_PROBABILITY[opp.stage];
    byStage[opp.stage].count++;
    byStage[opp.stage].value += opp.value;
    byStage[opp.stage].weighted += opp.value * prob;

    if (opp.stage === "won") {
      wonValue += opp.value;
      wonCount++;
    } else if (opp.stage === "lost") {
      lostValue += opp.value;
      lostCount++;
    } else {
      totalPipelineValue += opp.value;
      weightedPipelineValue += opp.value * prob;
    }
  }

  const closedTotal = wonCount + lostCount;
  const winRate = closedTotal > 0 ? wonCount / closedTotal : 0;
  const avgDealSize = opps.length > 0 ? opps.reduce((s, o) => s + o.value, 0) / opps.length : 0;

  return {
    total_pipeline_value: totalPipelineValue,
    weighted_pipeline_value: weightedPipelineValue,
    won_value: wonValue,
    lost_value: lostValue,
    avg_deal_size: avgDealSize,
    win_rate: winRate,
    total_opportunities: opps.length,
    by_stage: byStage,
  };
}
