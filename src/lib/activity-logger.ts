import {
  getActivities as getActivitiesFromDb,
  getActivityById,
  getActivityStats,
  logActivity as logActivityToDb,
  updateActivity,
  updateActivityStatus as updateActivityStatusInDb,
} from "@/lib/activities-db";

import type {
  Activity,
  ActivityStats,
  ActivityStatus,
  ActivityType,
  ActivitiesResult,
  GetActivitiesOptions,
} from "@/lib/activities-db";

export { getActivityById, getActivityStats, updateActivity };

export type {
  Activity,
  ActivityStats,
  ActivityStatus,
  ActivityType,
  ActivitiesResult,
  GetActivitiesOptions,
};

export const logActivity = logActivityToDb;

/**
 * Legacy compatibility wrapper used by older callers and tests.
 * Returns the activity array directly instead of the paginated result object.
 */
export function getActivities(): Activity[] {
  return getActivitiesFromDb({ limit: 1000, sort: "newest" }).activities;
}

/**
 * Legacy compatibility wrapper used by older callers and tests.
 * Returns the updated activity instead of void.
 */
export function updateActivityStatus(
  id: string,
  status: ActivityStatus,
  opts?: {
    duration_ms?: number;
    tokens_used?: number;
    metadata?: Record<string, unknown>;
  }
): Activity | null {
  const existing = getActivityById(id);
  if (!existing) {
    return null;
  }

  const hasMetrics = opts?.duration_ms !== undefined || opts?.tokens_used !== undefined;

  if (hasMetrics) {
    updateActivity(id, status, {
      duration_ms: opts?.duration_ms,
      tokens_used: opts?.tokens_used,
    });
  } else {
    updateActivityStatusInDb(id, status, opts?.metadata);
  }

  return getActivityById(id);
}