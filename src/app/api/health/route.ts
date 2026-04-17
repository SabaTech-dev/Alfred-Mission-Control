/**
 * Health check endpoint
 * GET /api/health - Check health of all services
 */
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

interface ServiceCheck {
  name: string;
  status: 'up' | 'down';
  details?: string;
}

async function checkProcessByPort(port: number, name: string): Promise<ServiceCheck> {
  try {
    const { stdout } = await execAsync(`ss -tlnp 2>/dev/null | grep :${port} || echo ""`);
    const running = stdout.trim().length > 0;
    return {
      name,
      status: running ? 'up' : 'down',
      details: running ? `listening on port ${port}` : `port ${port} not in use`,
    };
  } catch {
    return { name, status: 'down', details: 'check failed' };
  }
}

const SERVICES = [
  { name: 'alfred-mc', port: 3000 },
  { name: 'openclaw-gateway', port: 18789 },
  { name: 'postgresql', port: 5432 },
  { name: 'hindsight', port: 9077 },
  { name: 'ollama', port: 11434 },
  { name: 'coolify', port: 8000 },
  { name: 'n8n', port: 5678 },
];

export async function GET() {
  const checks = await Promise.all(
    SERVICES.map((svc) => checkProcessByPort(svc.port, svc.name)),
  );

  // Core services: MC + Gateway + PostgreSQL must be up for "healthy"
  const coreNames = ['alfred-mc', 'openclaw-gateway', 'postgresql'];
  const coreUp = checks
    .filter((c) => coreNames.includes(c.name))
    .every((c) => c.status === 'up');

  const overallStatus = coreUp ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
