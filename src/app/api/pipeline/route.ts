import { NextResponse } from "next/server";
import {
  listOpportunities,
  createOpportunity,
  getPipelineKPIs,
} from "@/lib/pipeline-db";
import { validateBody, CreateOpportunitySchema } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [opportunities, kpis] = [listOpportunities(), getPipelineKPIs()];
    return NextResponse.json({ opportunities, kpis });
  } catch (error) {
    console.error("Pipeline GET error:", error);
    // Graceful degradation: return empty data instead of 500
    // so the dashboard renders with a clean slate rather than crashing
    const emptyKpis = {
      total_pipeline_value: 0,
      weighted_pipeline_value: 0,
      won_value: 0,
      lost_value: 0,
      avg_deal_size: 0,
      win_rate: 0,
      total_opportunities: 0,
      by_stage: {},
    };
    return NextResponse.json({ opportunities: [], kpis: emptyKpis });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateBody(CreateOpportunitySchema, body);
    if (!validated.success) {
      return validated.error;
    }
    const opp = createOpportunity(validated.data);
    return NextResponse.json(opp, { status: 201 });
  } catch (error) {
    console.error("Pipeline POST error:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}
