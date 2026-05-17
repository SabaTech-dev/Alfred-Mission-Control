"use client";

import { useEffect, useState, useCallback } from "react";
import TechRadarVisual from "@/components/TechRadarVisual";
import {
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Star,
  FileWarning,
  Zap,
  RotateCcw,
  Target,
  Beaker,
  Search,
  Wrench,
  BookType,
  FileCode,
  Activity,
  RefreshCw,
  ArrowUpCircle,
  AlertOctagon,
  Package,
  Eye,
  Terminal,
  PowerOff,
  ListChecks,
  Filter,
  ClipboardList,
  Clock,
  CheckCircle2,
  Ban,
  ArrowRight,
  Tag,
  BarChart3,
} from "lucide-react";

interface LearningEntry {
  id: string;
  title: string;
  category: "golden" | "rule" | "pattern" | "adoption";
  content: string;
  date: string;
}

interface ErrorEntry {
  id: string;
  title: string;
  status: "open" | "mitigated" | "resolved" | "verified";
  content: string;
}

interface FeatureRequest {
  id: string;
  title: string;
  content: string;
}

interface Data {
  learnings: LearningEntry[];
  errors: ErrorEntry[];
  features: FeatureRequest[];
  radarContent: string;
  radarCategories: string[];
  stats: {
    learnings: { total: number; golden: number; rules: number; patterns: number; adoptions: number };
    errors: { total: number; open: number; mitigated: number; resolved: number; verified: number };
    features: number;
  };
}

interface PDCACycle {
  id: string;
  title: string;
  status: "plan" | "do" | "check" | "act" | "done";
  date: string;
  category: "mejora" | "investigacion" | "fix" | "aprendizaje" | "protocolo";
  description: string;
  source: string;
  metrics?: string;
  outcome?: string;
}

interface PDCAData {
  cycles: PDCACycle[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byMonth: Record<string, number>;
  };
}

interface SkillAuditEntry {
  name: string;
  emoji: string;
  status: "active" | "disabled" | "missing" | "command-only";
  missingBins?: string;
}

interface SkillsAuditData {
  total: number;
  eligible: number;
  visibleToModel: number;
  availableAsCommand: number;
  disabled: number;
  blocked: number;
  excludedByAgent: number;
  missingRequirements: number;
  healthScore: number;
  skills: SkillAuditEntry[];
  timestamp: string;
}

interface TrackedFeature {
  id: string;
  source: "feature_requests" | "autoresearch_ideas";
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "done" | "rejected";
  date: string;
  tags: string[];
  outcome?: string;
  complexity?: string;
  metricGoal?: string;
  stateOverride?: { status?: string; updatedAt?: string };
}

interface FeatureTrackerData {
  features: TrackedFeature[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

interface RadarData {
  technologies: {
    id: string;
    name: string;
    quadrant: "Adopt" | "Trial" | "Assess" | "Hold";
    ring: number;
    description: string;
    category: string;
    license?: string;
    version?: string;
    purpose?: string;
    note?: string;
  }[];
  stats: {
    total: number;
    byQuadrant: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

type Tab = "learnings" | "errors" | "features" | "feature-tracker" | "radar" | "pdca" | "skills-audit";

const categoryConfig = {
  golden: { icon: Star, color: "#fbbf24", label: "Regla de Oro", bg: "rgba(251,191,36,0.1)" },
  rule: { icon: Shield, color: "#60a5fa", label: "Regla", bg: "rgba(96,165,250,0.1)" },
  pattern: { icon: TrendingUp, color: "#34d399", label: "Patrón", bg: "rgba(52,211,153,0.1)" },
  adoption: { icon: FlaskConical, color: "#a78bfa", label: "Adopción", bg: "rgba(167,139,250,0.1)" },
};

const statusConfig = {
  open: { icon: XCircle, color: "#ef4444", label: "Abierto" },
  mitigated: { icon: AlertTriangle, color: "#f59e0b", label: "Mitigado" },
  resolved: { icon: CheckCircle, color: "#22c55e", label: "Resuelto" },
  verified: { icon: Shield, color: "#3b82f6", label: "Verificado" },
};

export default function LearningLabPage() {
  const [data, setData] = useState<Data | null>(null);
  const [pdcaData, setPdcaData] = useState<PDCAData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("learnings");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditData, setAuditData] = useState<SkillsAuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [ftData, setFtData] = useState<FeatureTrackerData | null>(null);
  const [ftLoading, setFtLoading] = useState(false);
  const [ftFilter, setFtFilter] = useState<string>("all");
  const [ftCategoryFilter, setFtCategoryFilter] = useState<string>("all");
  const [ftSearch, setFtSearch] = useState("");
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);

  useEffect(() => {
    fetch("/api/learning")
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === "pdca" && !pdcaData) {
      fetch("/api/learning/pdca")
        .then(r => r.json())
        .then(setPdcaData)
        .catch(console.error);
    }
  }, [activeTab, pdcaData]);

  useEffect(() => {
    if (activeTab === "skills-audit" && !auditData && !auditLoading) {
      setAuditLoading(true);
      fetch("/api/learning/skills-audit")
        .then(r => r.json())
        .then(d => { setAuditData(d); setAuditLoading(false); })
        .catch(() => setAuditLoading(false));
    }
  }, [activeTab, auditData, auditLoading]);

  useEffect(() => {
    if (activeTab === "feature-tracker" && !ftData && !ftLoading) {
      setFtLoading(true);
      fetch("/api/learning/feature-tracker")
        .then(r => r.json())
        .then(d => { setFtData(d); setFtLoading(false); })
        .catch(() => setFtLoading(false));
    }
  }, [activeTab, ftData, ftLoading]);

  useEffect(() => {
    if (activeTab === "radar" && !radarData && !radarLoading) {
      setRadarLoading(true);
      fetch("/api/learning/tech-radar")
        .then(r => r.json())
        .then(d => { setRadarData(d); setRadarLoading(false); })
        .catch(() => setRadarLoading(false));
    }
  }, [activeTab, radarData, radarLoading]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const { learnings, errors, features, radarContent, stats } = data;

  const filteredLearnings = learnings.filter(l => {
    if (filter !== "all" && l.category !== filter) return false;
    if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase()) && !l.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredErrors = errors.filter(e => {
    if (filter !== "all" && e.status !== filter) return false;
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tabs: { key: Tab; label: string; icon: typeof BookOpen; count: number }[] = [
    { key: "learnings", label: "Lecciones", icon: BookOpen, count: stats.learnings.total },
    { key: "errors", label: "Errores", icon: FileWarning, count: stats.errors.total },
    { key: "features", label: "Feature Requests", icon: Lightbulb, count: stats.features },
    { key: "feature-tracker", label: "Tracker", icon: ListChecks, count: ftData?.stats.total ?? 0 },
    { key: "radar", label: "Tech Radar", icon: Zap, count: data.radarCategories.length },
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
        <KPICard icon={Zap} label="Categorías Radar" value={data.radarCategories.length} color="#f97316" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setFilter("all"); setSearchQuery(""); }}
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

      {/* Search & Filters */}
      {activeTab !== "radar" && activeTab !== "pdca" && activeTab !== "skills-audit" && activeTab !== "feature-tracker" && (
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          {activeTab === "learnings" && (
            <div className="flex gap-1">
              {(["all", "golden", "rule", "pattern", "adoption"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filter === f ? "var(--accent)" : "var(--card)",
                    color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {f === "all" ? "Todos" : categoryConfig[f].label}
                </button>
              ))}
            </div>
          )}
          {activeTab === "errors" && (
            <div className="flex gap-1">
              {(["all", "open", "mitigated", "resolved", "verified"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filter === f ? "var(--accent)" : "var(--card)",
                    color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {f === "all" ? "Todos" : statusConfig[f].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === "learnings" && (
        <div className="space-y-2">
          {filteredLearnings.map(l => {
            const cfg = categoryConfig[l.category];
            const expanded = expandedItems.has(l.id);
            return (
              <div key={l.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <button onClick={() => toggleExpand(l.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <cfg.icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{l.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.date}</span>
                    </div>
                  </div>
                  {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    {l.content}
                  </div>
                )}
              </div>
            );
          })}
          {filteredLearnings.length === 0 && <EmptyState message="No hay lecciones que coincidan" />}
        </div>
      )}

      {activeTab === "errors" && (
        <div className="space-y-2">
          {filteredErrors.map(e => {
            const cfg = statusConfig[e.status];
            const expanded = expandedItems.has(e.id);
            return (
              <div key={e.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <button onClick={() => toggleExpand(e.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <cfg.icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>[{e.id}]</p>
                    <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{e.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    {e.content}
                  </div>
                )}
              </div>
            );
          })}
          {filteredErrors.length === 0 && <EmptyState message="No hay errores que coincidan" />}
        </div>
      )}

      {activeTab === "features" && (
        <div className="space-y-2">
          {features.map(f => {
            const expanded = expandedItems.has(f.id);
            return (
              <div key={f.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <button onClick={() => toggleExpand(f.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: "#a78bfa" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                  </div>
                  {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    {f.content}
                  </div>
                )}
              </div>
            );
          })}
          {features.length === 0 && <EmptyState message="No hay feature requests" />}
        </div>
      )}

      {activeTab === "pdca" && (
        <PDCAView data={pdcaData} expandedItems={expandedItems} toggleExpand={toggleExpand} filter={filter} setFilter={setFilter} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      )}

      {activeTab === "feature-tracker" && (
        <FeatureTrackerView
          data={ftData}
          loading={ftLoading}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          filter={ftFilter}
          setFilter={setFtFilter}
          categoryFilter={ftCategoryFilter}
          setCategoryFilter={setFtCategoryFilter}
          searchQuery={ftSearch}
          setSearchQuery={setFtSearch}
          onStatusChange={() => setFtData(null)}
        />
      )}

      {activeTab === "skills-audit" && (
        <SkillsAuditView data={auditData} loading={auditLoading} onRefresh={() => { setAuditData(null); setAuditLoading(false); }} />
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Skills Audit View Component ─────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  let color = "#22c55e"; // green
  if (score < 50) color = "#ef4444"; // red
  else if (score < 75) color = "#f59e0b"; // yellow

  return (
    <div className="flex items-center gap-6">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="var(--border)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div>
        <p className="text-4xl font-bold" style={{ color, fontFamily: "var(--font-heading)", letterSpacing: "-2px" }}>{score}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Health Score</p>
      </div>
    </div>
  );
}

function SkillsAuditView({ data, loading, onRefresh }: {
  data: SkillsAuditData | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [skillSearch, setSkillSearch] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Running skills audit...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No audit data available</p>
        <button onClick={onRefresh} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}>
          <RefreshCw className="w-4 h-4 inline mr-2" />Run Audit
        </button>
      </div>
    );
  }

  const { total, eligible, visibleToModel, availableAsCommand, disabled, blocked, excludedByAgent, missingRequirements, healthScore, skills } = data;

  const missingSkills = skills.filter(s => s.status === "missing");

  const filteredSkills = skills.filter(s => {
    if (skillFilter === "active" && s.status !== "active") return false;
    if (skillFilter === "missing" && s.status !== "missing") return false;
    if (skillSearch && !s.name.toLowerCase().includes(skillSearch.toLowerCase())) return false;
    return true;
  });

  const metrics = [
    { icon: Package, label: "Total Skills", value: total, color: "#60a5fa" },
    { icon: CheckCircle, label: "Eligible", value: eligible, color: "#22c55e" },
    { icon: Eye, label: "Visible", value: visibleToModel, color: "#a78bfa" },
    { icon: Terminal, label: "Command", value: availableAsCommand, color: "#34d399" },
    { icon: PowerOff, label: "Disabled", value: disabled, color: "#6b7280" },
    { icon: AlertOctagon, label: "Missing Reqs", value: missingRequirements, color: "#ef4444" },
  ];

  return (
    <div>
      {/* Health Score + Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
        {/* Health Gauge */}
        <div className="md:col-span-2 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Ecosystem Health</h2>
          </div>
          <HealthGauge score={healthScore} />
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Last checked: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Metric Cards */}
        <div className="md:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Missing Requirements Alert */}
      {missingSkills.length > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-5 h-5" style={{ color: "#ef4444" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#ef4444" }}>Missing Requirements ({missingSkills.length})</h3>
          </div>
          <div className="space-y-2">
            {missingSkills.map(s => (
              <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: "var(--card)" }}>
                <span className="text-lg">{s.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                  {s.missingBins && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Missing: {s.missingBins}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills List */}
      <div className="rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4 flex flex-wrap gap-3 items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Skills ({filteredSkills.length})
          </h3>
          <input
            type="text"
            value={skillSearch}
            onChange={e => setSkillSearch(e.target.value)}
            placeholder="Search skills..."
            className="flex-1 min-w-[150px] max-w-[250px] px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-1">
            {["all", "active", "disabled", "missing"].map(f => (
              <button
                key={f}
                onClick={() => setSkillFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  backgroundColor: skillFilter === f ? "var(--accent)" : "var(--card-elevated)",
                  color: skillFilter === f ? "var(--text-primary)" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto">
          {filteredSkills.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                backgroundColor: s.status === "missing" ? "rgba(239,68,68,0.08)" : "var(--card-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="text-sm">{s.emoji}</span>
              <span className="truncate" style={{ color: s.status === "missing" ? "#ef4444" : "var(--text-primary)" }}>{s.name}</span>
            </div>
          ))}
          {filteredSkills.length === 0 && (
            <div className="col-span-full text-center py-8" style={{ color: "var(--text-muted)" }}>
              <p className="text-sm">No skills match your filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PDCA View Component ─────────────────────────────────────────────

const pdcaStatusConfig: Record<string, { icon: typeof RotateCcw; color: string; label: string; bg: string }> = {
  plan: { icon: Target, color: "#60a5fa", label: "Plan", bg: "rgba(96,165,250,0.1)" },
  do: { icon: Beaker, color: "#fbbf24", label: "Do", bg: "rgba(251,191,36,0.1)" },
  check: { icon: Search, color: "#a78bfa", label: "Check", bg: "rgba(167,139,250,0.1)" },
  act: { icon: Wrench, color: "#f97316", label: "Act", bg: "rgba(249,115,22,0.1)" },
  done: { icon: CheckCircle, color: "#22c55e", label: "Done", bg: "rgba(34,197,94,0.1)" },
};

const pdcaCategoryConfig: Record<string, { color: string; label: string }> = {
  mejora: { color: "#22c55e", label: "Mejora" },
  investigacion: { color: "#60a5fa", label: "Investigación" },
  fix: { color: "#ef4444", label: "Fix" },
  aprendizaje: { color: "#a78bfa", label: "Aprendizaje" },
  protocolo: { color: "#fbbf24", label: "Protocolo" },
};

const sourceIcons: Record<string, typeof BookOpen> = {
  "PDCA_LOG.md": BookType,
  "seguir-aprendiendo": FlaskConical,
  "weekly-self-improvement": TrendingUp,
  "AUTORESEARCH_PROTOCOL.md": FileCode,
};

function PDCAView({ data, expandedItems, toggleExpand, filter, setFilter, searchQuery, setSearchQuery }: {
  data: PDCAData | null;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  const { cycles, stats } = data;

  const filtered = cycles.filter(c => {
    if (filter !== "all" && c.status !== filter && c.category !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* PDCA Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {(["plan", "do", "check", "act", "done"] as const).map(status => {
          const cfg = pdcaStatusConfig[status];
          const count = stats.byStatus[status] || 0;
          return (
            <div key={status} className="rounded-xl p-3" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33` }}>
              <div className="flex items-center gap-2 mb-1">
                <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Category Summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(stats.byCategory).map(([cat, count]) => {
          const cfg = pdcaCategoryConfig[cat] || { color: "#888", label: cat };
          return (
            <span key={cat} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
              {cfg.label}: {count}
            </span>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar ciclos PDCA..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1 flex-wrap">
          {["all", "plan", "do", "check", "act", "done", "mejora", "investigacion", "fix", "aprendizaje"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? "var(--accent)" : "var(--card)",
                color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {f === "all" ? "Todos" : pdcaStatusConfig[f]?.label ?? pdcaCategoryConfig[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtered.map(cycle => {
          const statusCfg = pdcaStatusConfig[cycle.status];
          const catCfg = pdcaCategoryConfig[cycle.category] || { color: "#888", label: cycle.category };
          const SourceIcon = sourceIcons[cycle.source] || BookOpen;
          const expanded = expandedItems.has(cycle.id);

          return (
            <div key={cycle.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <button onClick={() => toggleExpand(cycle.id)} className="w-full flex items-center gap-3 p-4 text-left">
                {/* Timeline dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: statusCfg.color, boxShadow: `0 0 8px ${statusCfg.color}44` }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{cycle.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>{catCfg.label}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cycle.date}</span>
                    <SourceIcon className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cycle.source}</span>
                  </div>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              </button>
              {expanded && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  {cycle.description && (
                    <div className="text-sm whitespace-pre-wrap mb-3" style={{ color: "var(--text-secondary)" }}>{cycle.description}</div>
                  )}
                  {cycle.outcome && (
                    <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>Outcome: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{cycle.outcome}</span>
                    </div>
                  )}
                  {cycle.metrics && (
                    <div className="text-xs whitespace-pre-wrap mt-2 p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>{cycle.metrics}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState message="No hay ciclos PDCA que coincidan" />}
      </div>
    </div>
  );
}

// ── Feature Tracker View Component ──────────────────────────────────────

const ftStatusConfig: Record<string, { icon: typeof ListChecks; color: string; label: string; bg: string }> = {
  "open": { icon: Lightbulb, color: "#60a5fa", label: "Open", bg: "rgba(96,165,250,0.1)" },
  "in-progress": { icon: Clock, color: "#fbbf24", label: "In Progress", bg: "rgba(251,191,36,0.1)" },
  "done": { icon: CheckCircle2, color: "#22c55e", label: "Done", bg: "rgba(34,197,94,0.1)" },
  "rejected": { icon: Ban, color: "#ef4444", label: "Rejected", bg: "rgba(239,68,68,0.1)" },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: "#ef4444", label: "High" },
  medium: { color: "#fbbf24", label: "Medium" },
  low: { color: "#60a5fa", label: "Low" },
};

const categoryColors: Record<string, string> = {
  backend: "#60a5fa",
  ui: "#a78bfa",
  testing: "#34d399",
  infra: "#f97316",
  memory: "#ec4899",
  integration: "#8b5cf6",
  security: "#ef4444",
  research: "#06b6d4",
  automation: "#f59e0b",
  ai: "#10b981",
  other: "#6b7280",
};

function FeatureTrackerView({ data, loading, expandedItems, toggleExpand, filter, setFilter, categoryFilter, setCategoryFilter, searchQuery, setSearchQuery, onStatusChange }: {
  data: FeatureTrackerData | null;
  loading: boolean;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  categoryFilter: string;
  setCategoryFilter: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onStatusChange: () => void;
}) {
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setChangingStatus(id);
    try {
      await fetch("/api/learning/feature-tracker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      onStatusChange();
    } catch (e) {
      console.error("Failed to update status:", e);
    }
    setChangingStatus(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading feature tracker...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tracker data available</p>
      </div>
    );
  }

  const { features, stats } = data;

  const filtered = features.filter(f => {
    if (filter !== "all" && f.status !== filter) return false;
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.tags.some(t => t.includes(q));
    }
    return true;
  });

  const categories = Object.keys(stats.byCategory).sort();

  return (
    <div>
      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {(["open", "in-progress", "done", "rejected"] as const).map(status => {
          const cfg = ftStatusConfig[status];
          const count = stats.byStatus[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                backgroundColor: filter === status ? cfg.bg : "var(--card)",
                border: `1px solid ${filter === status ? cfg.color + "66" : "var(--border)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
            </button>
          );
        })}
        {/* Priority quick summary */}
        <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>By Priority</span>
          </div>
          <div className="flex gap-2 mt-1">
            {(["high", "medium", "low"] as const).map(p => (
              <span key={p} className="text-xs font-bold" style={{ color: priorityConfig[p].color }}>
                {stats.byPriority[p] || 0} {priorityConfig[p].label[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search features, tags..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1 flex-wrap items-center">
          <Filter className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                backgroundColor: categoryFilter === cat ? (categoryColors[cat] || "#6b7280") + "22" : "var(--card)",
                color: categoryFilter === cat ? categoryColors[cat] || "#6b7280" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {cat} ({stats.byCategory[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Showing {filtered.length} of {stats.total} features
        </span>
        {(filter !== "all" || categoryFilter !== "all" || searchQuery) && (
          <button
            onClick={() => { setFilter("all"); setCategoryFilter("all"); setSearchQuery(""); }}
            className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--accent)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Feature List */}
      <div className="space-y-2">
        {filtered.map(f => {
          const statusCfg = ftStatusConfig[f.status];
          const priCfg = priorityConfig[f.priority];
          const catColor = categoryColors[f.category] || "#6b7280";
          const expanded = expandedItems.has(f.id);
          const isChanging = changingStatus === f.id;

          return (
            <div key={f.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <button onClick={() => toggleExpand(f.id)} className="w-full flex items-center gap-3 p-4 text-left">
                {/* Status indicator */}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusCfg.color, boxShadow: `0 0 6px ${statusCfg.color}44` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                    {f.stateOverride && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>overridden</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: priCfg.color + "15", color: priCfg.color }}>{priCfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: catColor + "15", color: catColor }}>{f.category}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{f.date}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {f.source === "feature_requests" ? "FR" : "AR"}</span>
                    {f.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>#{t}</span>
                    ))}
                  </div>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              </button>
              {expanded && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  {/* Description */}
                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{f.description}</p>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {f.complexity && (
                      <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Complexity</span>
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.complexity}</p>
                      </div>
                    )}
                    {f.metricGoal && (
                      <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Metric Goal</span>
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.metricGoal}</p>
                      </div>
                    )}
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Source</span>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.source === "feature_requests" ? "Feature Requests.md" : "AutoResearch Ideas.md"}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>ID</span>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.id}</p>
                    </div>
                  </div>

                  {/* Outcome */}
                  {f.outcome && (
                    <div className="text-sm p-3 rounded-lg mb-3" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <span className="font-medium" style={{ color: "#22c55e" }}>✅ Result: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{f.outcome}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {f.tags.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <Tag className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                      {f.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Status change dropdown */}
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Change status:</span>
                    {(["open", "in-progress", "done", "rejected"] as const).map(s => {
                      const sCfg = ftStatusConfig[s];
                      const isActive = f.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(f.id, s)}
                          disabled={isChanging}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            backgroundColor: isActive ? sCfg.bg : "var(--card-elevated)",
                            color: isActive ? sCfg.color : "var(--text-muted)",
                            border: isActive ? `1px solid ${sCfg.color}44` : "1px solid var(--border)",
                            opacity: isChanging ? 0.5 : 1,
                          }}
                        >
                          <sCfg.icon className="w-3 h-3" />
                          {sCfg.label}
                          {isChanging && <span className="animate-pulse">...</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState message="No features match your filters" />}
      </div>
    </div>
  );
}
