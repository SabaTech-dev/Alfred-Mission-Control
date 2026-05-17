/**
 * Pipeline-Kanban Bridge
 * Automatically creates Kanban tasks when opportunities are won
 * Dynamically calculates and persists opportunity progress based on associated Kanban tasks
 */

import { createTask, listTasks, type KanbanTask } from "@/lib/kanban-db";
import { logActivity } from "@/lib/activities-db";
import type { Opportunity } from "@/lib/pipeline-types";

export interface WonOpportunityTaskTemplate {
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "medium" | "high";
  labels?: Array<{ name: string; color: string }>;
}

// Import TaskPriority type from kanban-db
type TaskPriority = "low" | "medium" | "high";

// Task templates for each service type when opportunity is won
const TASK_TEMPLATES: Record<string, WonOpportunityTaskTemplate[]> = {
  // QA-Framework tasks
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

  // Security tasks
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

  // Orchestration tasks
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

  // Default tasks (other service types)
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

/**
 * Determine task templates based on service type
 */
function getTemplatesForServiceType(serviceType: Opportunity["service_type"]): WonOpportunityTaskTemplate[] {
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

/**
 * Create Kanban tasks when opportunity is won
 * @param opportunity - The opportunity that was won
 * @param previousStage - The previous stage (to verify it wasn't already "won")
 * @returns Array of created task IDs
 */
export function createTasksForWonOpportunity(
  opportunity: Opportunity,
  previousStage: string
): string[] {
  // Only create tasks if this is the first time moving to "won"
  if (previousStage === "won") {
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

  // Log activity
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
      },
    }
  );

  return createdTaskIds;
}

/**
 * Check if opportunity should trigger task creation
 */
export function shouldCreateTasksForOpportunity(
  opportunity: Opportunity,
  previousStage: string
): boolean {
  return opportunity.stage === "won" && previousStage !== "won";
}

/**
 * Calculate opportunity progress based on associated Kanban tasks
 * Progress is calculated as: (done tasks / total tasks) * 100
 * @param opportunity - The opportunity to calculate progress for
 * @returns Progress percentage (0-100)
 */
export function calculateOpportunityProgress(opportunity: Opportunity): number {
  // Only calculate progress for won opportunities
  if (opportunity.stage !== 'won') {
    return 0;
  }

  // Get all Kanban tasks
  const allTasks = listTasks({ view: 'all' });

  // Filter tasks associated with this opportunity (by company name in description)
  const oppTasks = allTasks.filter((task) =>
    task.description?.includes(`[Opportunity: ${opportunity.company}]`)
  );

  // No tasks associated → 0% progress
  if (oppTasks.length === 0) {
    return 0;
  }

  // Calculate progress: done tasks / total tasks
  const doneCount = oppTasks.filter((task) => task.status === 'done').length;
  const progress = Math.round((doneCount / oppTasks.length) * 100);

  return Math.max(0, Math.min(100, progress)); // Clamp between 0 and 100
}

/**
 * Update opportunity progress in database based on current Kanban tasks
 * This should be called after creating tasks or when task status changes
 * @param getOpportunityFn - Function to fetch opportunity by ID (from pipeline-db)
 * @param updateOpportunityFn - Function to update opportunity (from pipeline-db)
 * @param opportunityId - The opportunity ID to update
 * @returns Updated progress percentage
 */
export function updateOpportunityProgress(
  getOpportunityFn: (id: string) => Opportunity | null,
  updateOpportunityFn: (id: string, input: { progress: number }) => Opportunity | null,
  opportunityId: string
): number | null {
  const opp = getOpportunityFn(opportunityId);
  if (!opp) {
    return null;
  }

  const progress = calculateOpportunityProgress(opp);
  const updated = updateOpportunityFn(opportunityId, { progress });

  if (updated) {
    console.log(
      `[Pipeline-Kanban Bridge] Updated progress for opportunity ${opp.company}: ${progress}%`
    );
  }

  return progress;
}

/**
 * Extract opportunity company name from a Kanban task description
 * @param task - The Kanban task to parse
 * @returns Company name if task is associated with an opportunity, null otherwise
 */
export function extractOpportunityCompany(task: KanbanTask): string | null {
  const match = task.description?.match(/\[Opportunity: ([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Find all won opportunities associated with a company name
 * @param getOpportunitiesFn - Function to list all opportunities (from pipeline-db)
 * @param company - Company name to search for
 * @returns Array of won opportunities matching the company
 */
export function findWonOpportunitiesByCompany(
  getOpportunitiesFn: () => Opportunity[],
  company: string
): Opportunity[] {
  return getOpportunitiesFn().filter(
    (opp) => opp.company === company && opp.stage === 'won'
  );
}
