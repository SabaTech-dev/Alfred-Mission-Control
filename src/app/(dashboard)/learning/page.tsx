"use client";

import { useEffect, useState } from "react";
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

type Tab = "learnings" | "errors" | "features" | "radar";

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
  const [activeTab, setActiveTab] = useState<Tab>("learnings");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/learning")
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

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
    { key: "radar", label: "Tech Radar", icon: Zap, count: data.radarCategories.length },
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
      {activeTab !== "radar" && (
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

      {activeTab === "radar" && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: "#f97316" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Radar Tecnológico</h2>
          </div>
          {data.radarCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {data.radarCategories.map((cat, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
          <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-[600px] p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)" }}>
            {radarContent || "No hay datos del radar"}
          </pre>
        </div>
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
