import { NextRequest, NextResponse } from "next/server";

import { fetchAndAnalyze } from "@/lib/seo/analyzer";
import { isPrivateIP } from "@/lib/security/ssrf-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/seo/analyze?url=<targetUrl>
 *
 * Fetches the page server-side and runs a keyless on-page SEO analysis:
 * title/meta/headings, image alt text, broken links, word count, readability,
 * and an overall 0-100 score with actionable recommendations.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = (searchParams.get("url") || "").trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: "A 'url' query parameter is required." },
        { status: 400 },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { error: "The provided 'url' is not a valid URL." },
        { status: 400 },
      );
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only https URLs are supported." },
        { status: 400 },
      );
    }

    // SSRF guard: block private/internal IPs and metadata endpoints
    const hostname = parsed.hostname.toLowerCase();
    if (isPrivateIP(hostname)) {
      return NextResponse.json(
        { error: "Internal addresses are not allowed." },
        { status: 403 },
      );
    }

    // Block cloud metadata endpoints
    if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
      return NextResponse.json(
        { error: "Internal addresses are not allowed." },
        { status: 403 },
      );
    }

    const result = await fetchAndAnalyze(parsed.toString());

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/seo/analyze] Failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze the page.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
