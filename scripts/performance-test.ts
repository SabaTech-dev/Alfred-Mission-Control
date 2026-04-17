#!/usr/bin/env node
/**
 * Performance Testing Suite for Mission Control
 *
 * Runs load tests against Mission Control API endpoints and
 * reports response times, throughput, and error rates.
 *
 * Usage:
 *   node scripts/performance-test.ts [--endpoint URL] [--requests N] [--concurrency N]
 */

const DEFAULT_ENDPOINT = "http://127.0.0.1:3000";
const DEFAULT_REQUESTS = 100;
const DEFAULT_CONCURRENCY = 10;

const ENDPOINTS = [
  { path: "/api/health", method: "GET", name: "Health Check" },
  { path: "/api/system/stats", method: "GET", name: "System Stats" },
  { path: "/api/system/performance", method: "GET", name: "Performance Metrics" },
  { path: "/api/system/uptime", method: "GET", name: "Uptime" },
  { path: "/api/system/services", method: "GET", name: "Services" },
  { path: "/api/kanban/stats", method: "GET", name: "Kanban Stats" },
  { path: "/api/system/backups", method: "GET", name: "Backup List" },
];

interface TestResult {
  endpoint: string;
  method: string;
  name: string;
  totalRequests: number;
  successful: number;
  failed: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errors: string[];
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runEndpointTest(
  baseUrl: string,
  endpoint: { path: string; method: string; name: string },
  totalRequests: number,
  concurrency: number
): Promise<TestResult> {
  const results: number[] = [];
  const errors: string[] = [];
  let successful = 0;

  async function singleRequest(): Promise<{ time: number; ok: boolean; error?: string }> {
    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}${endpoint.path}`, { method: endpoint.method });
      const time = performance.now() - start;
      if (res.ok) {
        return { time, ok: true };
      }
      return { time, ok: false, error: `HTTP ${res.status}` };
    } catch (err) {
      const time = performance.now() - start;
      return { time, ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  // Run in batches of concurrency
  for (let i = 0; i < totalRequests; i += concurrency) {
    const batch = Math.min(concurrency, totalRequests - i);
    const promises = Array.from({ length: batch }, () => singleRequest());
    const batchResults = await Promise.all(promises);

    for (const r of batchResults) {
      results.push(r.time);
      if (r.ok) {
        successful++;
      } else if (r.error) {
        errors.push(r.error);
      }
    }
  }

  const sorted = [...results].sort((a, b) => a - b);

  return {
    endpoint: endpoint.path,
    method: endpoint.method,
    name: endpoint.name,
    totalRequests,
    successful,
    failed: totalRequests - successful,
    minMs: sorted[0] || 0,
    maxMs: sorted[sorted.length - 1] || 0,
    avgMs: results.reduce((a, b) => a + b, 0) / results.length || 0,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    errors: [...new Set(errors)],
  };
}

function formatMs(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(1)}ms`;
}

function printResults(results: TestResult[]): void {
  console.log("\n" + "=".repeat(90));
  console.log("  MISSION CONTROL — Performance Test Results");
  console.log("=".repeat(90));

  for (const r of results) {
    const status = r.failed === 0 ? "✅" : "⚠️";
    console.log(`\n${status} ${r.name} (${r.method} ${r.endpoint})`);
    console.log(`   Requests: ${r.totalRequests} | Success: ${r.successful} | Failed: ${r.failed}`);
    console.log(`   Latency: min=${formatMs(r.minMs)} avg=${formatMs(r.avgMs)} max=${formatMs(r.maxMs)}`);
    console.log(`   Percentiles: p50=${formatMs(r.p50Ms)} p95=${formatMs(r.p95Ms)} p99=${formatMs(r.p99Ms)}`);
    if (r.errors.length > 0) {
      console.log(`   Errors: ${r.errors.join(", ")}`);
    }
  }

  // Summary
  const totalReqs = results.reduce((a, r) => a + r.totalRequests, 0);
  const totalSuccess = results.reduce((a, r) => a + r.successful, 0);
  const avgLatency = results.reduce((a, r) => a + r.avgMs, 0) / results.length;

  console.log("\n" + "-".repeat(90));
  console.log(`  SUMMARY: ${totalReqs} requests | ${totalSuccess}/${totalReqs} success (${((totalSuccess / totalReqs) * 100).toFixed(1)}%) | avg latency: ${formatMs(avgLatency)}`);
  console.log("-".repeat(90) + "\n");
}

// --- Main ---
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let baseUrl = DEFAULT_ENDPOINT;
  let requests = DEFAULT_REQUESTS;
  let concurrency = DEFAULT_CONCURRENCY;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--endpoint" && args[i + 1]) baseUrl = args[++i];
    if (args[i] === "--requests" && args[i + 1]) requests = parseInt(args[++i], 10);
    if (args[i] === "--concurrency" && args[i + 1]) concurrency = parseInt(args[++i], 10);
  }

  console.log(`Running performance tests against ${baseUrl}`);
  console.log(`Config: ${requests} requests per endpoint, ${concurrency} concurrent`);

  const results: TestResult[] = [];

  for (const endpoint of ENDPOINTS) {
    const result = await runEndpointTest(baseUrl, endpoint, requests, concurrency);
    results.push(result);
  }

  printResults(results);

  // Exit with error if any endpoint had >50% failures
  const hasFailures = results.some((r) => r.failed > r.totalRequests * 0.5);
  process.exit(hasFailures ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
