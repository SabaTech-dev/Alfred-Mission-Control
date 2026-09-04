import net from "net";

import { probeGatewayRuntime } from "@/lib/openclaw-gateway";
import { safeExecFile } from "@/lib/safe-exec";

export interface StackServiceCheck {
  name: string;
  status: "up" | "down";
  details: string;
}

interface DockerContainer {
  name: string;
  image: string;
  status: string;
  ports: string;
}

const LOCAL_IPS = ["127.0.0.1", "192.168.1.39"];

async function canConnectTcp(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("close", () => finish(false));
    socket.connect(port, host);
  });
}

async function canConnectTcpAny(port: number, timeoutMs: number): Promise<{ ok: boolean; host?: string }> {
  for (const host of LOCAL_IPS) {
    const reachable = await canConnectTcp(host, port, timeoutMs);
    if (reachable) {
      return { ok: true, host };
    }
  }
  return { ok: false };
}

async function probeHttp(url: string, timeoutMs: number): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.ok) {
      return { ok: true, detail: `${url} responded ${response.status}` };
    }

    return { ok: false, detail: `${url} returned ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "request failed",
    };
  }
}

function parseDockerContainers(): DockerContainer[] {
  const result = safeExecFile(
    "docker",
    ["ps", "--format", "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"],
    { timeout: 4000 },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", image = "", status = "", ports = ""] = line.split("|");
      return { name, image, status, ports };
    });
}

function firstNonEmptyLine(...values: string[]): string | null {
  for (const value of values) {
    const line = value
      .split("\n")
      .map((entry) => entry.trim())
      .find(Boolean);

    if (line) {
      return line;
    }
  }

  return null;
}

async function checkTcpService(name: string, port: number): Promise<StackServiceCheck> {
  const result = await canConnectTcpAny(port, 1000);

  return {
    name,
    status: result.ok ? "up" : "down",
    details: result.ok
      ? `listening on port ${port} (${result.host})`
      : `port ${port} not reachable (tried 127.0.0.1, 192.168.1.39)`,
  };
}

async function checkGatewayService(): Promise<StackServiceCheck> {
  const probe = await probeGatewayRuntime(2000);

  if (probe.available) {
    const detail = probe.checkedUrl
      ? `${probe.checkedUrl}/health OK`
      : `gateway healthy on port ${probe.port}`;
    return {
      name: "openclaw-gateway",
      status: "up",
      details: detail,
    };
  }

  return {
    name: "openclaw-gateway",
    status: "down",
    details: probe.error ?? `gateway unavailable on port ${probe.port}`,
  };
}

async function checkPostgresService(dockerContainers: DockerContainer[]): Promise<StackServiceCheck> {
  const candidatePorts = [5432, 5433];

  for (const port of candidatePorts) {
    const readyResult = safeExecFile(
      "pg_isready",
      ["-h", "127.0.0.1", "-p", String(port)],
      { timeout: 3000 },
    );

    if (readyResult.status === 0 && /accepting connections/i.test(readyResult.stdout)) {
      return {
        name: "postgresql",
        status: "up",
        details: `accepting connections on port ${port}`,
      };
    }

    const reachable = await canConnectTcp("127.0.0.1", port, 1000);
    if (reachable) {
      return {
        name: "postgresql",
        status: "up",
        details: `listening on port ${port}`,
      };
    }
  }

  const container = dockerContainers.find(
    (entry) => entry.image.toLowerCase().includes("postgres") && /\bup\b/i.test(entry.status),
  );

  if (container) {
    const portHint = container.ports.trim() ? ` (${container.ports.trim()})` : "";
    return {
      name: "postgresql",
      status: "up",
      details: `docker container ${container.name} healthy${portHint}`,
    };
  }

  return {
    name: "postgresql",
    status: "down",
    details: "no PostgreSQL listener or healthy container detected",
  };
}

async function checkHttpService(name: string, url: string, port: number): Promise<StackServiceCheck> {
  const httpProbe = await probeHttp(url, 2000);
  if (httpProbe.ok) {
    return {
      name,
      status: "up",
      details: `${url} responded ${httpProbe.detail.split(" ").pop()}`,
    };
  }

  // Try alternative local IPs for services bound to 192.168.1.39
  const altUrl = url.replace("127.0.0.1", "192.168.1.39");
  const altProbe = await probeHttp(altUrl, 2000);
  if (altProbe.ok) {
    return {
      name,
      status: "up",
      details: `${altUrl} responded ${altProbe.detail.split(" ").pop()}`,
    };
  }

  const reachable = await canConnectTcpAny(port, 1000);
  if (reachable.ok) {
    return {
      name,
      status: "up",
      details: `listening on port ${port} (${reachable.host})`,
    };
  }

  return {
    name,
    status: "down",
    details: `${url} unavailable (${httpProbe.detail})`,
  };
}

/**
 * Collect health checks for all monitored stack services.
 *
 * NOTE: The legacy memory API (port 9077) was removed — migrated to native
 * memory-core (SQLite + Ollama nomic-embed). OSINT Nexus (port 8420) was also
 * removed from health checks as it is not a core service.
 */
export async function collectStackServiceChecks(): Promise<StackServiceCheck[]> {
  const dockerContainers = parseDockerContainers();

  const [gateway, postgresql, llamaRerank, coolify, browserless, langfuse, qmd, llamaGpu, llamaEmbed, llamaEmbedMem, searxng, engram, prAgent] = await Promise.all([
    checkGatewayService(),
    checkPostgresService(dockerContainers),
    checkTcpService("llama.cpp-rerank", 8005),
    checkTcpService("coolify", 8000),
    checkHttpService("browserless", "http://127.0.0.1:3002/pressure", 3002),
    checkHttpService("langfuse", "http://127.0.0.1:3001", 3001),
    checkTcpService("qmd-mcp", 8181),
    checkTcpService("llama.cpp-gpu", 8001),
    checkTcpService("llama.cpp-embed", 8002),
    checkTcpService("llama.cpp-embed-memory", 8006),
    checkHttpService("searxng", "http://127.0.0.1:8081", 8081),
    checkTcpService("engram", 7437),
    checkTcpService("pr-agent", 3003),
  ]);

  return [
    { name: "alfred-mc", status: "up", details: "API route responding" },
    gateway,
    postgresql,
    llamaRerank,
    coolify,
    browserless,
    langfuse,
    qmd,
    llamaGpu,
    llamaEmbed,
    llamaEmbedMem,
    searxng,
    engram,
    prAgent,
  ];
}

export function summarizeStackHealth(checks: StackServiceCheck[]): "healthy" | "degraded" {
  return checks.every((check) => check.status === "up") ? "healthy" : "degraded";
}

export function formatStackHeartbeat(checks: StackServiceCheck[]): string[] {
  return checks.map(
    (check) => `${check.status === "up" ? "✅" : "❌"} ${check.name}: ${check.details}`,
  );
}
