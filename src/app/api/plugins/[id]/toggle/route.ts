/**
 * Plugin Toggle API
 * POST /api/plugins/:id/toggle — Enable or disable a plugin
 */

import { NextRequest, NextResponse } from "next/server";
import { pluginsStore } from "@/lib/plugins-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = pluginsStore.findById(id);
    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    const updated = pluginsStore.update(id, {
      enabled: !plugin.enabled,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      plugin: updated,
      message: `Plugin ${updated.enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("[plugins] toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle plugin" }, { status: 500 });
  }
}
