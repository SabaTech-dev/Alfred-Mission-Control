import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type {
  ServiceProduct,
  CatalogKPIs,
  PricingTier,
  LandingCheckResult,
  LandingConfig,
  LandingStatus,
} from "@/lib/catalog-types";

// ─── Config path ───────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const CATALOG_FILE = path.join(DATA_DIR, "catalog-services.json");

// ─── Landing status cache ──────────────────────────────────────────
interface CachedStatus {
  results: LandingCheckResult[];
  checkedAt: number; // epoch ms
}
let landingCache: CachedStatus | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Config loader (re-reads from disk on every request) ───────────
interface CatalogConfig {
  services: Omit<ServiceProduct, "status">[];
  landings: LandingConfig[];
}

function loadConfig(): CatalogConfig {
  const raw = fs.readFileSync(CATALOG_FILE, "utf-8");
  return JSON.parse(raw);
}

// ─── Landing status checker ────────────────────────────────────────
async function checkLandingStatus(
  landings: LandingConfig[]
): Promise<LandingCheckResult[]> {
  const results = await Promise.allSettled(
    landings.map(async (landing) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(landing.url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        const elapsed = Date.now() - start;
        let status: LandingStatus = "live";
        if (res.status >= 400) status = "error";
        else if (res.status >= 300) status = "staging";
        return {
          id: landing.id,
          url: landing.url,
          label: landing.label,
          status,
          statusCode: res.status,
          responseTimeMs: elapsed,
          checkedAt: new Date().toISOString(),
        } satisfies LandingCheckResult;
      } catch (err: unknown) {
        const elapsed = Date.now() - start;
        return {
          id: landing.id,
          url: landing.url,
          label: landing.label,
          status: "error" as LandingStatus,
          responseTimeMs: elapsed,
          checkedAt: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
        } satisfies LandingCheckResult;
      }
    })
  );
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : {
      id: "unknown",
      url: "",
      label: "Unknown",
      status: "error" as LandingStatus,
      checkedAt: new Date().toISOString(),
      error: r.reason?.message ?? "Unknown error",
    }
  );
}

async function getLandingStatus(
  landings: LandingConfig[]
): Promise<LandingCheckResult[]> {
  const now = Date.now();
  if (landingCache && now - landingCache.checkedAt < CACHE_TTL_MS) {
    return landingCache.results;
  }
  const results = await checkLandingStatus(landings);
  landingCache = { results, checkedAt: now };
  return results;
}

// ─── Derive service status from landing check ─────────────────────
function deriveServiceStatus(
  service: { landingUrl: string | null },
  landingResults: LandingCheckResult[]
): ServiceProduct["status"] {
  if (!service.landingUrl) return "development";
  const match = landingResults.find((lr) => lr.url === service.landingUrl);
  if (!match) return "development";
  return match.status as ServiceProduct["status"];
}

// ─── KPIs calculation ──────────────────────────────────────────────
function calculateKPIs(
  services: ServiceProduct[],
  landingResults: LandingCheckResult[]
): CatalogKPIs {
  const liveServices = services.filter((s) => s.status === "live");

  // Average prices per category (monthly equivalent)
  const monthlyEquiv = (tier: PricingTier): number => {
    if (tier.priceDetail === "/mes") return tier.price;
    if (tier.priceDetail === "pago único") return tier.price / 12; // amortize 1 year
    if (tier.priceDetail === "/hora" || tier.priceDetail === "/hour")
      return tier.price * 40; // ~40h/month estimate
    return tier.price;
  };

  const avgPrice = (category: string): number => {
    const svcs = services.filter((s) => s.category === category);
    if (svcs.length === 0) return 0;
    const allTiers = svcs.flatMap((s) => s.tiers);
    if (allTiers.length === 0) return 0;
    return Math.round(
      allTiers.reduce((sum, t) => sum + monthlyEquiv(t), 0) / allTiers.length
    );
  };

  // Revenue potential Y1: assume 1 client per highlighted tier per live service, 12 months
  const revenueY1 = liveServices.reduce((sum, svc) => {
    const highlightTier = svc.tiers.find((t) => t.highlight);
    if (!highlightTier) return sum;
    return sum + monthlyEquiv(highlightTier) * 12;
  }, 0);

  return {
    total_services: services.length,
    live_count: liveServices.length,
    total_tiers: services.reduce((acc, s) => acc + s.tiers.length, 0),
    avg_price_consultoria: avgPrice("consultoria"),
    avg_price_orquestacion: avgPrice("orquestacion"),
    revenue_potential_y1: revenueY1,
  };
}

// ─── GET handler ───────────────────────────────────────────────────
export async function GET(request: Request) {
  const config = loadConfig();
  const landingResults = await getLandingStatus(config.landings);

  // Merge service data with dynamic landing status
  const services: ServiceProduct[] = config.services.map((svc) => ({
    ...svc,
    status: deriveServiceStatus(svc, landingResults),
  }));

  const kpis = calculateKPIs(services, landingResults);

  return NextResponse.json({
    services,
    kpis,
    landingStatus: landingResults,
    _meta: {
      source: "data/catalog-services.json",
      lastChecked: landingResults[0]?.checkedAt ?? null,
    },
  });
}
