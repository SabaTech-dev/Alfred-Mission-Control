import { NextResponse } from 'next/server';

interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: 'active' | 'inactive';
  lastActivity?: string;
  workspace?: string;
}

export async function GET() {
  try {
    // Define known agents from AGENTS.md
    const agents: AgentStatus[] = [
      {
        id: 'main',
        name: 'Alfred',
        emoji: '🤖',
        model: 'zai/glm-5-turbo',
        status: 'active',
        lastActivity: new Date().toISOString(),
        workspace: 'main',
      },
      {
        id: 'coder',
        name: 'Coder',
        emoji: '👨‍💻',
        model: 'qwen/qwen3-coder:free',
        status: 'inactive',
        workspace: 'coder',
      },
      {
        id: 'research',
        name: 'Research',
        emoji: '🔍',
        model: 'nvidia/kimi-k2.5',
        status: 'inactive',
        workspace: 'research',
      },
      {
        id: 'security',
        name: 'Security',
        emoji: '🛡️',
        model: 'minimax/minimax-m2.5:free',
        status: 'inactive',
        workspace: 'security',
      },
      {
        id: 'debug',
        name: 'Debug',
        emoji: '🐛',
        model: 'openrouter/hunter-alpha',
        status: 'inactive',
        workspace: 'debug',
      },
      {
        id: 'refactor-expert',
        name: 'Refactor',
        emoji: '♻️',
        model: 'minimax/minimax-m2.5:free',
        status: 'inactive',
        workspace: 'refactor',
      },
    ];

    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get agent status' }, { status: 500 });
  }
}
