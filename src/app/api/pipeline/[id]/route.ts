import { NextResponse } from "next/server";
import {
  getOpportunity,
  updateOpportunity,
  deleteOpportunity,
} from "@/lib/pipeline-db";
import { validateBody, UpdateOpportunitySchema } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opp = getOpportunity(id);
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(opp);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const validated = validateBody(UpdateOpportunitySchema, body);
  if (!validated.success) {
    return validated.error;
  }
  const opp = updateOpportunity(id, validated.data);
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(opp);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteOpportunity(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
