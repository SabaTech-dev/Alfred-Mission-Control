/**
 * Agents Config API - Lightweight endpoint for reading agents from openclaw.json
 * Does not depend on database or other services that may fail
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrSessionAuth } from '@/lib/auth-helpers';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/home/joker/.openclaw';
const OPENCLAW_CONFIG = join(OPENCLAW_DIR, 'openclaw.json');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth check
  const authResult = await requireAgentOrSessionAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    if (!existsSync(OPENCLAW_CONFIG)) {
      return NextResponse.json(
        { error: 'openclaw.json not found', agents: [] },
        { status: 404 }
      );
    }

    const config = JSON.parse(readFileSync(OPENCLAW_CONFIG, 'utf-8'));
    const agentsList = config.agents?.list || [];

    return NextResponse.json({
      agents: agentsList.map((agent: {
        id: string;
        name?: string;
        emoji?: string;
        color?: string;
        model?: string;
        skills?: string[];
      }) => ({
        id: agent.id,
        name: agent.name || agent.id,
        emoji: agent.emoji || '🤖',
        color: agent.color || '#666666',
        model: agent.model || 'unknown',
        skills: agent.skills || [],
        status: 'offline',
      })),
    });
  } catch (error) {
    console.error('[api/agents/config] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read config', agents: [] },
      { status: 500 }
    );
  }
}
