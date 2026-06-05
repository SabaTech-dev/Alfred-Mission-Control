import { NextRequest, NextResponse } from "next/server";
import { getMission, saveMission, getDefaultMission } from "@/lib/mission-storage";
import type { Mission } from "@/lib/mission-types";

/**
 * GET /api/mission
 * Returns the current mission statement
 */
export async function GET() {
  try {
    const mission = getMission();
    return NextResponse.json({ mission });
  } catch (error) {
    console.error("Failed to get mission:", error);
    return NextResponse.json(
      { error: "Failed to get mission" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mission
 * Updates the mission statement
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { statement, goals, values } = body;

    if (typeof statement !== "string") {
      return NextResponse.json(
        { error: "Invalid statement: must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(goals)) {
      return NextResponse.json(
        { error: "Invalid goals: must be an array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(values)) {
      return NextResponse.json(
        { error: "Invalid values: must be an array" },
        { status: 400 }
      );
    }

    const mission: Mission = {
      statement,
      goals,
      values,
      lastUpdated: new Date(),
    };

    saveMission(mission);

    return NextResponse.json({ mission });
  } catch (error) {
    console.error("Failed to save mission:", error);
    return NextResponse.json(
      { error: "Failed to save mission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mission
 * Resets the mission to default (deletes the mission file)
 */
export async function DELETE() {
  try {
    const deleted = saveMission(getDefaultMission());

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Failed to delete mission:", error);
    return NextResponse.json(
      { error: "Failed to delete mission" },
      { status: 500 }
    );
  }
}