// Types for agent inspection

export interface AgentInfo {
  id: string;
  name: string;
  status: 'working' | 'idle' | 'error' | 'paused';
  model: string;
  currentTask?: string;
  lastActivity?: string;
  tokensUsed: number;
  sessionCount: number;
  uptime?: number;
}

export interface AgentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: string;
  duration?: number;
  tokens_used?: number;
}

export interface AgentLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  source?: string;
}

export interface AgentMetrics {
  totalActivities: number;
  successRate: number;
  avgResponseTime: number;
  tokensPerDay: number;
  errorsLast24h: number;
  topTasks: { task: string; count: number }[];
}

export interface AgentIdentity {
  id: string;
  name: string;
  role: string;
  personality: string | null;
  avatar: string | null;
  mission: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TabId = 'overview' | 'activity' | 'logs' | 'config' | 'identity' | 'metrics';

/** Tab configuration for the agent inspect panel */
export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'activity', label: 'Activity', icon: '⚡' },
  { id: 'logs', label: 'Logs', icon: '📝' },
  { id: 'config', label: 'Config', icon: '⚙️' },
  { id: 'identity', label: 'Identity', icon: '🎭' },
  { id: 'metrics', label: 'Metrics', icon: '📈' },
];

/**
 * Format a timestamp as a relative time string (e.g., "5m ago", "2h ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Get CSS classes for agent status badge
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'working': return 'text-success bg-success-soft dark:bg-success-soft';
    case 'idle': return 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800';
    case 'error': return 'text-error bg-error-soft dark:bg-error-soft';
    case 'paused': return 'text-warning bg-warning-soft dark:bg-warning-soft';
    default: return 'text-neutral-500 bg-neutral-100';
  }
}

/**
 * Get CSS classes for log level indicator
 */
export function getLogLevelColor(level: string): string {
  switch (level) {
    case 'error': return 'text-error';
    case 'warn': return 'text-warning';
    case 'devops': return 'text-blue-400';
    default: return 'text-neutral-600 dark:text-neutral-400';
  }
}
