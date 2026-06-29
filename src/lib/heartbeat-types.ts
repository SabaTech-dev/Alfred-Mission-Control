/**
 * Shared heartbeat types.
 *
 * Single source of truth for the AgentHeartbeat shape used by both the
 * API route (src/app/api/heartbeat/route.ts) and the frontend hook
 * (src/hooks/useHeartbeat.ts). Keeping them aligned here prevents the
 * identity-field drift that previously existed between the two definitions.
 */

export interface AgentIdentityLite {
  name: string;
  role: string;
  avatar: string | null;
}

export interface ActiveHours {
  start: string;
  end: string;
}

/**
 * Base heartbeat configuration for an agent (always present).
 */
export interface AgentHeartbeatBase {
  agentId: string;
  agentName: string;
  workspace: string;
  enabled: boolean;
  every: string;
  target: string;
  activeHours: ActiveHours | null;
  identity?: AgentIdentityLite | null;
}

/**
 * Rich runtime metrics attached to a heartbeat when usage/status data is
 * available. All fields are optional so the route can degrade gracefully
 * when the usage DB or status source is unavailable.
 */
export interface HeartbeatMetrics {
  /** Total tokens consumed across the agent's active sessions. */
  tokensUsed?: number;
  /** Model id of the most recent active session. */
  activeModel?: string | null;
  /** Whether the agent currently has an active session. */
  sessionActive?: boolean;
  /** ISO timestamp of the last known activity. */
  lastActivity?: string | null;
  /** Token totals over time, oldest first, used for the sparkline. */
  tokenHistory?: number[];
}

/**
 * Full agent heartbeat enriched with runtime metrics.
 */
export interface AgentHeartbeat extends AgentHeartbeatBase, HeartbeatMetrics {}
