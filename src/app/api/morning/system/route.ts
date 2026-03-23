import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get system metrics
    const [cpuResult, memResult, diskResult, uptimeResult] = await Promise.allSettled([
      execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").catch(() => ({ stdout: '0' })),
      execAsync("free -m | awk '/Mem:/ {printf \"%d/%d MB (%.1f%%)\", $3, $2, ($3/$2)*100}'").catch(() => ({ stdout: 'N/A' })),
      execAsync("df -h / | awk 'NR==2 {printf \"%s / %s (%s used)\", $3, $2, $5}'").catch(() => ({ stdout: 'N/A' })),
      execAsync("uptime -p 2>/dev/null || uptime").catch(() => ({ stdout: 'N/A' })),
    ]);

    const cpu = cpuResult.status === 'fulfilled' ? parseFloat(cpuResult.value.stdout.trim()) || 0 : 0;
    const memory = memResult.status === 'fulfilled' ? memResult.value.stdout.trim() : 'N/A';
    const disk = diskResult.status === 'fulfilled' ? diskResult.value.stdout.trim() : 'N/A';
    const uptime = uptimeResult.status === 'fulfilled' ? uptimeResult.value.stdout.trim() : 'N/A';

    return NextResponse.json({
      cpu: {
        usage: cpu,
        status: cpu > 80 ? 'high' : cpu > 50 ? 'medium' : 'low',
      },
      memory: {
        usage: memory,
        status: memory.includes('%') && parseFloat(memory.split('(')[1]) > 80 ? 'high' : 'low',
      },
      disk: {
        usage: disk,
      },
      uptime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      cpu: { usage: 0, status: 'unknown' },
      memory: { usage: 'N/A', status: 'unknown' },
      disk: { usage: 'N/A' },
      uptime: 'N/A',
      timestamp: new Date().toISOString(),
    });
  }
}
