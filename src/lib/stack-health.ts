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
  const reachable = await canConnectTcp("127.0.0.1", port, 1000);

  return {
    name,
    status: reachable ? "up" : "down",
    details: reachable ? `listening on port ${port}` : `port ${port} not reachable`,
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

async function checkHindsightService(): Promise<StackServiceCheck> {
  const httpProbe = await probeHttp("http://127.0.0.1:9077/health", 2000);
  if (httpProbe.ok) {
    return {
      name: "hindsight",
      status: "up",
      details: "HTTP health check OK on port 9077",
    };
  }

  const portReachable = await canConnectTcp("127.0.0.1", 9077, 1000);
  if (portReachable) {
    return {
      name: "hindsight",
      status: "up",
      details: "listening on port 9077",
    };
  }

  const whichResult = safeExecFile("which", ["hindsight"], { timeout: 2000 });
  if (whichResult.status === 0) {
    const healthResult = safeExecFile("hindsight", ["health"], { timeout: 4000 });
    if (healthResult.status === 0) {
      return {
        name: "hindsight",
        status: "up",
        details: firstNonEmptyLine(healthResult.stdout, healthResult.stderr) ?? "CLI health check OK",
      };
    }

    return {
      name: "hindsight",
      status: "down",
      details:
        firstNonEmptyLine(healthResult.stdout, healthResult.stderr) ??
        `CLI installed but API check failed (${httpProbe.detail})`,
    };
  }

  return {
    name: "hindsight",
    status: "down",
    details: `CLI not found and port 9077 unavailable (${httpProbe.detail})`,
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

  const reachable = await canConnectTcp("127.0.0.1", port, 1000);
  if (reachable) {
    return {
      name,
      status: "up",
      details: `listening on port ${port}`,
    };
  }

  return {
    name,
    status: "down",
    details: `${url} unavailable (${httpProbe.detail})`,
  };
}

export async function collectStackServiceChecks(): Promise<StackServiceCheck[]> {
  const dockerContainers = parseDockerContainers();

  const [gateway, postgresql, hindsight, ollama, coolify, n8n, browserless, langfuse, qmd, llamaGpu, llamaEmbed, searxng, engram, prAgent, osintNexus] = await Promise.all([
    checkGatewayService(),
    checkPostgresService(dockerContainers),
    checkHindsightService(),
    checkTcpService("ollama", 11434),
    checkTcpService("coolify", 8000),
    checkTcpService("n8n", 5678),
    checkHttpService("browserless", "http://127.0.0.1:3002/pressure", 3002),
    checkHttpService("langfuse", "http://127.0.0.1:3001", 3001),
    checkTcpService("qmd-mcp", 8181),
    checkTcpService("llama.cpp-gpu", 8001),
    checkTcpService("llama.cpp-embed", 8002),
    checkHttpService("searxng", "http://127.0.0.1:8081", 8081),
    checkTcpService("engram", 7437),
    checkTcpService("pr-agent", 3003),
    checkTcpService("osint-nexus", 8420),
  ]);

  return [
    { name: "alfred-mc", status: "up", details: "API route responding" },
    gateway,
    postgresql,
    hindsight,
    ollama,
    coolify,
    n8n,
    browserless,
    langfuse,
    qmd,
    llamaGpu,
    llamaEmbed,
    searxng,
    engram,
    prAgent,
    osintNexus,
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
