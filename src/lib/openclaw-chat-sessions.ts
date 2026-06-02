// Stub - OpenClaw chat sessions integration

export interface AgentSession {
  key: string;
  label?: string;
  model?: string;
  status?: string;
  updatedAt?: string;
}

export function listAgentSessions(agentId: string): AgentSession[] {
  return [];
}

export function resolveCanonicalSession(agentId: string): AgentSession | null {
  return null;
}

export function getAgentSessionsDir(): string {
  return "";
}

export function readAgentSessionStore(): Record<string, unknown> {
  return {};
}
