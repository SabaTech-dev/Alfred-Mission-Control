import { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ApiResponseTimeEntry {
  endpoint: string;
  responseTime?: number;
  status: string;
  error?: string;
}

export interface PerformanceResults {
  timestamp: string;
  apiResponseTimes?: ApiResponseTimeEntry[];
  lighthouseScores?: Record<string, number> | null;
  bundleSize?: { main?: number; total?: number } | null;
  alertCount?: number;
}

export interface BaselineEntry {
  responseTime: number;
  status: string;
}

export interface BaselineMetrics {
  lighthouse?: boolean;
  apiResponseTime?: {
    timestamp: string;
    endpoints: Record<string, BaselineEntry>;
  };
  bundleSize?: unknown;
}

export interface PerformanceData {
  results: PerformanceResults | null;
  baseline: BaselineMetrics | null;
  recentLogs: string[];
  serverTime: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "CRITICAL";
  category: string;
  message: string;
  endpoint?: string | null;
  value?: number | null;
  threshold?: number | null;
}

export interface AlertsData {
  alerts: Alert[];
  summary: { total: number; critical: number; warnings: number; info: number };
}

export interface HistoryPoint {
  timestamp: string;
  apiResponseTimes: Array<{
    endpoint: string;
    responseTime: number;
    status: string;
  }>;
  alertCount: number;
}

export interface TrendInfo {
  avg: number;
  min: number;
  max: number;
  current: number;
  sampleCount: number;
}

export interface HistoryData {
  dataPoints: HistoryPoint[];
  totalPoints: number;
  trendSummary: Record<string, TrendInfo>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function statusColor(status: string): string {
  if (status === "success" || status === "OK") return "var(--success)";
  if (status === "ERROR" || status === "error" || status === "SLOW") return "var(--error)";
  return "var(--warning)";
}

export function alertLevelColor(level: string): string {
  if (level === "CRITICAL") return "var(--error)";
  if (level === "WARN") return "var(--warning)";
  return "var(--info)";
}

export function formatMs(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`;
}

export function logLevelColor(line: string): string {
  if (line.includes("[ERROR]")) return "var(--error)";
  if (line.includes("[WARN]")) return "var(--warning)";
  return "var(--text-secondary)";
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface UsePerformanceReturn {
  data: PerformanceData | null;
  alertsData: AlertsData | null;
  historyData: HistoryData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;

  // Derived
  results: PerformanceResults | null;
  baseline: BaselineMetrics | null;
  apiEndpoints: ApiResponseTimeEntry[];
  healthyCount: number;
  errorCount: number;
  baselineEndpoints: Record<string, BaselineEntry>;
  alerts: Alert[];
  alertSummary: { total: number; critical: number; warnings: number; info: number };
  trendSummary: Record<string, TrendInfo>;
  sparklineData: Record<string, number[]>;
}

export function usePerformance(): UsePerformanceReturn {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [perfRes, alertsRes, histRes] = await Promise.allSettled([
        fetch("/api/performance"),
        fetch("/api/performance/alerts?limit=20"),
        fetch("/api/performance/history?limit=60"),
      ]);

      if (perfRes.status === "fulfilled" && perfRes.value.ok) {
        setData(await perfRes.value.json());
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        setAlertsData(await alertsRes.value.json());
      }
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        setHistoryData(await histRes.value.json());
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const results = data?.results ?? null;
  const baseline = data?.baseline ?? null;
  const apiEndpoints = results?.apiResponseTimes ?? [];
  const healthyCount = apiEndpoints.filter((e) => e.status === "OK").length;
  const errorCount = apiEndpoints.filter((e) => e.status === "ERROR" || e.status === "SLOW").length;
  const baselineEndpoints = baseline?.apiResponseTime?.endpoints ?? {};
  const alerts = alertsData?.alerts ?? [];
  const alertSummary = alertsData?.summary ?? { total: 0, critical: 0, warnings: 0, info: 0 };
  const trendSummary = historyData?.trendSummary ?? {};

  const sparklineData: Record<string, number[]> = {};
  if (historyData?.dataPoints) {
    for (const point of historyData.dataPoints) {
      for (const ep of point.apiResponseTimes) {
        if (!sparklineData[ep.endpoint]) sparklineData[ep.endpoint] = [];
        sparklineData[ep.endpoint].push(ep.responseTime);
      }
    }
  }

  return {
    data,
    alertsData,
    historyData,
    loading,
    error,
    refresh: fetchData,
    results,
    baseline,
    apiEndpoints,
    healthyCount,
    errorCount,
    baselineEndpoints,
    alerts,
    alertSummary,
    trendSummary,
    sparklineData,
  };
}
