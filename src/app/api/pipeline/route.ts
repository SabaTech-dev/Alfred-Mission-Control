import { NextResponse } from "next/server";
import {
  listOpportunities,
  createOpportunity,
  getPipelineKPIs,
} from "@/lib/pipeline-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [opportunities, kpis] = [listOpportunities(), getPipelineKPIs()];
    return NextResponse.json({ opportunities, kpis });
  } catch (error) {
    console.error("Pipeline GET error:", error);
    return NextResponse.json({ error: "Failed to load pipeline" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const opp = createOpportunity(body);
    return NextResponse.json(opp, { status: 201 });
  } catch (error) {
    console.error("Pipeline POST error:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}
