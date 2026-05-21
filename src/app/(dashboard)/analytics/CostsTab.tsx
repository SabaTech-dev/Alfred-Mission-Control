"use client";

import {
  DollarSign, RefreshCw, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, Pencil, Check, X,
} from "lucide-react";
import { EfficiencyGauge } from "@/components/EfficiencyGauge";
import { TopTasksList } from "@/components/TopTasksList";
import { useI18n } from "@/i18n/provider";
import type { CostData } from "@/lib/costs-data";
import { CostCharts } from "./CostCharts";
import { CostTables } from "./CostTables";

interface CostsTabProps {
  costData: CostData | null;
  costLoading: boolean;
  collecting: boolean;
  timeframe: "7d" | "30d" | "90d";
  setTimeframe: (tf: "7d" | "30d" | "90d") => void;
  fetchCostData: () => void;
  editingBudget: boolean;
  setEditingBudget: (v: boolean) => void;
  budgetInput: string;
  setBudgetInput: (v: string) => void;
  savingBudget: boolean;
  saveBudget: () => void;
}

export function CostsTab({
  costData,
  costLoading,
  collecting,
  timeframe,
  setTimeframe,
  fetchCostData,
  editingBudget,
  setEditingBudget,
  budgetInput,
  setBudgetInput,
  savingBudget,
  saveBudget,
}: CostsTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Timeframe selector + refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          {(["7d", "30d", "90d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: timeframe === tf ? "var(--accent)" : "transparent",
                color: timeframe === tf ? "white" : "var(--text-secondary)",
              }}
            >
              {tf === "7d" ? t("analytics.days7") : tf === "30d" ? t("analytics.days30") : t("analytics.days90")}
            </button>
          ))}
        </div>
        <button
          onClick={fetchCostData}
          disabled={costLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            cursor: costLoading ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={14} className={costLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Loading / error states */}
      {(costLoading || collecting) && !costData ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }}></div>
            <p style={{ color: "var(--text-secondary)" }}>
              {collecting ? t("analytics.collectingData") : t("analytics.loadingCosts")}
            </p>
          </div>
        </div>
      ) : !costData ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-secondary)" }}>{t("analytics.loadCostsError")}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("analytics.costToday")}</span>
                {costData.yesterday > 0 && (
                  <div className="flex items-center gap-1">
                    {((costData.today - costData.yesterday) / costData.yesterday) * 100 > 0 ? (
                      <TrendingUp className="w-3 h-3" style={{ color: "var(--error)" }} />
                    ) : (
                      <TrendingDown className="w-3 h-3" style={{ color: "var(--success)" }} />
                    )}
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                ${costData.today.toFixed(2)}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {t("analytics.vsYesterday", { amount: costData.yesterday.toFixed(2) })}
              </p>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("analytics.costThisMonth")}</span>
              <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                ${costData.thisMonth.toFixed(2)}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {t("analytics.vsLastMonth", { amount: costData.lastMonth.toFixed(2) })}
              </p>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("analytics.projectedEom")}</span>
              <div className="text-3xl font-bold" style={{ color: "var(--warning)" }}>
                ${costData.projected.toFixed(2)}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {t("analytics.basedOnPace")}
              </p>
            </div>

            <BudgetCard
              costData={costData}
              editingBudget={editingBudget}
              setEditingBudget={setEditingBudget}
              budgetInput={budgetInput}
              setBudgetInput={setBudgetInput}
              savingBudget={savingBudget}
              saveBudget={saveBudget}
            />
          </div>

          <EfficiencyGauge />

          {/* Charts grid */}
          <CostCharts costData={costData} />

          <TopTasksList />

          {/* Model pricing + breakdown tables */}
          <CostTables costData={costData} />
        </>
      )}
    </div>
  );
}

// ── Budget card (inline sub-component) ──────────────────────────────

interface BudgetCardProps {
  costData: CostData;
  editingBudget: boolean;
  setEditingBudget: (v: boolean) => void;
  budgetInput: string;
  setBudgetInput: (v: string) => void;
  savingBudget: boolean;
  saveBudget: () => void;
}

function BudgetCard({
  costData,
  editingBudget,
  setEditingBudget,
  budgetInput,
  setBudgetInput,
  savingBudget,
  saveBudget,
}: BudgetCardProps) {
  const { t } = useI18n();
  const usagePercent = (costData.thisMonth / costData.budget) * 100;

  return (
    <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("analytics.budget")}</span>
        <div className="flex items-center gap-2">
          {usagePercent > 80 && (
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--error)" }} />
          )}
          {!editingBudget && (
            <button
              onClick={() => {
                setBudgetInput(costData.budget.toString());
                setEditingBudget(true);
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title={t("analytics.editBudget")}
            >
              <Pencil className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      </div>
      <div
        className="text-3xl font-bold"
        style={{
          color: usagePercent < 60 ? "var(--success)" : usagePercent < 85 ? "var(--warning)" : "var(--error)",
        }}
      >
        {usagePercent.toFixed(0)}%
      </div>
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.min(usagePercent, 100)}%`,
            backgroundColor: usagePercent < 60 ? "var(--success)" : usagePercent < 85 ? "var(--warning)" : "var(--error)",
          }}
        />
      </div>
      {editingBudget ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>$</span>
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="flex-1 px-2 py-1 text-sm rounded"
            style={{
              backgroundColor: "var(--card-elevated)",
              border: "1px solid var(--accent)",
              color: "var(--text-primary)",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") saveBudget();
              if (e.key === "Escape") setEditingBudget(false);
            }}
          />
          <button
            onClick={saveBudget}
            disabled={savingBudget}
            className="p-1 rounded hover:bg-green-500/20 transition-colors"
            title={t("common.save")}
          >
            {savingBudget ? (
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--success)" }} />
            ) : (
              <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
            )}
          </button>
          <button
            onClick={() => setEditingBudget(false)}
            className="p-1 rounded hover:bg-red-500/20 transition-colors"
            title={t("common.cancel")}
          >
            <X className="w-3 h-3" style={{ color: "var(--error)" }} />
          </button>
        </div>
      ) : (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          ${costData.thisMonth.toFixed(2)} / ${costData.budget.toFixed(2)}
        </p>
      )}
    </div>
  );
}
