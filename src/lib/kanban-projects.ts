/**
 * Kanban Project CRUD Operations
 * Project management for Mission Control.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/kanban-db";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsFilters,
  ProjectStatus,
} from "@/lib/mission-types";

// ============================================================================
// Row Parser
// ============================================================================

function parseProjectRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    missionAlignment: row.mission_alignment as string | null,
    status: row.status as ProjectStatus,
    milestones: row.milestones ? JSON.parse(row.milestones as string) : [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================================================
// Project CRUD
// ============================================================================

/** Create a new project */
export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = input.status ?? "active";
  const milestones = input.milestones ?? [];

  db.prepare(`
    INSERT INTO projects (id, name, description, mission_alignment, status, milestones, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.description ?? null,
    input.missionAlignment ?? null,
    status,
    JSON.stringify(milestones),
    now,
    now
  );

  return {
    id,
    name: input.name,
    description: input.description ?? null,
    missionAlignment: input.missionAlignment ?? null,
    status: status as ProjectStatus,
    milestones,
    createdAt: now,
    updatedAt: now,
  };
}

/** Get a project by ID */
export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? parseProjectRow(row) : null;
}

/** Update a project */
export function updateProject(id: string, updates: UpdateProjectInput): Project | null {
  const db = getDb();
  const existing = getProject(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
  if (updates.missionAlignment !== undefined) { fields.push("mission_alignment = ?"); values.push(updates.missionAlignment); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.milestones !== undefined) { fields.push("milestones = ?"); values.push(JSON.stringify(updates.milestones)); }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return getProject(id);
}

/**
 * Delete a project
 * @returns Object with deleted status and count of orphaned tasks
 */
export function deleteProject(id: string): { deleted: boolean; orphanedTasks: number } {
  const db = getDb();

  const taskCount = (db.prepare("SELECT COUNT(*) as n FROM kanban_tasks WHERE project_id = ?").get(id) as { n: number }).n;

  // Orphan tasks (set project_id to NULL) - enforces ON DELETE SET NULL behavior
  if (taskCount > 0) {
    db.prepare("UPDATE kanban_tasks SET project_id = NULL WHERE project_id = ?").run(id);
  }

  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return { deleted: result.changes > 0, orphanedTasks: taskCount };
}

/** List projects with optional filters */
export function listProjects(filters?: ListProjectsFilters): Project[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM projects ${where} ORDER BY created_at DESC`).all(...params) as Record<string, unknown>[];

  return rows.map(parseProjectRow);
}
