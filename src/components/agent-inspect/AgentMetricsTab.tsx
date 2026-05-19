"use client";

import { AgentMetrics } from "@/lib/agent-utils";

interface AgentMetricsTabProps {
  metrics: AgentMetrics;
}

export function AgentMetricsTab({ metrics }: AgentMetricsTabProps) {
  return (
    <>
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics.successRate}%
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Success Rate</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics.avgResponseTime}s
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Avg Response</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics.tokensPerDay.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Tokens/Day</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
          <div className={`text-2xl font-bold ${metrics.errorsLast24h > 0 ? "text-error" : "text-success"}`}>
            {metrics.errorsLast24h}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Errors (24h)</div>
        </div>
      </div>

      {/* Top tasks */}
      {metrics.topTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Top Tasks
          </h3>
          <div className="space-y-2">
            {metrics.topTasks.map((task, i) => (
              <div key={task.task} className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-4">{i + 1}.</span>
                <div className="flex-1">
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-info rounded-full"
                      style={{ width: `${(task.count / metrics.topTasks[0].count) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 w-12 text-right">
                  {task.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
