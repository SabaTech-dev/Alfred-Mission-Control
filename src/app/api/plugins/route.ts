/**
 * Plugins System API
 * GET    /api/plugins       — List all plugins (discovered + installed)
 * POST   /api/plugins       — Install a plugin by name or URL
 * DELETE /api/plugins       — Uninstall a plugin by id
 */

import { NextRequest, NextResponse } from "next/server";
import { pluginsStore, type PluginEntry } from "@/lib/plugins-store";

// GET — list all plugins
export async function GET() {
  try {
    const plugins = pluginsStore.list();
    return NextResponse.json({ plugins, total: plugins.length });
  } catch (error) {
    console.error("[plugins] GET error:", error);
    return NextResponse.json(
      { error: "Failed to list plugins" },
      { status: 500 }
    );
  }
}

// POST — install or register a plugin
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, type, config } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Plugin name is required" },
        { status: 400 }
      );
    }

    const existing = pluginsStore.findByName(name);
    if (existing) {
      return NextResponse.json(
        { error: `Plugin "${name}" is already installed`, plugin: existing },
        { status: 409 }
      );
    }

    const plugin: PluginEntry = pluginsStore.create({
      name,
      url: url || null,
      type: type || "third-party",
      status: "installed",
      config: config || {},
      installedAt: new Date().toISOString(),
      enabled: true,
    });

    return NextResponse.json({ plugin, message: `Plugin "${name}" installed` }, { status: 201 });
  } catch (error) {
    console.error("[plugins] POST error:", error);
    return NextResponse.json(
      { error: "Failed to install plugin" },
      { status: 500 }
    );
  }
}

// DELETE — uninstall a plugin
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Plugin id is required" },
        { status: 400 }
      );
    }

    const removed = pluginsStore.remove(id);
    if (!removed) {
      return NextResponse.json(
        { error: "Plugin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: `Plugin uninstalled` });
  } catch (error) {
    console.error("[plugins] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to uninstall plugin" },
      { status: 500 }
    );
  }
}
