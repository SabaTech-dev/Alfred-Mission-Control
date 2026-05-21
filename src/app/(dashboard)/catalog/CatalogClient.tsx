"use client";

import { Package, Cpu, RefreshCw } from "lucide-react";
import type { CatalogTab } from "@/lib/catalog-types";
import { useCatalogData } from "./useCatalogData";
import { ServicesTab } from "./ServicesTab";
import { InventoryTab } from "./InventoryTab";

export default function CatalogClient() {
  const {
    tab,
    setTab,
    data,
    inventory,
    expanded,
    setExpanded,
    filterCategory,
    setFilterCategory,
    skillSearch,
    setSkillSearch,
    loading,
    refreshing,
    lastRefresh,
    refresh,
  } = useCatalogData();

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
          onClick={refresh}
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
        {([
          { key: "services" as CatalogTab, label: "Servicios", icon: Package },
          { key: "inventory" as CatalogTab, label: "Inventario Sistema", icon: Cpu },
        ]).map((t) => (
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

      {/* Tab content */}
      {tab === "services" && (
        <ServicesTab
          services={services}
          kpis={kpis}
          landingStatus={landingStatus}
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
          expanded={expanded}
          onToggleExpand={setExpanded}
          lastRefresh={lastRefresh}
        />
      )}

      {tab === "inventory" && inventory && (
        <InventoryTab
          inventory={inventory}
          skillSearch={skillSearch}
          onSkillSearchChange={setSkillSearch}
        />
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
