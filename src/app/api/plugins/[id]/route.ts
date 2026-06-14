/**
 * Plugin Individual API
 * GET    /api/plugins/:id   — Get plugin details
 * PATCH  /api/plugins/:id   — Update plugin (enable/disable/config)
 */

import { NextRequest, NextResponse } from "next/server";
import { pluginsStore } from "@/lib/plugins-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = pluginsStore.findById(id);
    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    return NextResponse.json({ plugin });
  } catch (error) {
    console.error("[plugins] GET /:id error:", error);
    return NextResponse.json({ error: "Failed to get plugin" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { enabled, config, status } = body;

    const plugin = pluginsStore.findById(id);
    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    const updated = pluginsStore.update(id, {
      ...(enabled !== undefined && { enabled }),
      ...(config !== undefined && { config: { ...plugin.config, ...config } }),
      ...(status !== undefined && { status }),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ plugin: updated });
  } catch (error) {
    console.error("[plugins] PATCH /:id error:", error);
    return NextResponse.json({ error: "Failed to update plugin" }, { status: 500 });
  }
}
