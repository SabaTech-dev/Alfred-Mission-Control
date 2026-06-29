import { NextRequest, NextResponse } from "next/server";

import { changePassword, clearActivityLog, getSystemData } from "@/operations/system-ops";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAgentOrSessionAuth(request);
    if (!auth.authorized) return auth.error;

    const systemInfo = await getSystemData();
    return NextResponse.json(systemInfo);
  } catch (error) {
    console.error("[system] GET error:", error);
    return NextResponse.json({ error: "Failed to read system info" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAgentOrSessionAuth(request);
    if (!auth.authorized) return auth.error;
    const { action, data } = await request.json();

    if (action === "change_password") {
      const { currentPassword, newPassword } = data;
      const result = changePassword(currentPassword, newPassword);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      return NextResponse.json({ success: true, message: result.message });
    }

    if (action === "clear_activity_log") {
      const result = clearActivityLog();
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
