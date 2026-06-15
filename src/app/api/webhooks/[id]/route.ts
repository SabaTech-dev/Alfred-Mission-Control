/**
 * Webhook by ID — GET, PATCH (toggle/update), POST (test trigger)
 */
import { NextResponse, type NextRequest } from "next/server";
import { webhooksStore } from "@/lib/webhooks-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const webhook = webhooksStore.findById(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json({ webhook });
  } catch (error) {
    console.error("[webhooks] GET /:id error:", error);
    return NextResponse.json({ error: "Failed to get webhook" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Webhook id is required" }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.url === "string") updates.url = body.url;
    if (Array.isArray(body.events)) updates.events = body.events;
    if (typeof body.secret === "string") updates.secret = body.secret;
    if (body.headers && typeof body.headers === "object") updates.headers = body.headers;

    const updated = webhooksStore.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ webhook: updated });
  } catch (error) {
    console.error("[webhooks] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
}

// POST /api/webhooks/:id?trigger=true — Test deliver a ping event
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Webhook id is required" }, { status: 400 });
    }

    const webhook = webhooksStore.findById(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const success = await webhooksStore.deliver(id, "webhook.test", {
      message: "Test delivery from AMC",
      webhook: webhook.name,
    });

    return NextResponse.json({
      success,
      message: success
        ? "Test delivery successful"
        : "Test delivery failed — check URL and service availability",
      lastStatus: webhooksStore.findById(id)?.lastStatus,
    });
  } catch (error) {
    console.error("[webhooks] POST test error:", error);
    return NextResponse.json({ error: "Failed to test webhook" }, { status: 500 });
  }
}
