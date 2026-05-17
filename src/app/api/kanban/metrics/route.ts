/**
 * Kanban Metrics API
 *
 * GET /api/kanban/metrics
 *
 * Provides pipeline governance metrics including:
 * - Average time per status
 * - Stuck tasks (time in status > threshold)
 * - Throughput by specialist
 * - Cycle time by task type
 */

import { NextRequest, NextResponse } from "next/server";
import { listTasks } from "@/lib/kanban-db";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

interface MetricsResponse {
  summary: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    blockedTasks: number;
  };
  statusMetrics: {
    [status: string]: StatusMetric;
  };
  stuckTasks: StuckTask[];
  specialistMetrics: {
    [specialist: string]: SpecialistMetric;
  };
  cycleTime: {
    overall: number;
    byType: {
      [type: string]: number;
    };
  };
}

interface StatusMetric {
  count: number;
  avgTimeMs: number;
  avgTimeHuman: string;
  maxTimeMs: number;
  maxTimeHuman: string;
}

interface StuckTask {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  timeInStatusMs: number;
  timeInStatusHuman: string;
  thresholdMs: number;
  thresholdHuman: string;
}

interface SpecialistMetric {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  avgCompletionTimeMs: number;
  avgCompletionTimeHuman: string;
  throughputPerDay: number;
}

// Stuck task thresholds (in milliseconds)
const STUCK_THRESHOLDS: Record<string, number> = {
  backlog: 7 * 24 * 60 * 60 * 1000, // 7 days
  in_progress: 4 * 60 * 60 * 1000, // 4 hours
  review: 12 * 60 * 60 * 1000, // 12 hours
  blocked: 2 * 60 * 60 * 1000, // 2 hours
  waiting: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * GET /api/kanban/metrics
 * Returns comprehensive Kanban metrics
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAgentOrSessionAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Get all tasks
    const allTasks = listTasks();
    const now = Date.now();
    const cutoffDate = now - days * 24 * 60 * 60 * 1000;

    // Filter tasks by date range
    const tasks = allTasks.filter((task) => {
      const createdAt = new Date(task.created_at).getTime();
      return createdAt >= cutoffDate;
    });

    // Calculate summary
    const summary = {
      totalTasks: tasks.length,
      activeTasks: tasks.filter((t) => !["done", "archived"].includes(t.status)).length,
      completedTasks: tasks.filter((t) => t.status === "done" && !t.archived).length,
      blockedTasks: tasks.filter((t) => t.status === "blocked").length,
    };

    // Calculate status metrics
    const statusMetrics = calculateStatusMetrics(tasks, now);

    // Identify stuck tasks
    const stuckTasks = identifyStuckTasks(tasks, now);

    // Calculate specialist metrics
    const specialistMetrics = calculateSpecialistMetrics(tasks, now, days);

    // Calculate cycle time
    const cycleTime = calculateCycleTime(tasks);

    const response: MetricsResponse = {
      summary,
      statusMetrics,
      stuckTasks,
      specialistMetrics,
      cycleTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[metrics] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate metrics for each status
 */
function calculateStatusMetrics(
  tasks: any[],
  now: number
): Record<string, StatusMetric> {
  const metrics: Record<string, StatusMetric> = {};

  // Group tasks by status
  const tasksByStatus: Record<string, any[]> = {};
  for (const task of tasks) {
    if (!tasksByStatus[task.status]) {
      tasksByStatus[task.status] = [];
    }
    tasksByStatus[task.status].push(task);
  }

  // Calculate metrics for each status
  for (const [status, statusTasks] of Object.entries(tasksByStatus)) {
    const timesInStatus = statusTasks.map((task) => {
      const updated = new Date(task.updated_at).getTime();
      return now - updated;
    });

    const avgTimeMs =
      timesInStatus.reduce((sum, time) => sum + time, 0) / timesInStatus.length;
    const maxTimeMs = Math.max(...timesInStatus);

    metrics[status] = {
      count: statusTasks.length,
      avgTimeMs,
      avgTimeHuman: formatDuration(avgTimeMs),
      maxTimeMs,
      maxTimeHuman: formatDuration(maxTimeMs),
    };
  }

  return metrics;
}

/**
 * Identify tasks that have been in a status too long
 */
function identifyStuckTasks(tasks: any[], now: number): StuckTask[] {
  const stuckTasks: StuckTask[] = [];

  for (const task of tasks) {
    const threshold = STUCK_THRESHOLDS[task.status];
    if (!threshold) continue;

    const updated = new Date(task.updated_at).getTime();
    const timeInStatus = now - updated;

    if (timeInStatus > threshold) {
      stuckTasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
        assignee: task.assignee,
        timeInStatusMs: timeInStatus,
        timeInStatusHuman: formatDuration(timeInStatus),
        thresholdMs: threshold,
        thresholdHuman: formatDuration(threshold),
      });
    }
  }

  // Sort by time in status (longest first)
  stuckTasks.sort((a, b) => b.timeInStatusMs - a.timeInStatusMs);

  return stuckTasks;
}

/**
 * Calculate metrics for each specialist
 */
function calculateSpecialistMetrics(
  tasks: any[],
  now: number,
  days: number
): Record<string, SpecialistMetric> {
  const metrics: Record<string, SpecialistMetric> = {};

  // Group tasks by assignee
  const tasksByAssignee: Record<string, any[]> = {};
  for (const task of tasks) {
    const assignee = task.assignee || "unassigned";
    if (!tasksByAssignee[assignee]) {
      tasksByAssignee[assignee] = [];
    }
    tasksByAssignee[assignee].push(task);
  }

  // Calculate metrics for each specialist
  for (const [specialist, specialistTasks] of Object.entries(tasksByAssignee)) {
    const totalTasks = specialistTasks.length;
    const completedTasks = specialistTasks.filter((t) => t.status === "done").length;
    const inProgressTasks = specialistTasks.filter((t) => t.status === "in_progress").length;

    // Calculate average completion time
    const completedTaskTimes = specialistTasks
      .filter((t) => t.status === "done" && t.doneAt)
      .map((t) => {
        const created = new Date(t.created_at).getTime();
        const done = new Date(t.doneAt).getTime();
        return done - created;
      });

    const avgCompletionTimeMs =
      completedTaskTimes.length > 0
        ? completedTaskTimes.reduce((sum, time) => sum + time, 0) / completedTaskTimes.length
        : 0;

    // Calculate throughput (tasks completed per day)
    const throughputPerDay = days > 0 ? completedTasks / days : 0;

    metrics[specialist] = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      avgCompletionTimeMs,
      avgCompletionTimeHuman: formatDuration(avgCompletionTimeMs),
      throughputPerDay,
    };
  }

  return metrics;
}

/**
 * Calculate cycle time metrics
 */
function calculateCycleTime(tasks: any[]): {
  overall: number;
  byType: Record<string, number>;
} {
  const completedTasks = tasks.filter((t) => t.status === "done" && t.doneAt);

  const cycleTimes = completedTasks.map((task) => {
    const created = new Date(task.created_at).getTime();
    const done = new Date(task.doneAt).getTime();
    return done - created;
  });

  const overall =
    cycleTimes.length > 0
      ? cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length
      : 0;

  // Group by task type (using labels or priority)
  const byType: Record<string, number> = {};
  const tasksByType: Record<string, any[]> = {};

  for (const task of completedTasks) {
    // Use priority as type for now, could be enhanced to use labels
    const type = task.priority || "medium";
    if (!tasksByType[type]) {
      tasksByType[type] = [];
    }
    tasksByType[type].push(task);
  }

  for (const [type, typeTasks] of Object.entries(tasksByType)) {
    const typeCycleTimes = typeTasks.map((task) => {
      const created = new Date(task.created_at).getTime();
      const done = new Date(task.doneAt).getTime();
      return done - created;
    });

    byType[type] =
      typeCycleTimes.length > 0
        ? typeCycleTimes.reduce((sum, time) => sum + time, 0) / typeCycleTimes.length
        : 0;
  }

  return {
    overall,
    byType,
  };
}

/**
 * Format duration in milliseconds to human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
