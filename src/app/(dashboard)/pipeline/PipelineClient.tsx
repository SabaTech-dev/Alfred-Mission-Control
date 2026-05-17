"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  Save,
  ArrowRight,
  Trophy,
  XCircle,
  Filter,
} from "lucide-react";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  type PipelineStage,
  type Opportunity,
  type PipelineKPIs,
} from "@/lib/pipeline-types";

type KanbanTaskStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";

const STATUS_COLORS: Record<KanbanTaskStatus, string> = {
  backlog: "#6b7280",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#22c55e",
  blocked: "#ef4444",
};

export default function PipelineClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [kpis, setKpis] = useState<PipelineKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  
  // Pipeline-Kanban Bridge: Store Kanban tasks for opportunities
  const [kanbanTasks, setKanbanTasks] = useState<Record<string, any[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});

  // Filters
  const [filterStage, setFilterStage] = useState<PipelineStage | "all">("all");
  const [filterServiceType, setFilterServiceType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const filteredOpportunities = opportunities.filter((o) => {
    if (filterStage !== "all" && o.stage !== filterStage) return false;
    if (filterServiceType !== "all" && o.service_type !== filterServiceType) return false;
    if (filterDateFrom && o.created_at < filterDateFrom) return false;
    if (filterDateTo && o.created_at > filterDateTo + "T23:59:59") return false;
    return true;
  });

  const clearFilters = () => {
    setFilterStage("all");
    setFilterServiceType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters = filterStage !== "all" || filterServiceType !== "all" || filterDateFrom || filterDateTo;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setKpis(data.kpis || null);
    } catch (err) {
      console.error("Failed to fetch pipeline:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pipeline-Kanban Bridge: Fetch Kanban tasks when card is expanded
  const fetchKanbanTasks = async (oppId: string, company: string) => {
    if (kanbanTasks[oppId] || loadingTasks[oppId]) return; // Already fetched or loading
    
    setLoadingTasks(prev => ({ ...prev, [oppId]: true }));
    try {
      const res = await fetch("/api/kanban/tasks");
      const data = await res.json();
      const allTasks = data.tasks || [];
      // Filter tasks that mention this company
      const oppTasks = allTasks.filter((task: any) => 
        task.description?.includes(`[Opportunity: ${company}]`)
      );
      setKanbanTasks(prev => ({ ...prev, [oppId]: oppTasks }));
    } catch (err) {
      console.error(`Failed to fetch Kanban tasks for ${company}:`, err);
    } finally {
      setLoadingTasks(prev => ({ ...prev, [oppId]: false }));
    }
  };

  const handleToggleCard = async (oppId: string, company: string) => {
    const isExpanding = expandedCard !== oppId;
    setExpandedCard(isExpanding ? oppId : null);
    if (isExpanding) {
      await fetchKanbanTasks(oppId, company);
    }
  };

  const activeStages = PIPELINE_STAGES.filter((s) => s !== "won" && s !== "lost");
  const wonLostStages: PipelineStage[] = ["won", "lost"];

  const handleSave = async () => {
    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/pipeline/${editingId}` : "/api/pipeline";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    setShowForm(false);
    setEditingId(null);
    setFormData({});
    fetchData();
  };

  const handleEdit = (opp: Opportunity) => {
    setFormData({
      company: opp.company,
      contact_name: opp.contact_name || undefined,
      contact_email: opp.contact_email || undefined,
      contact_linkedin: opp.contact_linkedin || undefined,
      title: opp.title,
      description: opp.description || undefined,
      stage: opp.stage,
      value: opp.value,
      service_type: opp.service_type,
      probability: opp.probability ?? undefined,
      source: opp.source || undefined,
      next_action: opp.next_action || undefined,
      next_action_date: opp.next_action_date || undefined,
      notes: opp.notes || undefined,
    });
    setEditingId(opp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleStageChange = async (id: string, newStage: PipelineStage) => {
    await fetch(`/api/pipeline/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    fetchData();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number) =>
    new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1 }).format(val);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const serviceLabels: Record<string, string> = {
    consultoria_audit: "🔍 Audit",
    consultoria_retainer: "🔄 Retainer",
    consultoria_managed: "🛡️ Managed",
    orquestacion_setup: "⚙️ Setup",
    orquestacion_advanced: "🚀 Advanced",
    orquestacion_managed: "🤖 Managed Orch.",
    other: "📋 Otro",
  };

  if (loading) {
    return <div style={{ color: "var(--text-secondary)", padding: "40px" }}>Cargando pipeline...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            📊 Opportunity Pipeline
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Seguimiento de oportunidades comerciales
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setViewMode(viewMode === "pipeline" ? "list" : "pipeline")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {viewMode === "pipeline" ? "📋 Lista" : "📊 Pipeline"}
          </button>
          <button
            onClick={() => { setFormData({ stage: "lead", value: 5000, currency: "EUR" }); setShowForm(true); setEditingId(null); }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Plus size={16} /> Nueva Oportunidad
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: hasActiveFilters ? "var(--accent)" : "var(--surface)",
              color: hasActiveFilters ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Filter size={14} /> Filtros {hasActiveFilters && `(activos: ${filteredOpportunities.length}/${opportunities.length})`}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
        {showFilters && (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              padding: "12px",
              background: "var(--surface-elevated)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ minWidth: "140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Etapa</label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as PipelineStage | "all")}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
              >
                <option value="all">Todas</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: "160px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Tipo Servicio</label>
              <select
                value={filterServiceType}
                onChange={(e) => setFilterServiceType(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
              >
                <option value="all">Todos</option>
                <option value="consultoria_audit">🔍 Audit</option>
                <option value="consultoria_retainer">🔄 Retainer</option>
                <option value="consultoria_managed">🛡️ Managed</option>
                <option value="orquestacion_setup">⚙️ Setup</option>
                <option value="orquestacion_advanced">🚀 Advanced</option>
                <option value="orquestacion_managed">🤖 Managed Orch.</option>
                <option value="other">📋 Otro</option>
              </select>
            </div>
            <div style={{ minWidth: "140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Desde</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ minWidth: "140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>Hasta</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <KpiCard icon={<DollarSign size={18} />} label="Pipeline Total" value={formatCurrency(kpis.total_pipeline_value)} color="#3b82f6" />
          <KpiCard icon={<TrendingUp size={18} />} label="Weighted" value={formatCurrency(kpis.weighted_pipeline_value)} color="#8b5cf6" />
          <KpiCard icon={<Trophy size={18} />} label="Ganado" value={formatCurrency(kpis.won_value)} color="#10b981" />
          <KpiCard icon={<Target size={18} />} label="Win Rate" value={formatPercent(kpis.win_rate)} color="#f59e0b" />
          <KpiCard icon={<BarChart3 size={18} />} label="Deals Activos" value={String(kpis.total_opportunities - (kpis.by_stage.won?.count || 0) - (kpis.by_stage.lost?.count || 0))} color="#06b6d4" />
          <KpiCard icon={<DollarSign size={18} />} label="Deal Medio" value={formatCurrency(kpis.avg_deal_size)} color="#ec4899" />
        </div>
      )}

      {/* Pipeline View */}
      {viewMode === "pipeline" ? (
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "16px" }}>
          {activeStages.map((stage) => {
            const stageOpps = filteredOpportunities.filter((o) => o.stage === stage);
            const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);
            return (
              <div
                key={stage}
                style={{
                  minWidth: "240px",
                  flex: "1 0 240px",
                  background: "var(--surface-elevated)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Stage Header */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: STAGE_COLORS[stage] }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--surface)", padding: "2px 6px", borderRadius: "4px" }}>
                      {stageOpps.length}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {formatCurrency(stageValue)}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  {stageOpps.map((opp) => (
                    <OppCard
                      key={opp.id}
                      opp={opp}
                      expanded={expandedCard === opp.id}
                      onToggle={() => handleToggleCard(opp.id, opp.company)}
                      onStageChange={handleStageChange}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      serviceLabels={serviceLabels}
                      activeStages={activeStages}
                      kanbanTasks={kanbanTasks[opp.id] || []}
                      loadingTasks={loadingTasks[opp.id] || false}
                    />
                  ))}
                  {stageOpps.length === 0 && (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                      Sin oportunidades
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div style={{ background: "var(--surface-elevated)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Empresa</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Título</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Etapa</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>Valor</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Servicio</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Próx. Acción</th>
                <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.map((opp) => (
                <tr key={opp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>{opp.company}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{opp.title}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, color: "#fff", background: STAGE_COLORS[opp.stage] }}>
                      {STAGE_LABELS[opp.stage]}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-primary)", fontWeight: 500 }}>{formatCurrency(opp.value)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontSize: "12px" }}>{serviceLabels[opp.service_type] || opp.service_type}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "12px" }}>{opp.next_action || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                      <button onClick={() => handleEdit(opp)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(opp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOpportunities.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                    No hay oportunidades. Crea la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Won/Lost Section */}
      {(filteredOpportunities.some((o) => o.stage === "won") || filteredOpportunities.some((o) => o.stage === "lost")) && (
        <div style={{ marginTop: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
            Historial
          </h2>
          <div style={{ display: "flex", gap: "12px" }}>
            {wonLostStages.map((stage) => {
              const stageOpps = filteredOpportunities.filter((o) => o.stage === stage);
              if (stageOpps.length === 0) return null;
              return (
                <div key={stage} style={{ flex: 1, background: "var(--surface-elevated)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                    {stage === "won" ? <Trophy size={14} style={{ color: "#10b981" }} /> : <XCircle size={14} style={{ color: "#ef4444" }} />}
                    <span style={{ fontSize: "13px", fontWeight: 600, color: STAGE_COLORS[stage] }}>{STAGE_LABELS[stage]}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>({stageOpps.length})</span>
                  </div>
                  <div style={{ padding: "8px" }}>
                    {stageOpps.map((opp) => (
                      <div key={opp.id} style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{opp.company}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{opp.title}</div>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: STAGE_COLORS[stage] }}>{formatCurrency(opp.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: "var(--surface-elevated)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              padding: "24px",
              width: "480px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                {editingId ? "Editar Oportunidad" : "Nueva Oportunidad"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormField label="Empresa *" value={formData.company || ""} onChange={(v) => setFormData({ ...formData, company: v })} />
              <FormField label="Título *" value={formData.title || ""} onChange={(v) => setFormData({ ...formData, title: v })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormField label="Valor (€)" type="number" value={String(formData.value || "")} onChange={(v) => setFormData({ ...formData, value: Number(v) })} />
                <FormSelect
                  label="Etapa"
                  value={formData.stage || "lead"}
                  options={PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
                  onChange={(v) => setFormData({ ...formData, stage: v as PipelineStage })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormField label="Contacto" value={formData.contact_name || ""} onChange={(v) => setFormData({ ...formData, contact_name: v })} />
                <FormField label="Email" value={formData.contact_email || ""} onChange={(v) => setFormData({ ...formData, contact_email: v })} />
              </div>
              <FormSelect
                label="Tipo de Servicio"
                value={formData.service_type || "other"}
                options={[
                  { value: "consultoria_audit", label: "🔍 Consultoría Audit" },
                  { value: "consultoria_retainer", label: "🔄 Consultoría Retainer" },
                  { value: "consultoria_managed", label: "🛡️ Consultoría Managed" },
                  { value: "orquestacion_setup", label: "⚙️ Orquestación Setup" },
                  { value: "orquestacion_advanced", label: "🚀 Orquestación Advanced" },
                  { value: "orquestacion_managed", label: "🤖 Orquestación Managed" },
                  { value: "other", label: "📋 Otro" },
                ]}
                onChange={(v) => setFormData({ ...formData, service_type: v as Opportunity["service_type"] })}
              />
              <FormField label="Próxima Acción" value={formData.next_action || ""} onChange={(v) => setFormData({ ...formData, next_action: v })} />
              <FormField label="Fecha Próx. Acción" type="date" value={formData.next_action_date || ""} onChange={(v) => setFormData({ ...formData, next_action_date: v })} />
              <FormField label="Fuente" value={formData.source || ""} onChange={(v) => setFormData({ ...formData, source: v })} />
              <FormTextarea label="Notas" value={formData.notes || ""} onChange={(v) => setFormData({ ...formData, notes: v })} />

              <button
                onClick={handleSave}
                disabled={!formData.company || !formData.title}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: formData.company && formData.title ? "var(--accent)" : "var(--surface)",
                  color: formData.company && formData.title ? "#fff" : "var(--text-muted)",
                  cursor: formData.company && formData.title ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginTop: "8px",
                }}
              >
                <Save size={16} /> {editingId ? "Guardar Cambios" : "Crear Oportunidad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Sub-components */

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--surface-elevated)", borderRadius: "10px", border: "1px solid var(--border)", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function OppCard({
  opp,
  expanded,
  onToggle,
  onStageChange,
  onEdit,
  onDelete,
  formatCurrency,
  formatDate,
  serviceLabels,
  activeStages,
  kanbanTasks,
  loadingTasks,
}: {
  opp: Opportunity;
  expanded: boolean;
  onToggle: () => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  formatCurrency: (v: number) => string;
  formatDate: (d: string | null) => string;
  serviceLabels: Record<string, string>;
  activeStages: PipelineStage[];
  kanbanTasks: any[];
  loadingTasks: boolean;
}) {
  const stageIdx = activeStages.indexOf(opp.stage as PipelineStage);
  const canAdvance = stageIdx < activeStages.length - 1;
  const canRetreat = stageIdx > 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        padding: "10px 12px",
        cursor: "pointer",
      }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{opp.company}</div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{opp.title}</div>
        </div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
          {formatCurrency(opp.value)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--surface-elevated)", padding: "2px 6px", borderRadius: "3px" }}>
          {serviceLabels[opp.service_type] || opp.service_type}
        </span>
        {opp.contact_name && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>👤 {opp.contact_name}</span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
          {opp.description && (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>{opp.description}</div>
          )}
          {opp.next_action && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
              📌 {opp.next_action} {opp.next_action_date && `— ${formatDate(opp.next_action_date)}`}
            </div>
          )}
          {opp.source && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>📍 Fuente: {opp.source}</div>
          )}
          {opp.notes && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", fontStyle: "italic" }}>{opp.notes}</div>
          )}

          <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
            {canRetreat && (
              <button
                onClick={() => onStageChange(opp.id, activeStages[stageIdx - 1])}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }}
              >
                ←
              </button>
            )}
            {canAdvance && (
              <button
                onClick={() => onStageChange(opp.id, activeStages[stageIdx + 1])}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                Avanzar <ArrowRight size={12} />
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={() => onEdit(opp)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={14} /></button>
            <button onClick={() => onDelete(opp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Trash2 size={14} /></button>
          </div>

          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px" }}>
            Creado: {formatDate(opp.created_at)}
          </div>
          
          {/* Pipeline-Kanban Bridge: Show associated Kanban tasks */}
          {expanded && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", borderTopStyle: "dashed" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ background: "#8b5cf6", color: "#fff", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>KANBAN</span>
                Tareas asociadas ({kanbanTasks.length})
              </div>
              
              {loadingTasks ? (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px" }}>Cargando tareas...</div>
              ) : kanbanTasks.length === 0 ? (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px" }}>Sin tareas asociadas</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {kanbanTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "4px",
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border)",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {/* Status badge */}
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "9px",
                          fontWeight: 600,
                          color: "#fff",
                          background: STATUS_COLORS[task.status as KanbanTaskStatus] || "#6b7280",
                        }}
                      >
                        {String(task.status)}
                      </span>
                      
                      {/* Task title (truncated) */}
                      <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </div>
                      
                      {/* Assignee */}
                      {task.assignee && (
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", background: "var(--surface)", padding: "2px 5px", borderRadius: "3px" }}>
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Progress indicator */}
              {kanbanTasks.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    <span>Progreso:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {kanbanTasks.filter((t) => t.status === "done").length} / {kanbanTasks.length} tareas completadas
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: STATUS_COLORS[kanbanTasks.filter((t) => t.status === "done").length === kanbanTasks.length ? "done" : "in_progress"],
                        width: `${Math.round((kanbanTasks.filter((t) => t.status === "done").length / kanbanTasks.length) * 100)}%`,
                        transition: "width 0.3s ease, background 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: "13px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function FormSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: "13px",
          boxSizing: "border-box",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: "13px",
          resize: "vertical",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
