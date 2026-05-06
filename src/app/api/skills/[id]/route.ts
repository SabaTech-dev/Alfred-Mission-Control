import { NextRequest, NextResponse } from "next/server";
import { listMergedSkills } from "@/operations/skills-ops";

export const dynamic = "force-dynamic";

// GET /api/skills/[id] — Get full skill details including fullContent
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const skills = await listMergedSkills();
    const skill = skills.find((s) => s.id === id);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("Failed to get skill:", error);
    return NextResponse.json({ error: "Failed to get skill" }, { status: 500 });
  }
}
