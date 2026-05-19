"use client";

import { AgentActivity } from "@/lib/agent-utils";
import { formatRelativeTime } from "@/lib/agent-utils";

interface AgentActivityTabProps {
  activities: AgentActivity[];
}

export function AgentActivityTab({ activities }: AgentActivityTabProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
        No recent activity
      </div>
    );
  }

  return (
    <>
      {activities.map(activity => (
        <div
          key={activity.id}
          className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white">
                {activity.type}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {activity.description}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              activity.status === "success"
                ? "bg-success-soft text-success dark:bg-success-soft dark:text-success"
                : activity.status === "error"
                  ? "bg-error-soft text-error dark:bg-error-soft dark:text-error"
                  : "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
            }`}>
              {activity.status}
            </span>
          </div>
          <div className="text-xs text-neutral-400 mt-2">
            {formatRelativeTime(activity.timestamp)}
            {activity.duration && ` \u2022 ${activity.duration}ms`}
            {activity.tokens_used && ` \u2022 ${activity.tokens_used} tokens`}
          </div>
        </div>
      ))}
    </>
  );
}
