/**
 * Kanban Agent Identity CRUD Operations
 * Agent personality, role, and mission management.
 */

import { getDb } from "@/lib/kanban-db";
import type {
  AgentIdentity,
  CreateAgentIdentityInput,
  UpdateAgentIdentityInput,
} from "@/lib/mission-types";

// ============================================================================
// Row Parser
// ============================================================================

function parseAgentIdentityRow(row: Record<string, unknown>): AgentIdentity {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    personality: row.personality as string | null,
    avatar: row.avatar as string | null,
    mission: row.mission as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================================================
// Agent Identity CRUD
// ============================================================================

/** Create a new agent identity */
export function createAgentIdentity(input: CreateAgentIdentityInput): AgentIdentity {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO agent_identities (id, name, role, personality, avatar, mission, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.name,
    input.role,
    input.personality ?? null,
    input.avatar ?? null,
    input.mission ?? null,
    now,
    now
  );

  return {
    id: input.id,
    name: input.name,
    role: input.role,
    personality: input.personality ?? null,
    avatar: input.avatar ?? null,
    mission: input.mission ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Get an agent identity by ID */
export function getAgentIdentity(id: string): AgentIdentity | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agent_identities WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? parseAgentIdentityRow(row) : null;
}

/** Update an agent identity */
export function updateAgentIdentity(id: string, updates: UpdateAgentIdentityInput): AgentIdentity | null {
  const db = getDb();
  const existing = getAgentIdentity(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.role !== undefined) { fields.push("role = ?"); values.push(updates.role); }
  if (updates.personality !== undefined) { fields.push("personality = ?"); values.push(updates.personality); }
  if (updates.avatar !== undefined) { fields.push("avatar = ?"); values.push(updates.avatar); }
  if (updates.mission !== undefined) { fields.push("mission = ?"); values.push(updates.mission); }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE agent_identities SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return getAgentIdentity(id);
}

/** Delete an agent identity */
export function deleteAgentIdentity(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM agent_identities WHERE id = ?").run(id);
  return result.changes > 0;
}

/** List all agent identities */
export function listAgentIdentities(): AgentIdentity[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM agent_identities ORDER BY created_at ASC").all() as Record<string, unknown>[];
  return rows.map(parseAgentIdentityRow);
}
