import "server-only";

import { createPrivateKey, sign } from "crypto";
import fs from "fs";

import type { ChatGatewayStatus } from "@/lib/openclaw-chat-types";
import { OPENCLAW_DIR } from "@/lib/paths";

export interface GatewayConfig {
  url: string | null;
  host: string;
  token: string;
  deviceToken: string;
  password: string;
  port: number;
  device: GatewayDeviceIdentity | null;
}

interface GatewayDeviceIdentity {
  id: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface StoredDeviceIdentity {
  deviceId?: string;
  publicKeyPem?: string;
  privateKeyPem?: string;
}

interface StoredDeviceAuth {
  tokens?: {
    operator?: {
      token?: string;
    };
  };
}

function readGatewayDeviceIdentity(): GatewayDeviceIdentity | null {
  const devicePath = `${OPENCLAW_DIR}/identity/device.json`;

  try {
    const raw = fs.readFileSync(devicePath, "utf-8");
    const parsed = JSON.parse(raw) as StoredDeviceIdentity;
    const id = parsed.deviceId?.trim() ?? "";
    const publicKeyPem = parsed.publicKeyPem?.trim() ?? "";
    const privateKeyPem = parsed.privateKeyPem?.trim() ?? "";

    if (!id || !publicKeyPem || !privateKeyPem) {
      return null;
    }

    return {
      id,
      publicKeyPem,
      privateKeyPem,
    };
  } catch {
    return null;
  }
}

function readGatewayOperatorDeviceToken(): string {
  const deviceAuthPath = `${OPENCLAW_DIR}/identity/device-auth.json`;

  try {
    const raw = fs.readFileSync(deviceAuthPath, "utf-8");
    const parsed = JSON.parse(raw) as StoredDeviceAuth;
    return parsed.tokens?.operator?.token?.trim() ?? "";
  } catch {
    return "";
  }
}

export function readGatewayConfig(): GatewayConfig {
  const configPath = `${OPENCLAW_DIR}/openclaw.json`;
  const fallbackPort = Number.parseInt(process.env.OPENCLAW_GATEWAY_PORT ?? "", 10);
  const envPort = Number.isFinite(fallbackPort) ? fallbackPort : 18789;

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      gateway?: {
        mode?: "local" | "remote";
        port?: number;
        bind?: "auto" | "lan" | "loopback" | "custom" | "tailnet";
        customBindHost?: string;
        remote?: { url?: string };
        auth?: { token?: string; password?: string };
      };
    };

    const deviceToken = readGatewayOperatorDeviceToken();
    const token = process.env.OPENCLAW_GATEWAY_TOKEN ?? parsed.gateway?.auth?.token ?? deviceToken;
    const password = process.env.OPENCLAW_GATEWAY_PASSWORD ?? parsed.gateway?.auth?.password ?? "";
    const mode = parsed.gateway?.mode ?? "local";
    const explicitUrl = process.env.OPENCLAW_GATEWAY_URL ?? (mode === "remote" ? parsed.gateway?.remote?.url : undefined) ?? null;

    const configuredHost = process.env.OPENCLAW_GATEWAY_HOST ?? parsed.gateway?.customBindHost;
    const bindMode = parsed.gateway?.bind;
    const host =
      configuredHost ??
      (bindMode === "tailnet" ? parsed.gateway?.customBindHost ?? "127.0.0.1" : "127.0.0.1");

    return {
      url: explicitUrl,
      host,
      token,
      deviceToken,
      password,
      port: parsed.gateway?.port ?? envPort,
      device: readGatewayDeviceIdentity(),
    };
  } catch {
    const deviceToken = readGatewayOperatorDeviceToken();
    return {
      url: process.env.OPENCLAW_GATEWAY_URL ?? null,
      host: process.env.OPENCLAW_GATEWAY_HOST ?? "127.0.0.1",
      token: process.env.OPENCLAW_GATEWAY_TOKEN ?? deviceToken,
      deviceToken,
      password: process.env.OPENCLAW_GATEWAY_PASSWORD ?? "",
      port: envPort,
      device: readGatewayDeviceIdentity(),
    };
  }
}

export function buildConnectParams(config: GatewayConfig, nonce?: string): Record<string, unknown> {
  const auth: { token?: string; deviceToken?: string; password?: string } = {};
  if (config.token.trim()) {
    auth.token = config.token.trim();
  }
  if (config.deviceToken.trim()) {
    auth.deviceToken = config.deviceToken.trim();
  }
  if (config.password.trim()) {
    auth.password = config.password.trim();
  }

  const client = {
    id: "gateway-client",
    version: "1.0.0",
    platform: "node",
    mode: "backend",
    instanceId: "alfred-chat",
  } as const;
  const role = "operator";
  const scopes = ["operator.read", "operator.admin"];

  let device: Record<string, unknown> | undefined;
  if (config.device && nonce) {
    const signedAt = Date.now();
    const payload = [
      "v2",
      config.device.id,
      client.id,
      client.mode,
      role,
      scopes.join(","),
      String(signedAt),
      auth.token ?? "",
      nonce,
    ].join("|");

    const signature = sign(null, Buffer.from(payload, "utf-8"), createPrivateKey(config.device.privateKeyPem));
    device = {
      id: config.device.id,
      publicKey: config.device.publicKeyPem,
      signature: signature.toString("base64url"),
      signedAt,
      nonce,
    };
  }

  return {
    minProtocol: 3,
    maxProtocol: 3,
    client,
    role,
    scopes,
    device,
    caps: [],
    auth: Object.keys(auth).length > 0 ? auth : undefined,
    locale: "en-US",
    userAgent: "alfred-chat",
  };
}

function toWebSocketUrl(value: string): string {
  if (/^wss?:\/\//i.test(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http/i, "ws");
  }

  return `ws://${value}`;
}

export function getGatewaySocketUrls(config: GatewayConfig): string[] {
  const urls = new Set<string>();
  const push = (value: string | null | undefined) => {
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    urls.add(toWebSocketUrl(normalized));
  };

  if (config.url) {
    push(config.url);
    return Array.from(urls);
  }

  push(`${config.host}:${config.port}`);
  push(`127.0.0.1:${config.port}`);
  push(`localhost:${config.port}`);
  push(`[::1]:${config.port}`);

  return Array.from(urls);
}

export async function checkGatewayStatus(): Promise<ChatGatewayStatus> {
  const start = Date.now();
  try {
    // Use lightweight HTTP health check instead of WebSocket
    // WebSocket requires device pairing which may not be configured
    const config = readGatewayConfig();
    const hosts = config.url ? [config.url] : [
      `http://${config.host}:${config.port}`,
      `http://127.0.0.1:${config.port}`,
      `http://localhost:${config.port}`,
    ];

    for (const base of hosts) {
      try {
        const url = base.replace(/^ws/i, "http");
        const res = await fetch(`${url}/health`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (res.ok) {
          return { available: true, latencyMs: Date.now() - start, error: null };
        }
      } catch {
        // try next host
      }
    }

    return { available: false, latencyMs: null, error: "Gateway HTTP health check failed" };
  } catch (error) {
    return {
      available: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : "Gateway unavailable",
    };
  }
}

// Re-export from gateway-methods for backward compatibility
export { startGatewayChat, type GatewayChatRun } from "./gateway-methods";
