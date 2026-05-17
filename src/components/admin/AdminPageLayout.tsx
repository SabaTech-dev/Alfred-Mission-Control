"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Activity,
  Database,
  Heart,
  Gauge,
  Users,
  Bug,
  Settings,
  ScanSearch,
  FileCheck,
  Server,
  DollarSign,
  ToggleLeft,
  Plug,
  HardDrive,
  ArrowLeft,
} from "lucide-react";

const adminPages = [
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
  { href: "/admin/performance-metrics", label: "Performance", icon: Gauge },
  { href: "/admin/database-backups", label: "DB Backups", icon: Database },
  { href: "/admin/system-health", label: "System Health", icon: Heart },
  { href: "/admin/api-usage", label: "API Usage", icon: Activity },
  { href: "/admin/user-audit", label: "User Audit", icon: Users },
  { href: "/admin/error-tracking", label: "Error Tracking", icon: Bug },
  { href: "/admin/config-audit", label: "Config Audit", icon: Settings },
  { href: "/admin/security-scan", label: "Security Scan", icon: ScanSearch },
  { href: "/admin/compliance-reports", label: "Compliance", icon: FileCheck },
  { href: "/admin/cluster-status", label: "Cluster Status", icon: Server },
  { href: "/admin/cost-optimization", label: "Cost Optimize", icon: DollarSign },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/integrations-status", label: "Integrations", icon: Plug },
  { href: "/admin/legacy-migration", label: "Legacy Migration", icon: HardDrive },
];

export function AdminPageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: "0.75rem",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Admin Dashboard
        </Link>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.25rem",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "var(--card)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
        }}
      >
        {adminPages.map((page) => {
          const Icon = page.icon;
          const isActive = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                textDecoration: "none",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: isActive ? "var(--accent)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {page.label}
            </Link>
          );
        })}
      </div>

      <div
        style={{
          backgroundColor: "var(--card)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          padding: "1.5rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}
