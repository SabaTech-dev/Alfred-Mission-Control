import { NextResponse } from "next/server";

import { probeGatewayRuntime } from "@/lib/openclaw-gateway";

export const dynamic = "force-dynamic";

interface GatewayStatus {
  status: "connected" | "disconnected" | "error";
  latency: number | null;
  port: number;
  lastChecked: string;
  error?: string;
}

export async function GET(): Promise<NextResponse<GatewayStatus>> {
  const probe = await probeGatewayRuntime(3000);

  return NextResponse.json({
    status: probe.available ? "connected" : probe.listenerActive ? "error" : "disconnected",
    latency: probe.latencyMs,
    port: probe.port,
    lastChecked: new Date().toISOString(),
    error: probe.error ?? undefined,
  });
}
