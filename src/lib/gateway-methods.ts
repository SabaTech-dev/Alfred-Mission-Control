import { randomUUID } from "crypto";

import type { ChatGatewayStatus } from "@/lib/openclaw-chat-types";

import {
  readGatewayConfig,
  buildConnectParams,
  getGatewaySocketUrls,
} from "./openclaw-gateway";
import type { GatewayConfig } from "./openclaw-gateway";

interface GatewayResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code?: string; message?: string };
}

interface GatewayEventFrame {
  type: "event";
  event: string;
  payload?: unknown;
}

type GatewayFrame = GatewayResponseFrame | GatewayEventFrame;

export interface GatewayChatRun {
  runId: string;
  close: () => void;
  onChatEvent: (handler: (payload: unknown) => void) => void;
  waitForCompletion: (timeoutMs: number) => Promise<void>;
}

function parseFrame(rawData: unknown): GatewayFrame | null {
  let text = "";
  if (typeof rawData === "string") {
    text = rawData;
  } else if (rawData instanceof ArrayBuffer) {
    text = Buffer.from(rawData).toString("utf-8");
  } else if (ArrayBuffer.isView(rawData)) {
    text = Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength).toString("utf-8");
  } else {
    text = String(rawData ?? "");
  }

  try {
    const parsed = JSON.parse(text) as GatewayFrame;
    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function connectGatewaySession(ws: WebSocket, config: GatewayConfig, timeoutMs: number): Promise<void> {
  const requestId = randomUUID();
  let didSend = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Gateway connect timed out"));
    }, timeoutMs);

    const sendConnect = (nonce?: string) => {
      if (didSend) {
        return;
      }

      didSend = true;
      ws.send(
        JSON.stringify({
          type: "req",
          id: requestId,
          method: "connect",
          params: buildConnectParams(config, nonce),
        }),
      );
    };

    const fallbackConnect = config.device
      ? null
      : setTimeout(() => {
          sendConnect();
        }, 150);

    const cleanup = () => {
      clearTimeout(timeout);
      if (fallbackConnect) {
        clearTimeout(fallbackConnect);
      }
      ws.removeEventListener("message", handleMessage);
      ws.removeEventListener("close", handleClose);
      ws.removeEventListener("error", handleError);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Gateway socket connection error"));
    };

    const handleClose = () => {
      cleanup();
      reject(new Error("Gateway socket closed during connect"));
    };

    const handleMessage = (event: MessageEvent) => {
      const frame = parseFrame(event.data);
      if (!frame) {
        return;
      }

      if (frame.type === "event" && frame.event === "connect.challenge") {
        const challengePayload = frame.payload as { nonce?: unknown } | undefined;
        const nonce = typeof challengePayload?.nonce === "string" ? challengePayload.nonce : undefined;
        sendConnect(nonce);
        return;
      }

      if (frame.type === "res" && frame.id === requestId) {
        cleanup();
        if (frame.ok) {
          resolve();
          return;
        }

        reject(new Error(frame.error?.message ?? "Gateway connect failed"));
      }
    };

    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", handleClose);
    ws.addEventListener("error", handleError);
  });
}

function sendRequest(
  ws: WebSocket,
  method: string,
  params: unknown,
  timeoutMs: number,
): Promise<unknown> {
  const requestId = randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Gateway ${method} timed out`));
    }, timeoutMs);

    const handleMessage = (event: MessageEvent) => {
      const frame = parseFrame(event.data);
      if (!frame || frame.type !== "res" || frame.id !== requestId) {
        return;
      }

      ws.removeEventListener("message", handleMessage);
      clearTimeout(timeout);

      if (frame.ok) {
        resolve(frame.payload);
      } else {
        reject(new Error(frame.error?.message ?? `Gateway ${method} failed`));
      }
    };

    ws.addEventListener("message", handleMessage);
    ws.send(
      JSON.stringify({
        type: "req",
        id: requestId,
        method,
        params,
      }),
    );
  });
}

async function openGatewaySocket(timeoutMs = 4_000): Promise<WebSocket> {
  const config = readGatewayConfig();
  const urls = getGatewaySocketUrls(config);
  const errors: string[] = [];

  for (const url of urls) {
    const ws = new WebSocket(url);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Gateway socket open timeout"));
        }, timeoutMs);

        ws.addEventListener("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        ws.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("Gateway socket connection error"));
        });
      });

      await connectGatewaySession(ws, config, timeoutMs);
      return ws;
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : "connection failed"}`);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }

  throw new Error(errors.length > 0 ? errors.join(" | ") : "Gateway unavailable");
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

export async function startGatewayChat(params: {
  sessionKey: string;
  message: string;
}): Promise<GatewayChatRun> {
  const ws = await openGatewaySocket(5_000);
  const runPayload = (await sendRequest(
    ws,
    "chat.send",
    {
      sessionKey: params.sessionKey,
      message: params.message,
      idempotencyKey: randomUUID(),
    },
    10_000,
  )) as { runId?: string };

  const runId = runPayload.runId;
  if (!runId) {
    ws.close();
    throw new Error("Gateway did not return runId");
  }

  const subscribers = new Set<(payload: unknown) => void>();
  const listener = (event: MessageEvent) => {
    const frame = parseFrame(event.data);
    if (!frame || frame.type !== "event" || frame.event !== "chat") {
      return;
    }

    const payload = frame.payload as { runId?: string };
    if (payload?.runId !== runId) {
      return;
    }

    for (const subscriber of subscribers) {
      subscriber(frame.payload);
    }
  };

  ws.addEventListener("message", listener);

  return {
    runId,
    close: () => {
      ws.removeEventListener("message", listener);
      ws.close();
    },
    onChatEvent: (handler) => {
      subscribers.add(handler);
    },
    waitForCompletion: async (timeoutMs) => {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Gateway stream timeout"));
        }, timeoutMs);

        const completionHandler = (payload: unknown) => {
          const typedPayload = payload as { state?: string };
          if (
            typedPayload.state === "final" ||
            typedPayload.state === "error" ||
            typedPayload.state === "aborted"
          ) {
            clearTimeout(timeout);
            subscribers.delete(completionHandler);
            resolve();
          }
        };

        subscribers.add(completionHandler);
      });
    },
  };
}
