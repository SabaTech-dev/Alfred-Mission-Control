"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  type PipelineStage,
  type Opportunity,
  type PipelineKPIs,
} from "@/lib/pipeline-types";
import { PipelineFunnelChart } from "./PipelineFunnelChart";
import * as PipelineTypes from "./PipelineTypes";
import { PipelineFilters } from "./PipelineFilters";
import { PipelineKpiCards } from "./PipelineKpiCards";
import { PipelineModal } from "./PipelineModal";
import { PipelineOppCard } from "./PipelineOppCard";
import { ResearchPipeline } from "./ResearchPipeline";
import { PipelineListView } from "./PipelineListView";

// Filter-aware KPI hook — computes metrics from a given opportunities array
function useFilteredKPIs(opps: Opportunity[]): PipelineTypes.FilteredKPIs {
  return useMemo(() => {
    const active = opps.filter((o) => o.stage !== "won" && o.stage !== "lost");
    const won = opps.filter((o) => o.stage === "won");
    const lost = opps.filter((o) => o.stage === "lost");

    const totalPipelineValue = active.reduce((s, o) => s + o.value, 0);
    const wonValue = won.reduce((s, o) => s + o.value, 0);

    // Avg cycle time: mean days from created_at to closed_at for won deals
    let avgCycleTimeDays = 0;
    const closedWithDates = won.filter((o) => o.closed_at && o.created_at);
    if (closedWithDates.length > 0) {
      const totalDays = closedWithDates.reduce((s, o) => {
        const created = new Date(o.created_at).getTime();
        const closed = new Date(o.closed_at!).getTime();
        return s + (closed - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgCycleTimeDays = Math.round(totalDays / closedWithDates.length);
    }

    const wonCount = won.length;
    const lostCount = lost.length;
    const winRate = wonCount + lostCount > 0 ? wonCount / (wonCount + lostCount) : 0;

    return {
      totalOpportunities: opps.length,
      totalPipelineValue,
      avgCycleTimeDays,
      wonCount,
      wonValue,
      lostCount,
      winRate,
    };
  }, [opps]);
}

export default function PipelineClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [researchItems, setResearchItems] = useState<PipelineTypes.ResearchItem[]>([]);
  const [kpis, setKpis] = useState<PipelineKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [researchLoading, setResearchLoading] = useState(true);
  const [showResearch, setShowResearch] = useState(true);
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

  // Filter-aware KPIs — respond to date range, service type, and stage filters
  const filteredKPIs = useFilteredKPIs(filteredOpportunities);

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

  const fetchResearchData = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/research");
      const data = await res.json();
      setResearchItems(data.items || []);
    } catch (err) {
      console.error("Failed to fetch research pipeline:", err);
    } finally {
      setResearchLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchResearchData(); }, [fetchResearchData]);

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
      <PipelineFilters
        filterStage={filterStage}
        filterServiceType={filterServiceType}
        filterDateFrom={filterDateFrom}
        filterDateTo={filterDateTo}
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        filteredOpportunitiesCount={filteredOpportunities.length}
        totalOpportunitiesCount={opportunities.length}
        onFilterStageChange={setFilterStage}
        onFilterServiceTypeChange={setFilterServiceType}
        onFilterDateFromChange={setFilterDateFrom}
        onFilterDateToChange={setFilterDateTo}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
      />

      {/* KPI Cards */}
      <PipelineKpiCards kpis={kpis} />

      {/* Research Pipeline Section */}
      <ResearchPipeline
        researchItems={researchItems}
        researchLoading={researchLoading}
        showResearch={showResearch}
        onToggle={() => setShowResearch(!showResearch)}
      />

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
                    {PipelineTypes.formatCurrency(stageValue)}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  {stageOpps.map((opp) => (
                    <PipelineOppCard
                      key={opp.id}
                      opp={opp}
                      expanded={expandedCard === opp.id}
                      onToggle={() => handleToggleCard(opp.id, opp.company)}
                      onStageChange={handleStageChange}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
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
        <PipelineListView
          opportunities={filteredOpportunities}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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
                    {stage === "won" ? <span style={{ color: "#10b981" }}>🏆</span> : <span style={{ color: "#ef4444" }}>✖</span>}
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
                        <span style={{ fontSize: "13px", fontWeight: 600, color: STAGE_COLORS[stage] }}>{PipelineTypes.formatCurrency(opp.value)}</span>
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
      <PipelineModal
        showForm={showForm}
        editingId={editingId}
        formData={formData}
        setShowForm={setShowForm}
        onFormDataChange={setFormData}
        onSave={handleSave}
      />
    </div>
  );
}