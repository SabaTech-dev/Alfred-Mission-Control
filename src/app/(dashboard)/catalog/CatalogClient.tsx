"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ExternalLink,
  Globe,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  TrendingUp,
  DollarSign,
  Layers,
  CircleDot,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type ServiceProduct,
  type CatalogKPIs,
  type ServiceCategory,
} from "@/lib/catalog-types";

interface CatalogData {
  services: ServiceProduct[];
  kpis: CatalogKPIs;
}

export default function CatalogClient() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
        <div style={{ color: "var(--text-secondary)" }}>Cargando catálogo...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
        <div style={{ color: "var(--error)" }}>Error cargando catálogo</div>
      </div>
    );
  }

  const { services, kpis } = data;
  const filtered =
    filterCategory === "all"
      ? services
      : services.filter((s) => s.category === filterCategory);

  const kpiCards = [
    {
      label: "Servicios",
      value: kpis.total_services,
      icon: Package,
      color: "#3b82f6",
    },
    {
      label: "En vivo",
      value: kpis.live_count,
      icon: Globe,
      color: "#10b981",
    },
    {
      label: "Tiers totales",
      value: kpis.total_tiers,
      icon: Layers,
      color: "#8b5cf6",
    },
    {
      label: "Revenue Y1",
      value: `€${(kpis.revenue_potential_y1 / 1000).toFixed(0)}K`,
      icon: TrendingUp,
      color: "#f59e0b",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            <Package style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
            Catálogo de Servicios
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Servicios SabaTech — Pricing, landings y estado
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {kpiCards.map((kpi) => (
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

      {/* Filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button
          onClick={() => setFilterCategory("all")}
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
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: filterCategory === cat ? 600 : 400,
              border: "1px solid",
              borderColor: filterCategory === cat ? CATEGORY_COLORS[cat] : "var(--border)",
              backgroundColor:
                filterCategory === cat ? `${CATEGORY_COLORS[cat]}20` : "transparent",
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
          <div
            key={service.id}
            style={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {/* Service Header */}
            <div
              style={{
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                cursor: "pointer",
              }}
              onClick={() => setExpanded(expanded === service.id ? null : service.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: CATEGORY_COLORS[service.category],
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: CATEGORY_COLORS[service.category],
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {CATEGORY_LABELS[service.category]}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      backgroundColor: `${STATUS_COLORS[service.status]}20`,
                      color: STATUS_COLORS[service.status],
                      fontWeight: 500,
                    }}
                  >
                    {STATUS_LABELS[service.status]}
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: "0 0 4px 0",
                  }}
                >
                  {service.name}
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                  {service.tagline}
                </p>
                {/* Tier pills */}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  {service.tiers.map((tier) => (
                    <span
                      key={tier.name}
                      style={{
                        fontSize: "12px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        backgroundColor: tier.highlight
                          ? "var(--accent-soft)"
                          : "var(--surface)",
                        color: tier.highlight ? "var(--accent)" : "var(--text-secondary)",
                        fontWeight: tier.highlight ? 600 : 400,
                        border: tier.highlight ? "1px solid var(--accent)" : "1px solid var(--border)",
                      }}
                    >
                      {tier.name} — {tier.price}{tier.priceDetail !== "pago único" ? tier.priceDetail : ""}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {service.landingUrl && (
                  <a
                    href={service.landingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: "var(--accent)",
                      textDecoration: "none",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      backgroundColor: "var(--accent-soft)",
                    }}
                  >
                    <Globe style={{ width: "14px", height: "14px" }} />
                    Landing
                  </a>
                )}
                {expanded === service.id ? (
                  <ChevronUp style={{ width: "20px", height: "20px", color: "var(--text-muted)" }} />
                ) : (
                  <ChevronDown style={{ width: "20px", height: "20px", color: "var(--text-muted)" }} />
                )}
              </div>
            </div>

            {/* Expanded: Tiers detail */}
            {expanded === service.id && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "20px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    marginBottom: "16px",
                    lineHeight: 1.6,
                  }}
                >
                  {service.description}
                </p>

                {service.frameworks && (
                  <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                    {service.frameworks.map((fw) => (
                      <span
                        key={fw}
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {fw}
                      </span>
                    ))}
                  </div>
                )}

                {service.targetMarket && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                    🎯 Target: {service.targetMarket}
                  </p>
                )}

                {/* Tier cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {service.tiers.map((tier) => (
                    <div
                      key={tier.name}
                      style={{
                        padding: "16px",
                        borderRadius: "10px",
                        border: tier.highlight
                          ? "2px solid var(--accent)"
                          : "1px solid var(--border)",
                        backgroundColor: tier.highlight ? "var(--accent-soft)" : "var(--surface)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {tier.name}
                          {tier.highlight && (
                            <Sparkles
                              style={{
                                display: "inline",
                                width: "14px",
                                height: "14px",
                                marginLeft: "4px",
                                color: "var(--accent)",
                                verticalAlign: "middle",
                              }}
                            />
                          )}
                        </span>
                      </div>
                      <div style={{ marginBottom: "8px" }}>
                        <span
                          style={{
                            fontSize: "22px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {tier.price}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--text-muted)",
                            marginLeft: "4px",
                          }}
                        >
                          {tier.priceDetail}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginBottom: "12px",
                        }}
                      >
                        {tier.description}
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {tier.features.map((f) => (
                          <li
                            key={f}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "6px",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              marginBottom: "4px",
                            }}
                          >
                            <Check
                              style={{
                                width: "14px",
                                height: "14px",
                                color: "var(--accent)",
                                flexShrink: 0,
                                marginTop: "1px",
                              }}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
