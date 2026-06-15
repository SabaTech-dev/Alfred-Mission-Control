/**
 * Webhooks API
 *
 * GET  /api/webhooks     — List all webhooks
 * POST /api/webhooks     — Create a new webhook
 * DELETE /api/webhooks   — Delete a webhook by id (?id=wh-...)
 */
import { NextResponse, type NextRequest } from "next/server";
import { webhooksStore } from "@/lib/webhooks-store";

export async function GET() {
  try {
    const webhooks = webhooksStore.list();
    return NextResponse.json({ webhooks, total: webhooks.length });
  } catch (error) {
    console.error("[webhooks] GET error:", error);
    return NextResponse.json(
      { error: "Failed to list webhooks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, events, secret, headers } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Webhook name is required" },
        { status: 400 }
      );
    }
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const webhook = webhooksStore.create({
      name,
      url,
      events: Array.isArray(events) ? events : events ? [events] : ["*"],
      secret: secret || "",
      headers: headers || {},
      enabled: true,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { webhook, message: `Webhook "${name}" created` },
      { status: 201 }
    );
  } catch (error) {
    console.error("[webhooks] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Webhook id is required" },
        { status: 400 }
      );
    }

    const removed = webhooksStore.remove(id);
    if (!removed) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Webhook deleted" });
  } catch (error) {
    console.error("[webhooks] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
