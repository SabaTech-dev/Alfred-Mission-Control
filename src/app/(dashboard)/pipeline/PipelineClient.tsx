"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  PIPELINE_STAGES,
  type PipelineStage,
  type Opportunity,
  type PipelineKPIs,
} from "@/lib/pipeline-types";
import * as PipelineTypes from "./PipelineTypes";
import { PipelineFilters } from "./PipelineFilters";
import { PipelineKpiCards } from "./PipelineKpiCards";
import { PipelineModal } from "./PipelineModal";
import { PipelineListView } from "./PipelineListView";
import { ResearchPipeline } from "./ResearchPipeline";
import { PipelineStageColumn } from "./PipelineStageColumn";
import { PipelineWonLost } from "./PipelineWonLost";
import { OpportunityPopupModal } from "./OpportunityPopupModal";

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
  const [scraping, setScraping] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Pipeline-Kanban Bridge: Store Kanban tasks for opportunities
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const hasActiveFilters = Boolean(filterStage !== "all" || filterServiceType !== "all" || filterDateFrom || filterDateTo);
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

  // Auto-refresh pipeline every 60s
  useAutoRefresh(fetchData, { intervalMs: 60000, pauseWhenHidden: true });

  // Pipeline-Kanban Bridge: Fetch Kanban tasks when card is expanded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchKanbanTasks = async (oppId: string, company: string) => {
    if (kanbanTasks[oppId] || loadingTasks[oppId]) return;

    setLoadingTasks(prev => ({ ...prev, [oppId]: true }));
    try {
      const res = await fetch("/api/kanban/tasks");
      const data = await res.json();
      const allTasks = data.tasks || [];
      // Filter tasks that mention this company
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const handleLaunchScraping = async () => {
    if (!confirm("¿Lanzar scrapping de leads? Esto buscará nuevas oportunidades en plataformas freelance.")) return;
    setScraping(true);
    try {
      const res = await fetch("/api/pipeline/scrap", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Scrapping completado. Recargando oportunidades...");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al lanzar scrapping: " + (err as Error).message);
    } finally {
      setScraping(false);
    }
  };

  const handleOppClick = (opp: Opportunity) => {
    setSelectedOpp(opp);
  };

  const handleOppAction = async (action: "discard" | "wait" | "investigate") => {
    if (!selectedOpp) return;

    if (action === "discard") {
      await fetch(`/api/pipeline/${selectedOpp.id}`, { method: "DELETE" });
      setSelectedOpp(null);
      fetchData();
      return;
    }

    if (action === "wait") {
      await fetch(`/api/pipeline/${selectedOpp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          stage: "negotiating",
          notes: `${selectedOpp.notes || ""}\n\nPuesta en espera por usuario - ${new Date().toISOString()}`
        }),
      });
      setSelectedOpp(null);
      fetchData();
      return;
    }

    if (action === "investigate") {
      // Move to development stage and send to Alfred for investigation
      await fetch(`/api/pipeline/${selectedOpp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          stage: "development",
          next_action: "Investigación estratégica requerida",
          notes: `${selectedOpp.notes || ""}\n\nUsuario solicitó investigación estratégica - ${new Date().toISOString()}`
        }),
      });
      
      // Here you could also trigger a workflow to create OpenSpec files
      // For now, just update the stage
      
      setSelectedOpp(null);
      fetchData();
      alert(`Oportunidad "${selectedOpp.title}" movida a Desarrollo para investigación. Alfred generará plan estratégico y tareas.`);
    }
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
            onClick={handleLaunchScraping}
            disabled={scraping}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: scraping ? "1px solid var(--border)" : "1px solid #eab308",
              background: scraping ? "var(--surface-disabled)" : "#eab308",
              color: scraping ? "var(--text-disabled)" : "#000",
              cursor: scraping ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {scraping ? "⏳ Scraping..." : "🔍 Lanzar Scraping"}
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
          {activeStages.map((stage) => (
            <PipelineStageColumn
              key={stage}
              stage={stage}
              opportunities={filteredOpportunities}
              expandedCard={expandedCard}
              onToggleCard={handleToggleCard}
              onStageChange={handleStageChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOppClick={handleOppClick}
              activeStages={activeStages}
              kanbanTasks={kanbanTasks}
              loadingTasks={loadingTasks}
            />
          ))}
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
      <PipelineWonLost
        opportunities={filteredOpportunities}
        wonLostStages={wonLostStages}
      />

      {/* Modal Form */}
      <PipelineModal
        showForm={showForm}
        editingId={editingId}
        formData={formData}
        setShowForm={setShowForm}
        onFormDataChange={setFormData}
        onSave={handleSave}
      />

      {/* Opportunity Popup Modal */}
      {selectedOpp && (
        <OpportunityPopupModal
          opp={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onAction={handleOppAction}
        />
      )}
    </div>
  );
}
