"use client";

import { ActivityFeed } from "@/components/ActivityFeed";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/i18n/provider";
import type { DashboardTelemetryResponse } from "@/lib/telemetry/types";

import { DashboardAgentGrid } from "./DashboardAgentGrid";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardStatsCards } from "./DashboardStatsCards";
import { useDashboardTelemetry } from "./useDashboardTelemetry";

export interface DashboardClientProps {
  initialTelemetry: DashboardTelemetryResponse | null;
}

export default function DashboardClient({ initialTelemetry }: DashboardClientProps) {
  const { t } = useI18n();
  const { telemetry, telemetryLoading, telemetryError, handleRetry } =
    useDashboardTelemetry(initialTelemetry);

  // Loading skeleton while telemetry loads client-side
  if (!telemetry) {
    return (
      <ErrorBoundary>
        <div className="p-4 md:p-8">
          <PageHeader
            title={t("dashboard.title")}
            subtitle={t("dashboard.overview")}
            helpTitle={t("help.dashboard.title")}
            helpDescription={t("help.dashboard.description")}
          />
          <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
            <div className="text-center">
              <div className="animate-pulse text-lg">{t("dashboard.telemetry.loading")}</div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8">
        <PageHeader
          title={t("dashboard.title")}
          subtitle={t("dashboard.overview")}
          helpTitle={t("help.dashboard.title")}
          helpDescription={t("help.dashboard.description")}
        />

        <DashboardStatsCards
          totalActivities={telemetry.summary.totalActivities}
          todayActivities={telemetry.summary.todayActivities}
          successfulActivities={telemetry.summary.successfulActivities}
          failedActivities={telemetry.summary.failedActivities}
        />

        <DashboardAgentGrid
          agents={telemetry.agents}
          degraded={telemetry.degraded}
          freshness={telemetry.freshness}
          loading={telemetryLoading}
          error={telemetryError}
          onRetry={handleRetry}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div
            className="lg:col-span-2 rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="accent-line" />
                <h2
                  className="text-base font-semibold"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--text-primary)",
                  }}
                >
                  {t("dashboard.recentActivity")}
                </h2>
              </div>
            </div>
            <div className="p-0">
              <ActivityFeed limit={5} />
            </div>
          </div>

          <DashboardSidebar />
        </div>
      </div>
    </ErrorBoundary>
  );
}
