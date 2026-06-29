import { NextRequest, NextResponse } from "next/server";

import { fetchContentPlan } from "@/lib/seo/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/seo/content?keyword=<targetKeyword>
 *
 * Generates a 10-item content plan: titles, target keyword, search intent,
 * and estimated difficulty. Enriched with People-Also-Ask questions when
 * scraping succeeds (best-effort, non-fatal on failure).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = (searchParams.get("keyword") || "").trim();

    if (!keyword) {
      return NextResponse.json(
        { error: "A 'keyword' query parameter is required." },
        { status: 400 },
      );
    }

    const ideas = await fetchContentPlan(keyword);

    return NextResponse.json({
      keyword,
      count: ideas.length,
      ideas,
    });
  } catch (error) {
    console.error("[api/seo/content] Failed:", error);
    return NextResponse.json(
      { error: "Failed to generate content plan." },
      { status: 500 },
    );
  }
}
