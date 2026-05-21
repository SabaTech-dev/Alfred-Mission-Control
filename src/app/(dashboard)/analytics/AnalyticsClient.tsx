"use client";

import { BarChart3, DollarSign } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useI18n } from "@/i18n/provider";
import type { AnalyticsClientProps, Tab } from "./types";
import { useAnalyticsData } from "./useAnalyticsData";
import { OverviewTab } from "./OverviewTab";
import { CostsTab } from "./CostsTab";

export default function AnalyticsClient({ initialAnalyticsData, initialCostData }: AnalyticsClientProps) {
  const { t } = useI18n();
  const {
    activeTab,
    setActiveTab,
    collecting,
    costData,
    costLoading,
    timeframe,
    setTimeframe,
    editingBudget,
    setEditingBudget,
    budgetInput,
    setBudgetInput,
    savingBudget,
    fetchCostData,
    saveBudget,
  } = useAnalyticsData(initialCostData);

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: "overview", label: t("analytics.overview"), icon: BarChart3 },
    { id: "costs", label: t("analytics.costs"), icon: DollarSign },
  ];

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8" style={{ backgroundColor: "var(--background)", minHeight: "100vh" }}>
        <div className="mb-4 md:mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            {t("analytics.title")}
          </h1>
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            {t("analytics.subtitle")}
          </p>
        </div>

        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
              style={{
                color: activeTab === id ? "var(--accent)" : "var(--text-secondary)",
                borderBottom: activeTab === id ? "2px solid var(--accent)" : "2px solid transparent",
                borderLeft: "none",
                borderRight: "none",
                borderTop: "none",
                background: "none",
                cursor: "pointer",
                paddingBottom: "0.5rem",
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <OverviewTab data={initialAnalyticsData} />}
        {activeTab === "costs" && (
          <CostsTab
            costData={costData}
            costLoading={costLoading}
            collecting={collecting}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            fetchCostData={fetchCostData}
            editingBudget={editingBudget}
            setEditingBudget={setEditingBudget}
            budgetInput={budgetInput}
            setBudgetInput={setBudgetInput}
            savingBudget={savingBudget}
            saveBudget={saveBudget}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
