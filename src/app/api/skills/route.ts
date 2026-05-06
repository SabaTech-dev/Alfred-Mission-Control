/**
 * Skills API - Enhanced with installation, eligibility checks, and progress
 */
import { NextRequest, NextResponse } from "next/server";

import {
  checkEligibility,
  installSkill,
  uninstallSkill,
  updateSkill,
  type InstallProgress,
} from "@/lib/skills-installer";
import { listMergedSkills } from "@/operations/skills-ops";

export const dynamic = "force-dynamic";

// In-memory store for install progress (would be Redis in production)
const installProgress = new Map<string, InstallProgress>();

// GET /api/skills - List all skills
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Check eligibility for a skill
  if (action === "check") {
    const skillId = url.searchParams.get("skillId");
    if (!skillId) {
      return NextResponse.json({ error: "skillId required" }, { status: 400 });
    }

    const eligibility = await checkEligibility(skillId);
    return NextResponse.json({ eligibility });
  }

  // Get install progress
  if (action === "progress") {
    const installId = url.searchParams.get("installId");
    if (!installId) {
      return NextResponse.json({ error: "installId required" }, { status: 400 });
    }

    const progress = installProgress.get(installId);
    return NextResponse.json({ progress: progress || { step: "checking", message: "Not found", progress: 0 } });
  }

  // List skills with pagination
  try {
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const search = url.searchParams.get("search") || "";
    const source = url.searchParams.get("source") || "all";
    const summary = url.searchParams.get("summary") !== "false"; // default true

    const allSkills = await listMergedSkills();

    // Filter
    let filtered = allSkills;
    if (source !== "all") {
      filtered = filtered.filter((s) => s.source === source);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    // Strip fullContent from listing to reduce payload (loaded on-demand)
    const items = summary
      ? paged.map(({ fullContent: _fc, ...rest }) => rest)
      : paged;

    return NextResponse.json({
      skills: items,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Failed to list skills:", error);
    return NextResponse.json({ error: "Failed to list skills" }, { status: 500 });
  }
}

// POST /api/skills - Install a skill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, skillId, version } = body;

    if (!skillId) {
      return NextResponse.json({ error: "skillId required" }, { status: 400 });
    }

    // Generate install ID for progress tracking
    const installId = `install-${skillId}-${Date.now()}`;

    if (action === "install") {
      // Start installation with progress callback
      const result = await installSkill(skillId, version, (progress) => {
        installProgress.set(installId, progress);
        
        // Clean up progress after 5 minutes
        setTimeout(() => installProgress.delete(installId), 5 * 60 * 1000);
      });

      return NextResponse.json({
        ...result,
        installId,
      });
    }

    if (action === "update") {
      const result = await updateSkill(skillId, (progress) => {
        installProgress.set(installId, progress);
        setTimeout(() => installProgress.delete(installId), 5 * 60 * 1000);
      });

      return NextResponse.json({
        ...result,
        installId,
      });
    }

    if (action === "uninstall") {
      const result = await uninstallSkill(skillId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Skill operation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 }
    );
  }
}
