"use client";

import {
  Package,
  Globe,
  Layers,
  TrendingUp,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type ServiceCategory,
  type CatalogKPIs,
  type LandingCheckResult,
  type ServiceProduct,
} from "@/lib/catalog-types";
import { ServiceCard } from "./ServiceCard";

interface ServicesTabProps {
  services: ServiceProduct[];
  kpis: CatalogKPIs;
  landingStatus: LandingCheckResult[];
  filterCategory: ServiceCategory | "all";
  onFilterChange: (cat: ServiceCategory | "all") => void;
  expanded: string | null;
  onToggleExpand: (id: string) => void;
  lastRefresh: Date | null;
}

export function ServicesTab({
  services,
  kpis,
  landingStatus,
  filterCategory,
  onFilterChange,
  expanded,
  onToggleExpand,
  lastRefresh,
}: ServicesTabProps) {
  const filtered =
    filterCategory === "all"
      ? services
      : services.filter((s) => s.category === filterCategory);

  return (
    <>
      {/* Landing Status Bar */}
      {landingStatus && landingStatus.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {landingStatus.map((ls) => (
            <div
              key={ls.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-elevated)",
                fontSize: "13px",
              }}
            >
              {ls.status === "live" ? (
                <Wifi style={{ width: 14, height: 14, color: "#10b981" }} />
              ) : ls.status === "error" ? (
                <WifiOff style={{ width: 14, height: 14, color: "#ef4444" }} />
              ) : (
                <Clock style={{ width: 14, height: 14, color: "#3b82f6" }} />
              )}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {ls.label}
              </span>
              {ls.responseTimeMs != null && (
                <span
                  style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}
                >
                  {ls.responseTimeMs}ms
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Servicios", value: kpis.total_services, icon: Package, color: "#3b82f6" },
          { label: "En vivo", value: kpis.live_count, icon: Globe, color: "#10b981" },
          { label: "Tiers totales", value: kpis.total_tiers, icon: Layers, color: "#8b5cf6" },
          {
            label: "Revenue Y1",
            value: `€${(kpis.revenue_potential_y1 / 1000).toFixed(0)}K`,
            icon: TrendingUp,
            color: "#f59e0b",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <kpi.icon style={{ width: "16px", height: "16px", color: kpi.color }} />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {lastRefresh && (
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
          Última actualización:{" "}
          {lastRefresh.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} ·
          Auto-refresh cada 5 min
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button
          onClick={() => onFilterChange("all")}
          style={{
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: filterCategory === "all" ? 600 : 400,
            border: "1px solid",
            borderColor: filterCategory === "all" ? "var(--accent)" : "var(--border)",
            backgroundColor: filterCategory === "all" ? "var(--accent-soft)" : "transparent",
            color: filterCategory === "all" ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          Todos
        </button>
        {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => onFilterChange(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: filterCategory === cat ? 600 : 400,
              border: "1px solid",
              borderColor: filterCategory === cat ? CATEGORY_COLORS[cat] : "var(--border)",
              backgroundColor: filterCategory === cat ? `${CATEGORY_COLORS[cat]}20` : "transparent",
              color: filterCategory === cat ? CATEGORY_COLORS[cat] : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Service Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isExpanded={expanded === service.id}
            onToggle={() => onToggleExpand(service.id)}
          />
        ))}
      </div>
    </>
  );
}
