/**
 * Quick Actions API
 * POST /api/actions  body: { action }
 * Available actions: git-status, restart-gateway, clear-temp, usage-stats, heartbeat
 */
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logActivity } from '@/lib/activities-db';

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

const WORKSPACE = process.env.OPENCLAW_DIR ? `${process.env.OPENCLAW_DIR}/workspace` : '/home/joker/.openclaw/workspace';

interface ActionResult {
  action: string;
  status: 'success' | 'error';
  output: string;
  duration_ms: number;
  timestamp: string;
}

async function runAction(action: string): Promise<ActionResult> {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  try {
    let output = '';

    switch (action) {
      case 'git-status': {
        // Find all git repos in workspace and get their status
        const { stdout: dirs } = await execAsync(`find "${WORKSPACE}" -maxdepth 2 -name ".git" -type d 2>/dev/null | head -10`);
        const repoPaths = dirs.trim().split('\n').filter(Boolean).map((d) => d.replace('/.git', ''));

        const results: string[] = [];
        for (const repoPath of repoPaths) {
          const name = repoPath.split('/').pop() || repoPath;
          try {
            const { stdout: status } = await execAsync(`cd "${repoPath}" && git status --short && git log --oneline -3 2>&1`);
            results.push(`📁 ${name}:\n${status || '(clean)'}`);
          } catch {
            results.push(`📁 ${name}: (error reading git status)`);
          }
        }
        output = results.length ? results.join('\n\n') : 'No git repos found in workspace';
        break;
      }

      case 'restart-gateway': {
        const { stdout, stderr } = await execAsync('sudo /usr/local/bin/openclaw-services gateway restart 2>&1');
        output = stdout || stderr || 'Restart command executed';
        // Also check status
        try {
          const { stdout: status } = await execAsync('pgrep -f "openclaw-gateway" | head -1');
          output += `\nStatus: ${status.trim() ? 'running' : 'stopped'}`;
        } catch {}
        break;
      }

      case 'clear-temp': {
        const commands = [
          'find /tmp -maxdepth 1 -type f -mtime +1 -delete 2>/dev/null; echo "Cleaned /tmp"',
          `find "${WORKSPACE}" -name "*.tmp" -o -name "*.bak" | head -20 | xargs rm -f 2>/dev/null; echo "Cleaned tmp/bak files"`,
          'find /root/.pm2/logs -name "*.log" -size +50M -exec truncate -s 10M {} \\; 2>/dev/null; echo "Trimmed large PM2 logs"',
        ];
        const results = await Promise.all(commands.map((cmd) => execAsync(cmd).then((r) => r.stdout).catch((e) => e.message)));
        output = results.join('\n');
        break;
      }

      case 'usage-stats': {
        const { stdout: du } = await execAsync(`du -sh "${WORKSPACE}" 2>/dev/null || echo "N/A"`);
        const { stdout: df } = await execAsync('df -h / | tail -1');
        const { stdout: mem } = await execAsync('free -h | head -2');
        const { stdout: cpu } = await execAsync("top -bn1 | grep 'Cpu(s)' | head -1");
        const { stdout: uptime } = await execAsync('uptime -p');
        output = `Workspace: ${du.trim()}\n\nDisk: ${df.trim()}\n\nMemory:\n${mem.trim()}\n\nCPU: ${cpu.trim()}\n\nUptime: ${uptime.trim()}`;
        break;
      }

      case 'heartbeat': {
        // Check all critical services by port
        const services = [
          { name: 'alfred-mc', port: 3000 },
          { name: 'openclaw-gateway', port: 18789 },
          { name: 'postgresql', port: 5432 },
          { name: 'hindsight', port: 9077 },
          { name: 'ollama', port: 11434 },
          { name: 'coolify', port: 8000 },
          { name: 'n8n', port: 5678 },
        ];
        const results: string[] = [];

        for (const svc of services) {
          try {
            const { stdout } = await execAsync(`ss -tlnp 2>/dev/null | grep :${svc.port} || echo ""`);
            const running = stdout.trim().length > 0;
            results.push(`${running ? '✅' : '❌'} ${svc.name}: ${running ? `listening on :${svc.port}` : 'down'}`);
          } catch {
            results.push(`❌ ${svc.name}: check failed`);
          }
        }

        output = results.join('\n');
        break;
      }

      case 'npm-audit': {
        const { stdout, stderr } = await execAsync(`cd "${WORKSPACE}/alfred" && npm audit --json 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8');const j=JSON.parse(d);console.log('Vulnerabilities: '+JSON.stringify(j.metadata?.vulnerabilities||{}))" 2>&1`).catch((e) => ({ stdout: '', stderr: e.message }));
        output = stdout || stderr || 'Audit completed';
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const duration_ms = Date.now() - start;
    logActivity('command', `Quick action: ${action}`, 'success', { duration_ms, metadata: { action } });

    return { action, status: 'success', output, duration_ms, timestamp };
  } catch (err) {
    const duration_ms = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);
    logActivity('command', `Quick action failed: ${action}`, 'error', { duration_ms, metadata: { action, error: errMsg } });
    return { action, status: 'error', output: errMsg, duration_ms, timestamp };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    const validActions = ['git-status', 'restart-gateway', 'clear-temp', 'usage-stats', 'heartbeat', 'npm-audit'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Unknown action. Valid: ${validActions.join(', ')}` }, { status: 400 });
    }

    const result = await runAction(action);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[actions] Error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
