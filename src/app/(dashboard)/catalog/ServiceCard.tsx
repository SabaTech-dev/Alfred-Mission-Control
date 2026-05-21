"use client";

import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Globe,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatPrice,
  type ServiceProduct,
} from "@/lib/catalog-types";

interface ServiceCardProps {
  service: ServiceProduct;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ServiceCard({ service, isExpanded, onToggle }: ServiceCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div style={{ flex: 1 }}>
          {/* Category + Status badges */}
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
          {/* Name + Tagline */}
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
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
        {/* Actions */}
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
          {isExpanded ? (
            <ChevronUp style={{ width: 20, height: 20, color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown style={{ width: 20, height: 20, color: "var(--text-muted)" }} />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
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
          {/* Tier detail cards */}
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
  );
}
