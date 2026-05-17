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
    // Define known agents from the current OpenClaw topology
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
        name: 'Code Assistant',
        emoji: '👨‍💻',
        model: 'zai/glm-5.1',
        status: 'inactive',
        workspace: 'coder',
      },
      {
        id: 'research',
        name: 'Research Agent',
        emoji: '🔍',
        model: 'zai/glm-5',
        status: 'inactive',
        workspace: 'research',
      },
      {
        id: 'security',
        name: 'Security Bot',
        emoji: '🛡️',
        model: 'zai/glm-5',
        status: 'inactive',
        workspace: 'security',
      },
      {
        id: 'devops',
        name: 'Debug Specialist',
        emoji: '🐛',
        model: 'zai/glm-4.7',
        status: 'inactive',
        workspace: 'devops',
      },
      {
        id: 'qa-tester',
        name: 'QA Tester',
        emoji: '🧪',
        model: 'zai/glm-4.7',
        status: 'inactive',
        workspace: 'qa-tester',
      },
    ];

    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get agent status' }, { status: 500 });
  }
}
