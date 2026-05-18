"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  ExternalLink,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  TrendingUp,
  Layers,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Bot,
  Wrench,
  Cpu,
  Activity,
  Search,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatPrice,
  type ServiceProduct,
  type CatalogKPIs,
  type ServiceCategory,
  type LandingCheckResult,
} from "@/lib/catalog-types";

// ─── Inventory types ────────────────────────────────────────────────
interface AgentInfo {
  name: string;
  id: string;
  agentDir: string;
  model: { primary: string; fallbacks: string[] };
  isDefault: boolean;
  status: "active" | "inactive";
  heartbeatEvery?: string;
}

interface SkillInfo {
  name: string;
  source: "system" | "workspace" | "plugin" | "agent";
  location: string;
  hasSKILL: boolean;
}

interface InventoryData {
  agents: AgentInfo[];
  skills: {
    system: SkillInfo[];
    workspace: SkillInfo[];
    plugin: SkillInfo[];
    total: number;
  };
  models: {
    available: { id: string; alias?: string }[];
    default: string;
  };
  mcps: { name: string; configured: boolean; source?: string }[];
  timestamp: string;
}

interface CatalogData {
  services: ServiceProduct[];
  kpis: CatalogKPIs;
  landingStatus: LandingCheckResult[];
  _meta: { source: string; lastChecked: string | null };
}

type Tab = "services" | "inventory";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const SKILL_SOURCE_COLORS: Record<string, string> = {
  system: "#3b82f6",
  workspace: "#8b5cf6",
  plugin: "#f59e0b",
};

const SKILL_SOURCE_LABELS: Record<string, string> = {
  system: "Sistema",
  workspace: "Workspace",
  plugin: "Plugin",
};

// Categorize agents by role
function getAgentCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alfred") || n.includes("main") || n.includes("principal"))
    return "Orquestación";
  if (n.includes("coder") || n.includes("code"))
    return "Coding";
  if (n.includes("security")) return "Security";
  if (n.includes("research")) return "Research";
  if (n.includes("devops") || n.includes("infra")) return "DevOps";
  if (n.includes("qa") || n.includes("test")) return "Testing";
  if (n.includes("opencode")) return "Development";
  return "Otro";
}

export default function CatalogClient() {
  const [tab, setTab] = useState<Tab>("services");
  const [data, setData] = useState<CatalogData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<
    ServiceCategory | "all"
  >("all");
  const [skillSearch, setSkillSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchCatalog = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/catalog");
      const d = await res.json();
      setData(d);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error loading catalog:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/inventory");
      const d = await res.json();
      setInventory(d);
    } catch (err) {
      console.error("Error loading inventory:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCatalog(true), fetchInventory()]);
  }, [fetchCatalog, fetchInventory]);

  useEffect(() => {
    const interval = setInterval(() => fetchCatalog(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCatalog]);

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

  const { services, kpis, landingStatus } = data;
  const filtered =
    filterCategory === "all"
      ? services
      : services.filter((s) => s.category === filterCategory);

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
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            <Package
              style={{
                display: "inline",
                marginRight: "8px",
                verticalAlign: "middle",
              }}
            />
            Catálogo & Inventario
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Servicios SabaTech + Inventario del sistema en vivo
          </p>
        </div>
        <button
          onClick={() => { fetchCatalog(true); fetchInventory(); }}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-elevated)",
            color: "var(--text-secondary)",
            cursor: refreshing ? "wait" : "pointer",
            fontSize: "13px",
          }}
        >
          <RefreshCw
            style={{
              width: "14px",
              height: "14px",
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          {refreshing ? "Actualizando..." : "Refrescar"}
        </button>
      </div>

      {/* Tab selector */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "24px",
          borderBottom: "2px solid var(--border)",
        }}
      >
        {[
          { key: "services" as Tab, label: "Servicios", icon: Package },
          { key: "inventory" as Tab, label: "Inventario Sistema", icon: Cpu },
        ].map((t, i) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "var(--accent)" : "var(--text-secondary)",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
            }}
          >
            <t.icon style={{ width: "16px", height: "16px" }} />
            {t.label}
            {t.key === "inventory" && inventory && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                {inventory.agents.length}A · {inventory.skills.total}S
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB: SERVICES ═══ */}
      {tab === "services" && (
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
              <div
                key={service.id}
                style={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
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
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: CATEGORY_COLORS[service.category],
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: CATEGORY_COLORS[service.category],
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {CATEGORY_LABELS[service.category]}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
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
                    <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                      {service.name}
                    </h2>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                      {service.tagline}
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                      {service.tiers.map((tier) => (
                        <span
                          key={tier.name}
                          style={{
                            fontSize: "12px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor: tier.highlight ? "var(--accent-soft)" : "var(--surface)",
                            color: tier.highlight ? "var(--accent)" : "var(--text-secondary)",
                            fontWeight: tier.highlight ? 600 : 400,
                            border: tier.highlight ? "1px solid var(--accent)" : "1px solid var(--border)",
                          }}
                        >
                          {tier.name} — {formatPrice(tier.price)}
                          {tier.priceDetail !== "pago único" ? tier.priceDetail : ""}
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
                        <Globe style={{ width: 14, height: 14 }} />
                        Landing
                      </a>
                    )}
                    {expanded === service.id ? (
                      <ChevronUp style={{ width: 20, height: 20, color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronDown style={{ width: 20, height: 20, color: "var(--text-muted)" }} />
                    )}
                  </div>
                </div>
                {expanded === service.id && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "20px" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.6 }}>
                      {service.description}
                    </p>
                    {service.frameworks && service.frameworks.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                        {service.frameworks.map((fw) => (
                          <span
                            key={fw}
                            style={{
                              fontSize: 11,
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
                            border: tier.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
                            backgroundColor: tier.highlight ? "var(--accent-soft)" : "var(--surface)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                              {tier.name}
                              {tier.highlight && (
                                <Sparkles
                                  style={{ display: "inline", width: 14, height: 14, marginLeft: 4, color: "var(--accent)", verticalAlign: "middle" }}
                                />
                              )}
                            </span>
                          </div>
                          <div style={{ marginBottom: "8px" }}>
                            <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
                              {formatPrice(tier.price)}
                            </span>
                            <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: 4 }}>
                              {tier.priceDetail}
                            </span>
                          </div>
                          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                            {tier.description}
                          </p>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {tier.features.map((f) => (
                              <li
                                key={f}
                                style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}
                              >
                                <Check style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0, marginTop: "1px" }} />
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
        </>
      )}

      {/* ═══ TAB: INVENTORY ═══ */}
      {tab === "inventory" && inventory && (
        <div>
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {[
              { label: "Agentes", value: inventory.agents.length, icon: Bot, color: "#8b5cf6" },
              { label: "Skills", value: inventory.skills.total, icon: Wrench, color: "#3b82f6" },
              { label: "Modelos", value: inventory.models.available.length, icon: Cpu, color: "#10b981" },
              { label: "MCPs", value: inventory.mcps.length, icon: Activity, color: "#f59e0b" },
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
                <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* ─── Agents Section ─── */}
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Bot style={{ width: "20px", height: "20px", color: "#8b5cf6" }} />
            Agentes ({inventory.agents.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
            {inventory.agents.map((agent) => {
              const cat = getAgentCategory(agent.name);
              return (
                <div
                  key={agent.id}
                  style={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "10px",
                          backgroundColor: "#8b5cf620",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                        }}
                      >
                        🤖
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {agent.name}
                          </span>
                          {agent.isDefault && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "8px",
                                backgroundColor: "#f59e0b20",
                                color: "#f59e0b",
                                fontWeight: 600,
                              }}
                            >
                              DEFAULT
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              backgroundColor: "#10b98120",
                              color: "#10b981",
                            }}
                          >
                            {cat}
                          </span>
                        </div>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {agent.id}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                        {agent.model.primary}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {agent.model.fallbacks.length} fallbacks
                      </div>
                    </div>
                  </div>
                  {agent.heartbeatEvery && (
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
                      💓 Heartbeat: {agent.heartbeatEvery}
                    </div>
                  )}
                  {/* Model fallback chain */}
                  {agent.model.fallbacks.length > 0 && (
                    <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>Chain:</span>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#8b5cf620",
                          color: "#8b5cf6",
                          fontWeight: 600,
                        }}
                      >
                        {agent.model.primary}
                      </span>
                      {agent.model.fallbacks.slice(0, 3).map((fb, i) => (
                        <span key={i} style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          → {fb}
                        </span>
                      ))}
                      {agent.model.fallbacks.length > 3 && (
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          +{agent.model.fallbacks.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Skills Section ─── */}
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Wrench style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
            Skills ({inventory.skills.total})
          </h2>
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-elevated)",
            }}
          >
            <Search style={{ width: "16px", height: "16px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar skills..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: "var(--text-primary)",
                fontSize: "14px",
                width: "100%",
              }}
            />
          </div>
          {(["system", "workspace", "plugin"] as const).map((source) => {
            const skills = inventory.skills[source];
            const filtered = skillSearch
              ? skills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()))
              : skills;
            if (filtered.length === 0) return null;
            return (
              <div key={source} style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: SKILL_SOURCE_COLORS[source],
                    marginBottom: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: SKILL_SOURCE_COLORS[source],
                    }}
                  />
                  {SKILL_SOURCE_LABELS[source]} ({filtered.length})
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  {filtered.map((skill) => (
                    <span
                      key={skill.name}
                      style={{
                        fontSize: "12px",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--surface-elevated)",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {skill.hasSKILL ? "✓" : "○"} {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* ─── Models Section ─── */}
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "16px",
              marginTop: "32px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Cpu style={{ width: "20px", height: "20px", color: "#10b981" }} />
            Modelos Disponibles ({inventory.models.available.length})
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Default: <strong>{inventory.models.default}</strong>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "32px" }}>
            {inventory.models.available.map((m) => (
              <span
                key={m.id}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  backgroundColor: m.id === inventory.models.default ? "#10b98120" : "var(--surface-elevated)",
                  color: m.id === inventory.models.default ? "#10b981" : "var(--text-secondary)",
                  fontWeight: m.id === inventory.models.default ? 600 : 400,
                }}
                title={m.id}
              >
                {m.alias || m.id}
              </span>
            ))}
          </div>

          {/* ─── MCPs Section ─── */}
          {inventory.mcps.length > 0 && (
            <>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Activity style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
                MCPs / Integraciones ({inventory.mcps.length})
              </h2>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {inventory.mcps.map((mcp) => (
                  <div
                    key={mcp.name}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--surface-elevated)",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>{mcp.name}</div>
                    {mcp.source && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{mcp.source}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Timestamp */}
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "24px" }}>
            Inventario generado: {new Date(inventory.timestamp).toLocaleString("es-ES")}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
