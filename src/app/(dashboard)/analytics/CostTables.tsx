"use client";

import { useI18n } from "@/i18n/provider";
import { MODEL_PRICING } from "@/lib/pricing-types";
import type { CostData } from "@/lib/costs-data";

interface CostTablesProps {
  costData: CostData;
}

export function CostTables({ costData }: CostTablesProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Model pricing table */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("analytics.modelPricing")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.model")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.input")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.output")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.cacheRead")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.cacheWrite")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.context")}</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_PRICING.map((model) => (
                <tr key={model.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 px-4">
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{model.name}</span>
                  </td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-primary)" }}>${model.inputPricePerMillion}</td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-primary)" }}>${model.outputPricePerMillion}</td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-secondary)" }}>
                    {model.cacheReadPricePerMillion ? `$${model.cacheReadPricePerMillion}` : "-"}
                  </td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-secondary)" }}>
                    {model.cacheWritePricePerMillion ? `$${model.cacheWritePricePerMillion}` : "-"}
                  </td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-muted)" }}>{(model.contextWindow / 1000).toFixed(0)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed breakdown table */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("analytics.detailedBreakdown")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.agent")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.tokensCol")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.cost")}</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("analytics.percentOfTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {costData.byAgent.map((agent) => {
                const percent = (agent.cost / costData.thisMonth) * 100;
                return (
                  <tr key={agent.agent} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-3 px-4">
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{agent.agent}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                      {agent.tokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                      ${agent.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right" style={{ color: "var(--text-secondary)" }}>
                      {percent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
