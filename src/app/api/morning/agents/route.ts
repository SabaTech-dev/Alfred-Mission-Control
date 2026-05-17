import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: 'active' | 'inactive';
  lastActivity?: string;
  workspace?: string;
}

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/home/ubuntu/.openclaw';
const OPENCLAW_CONFIG = path.join(OPENCLAW_DIR, 'openclaw.json');

interface OpenClawAgent {
  id: string;
  name?: string;
  identity?: { name?: string };
  model?: { primary?: string } | string;
  workspace?: string;
}

// Identity → emoji mappings for known agents (centralized source of truth)
const AGENT_EMOJI_MAP: Record<string, string> = {
  main: '🤖',
  alfred: '🤖',
  coder: '👨‍💻',
  security: '🛡️',
  research: '🔍',
  devops: '🔧',
  'qa-tester': '🧪',
  opencode: '⚡',
};

/**
 * Get emoji for an agent based on its id
 */
function getAgentEmoji(id: string): string {
  return AGENT_EMOJI_MAP[id] || '🤖';
}

/**
 * Extract model string from agent config (can be string or { primary: string })
 */
function getAgentModel(agent: OpenClawAgent): string {
  if (typeof agent.model === 'string') return agent.model;
  return agent.model?.primary || 'unknown';
}

/**
 * Get identity name from agent config
 */
function getAgentName(agent: OpenClawAgent): string {
  if (agent.identity?.name) return agent.identity.name;
  if (agent.name) return agent.name;
  return agent.id;
}

export async function GET() {
  try {
    const agents: AgentStatus[] = [];

    // Load agents from openclaw.json
    if (fs.existsSync(OPENCLAW_CONFIG)) {
      try {
        const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));
        const agentList: OpenClawAgent[] = config.agents?.list || [];

        for (const agent of agentList) {
          agents.push({
            id: agent.id,
            name: getAgentName(agent),
            emoji: getAgentEmoji(agent.id),
            model: getAgentModel(agent),
            status: agent.id === 'main' ? 'active' : 'inactive',
            lastActivity: agent.id === 'main' ? new Date().toISOString() : undefined,
            workspace: agent.workspace
              ? path.basename(agent.workspace)
              : agent.id,
          });
        }
      } catch (err) {
        console.error('[morning/agents] Failed to parse openclaw.json:', err);
      }
    }

    // Add opencode agent (not in openclaw.json but part of the ecosystem)
    const hasOpencode = agents.some((a) => a.id === 'opencode');
    if (!hasOpencode) {
      agents.push({
        id: 'opencode',
        name: 'OpenCode (alfred-coder)',
        emoji: '⚡',
        model: 'zai/glm-5.1',
        status: 'active',
        workspace: 'opencode',
      });
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[morning/agents] Error:', error);
    return NextResponse.json({ error: 'Failed to get agent status' }, { status: 500 });
  }
}
