"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { useState } from "react";

import {
  type TabId,
  TABS,
  formatRelativeTime,
  getStatusColor,
  getLogLevelColor,
} from "@/lib/agent-utils";
import { useAgentInspect } from "@/hooks/useAgentInspect";
import { AgentActivityTab } from "@/components/agent-inspect/AgentActivityTab";
import { AgentMetricsTab } from "@/components/agent-inspect/AgentMetricsTab";
import { AgentIdentityTab } from "@/components/agent-inspect/AgentIdentityTab";

interface AgentInspectPanelProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, agentId: string) => void;
}

export function AgentInspectPanel({ agentId, isOpen, onClose, onAction }: AgentInspectPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const {
    agent,
    activities,
    logs,
    metrics,
    config,
    identity,
    identityForm,
    setIdentityForm,
    isLoading,
    logFilter,
    setLogFilter,
    identitySaving,
    identitySaveSuccess,
    identityError,
    handleSaveIdentity,
  } = useAgentInspect(agentId, isOpen);

  const handleAction = (action: string) => {
    onAction?.(action, agentId);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col border-l border-neutral-200 dark:border-neutral-700"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {identity?.avatar ? (
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg overflow-hidden">
              {identity.avatar.startsWith("http") || identity.avatar.startsWith("/") ? (
                <Image src={identity.avatar} alt="Avatar" width={32} height={32} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span>{identity.avatar}</span>
              )}
            </div>
          ) : (
            <div className={`w-3 h-3 rounded-full ${
              agent?.status === "working" ? "bg-success animate-pulse" :
              agent?.status === "error" ? "bg-error" :
              agent?.status === "paused" ? "bg-warning" :
              "bg-neutral-400"
            }`} />
          )}
          <h2 className="font-semibold text-neutral-900 dark:text-white">
            {identity?.name || agent?.name || agentId}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Context menu */}
          <div className="relative group">
            <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleAction("pause")} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                <span>⏸️</span> Pause
              </button>
              <button onClick={() => handleAction("resume")} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                <span>▶️</span> Resume
              </button>
              <button onClick={() => handleAction("restart")} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                <span>🔄</span> Restart
              </button>
              <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
              <button onClick={() => handleAction("view_logs")} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                <span>📋</span> View Full Logs
              </button>
              <button onClick={() => handleAction("export")} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                <span>📤</span> Export Data
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-info text-info dark:text-info"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-info border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(agent?.status || "idle")}`}>
                      {agent?.status || "unknown"}
                    </span>
                  </div>
                  {agent?.currentTask && (
                    <div className="text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">Current task: </span>
                      <span className="text-neutral-900 dark:text-white">{agent.currentTask}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">{agent?.tokensUsed?.toLocaleString() || 0}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Tokens Used</div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">{agent?.sessionCount || 0}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Sessions</div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{agent?.model?.split("-")[0] || "N/A"}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Model</div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{agent?.uptime ? `${Math.floor(agent.uptime / 3600)}h` : "N/A"}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Uptime</div>
                  </div>
                </div>
                {agent?.lastActivity && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Last activity: {formatRelativeTime(agent.lastActivity)}
                  </div>
                )}
              </motion.div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                <AgentActivityTab activities={activities} />
              </motion.div>
            )}

            {/* Logs Tab */}
            {activeTab === "logs" && (
              <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                <div className="flex gap-2 mb-3">
                  {(["all", "info", "warn", "error"] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setLogFilter(level)}
                      className={`px-2 py-1 text-xs rounded ${
                        logFilter === level
                          ? "bg-info-soft text-info dark:bg-info-soft dark:text-info"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
                {logs.filter(l => logFilter === "all" || l.level === logFilter).length === 0 ? (
                  <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">No logs to display</div>
                ) : (
                  logs.filter(l => logFilter === "all" || l.level === logFilter).map(log => (
                    <div key={log.id} className="p-2 font-mono text-xs border-l-2 border-neutral-200 dark:border-neutral-700 pl-3">
                      <div className="flex items-center gap-2">
                        <span className={`uppercase font-medium ${getLogLevelColor(log.level)}`}>[{log.level}]</span>
                        <span className="text-neutral-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-neutral-700 dark:text-neutral-300 mt-1">{log.message}</div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Config Tab */}
            {activeTab === "config" && (
              <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {Object.entries(config).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{key}</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Identity Tab */}
            {activeTab === "identity" && (
              <motion.div key="identity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <AgentIdentityTab
                  agentId={agentId}
                  identityForm={identityForm}
                  setIdentityForm={setIdentityForm}
                  identitySaving={identitySaving}
                  identitySaveSuccess={identitySaveSuccess}
                  identityError={identityError}
                  handleSaveIdentity={handleSaveIdentity}
                />
              </motion.div>
            )}

            {/* Metrics Tab */}
            {activeTab === "metrics" && metrics && (
              <motion.div key="metrics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <AgentMetricsTab metrics={metrics} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer with actions */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("refresh")}
            className="flex-1 px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => handleAction("view_full")}
            className="flex-1 px-3 py-2 text-sm bg-info hover:bg-info text-white rounded-lg transition-colors"
          >
            Open Full View
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default AgentInspectPanel;
