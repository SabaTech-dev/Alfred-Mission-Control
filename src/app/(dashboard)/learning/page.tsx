"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Lightbulb,
  Star,
  Zap,
  FileWarning,
  RotateCcw,
  ListChecks,
  Activity,
} from "lucide-react";

import TechRadarVisual from "@/components/TechRadarVisual";

import type {
  Data,
  PDCAData,
  SkillsAuditData,
  FeatureTrackerData,
  RadarData,
  Tab,
} from "@/lib/learning-types";

import { LearningsTab } from "./LearningsTab";
import { ErrorsTab } from "./ErrorsTab";
import { FeaturesTab } from "./FeaturesTab";
import { PDCACyclesTab } from "./PDCACyclesTab";
import { SkillsAuditTab } from "./SkillsAuditTab";
import { FeatureTrackerView } from "./FeatureTrackerView";
import { authFetch } from "@/lib/auth-fetch";

// ── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color }: { icon: typeof BookOpen; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function LearningLabPage() {
  const [data, setData] = useState<Data | null>(null);
  const [pdcaData, setPdcaData] = useState<PDCAData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("learnings");
  const [auditData, setAuditData] = useState<SkillsAuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [ftData, setFtData] = useState<FeatureTrackerData | null>(null);
  const [ftLoading, setFtLoading] = useState(false);
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/learning")
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === "pdca" && !pdcaData) {
      authFetch("/api/learning/pdca")
        .then(r => r.json())
        .then(setPdcaData)
        .catch(console.error);
    }
  }, [activeTab, pdcaData]);

  useEffect(() => {
    if (activeTab === "skills-audit" && !auditData && !auditLoading) {
      setAuditLoading(true);
      authFetch("/api/learning/skills-audit")
        .then(r => r.json())
        .then(d => { setAuditData(d); setAuditLoading(false); })
        .catch(() => setAuditLoading(false));
    }
  }, [activeTab, auditData, auditLoading]);

  useEffect(() => {
    if (activeTab === "feature-tracker" && !ftData && !ftLoading) {
      setFtLoading(true);
      authFetch("/api/learning/feature-tracker")
        .then(r => r.json())
        .then(d => { setFtData(d); setFtLoading(false); })
        .catch(() => setFtLoading(false));
    }
  }, [activeTab, ftData, ftLoading]);

  useEffect(() => {
    if (activeTab === "radar" && !radarData && !radarLoading) {
      setRadarLoading(true);
      authFetch("/api/learning/tech-radar")
        .then(r => r.json())
        .then(d => { setRadarData(d); setRadarLoading(false); })
        .catch(() => setRadarLoading(false));
    }
  }, [activeTab, radarData, radarLoading]);

  if (!data) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }} />
          <p style={{ color: "var(--text-muted)" }}>Cargando Learning Lab...</p>
        </div>
      </div>
    );
  }

  const { learnings, errors, features, radarCategories, stats } = data;

  const tabs: { key: Tab; label: string; icon: typeof BookOpen; count: number }[] = [
    { key: "learnings", label: "Lecciones", icon: BookOpen, count: stats.learnings.total },
    { key: "errors", label: "Errores", icon: FileWarning, count: stats.errors.total },
    { key: "features", label: "Feature Requests", icon: Lightbulb, count: stats.features },
    { key: "feature-tracker", label: "Tracker", icon: ListChecks, count: ftData?.stats.total ?? 0 },
    { key: "radar", label: "Tech Radar", icon: Zap, count: radarCategories.length },
    { key: "pdca", label: "PDCA Cycles", icon: RotateCcw, count: pdcaData?.stats.total ?? 0 },
    { key: "skills-audit", label: "Skills Audit", icon: Activity, count: auditData?.total ?? 0 },
  ];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
          🧪 Learning Lab
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Centro de aprendizaje continuo — lecciones, errores, mejoras y radar tecnológico
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <KPICard icon={Star} label="Reglas de Oro" value={stats.learnings.golden} color="#fbbf24" />
        <KPICard icon={BookOpen} label="Total Lecciones" value={stats.learnings.total} color="#60a5fa" />
        <KPICard icon={XCircle} label="Errores Abiertos" value={stats.errors.open} color="#ef4444" />
        <KPICard icon={CheckCircle} label="Errores Resueltos" value={stats.errors.resolved + stats.errors.verified} color="#22c55e" />
        <KPICard icon={Lightbulb} label="Feature Requests" value={stats.features} color="#a78bfa" />
        <KPICard icon={Zap} label="Categorías Radar" value={radarCategories.length} color="#f97316" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === tab.key ? "var(--accent)" : "transparent",
              color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: activeTab === tab.key ? "rgba(255,255,255,0.2)" : "var(--card-elevated)" }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "learnings" && <LearningsTab learnings={learnings} />}
      {activeTab === "errors" && <ErrorsTab errors={errors} />}
      {activeTab === "features" && <FeaturesTab features={features} />}
      {activeTab === "pdca" && <PDCACyclesTab data={pdcaData} />}
      {activeTab === "feature-tracker" && (
        <FeatureTrackerView
          data={ftData}
          loading={ftLoading}
          onStatusChange={() => setFtData(null)}
        />
      )}
      {activeTab === "skills-audit" && (
        <SkillsAuditTab
          data={auditData}
          loading={auditLoading}
          onRefresh={() => { setAuditData(null); setAuditLoading(false); }}
        />
      )}
      {activeTab === "radar" && (
        <TechRadarVisual
          data={radarData}
          loading={radarLoading}
          onRefresh={() => { setRadarData(null); setRadarLoading(false); }}
        />
      )}
    </div>
  );
}
