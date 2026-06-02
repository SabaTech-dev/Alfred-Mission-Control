/**
 * Sessions list operations — stub
 * Real implementation requires OpenClaw chat-sessions integration
 */
export interface SessionInfo {
  id: string;
  label: string;
  agentId: string;
  kind: string;
  status: string;
  lastActivity: string;
}

export async function getSessionsList(): Promise<SessionInfo[]> {
  return [];
}
