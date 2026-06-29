import { NextRequest, NextResponse } from "next/server";

import { fetchKeywordSuggestions } from "@/lib/seo/keyword";

export const dynamic = "force-dynamic";

/**
 * GET /api/seo/keywords?seed=<keyword>&url=<targetUrl>
 *
 * Returns keyword suggestions with estimated volume, competition, and trend.
 * Uses keyless data sources (Google Suggest + Google Trends RSS).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seed = (searchParams.get("seed") || "").trim();
    const targetUrl = searchParams.get("url") || undefined;

    if (!seed) {
      return NextResponse.json(
        { error: "A 'seed' query parameter is required." },
        { status: 400 },
      );
    }

    const suggestions = await fetchKeywordSuggestions(seed, { targetUrl });

    return NextResponse.json({
      seed,
      targetUrl: targetUrl ?? null,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("[api/seo/keywords] Failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch keyword suggestions." },
      { status: 500 },
    );
  }
}
