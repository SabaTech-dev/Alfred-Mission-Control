import { useState, useCallback } from "react";

import { type CronJob } from "@/components/CronJobCard";
import type { SystemCronJob } from "@/app/api/cron/system/route";
import type { OpenClawCronJob } from "@/operations/openclaw-cron-ops";
import type { HeartbeatStatus as HeartbeatStatusType } from "@/operations/heartbeat-ops";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n/provider";

export type ViewMode = "list" | "timeline";
export type CronTab = "all" | "system" | "openclaw" | "heartbeat";

export interface CronPageData {
  openclawJobs: OpenClawCronJob[];
  systemJobs: SystemCronJob[];
  heartbeat: HeartbeatStatusType | null;
}

export function useCronJobs(initialData: CronPageData) {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();

  const [jobs, setJobs] = useState<CronJob[]>(initialData.openclawJobs as CronJob[]);
  const [systemJobs, setSystemJobs] = useState<SystemCronJob[]>(initialData.systemJobs);
  const [heartbeat, setHeartbeat] = useState<HeartbeatStatusType | null>(initialData.heartbeat);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<CronTab>("openclaw");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);

  const [logsModal, setLogsModal] = useState<{
    isOpen: boolean;
    jobId: string;
    jobName: string;
    logPath?: string;
  }>({ isOpen: false, jobId: "", jobName: "" });

  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      const [openclawRes, systemRes, heartbeatRes] = await Promise.all([
        fetch("/api/cron"),
        fetch("/api/cron/system"),
        fetch("/api/heartbeat"),
      ]);

      if (openclawRes.ok) {
        const data = await openclawRes.json();
        console.log("[cron] OpenClaw jobs loaded:", Array.isArray(data) ? data.length : 0);
        setJobs(Array.isArray(data) ? data : []);
      } else {
        console.error("[cron] Failed to load OpenClaw jobs:", openclawRes.status, await openclawRes.text());
      }

      if (systemRes.ok) {
        const data = await systemRes.json();
        console.log("[cron] System jobs loaded:", data.jobs?.length || 0);
        setSystemJobs(data.jobs || []);
      } else {
        console.error("[cron] Failed to load system jobs:", systemRes.status);
      }

      if (heartbeatRes.ok) {
        const data = await heartbeatRes.json();
        setHeartbeat(data);
      } else {
        console.error("[cron] Failed to load heartbeat:", heartbeatRes.status);
      }
    } catch (err) {
      console.error("[cron] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/cron", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update job");
      setJobs((prev) =>
        prev.map((job) => (job.id === id ? { ...job, enabled } : job))
      );
    } catch (err) {
      console.error("Toggle error:", err);
      setError("Failed to update job status");
    }
  }, []);

  const handleDeleteClick = useCallback((job: CronJob) => {
    setJobToDelete(job);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cron?id=${jobToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs((prev) => prev.filter((job) => job.id !== jobToDelete.id));
      setJobToDelete(null);
      showSuccess(t("cron.jobDeleted"));
    } catch (err) {
      console.error("Delete error:", err);
      showError(t("cron.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }, [jobToDelete, showSuccess, showError, t]);

  const handleRun = useCallback(async (id: string) => {
    const job = jobs.find((j) => j.id === id);
    const res = await fetch("/api/cron/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showError(t("cron.failedToTrigger") + ` "${job?.name || id}"`);
      throw new Error(data.error || "Trigger failed");
    }

    showSuccess(`"${job?.name || id}" ${t("cron.triggered")}!`);
  }, [jobs, showError, showSuccess, t]);

  const handleSystemRun = useCallback(async (id: string) => {
    const job = systemJobs.find((j) => j.id === id);
    const res = await fetch("/api/cron/system-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showError(t("cron.failedToTrigger") + ` "${job?.name || id}"`);
      throw new Error(data.error || "Run failed");
    }

    showSuccess(`"${job?.name || id}" ${t("cron.triggered")}!`);
  }, [systemJobs, showError, showSuccess, t]);

  const handleEdit = useCallback((job: CronJob) => {
    setEditingJob(job);
    setIsModalOpen(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setEditingJob(null);
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async (jobData: Partial<CronJob>) => {
    try {
      const isEditing = !!editingJob?.id;
      const url = "/api/cron";
      const method = isEditing ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: jobData.name,
        description: jobData.description,
        message: jobData.message,
        schedule:
          typeof jobData.schedule === "string" ? jobData.schedule : undefined,
        timezone: jobData.timezone || "UTC",
      };

      if (isEditing) {
        body.id = editingJob.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save job");
      }

      showSuccess(isEditing ? t("cron.jobUpdated") : t("cron.jobCreated"));

      setIsModalOpen(false);
      setEditingJob(null);
      fetchAllData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save job";
      showError(message);
      throw err;
    }
  }, [editingJob, showSuccess, showError, t, fetchAllData]);

  const handleHeartbeatSave = useCallback(async (content: string, agentId?: string) => {
    const res = await fetch("/api/heartbeat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, agentId }),
    });

    if (!res.ok) {
      throw new Error("Failed to save HEARTBEAT.md");
    }

    fetchAllData();
  }, [fetchAllData]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingJob(null);
  }, []);

  const activeJobs = jobs.filter((j) => j.enabled).length;
  const pausedJobs = jobs.length - activeJobs;

  return {
    // State
    jobs,
    systemJobs,
    heartbeat,
    isLoading,
    error,
    jobToDelete,
    isDeleting,
    viewMode,
    activeTab,
    isModalOpen,
    editingJob,
    logsModal,

    // Derived
    activeJobs,
    pausedJobs,

    // Setters
    setIsLoading,
    setError,
    setActiveTab,
    setViewMode,
    setLogsModal,
    setJobToDelete,

    // Actions
    fetchAllData,
    handleToggle,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRun,
    handleSystemRun,
    handleEdit,
    handleCreateNew,
    handleSave,
    handleHeartbeatSave,
    handleCloseModal,
  };
}
