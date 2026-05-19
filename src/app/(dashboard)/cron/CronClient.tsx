"use client";

import dynamic from "next/dynamic";
import {
  Clock,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  CalendarDays,
  Plus,
  Server,
  Bot,
  Heart,
} from "lucide-react";

import { CronWeeklyTimeline } from "@/components/CronWeeklyTimeline";
import { SystemCronLogsModal } from "@/components/SystemCronCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useI18n } from "@/i18n/provider";
import { useCronJobs, type CronPageData } from "@/hooks/useCronJobs";
import { CronJobListTab } from "./CronJobListTab";
import { SystemCronTab } from "./SystemCronTab";
import { HeartbeatTab } from "./HeartbeatTab";
import { CronStatsCards } from "./CronStatsCards";

const CronJobModal = dynamic(
  () => import("@/components/CronJobModal").then((m) => ({ default: m.CronJobModal })),
  { loading: () => <div className="p-6">Cargando CronJobModal...</div>, ssr: false }
);

export function CronClient({ initialData }: { initialData: CronPageData }) {
  const { t } = useI18n();
  const {
    jobs, systemJobs, heartbeat,
    isLoading, error, jobToDelete, isDeleting,
    viewMode, activeTab, isModalOpen, editingJob, logsModal,
    activeJobs, pausedJobs,
    setIsLoading, setError, setActiveTab, setViewMode,
    setLogsModal, setJobToDelete,
    fetchAllData, handleToggle, handleDeleteClick, handleDeleteConfirm,
    handleRun, handleSystemRun, handleEdit, handleCreateNew,
    handleSave, handleHeartbeatSave, handleCloseModal,
  } = useCronJobs(initialData);

  const showSystem = activeTab === "all" || activeTab === "system";
  const showOpenclaw = activeTab === "all" || activeTab === "openclaw";
  const hasVisibleJobs =
    (showSystem && systemJobs.length > 0) ||
    (showOpenclaw && jobs.length > 0);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold mb-1"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            {t("cron.title")}
          </h1>
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            {t("cron.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={handleCreateNew} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", backgroundColor: "var(--accent)",
            color: "#000", borderRadius: "0.5rem", border: "none",
            cursor: "pointer", fontWeight: 600, transition: "opacity 0.2s",
          }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("cron.createJob")}</span>
          </button>
          <button onClick={() => { setIsLoading(true); fetchAllData(); }} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", backgroundColor: "var(--card)",
            color: "var(--text-primary)", borderRadius: "0.5rem",
            border: "1px solid var(--border)", cursor: "pointer",
            fontWeight: 500, transition: "opacity 0.2s",
          }}>
            <RefreshCw className="w-4 h-4" />
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {/* Tab buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("all")} style={{
          padding: "0.5rem 1rem", borderRadius: "0.5rem",
          backgroundColor: activeTab === "all" ? "var(--accent)" : "var(--card)",
          color: activeTab === "all" ? "#000" : "var(--text-secondary)",
          border: "1px solid var(--border)", cursor: "pointer",
          fontWeight: 600, fontSize: "0.85rem",
        }}>
          {t("cron.all")} ({systemJobs.length + jobs.length})
        </button>
        <button onClick={() => setActiveTab("system")} style={{
          padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid var(--border)",
          cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "0.25rem",
          backgroundColor: activeTab === "system" ? "var(--info)" : "var(--card)",
          color: activeTab === "system" ? "#000" : "var(--text-secondary)",
        }}>
          <Server className="w-4 h-4" />
          {t("cron.systemJobs")} ({systemJobs.length})
        </button>
        <button onClick={() => setActiveTab("openclaw")} style={{
          padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid var(--border)",
          cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "0.25rem",
          backgroundColor: activeTab === "openclaw" ? "var(--accent)" : "var(--card)",
          color: activeTab === "openclaw" ? "#000" : "var(--text-secondary)",
        }}>
          <Bot className="w-4 h-4" />
          {t("cron.agentJobs")} ({activeJobs})
        </button>
        <button onClick={() => setActiveTab("heartbeat")} style={{
          padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid var(--border)",
          cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "0.25rem",
          backgroundColor: activeTab === "heartbeat" ? "var(--error)" : "var(--card)",
          color: activeTab === "heartbeat" ? "#fff" : "var(--text-secondary)",
        }}>
          <Heart className="w-4 h-4" />
          {t("cron.heartbeat")} {heartbeat?.enabled ? "✓" : ""}
        </button>
      </div>

      {/* Stats cards */}
      <CronStatsCards
        systemJobsCount={systemJobs.length}
        activeJobs={activeJobs}
        pausedJobs={pausedJobs}
        heartbeat={heartbeat}
        activeTab={activeTab}
        onTabClick={setActiveTab}
      />

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: "1.5rem", padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem",
          backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)", borderRadius: "0.5rem",
        }}>
          <AlertCircle className="w-5 h-5" style={{ color: "var(--error)" }} />
          <span style={{ color: "var(--error)" }}>{error}</span>
          <button onClick={() => setError(null)} style={{
            marginLeft: "auto", color: "var(--error)", background: "none", border: "none", cursor: "pointer",
          }}>
            Dismiss
          </button>
        </div>
      )}

      {/* View mode toggle (hidden for heartbeat tab) */}
      {activeTab !== "heartbeat" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{
            display: "flex", backgroundColor: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "3px",
          }}>
            <button onClick={() => setViewMode("list")} style={{
              display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
              borderRadius: "0.35rem", fontSize: "0.8rem", fontWeight: 600, border: "none",
              cursor: "pointer", transition: "all 0.15s",
              backgroundColor: viewMode === "list" ? "var(--accent)" : "transparent",
              color: viewMode === "list" ? "white" : "var(--text-secondary)",
            }}>
              <LayoutGrid className="w-3.5 h-3.5" />
              Lista
            </button>
            <button onClick={() => setViewMode("timeline")} style={{
              display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
              borderRadius: "0.35rem", fontSize: "0.8rem", fontWeight: 600, border: "none",
              cursor: "pointer", transition: "all 0.15s",
              backgroundColor: viewMode === "timeline" ? "var(--accent)" : "transparent",
              color: viewMode === "timeline" ? "white" : "var(--text-secondary)",
            }}>
              <CalendarDays className="w-3.5 h-3.5" />
              {t("cron.timeline")}
            </button>
          </div>
        </div>
      )}

      {/* Content area */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 0" }}>
          <div style={{
            width: "2rem", height: "2rem", borderRadius: "50%",
            border: "2px solid var(--accent)", borderTopColor: "transparent",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      ) : activeTab === "heartbeat" ? (
        heartbeat ? <HeartbeatTab data={heartbeat} onSave={handleHeartbeatSave} /> : null
      ) : systemJobs.length === 0 && jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <Clock className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {t("cron.noJobs")}
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>{t("cron.noJobsHint")}</p>
          <button onClick={handleCreateNew} style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", backgroundColor: "var(--accent)", color: "#000",
            borderRadius: "0.5rem", border: "none", cursor: "pointer", fontWeight: 600,
          }}>
            <Plus className="w-4 h-4" />
            {t("cron.createJob")}
          </button>
        </div>
      ) : viewMode === "timeline" ? (
        <div className="rounded-xl overflow-hidden" style={{
          backgroundColor: "var(--card)", border: "1px solid var(--border)",
          padding: "1.25rem",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            marginBottom: "1.25rem", paddingBottom: "1rem",
            borderBottom: "1px solid var(--border)",
          }}>
            <CalendarDays className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h2 style={{
              fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
            }}>
              {t("cron.scheduleOverview")}
            </h2>
          </div>
          <CronWeeklyTimeline jobs={jobs} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {showSystem && (
            <SystemCronTab systemJobs={systemJobs} onRun={handleSystemRun} />
          )}
          {showOpenclaw && (
            <CronJobListTab
              jobs={jobs}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onRun={handleRun}
              onDelete={handleDeleteClick}
              isDeleting={isDeleting}
              deletingJobId={jobToDelete?.id}
            />
          )}
          {!hasVisibleJobs && (
            <div className="text-center p-8 border border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)]">
              No hay tareas configuradas en esta vista.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CronJobModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingJob={editingJob}
      />

      <SystemCronLogsModal
        isOpen={logsModal.isOpen}
        onClose={() => setLogsModal({ ...logsModal, isOpen: false })}
        jobId={logsModal.jobId}
        jobName={logsModal.jobName}
        logPath={logsModal.logPath}
      />

      <ConfirmDialog
        isOpen={jobToDelete !== null}
        title={t("cron.deleteJob")}
        message={t("cron.confirmDelete", { name: jobToDelete?.name || "" })}
        confirmLabel={t("cron.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setJobToDelete(null)}
      />

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(2rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
