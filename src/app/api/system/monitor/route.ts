import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import { readFileSync } from "fs";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

const SYSTEM_SERVICES = [
  "alfred-mission-control",
  "docker",
  "ollama",
  "tailscaled",
  "fail2ban",
  "redis-server",
  "ssh",
  "cron",
  "postgresql",
];

const USER_SERVICES = ["openclaw-gateway", "searxng"];

interface ServiceEntry {
  name: string;
  status: string;
  description: string;
  backend: string;
  uptime?: number | null;
  restarts?: number;
  pid?: number | null;
  mem?: number | null;
  cpu?: number | null;
}

interface TailscaleDevice {
  hostname: string;
  ip: string;
  os: string;
  online: boolean;
}

interface FirewallRule {
  port: string;
  action: string;
  from: string;
  comment: string;
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "alfred-mission-control": "Alfred Mission Control – Dashboard",
  docker: "Docker Container Runtime",
  ollama: "Ollama – Local LLM Server",
  tailscaled: "Tailscale VPN Daemon",
  fail2ban: "Fail2ban – Intrusion Prevention",
  "redis-server": "Redis – In-Memory Store",
  ssh: "SSH Server",
  cron: "Cron – Scheduled Tasks",
  postgresql: "PostgreSQL Database",
  "openclaw-gateway": "OpenClaw Gateway",
  searxng: "SearXNG – Privacy Search Engine",
};

/**
 * Check if a systemd service is active (system-level)
 */
async function checkSystemdService(name: string): Promise<ServiceEntry> {
  try {
    const { stdout } = await execAsync(
      `systemctl is-active ${name} 2>/dev/null || echo "unknown"`
    );
    const status = stdout.trim();
    return {
      name,
      status,
      description: SERVICE_DESCRIPTIONS[name] ?? name,
      backend: "systemd",
    };
  } catch {
    return {
      name,
      status: "unknown",
      description: SERVICE_DESCRIPTIONS[name] ?? name,
      backend: "systemd",
    };
  }
}

/**
 * Check if a user-level systemd service is active
 */
async function checkUserService(name: string): Promise<ServiceEntry> {
  try {
    const { stdout } = await execAsync(
      `systemctl --user is-active ${name} 2>/dev/null || echo "unknown"`
    );
    const status = stdout.trim();
    return {
      name,
      status,
      description: SERVICE_DESCRIPTIONS[name] ?? name,
      backend: "systemd-user",
    };
  } catch {
    return {
      name,
      status: "unknown",
      description: SERVICE_DESCRIPTIONS[name] ?? name,
      backend: "systemd-user",
    };
  }
}

/**
 * Docker container info
 */
interface DockerContainer {
  name: string;
  status: string;
}

/**
 * Discover running Docker containers
 */
async function discoverDockerContainers(): Promise<ServiceEntry[]> {
  try {
    const { stdout } = await execAsync(
      `docker ps --format '{{.Names}}\t{{.Status}}' 2>/dev/null || true`
    );
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const [name, ...statusParts] = line.split("\t");
      const status = statusParts.join(" ");

      return {
        name: `docker-${name}`,
        status: status.toLowerCase().includes("up") ? "active" : "inactive",
        description: `Docker Container: ${name}`,
        backend: "docker",
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // ── CPU ──────────────────────────────────────────────────────────────────
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();
    const cpuUsage = Math.min(Math.round((loadAvg[0] / cpuCount) * 100), 100);

    // ── RAM ──────────────────────────────────────────────────────────────────
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // ── Disk ─────────────────────────────────────────────────────────────────
    let diskTotal = 100;
    let diskUsed = 0;
    let diskFree = 100;
    try {
      const { stdout } = await execAsync("df -BG / | tail -1");
      const parts = stdout.trim().split(/\s+/);
      diskTotal = parseInt(parts[1].replace("G", ""));
      diskUsed = parseInt(parts[2].replace("G", ""));
      diskFree = parseInt(parts[3].replace("G", ""));
    } catch (error) {
      console.error("Failed to get disk stats:", error);
    }
    const diskPercent = (diskUsed / diskTotal) * 100;

    // ── Network (real stats from /proc/net/dev) ───────────────────────────────
    let network = { rx: 0, tx: 0 };
    try {
      function readNetStats(): { rx: number; tx: number; ts: number } {
        const netDev = readFileSync('/proc/net/dev', 'utf-8');
        const lines = netDev.trim().split('\n').slice(2);
        let rx = 0, tx = 0;
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const iface = parts[0].replace(':', '');
          if (iface === 'lo') continue;
          rx += parseInt(parts[1]) || 0;
          tx += parseInt(parts[9]) || 0;
        }
        return { rx, tx, ts: Date.now() };
      }

      const current = readNetStats();

      // Use module-level cache for previous reading
      if ((global as Record<string, unknown>).__netPrev) {
        const prev = (global as Record<string, unknown>).__netPrev as { rx: number; tx: number; ts: number };
        const dtSec = (current.ts - prev.ts) / 1000;
        if (dtSec > 0) {
          network = {
            rx: parseFloat(Math.max(0, (current.rx - prev.rx) / 1024 / 1024 / dtSec).toFixed(3)),
            tx: parseFloat(Math.max(0, (current.tx - prev.tx) / 1024 / 1024 / dtSec).toFixed(3)),
          };
        }
      }
      (global as Record<string, unknown>).__netPrev = current;
    } catch (error) {
      console.error("Failed to get network stats:", error);
    }

    // ── Services (auto-discovered) ────────────────────────────────────────────
    const services: ServiceEntry[] = [];

    // 1. System-level systemd services
    const systemChecks = SYSTEM_SERVICES.map(checkSystemdService);
    const userServiceChecks = USER_SERVICES.map(checkUserService);

    // 2. Docker containers
    const dockerChecks = discoverDockerContainers();

    // Run all service checks in parallel
    const [systemResults, userResults, dockerResults] = await Promise.all([
      Promise.all(systemChecks),
      Promise.all(userServiceChecks),
      dockerChecks,
    ]);

    services.push(...systemResults);
    services.push(...userResults);
    services.push(...dockerResults);

    // ── Tailscale VPN ─────────────────────────────────────────────────────────
    let tailscaleActive = false;
    let tailscaleIp = "";
    const tailscaleDevices: TailscaleDevice[] = [];

    try {
      await execAsync("which tailscale");

      try {
        const { stdout: tsStatus } = await execAsync("tailscale status 2>/dev/null || true");
        const lines = tsStatus.trim().split("\n").filter(Boolean);

        if (lines.length > 0 && !tsStatus.includes("not running")) {
          tailscaleActive = true;
          for (const line of lines) {
            if (line.startsWith("#")) continue;
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              tailscaleDevices.push({
                ip: parts[0],
                hostname: parts[1],
                os: parts[3] || "",
                online: line.includes("active") || line.includes("online"),
              });
            }
          }
          if (tailscaleDevices.length > 0) {
            tailscaleIp = tailscaleDevices[0].ip;
          }
        }
      } catch (error) {
        console.error("Failed to get Tailscale status:", error);
      }
    } catch {
      // Tailscale not installed
    }

    // ── Firewall (UFW) ────────────────────────────────────────────────────────
    let firewallActive = false;
    const firewallRulesList: FirewallRule[] = [];

    try {
      const { stdout: ufwStatus } = await execAsync("ufw status numbered 2>/dev/null || true");
      if (ufwStatus.includes("Status: active")) {
        firewallActive = true;
        const lines = ufwStatus.split("\n");
        for (const line of lines) {
          const match = line.match(/\[\s*\d+\]\s+([\w/:]+)\s+(\w+)\s+(\S+)\s*(#?.*)$/);
          if (match) {
            firewallRulesList.push({
              port: match[1].trim(),
              action: match[2].trim(),
              from: match[3].trim(),
              comment: match[4].replace("#", "").trim(),
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to get firewall status:", error);
    }

    return NextResponse.json({
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().map(() => Math.round(Math.random() * 100)),
        loadAvg,
      },
      ram: {
        total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
        used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
        free: parseFloat((freeMem / 1024 / 1024 / 1024).toFixed(2)),
        cached: 0,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        percent: diskPercent,
      },
      network,
      systemd: services, // kept field name for backwards compat with page.tsx
      tailscale: {
        active: tailscaleActive,
        ip: tailscaleIp,
        devices: tailscaleDevices,
      },
      firewall: {
        active: firewallActive,
        rules: firewallRulesList,
        ruleCount: firewallRulesList.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system monitor data:", error);
    return NextResponse.json(
      { error: "Failed to fetch system monitor data" },
      { status: 500 }
    );
  }
}
