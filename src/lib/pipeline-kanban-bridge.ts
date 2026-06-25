/**
 * Pipeline-Kanban Bridge — Bidirectional Sync
 *
 * Capabilities:
 * 1. Auto-create Kanban tasks when opportunity moves to "proposal" stage
 * 2. Auto-create Kanban tasks when opportunity moves to "won" stage
 * 3. Stage-to-status mapping: opportunity stage changes update linked Kanban task statuses
 * 4. Reverse sync: when all proposal-stage tasks are done, advance opportunity to negotiation
 * 5. Progress calculation based on linked Kanban task completion
 */

import { createTask, listTasks, type KanbanTask } from "@/lib/kanban-db";
import { logActivity } from "@/lib/activities-db";
import type { Opportunity, PipelineStage } from "@/lib/pipeline-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskTemplate {
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "medium" | "high";
  labels?: Array<{ name: string; color: string }>;
}

// ---------------------------------------------------------------------------
// Stage ↔ Kanban status mapping
// ---------------------------------------------------------------------------

/** Map pipeline stages to the default Kanban task status for new tasks */
const STAGE_DEFAULT_STATUS: Partial<Record<PipelineStage, KanbanTask["status"]>> = {
  proposal: "todo",
  negotiation: "in_progress",
  won: "backlog",
};

/** Map pipeline stages to Kanban task status when stage changes forward */
const STAGE_STATUS_MAP: Record<PipelineStage, KanbanTask["status"]> = {
  lead: "backlog",
  contacted: "backlog",
  qualifying: "backlog",
  proposal: "todo",
  negotiation: "in_progress",
  won: "in_progress",
  lost: "backlog",
  done: "done",
};

/** Reverse map: when all tasks reach a status, advance opportunity stage */
const STAGE_ADVANCEMENT_MAP: Record<string, PipelineStage> = {
  proposal: "negotiation",
  negotiation: "won",
};

/** Active stages that participate in bidirectional sync */
const ACTIVE_STAGES: PipelineStage[] = ["proposal", "negotiation", "won"];

// ---------------------------------------------------------------------------
// Task templates per service type
// ---------------------------------------------------------------------------

const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  qa_framework: [
    {
      title: "Onboard client - QA Framework",
      description: "Initial onboarding call, setup access, gather requirements",
      assignee: "qa-tester",
      priority: "high",
      labels: [{ name: "onboarding", color: "#3b82f6" }],
    },
    {
      title: "Setup QA Framework for client",
      description: "Configure QA Framework according to client specifications",
      assignee: "coder",
      priority: "high",
      labels: [{ name: "setup", color: "#8b5cf6" }],
    },
    {
      title: "Training session - QA Framework",
      description: "Conduct training session for client team",
      assignee: "qa-tester",
      priority: "medium",
      labels: [{ name: "training", color: "#10b981" }],
    },
  ],

  security: [
    {
      title: "Conduct security audit",
      description: "Perform comprehensive security audit and vulnerability assessment",
      assignee: "security",
      priority: "high",
      labels: [{ name: "audit", color: "#ef4444" }],
    },
    {
      title: "Prepare security report",
      description: "Document findings, recommendations, and remediation plan",
      assignee: "security",
      priority: "high",
      labels: [{ name: "report", color: "#f59e0b" }],
    },
    {
      title: "Remediation support",
      description: "Assist client with security issue remediation",
      assignee: "security",
      priority: "high",
      labels: [{ name: "remediation", color: "#3b82f6" }],
    },
  ],

  orquestacion: [
    {
      title: "Design orchestration architecture",
      description: "Design multi-agent orchestration system for client needs",
      assignee: "coder",
      priority: "high",
      labels: [{ name: "design", color: "#8b5cf6" }],
    },
    {
      title: "Implement orchestration pipeline",
      description: "Build and deploy the orchestration pipeline",
      assignee: "coder",
      priority: "high",
      labels: [{ name: "implementation", color: "#10b981" }],
    },
    {
      title: "Testing & validation",
      description: "Test orchestration system and validate with client",
      assignee: "qa-tester",
      priority: "high",
      labels: [{ name: "testing", color: "#f59e0b" }],
    },
  ],

  default: [
    {
      title: "Initial client meeting",
      description: "Kickoff meeting with client to define scope and timeline",
      assignee: "coder",
      priority: "high",
      labels: [{ name: "onboarding", color: "#3b82f6" }],
    },
    {
      title: "Project setup",
      description: "Set up project infrastructure and tools",
      assignee: "coder",
      priority: "medium",
      labels: [{ name: "setup", color: "#8b5cf6" }],
    },
    {
      title: "Delivery",
      description: "Complete project deliverables and handover",
      assignee: "coder",
      priority: "high",
      labels: [{ name: "delivery", color: "#10b981" }],
    },
  ],
};

/** Proposal-stage templates — lighter, focused on proposal preparation */
const PROPOSAL_TASK_TEMPLATES: TaskTemplate[] = [
  {
    title: "Prepare proposal document",
    description: "Draft detailed proposal including scope, timeline, and pricing",
    assignee: "coder",
    priority: "high",
    labels: [{ name: "proposal", color: "#8b5cf6" }],
  },
  {
    title: "Technical feasibility review",
    description: "Assess technical requirements and feasibility",
    assignee: "coder",
    priority: "high",
    labels: [{ name: "review", color: "#3b82f6" }],
  },
  {
    title: "Schedule proposal presentation",
    description: "Coordinate meeting with client to present proposal",
    assignee: "coder",
    priority: "medium",
    labels: [{ name: "meeting", color: "#10b981" }],
  },
];

function getTemplatesForServiceType(
  serviceType: Opportunity["service_type"]
): TaskTemplate[] {
  if (serviceType?.startsWith("qa") || serviceType?.includes("framework")) {
    return TASK_TEMPLATES.qa_framework;
  }
  if (serviceType?.startsWith("security") || serviceType?.includes("audit")) {
    return TASK_TEMPLATES.security;
  }
  if (serviceType?.startsWith("orquestacion")) {
    return TASK_TEMPLATES.orquestacion;
  }
  return TASK_TEMPLATES.default;
}

// ---------------------------------------------------------------------------
// Helper: find linked tasks for an opportunity
// ---------------------------------------------------------------------------

function findLinkedTasks(company: string): KanbanTask[] {
  return listTasks({ view: "all" }).filter((task) =>
    task.description?.includes(`[Opportunity: ${company}]`)
  );
}

function hasExistingLinkedTasks(company: string): boolean {
  return findLinkedTasks(company).length > 0;
}

// ---------------------------------------------------------------------------
// 1. Proposal-stage task creation
// ---------------------------------------------------------------------------

/**
 * Auto-create Kanban tasks when opportunity enters "proposal" stage.
 * Uses lighter templates focused on proposal preparation.
 */
export function createTasksForProposalStage(
  opportunity: Opportunity,
  previousStage: string
): string[] {
  if (opportunity.stage !== "proposal" || previousStage === "proposal") {
    return [];
  }

  // Prevent duplicates — if tasks already exist for this company, skip
  if (hasExistingLinkedTasks(opportunity.company)) {
    console.log(
      `[Pipeline-Kanban Bridge] Skipping proposal tasks for ${opportunity.company}: linked tasks already exist`
    );
    return [];
  }

  const createdTaskIds: string[] = [];

  for (const template of PROPOSAL_TASK_TEMPLATES) {
    const description = `[Opportunity: ${opportunity.company}] ${template.description}`;
    const task = createTask({
      title: `${template.title} - ${opportunity.company}`,
      description,
      status: "todo",
      priority: template.priority,
      assignee: template.assignee,
      labels: template.labels,
      createdBy: "pipeline-automation",
    });
    createdTaskIds.push(task.id);
  }

  logActivity(
    "pipeline_proposal",
    `Propuesta iniciada: ${opportunity.company} — ${opportunity.title}. ${createdTaskIds.length} tareas creadas`,
    "info",
    {
      agent: "pipeline-automation",
      metadata: {
        opportunity_id: opportunity.id,
        company: opportunity.company,
        task_count: createdTaskIds.length,
        task_ids: createdTaskIds,
      } as Record<string, unknown>,
    }
  );

  return createdTaskIds;
}

/**
 * Check if opportunity should trigger proposal-stage task creation
 */
export function shouldCreateProposalTasks(
  opportunity: Opportunity,
  previousStage: string
): boolean {
  return opportunity.stage === "proposal" && previousStage !== "proposal";
}

// ---------------------------------------------------------------------------
// 2. Won-stage task creation (existing, preserved)
// ---------------------------------------------------------------------------

/**
 * Create Kanban tasks when opportunity is won.
 * Only fires if no tasks already exist for this opportunity.
 */
export function createTasksForWonOpportunity(
  opportunity: Opportunity,
  previousStage: string
): string[] {
  if (opportunity.stage !== "won" || previousStage === "won") {
    return [];
  }

  // If proposal-stage tasks already exist, don't create duplicates
  if (hasExistingLinkedTasks(opportunity.company)) {
    console.log(
      `[Pipeline-Kanban Bridge] Won stage: updating existing task statuses for ${opportunity.company} instead of creating new tasks`
    );
    return [];
  }

  const templates = getTemplatesForServiceType(opportunity.service_type);
  const createdTaskIds: string[] = [];

  for (const template of templates) {
    const description = `[Opportunity: ${opportunity.company}] ${template.description}`;
    const task = createTask({
      title: `${template.title} - ${opportunity.company}`,
      description,
      status: "backlog",
      priority: template.priority,
      assignee: template.assignee,
      labels: template.labels,
      createdBy: "pipeline-automation",
    });
    createdTaskIds.push(task.id);
  }

  logActivity(
    "pipeline_won",
    `Oportunidad ganada: ${opportunity.company} — ${opportunity.title}. ${createdTaskIds.length} tareas creadas en Kanban`,
    "success",
    {
      agent: "pipeline-automation",
      metadata: {
        opportunity_id: opportunity.id,
        company: opportunity.company,
        task_count: createdTaskIds.length,
        task_ids: createdTaskIds,
      } as Record<string, unknown>,
    }
  );

  return createdTaskIds;
}

/**
 * Check if opportunity should trigger won-stage task creation
 */
export function shouldCreateTasksForOpportunity(
  opportunity: Opportunity,
  previousStage: string
): boolean {
  return opportunity.stage === "won" && previousStage !== "won";
}

// ---------------------------------------------------------------------------
// 3. Stage-to-status sync (pipeline → kanban)
// ---------------------------------------------------------------------------

/**
 * When an opportunity changes stage, update the status of all linked Kanban tasks.
 * Uses STAGE_STATUS_MAP to determine the target status.
 *
 * @param opportunity - Updated opportunity
 * @param previousStage - Stage before the change
 * @param updateTaskFn - Function to update a Kanban task (injected to avoid circular deps)
 */
export function syncStageToTaskStatuses(
  opportunity: Opportunity,
  previousStage: string,
  updateTaskFn: (id: string, updates: { status: string }) => KanbanTask | null
): number {
  if (opportunity.stage === previousStage) return 0;
  if (!ACTIVE_STAGES.includes(opportunity.stage)) return 0;

  const targetStatus = STAGE_STATUS_MAP[opportunity.stage];
  if (!targetStatus) return 0;

  const linkedTasks = findLinkedTasks(opportunity.company);
  let updatedCount = 0;

  for (const task of linkedTasks) {
    // Don't touch tasks already done — they're completed
    if (task.status === "done") continue;
    if (task.status === targetStatus) continue;

    updateTaskFn(task.id, { status: targetStatus });
    updatedCount++;
  }

  if (updatedCount > 0) {
    console.log(
      `[Pipeline-Kanban Bridge] Stage ${previousStage}→${opportunity.stage}: updated ${updatedCount} task statuses to "${targetStatus}" for ${opportunity.company}`
    );
  }

  return updatedCount;
}

// ---------------------------------------------------------------------------
// 4. Reverse sync: Kanban → pipeline stage advancement
// ---------------------------------------------------------------------------

/**
 * Check if all linked tasks for an opportunity are done.
 * If so, and the opportunity is in a stage that can auto-advance, advance it.
 *
 * @param company - Company name to find linked opportunities
 * @param getOpportunitiesFn - List all opportunities
 * @param updateOpportunityFn - Update an opportunity
 * @returns Array of opportunities that were advanced
 */
export function checkStageAdvancement(
  company: string,
  getOpportunitiesFn: () => Opportunity[],
  updateOpportunityFn: (id: string, input: { stage: PipelineStage; progress: number }) => Opportunity | null
): Opportunity[] {
  const linkedTasks = findLinkedTasks(company);
  if (linkedTasks.length === 0) return [];

  const allDone = linkedTasks.every((t) => t.status === "done");
  if (!allDone) return [];

  // Find active opportunities for this company that can be advanced
  const opportunities = getOpportunitiesFn().filter(
    (opp) =>
      opp.company === company &&
      opp.stage in STAGE_ADVANCEMENT_MAP
  );

  const advanced: Opportunity[] = [];

  for (const opp of opportunities) {
    const nextStage = STAGE_ADVANCEMENT_MAP[opp.stage];
    if (!nextStage) continue;

    const updated = updateOpportunityFn(opp.id, { stage: nextStage, progress: 100 });
    if (updated) {
      advanced.push(updated);
      console.log(
        `[Pipeline-Kanban Bridge] Auto-advanced opportunity ${opp.company}: ${opp.stage} → ${nextStage} (all tasks done)`
      );
      logActivity(
        "pipeline_advanced",
        `Oportunidad auto-avanzada: ${opp.company} — ${opp.stage} → ${nextStage}`,
        "success",
        {
          agent: "pipeline-automation",
          metadata: {
            opportunity_id: opp.id,
            from_stage: opp.stage,
            to_stage: nextStage,
          } as Record<string, unknown>,
        }
      );
    }
  }

  return advanced;
}

// ---------------------------------------------------------------------------
// 5. Progress calculation (extended to proposal/negotiation stages)
// ---------------------------------------------------------------------------

/**
 * Calculate opportunity progress based on associated Kanban tasks.
 * Works for proposal, negotiation, and won stages.
 */
export function calculateOpportunityProgress(opportunity: Opportunity): number {
  if (!ACTIVE_STAGES.includes(opportunity.stage)) {
    return 0;
  }

  const oppTasks = findLinkedTasks(opportunity.company);
  if (oppTasks.length === 0) return 0;

  const doneCount = oppTasks.filter((t) => t.status === "done").length;
  const progress = Math.round((doneCount / oppTasks.length) * 100);

  return Math.max(0, Math.min(100, progress));
}

/**
 * Update opportunity progress in database based on current Kanban tasks
 */
export function updateOpportunityProgress(
  getOpportunityFn: (id: string) => Opportunity | null,
  updateOpportunityFn: (id: string, input: { progress: number }) => Opportunity | null,
  opportunityId: string
): number | null {
  const opp = getOpportunityFn(opportunityId);
  if (!opp) return null;

  const progress = calculateOpportunityProgress(opp);
  updateOpportunityFn(opportunityId, { progress });

  if (progress > 0) {
    console.log(
      `[Pipeline-Kanban Bridge] Updated progress for ${opp.company}: ${progress}%`
    );
  }

  return progress;
}

// ---------------------------------------------------------------------------
// 6. Utility functions
// ---------------------------------------------------------------------------

/**
 * Extract opportunity company name from a Kanban task description
 */
export function extractOpportunityCompany(task: KanbanTask): string | null {
  const match = task.description?.match(/\[Opportunity: ([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Find all active (proposal/negotiation/won) opportunities for a company
 */
export function findActiveOpportunitiesByCompany(
  getOpportunitiesFn: () => Opportunity[],
  company: string
): Opportunity[] {
  return getOpportunitiesFn().filter(
    (opp) => opp.company === company && ACTIVE_STAGES.includes(opp.stage)
  );
}

/**
 * Find all won opportunities for a company (kept for backward compat)
 */
export function findWonOpportunitiesByCompany(
  getOpportunitiesFn: () => Opportunity[],
  company: string
): Opportunity[] {
  return getOpportunitiesFn().filter(
    (opp) => opp.company === company && opp.stage === "won"
  );
}

// ---------------------------------------------------------------------------
// 7. Full sync — used by API route
// ---------------------------------------------------------------------------

export interface FullSyncResult {
  opportunities_checked: number;
  progress_updated: number;
  stages_advanced: number;
  tasks_matched: number;
  details: Array<{
    opportunityId: string;
    company: string;
    stage: string;
    tasks_total: number;
    tasks_done: number;
    progress: number;
    updated: boolean;
    advanced: boolean;
  }>;
}

/**
 * Full bidirectional sync:
 * 1. Recalculate progress for all active opportunities
 * 2. Check and advance stages where all tasks are done
 *
 * @param getOpportunitiesFn - List all opportunities
 * @param updateOpportunityFn - Update an opportunity
 * @returns Full sync result
 */
export function fullSync(
  getOpportunitiesFn: () => Opportunity[],
  updateOpportunityFn: (id: string, input: { stage?: PipelineStage; progress: number }) => Opportunity | null
): FullSyncResult {
  const result: FullSyncResult = {
    opportunities_checked: 0,
    progress_updated: 0,
    stages_advanced: 0,
    tasks_matched: 0,
    details: [],
  };

  const allOpportunities = getOpportunitiesFn();

  for (const opp of allOpportunities) {
    if (!ACTIVE_STAGES.includes(opp.stage)) continue;

    result.opportunities_checked++;

    const oppTasks = findLinkedTasks(opp.company);
    if (oppTasks.length === 0) continue;

    result.tasks_matched += oppTasks.length;
    const doneCount = oppTasks.filter((t) => t.status === "done").length;
    const progress = Math.round((doneCount / oppTasks.length) * 100);

    const allDone = doneCount === oppTasks.length;
    const nextStage = allDone ? STAGE_ADVANCEMENT_MAP[opp.stage] : undefined;

    const progressChanged = progress !== opp.progress;
    const stageChanged = !!nextStage;

    if (progressChanged || stageChanged) {
      const updateInput: { stage?: PipelineStage; progress: number } = {
        progress,
      };
      if (nextStage) {
        updateInput.stage = nextStage;
      }
      updateOpportunityFn(opp.id, updateInput);
      if (progressChanged) result.progress_updated++;
      if (stageChanged) result.stages_advanced++;
    }

    result.details.push({
      opportunityId: opp.id,
      company: opp.company,
      stage: opp.stage,
      tasks_total: oppTasks.length,
      tasks_done: doneCount,
      progress,
      updated: progressChanged,
      advanced: stageChanged,
    });
  }

  if (result.progress_updated > 0 || result.stages_advanced > 0) {
    logActivity(
      "pipeline_kanban_sync",
      `Full sync: ${result.progress_updated} progress updates, ${result.stages_advanced} stage advances`,
      "pipeline",
      {
        agent: "kanban-bridge",
        metadata: {
          checked: result.opportunities_checked,
          progressUpdated: result.progress_updated,
          advanced: result.stages_advanced,
          tasksMatched: result.tasks_matched,
        } as Record<string, unknown>,
      }
    );
  }

  return result;
}
