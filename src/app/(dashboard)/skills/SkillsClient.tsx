"use client";

import { useEffect, useState } from "react";
import { Puzzle } from "lucide-react";
import { SectionHeader, MetricCard } from "@/components/Alfred";
import { ClawHubBrowser } from "@/components/ClawHubBrowser";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useI18n } from "@/i18n/provider";
import { Skill, SkillsInitialData, SkillUpdate } from "./SkillsTypes";
import { SkillCard } from "./SkillCard";
import { SkillDetailModal } from "./SkillDetailModal";
import { SkillsPagination } from "./SkillsPagination";
import { SkillsFilterBar } from "./SkillsFilterBar";

const PAGE_SIZE = 50;

export default function SkillsClient(_props?: { initialData?: SkillsInitialData }) {
  const { t } = useI18n();
  const [skills, setSkills] = useState<Skill[]>(_props?.initialData?.skills ?? []);
  const [loading, setLoading] = useState(!_props?.initialData?.skills?.length);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "workspace" | "system">("all");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [togglingSkill, setTogglingSkill] = useState<string | null>(null);
  const [showClawHub, setShowClawHub] = useState(false);
  const [updates, setUpdates] = useState<SkillUpdate[]>([]);
  const [skillToDisable, setSkillToDisable] = useState<Skill | null>(null);
  const [showUpdateAllConfirm, setShowUpdateAllConfirm] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch skills with pagination
  const fetchSkills = async (p: number, search?: string, source?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (source && source !== "all") params.set("source", source);
      const res = await fetch(`/api/skills?${params}`);
      const data = await res.json();
      if (data.skills) {
        setSkills(data.skills as Skill[]);
      }
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Load skill detail with fullContent on selection
  const handleSelectSkill = async (skillId: string) => {
    const existing = skills.find((s) => s.id === skillId);
    if (existing?.fullContent) {
      setSelectedSkill(existing);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skillId)}`);
      const data = await res.json();
      if (data.skill) {
        setSelectedSkill(data.skill as Skill);
      }
    } catch {
      // fallback to list data
      setSelectedSkill(existing ?? null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!_props?.initialData?.skills?.length) {
      fetchSkills(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkills(1, searchQuery, filterSource);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterSource]);

  const handleInstallFromClawHub = () => {
    fetchSkills(page, searchQuery, filterSource);
    fetch("/api/skills/updates")
      .then((res) => res.json())
      .then((data) => {
        if (data.updates) {
          setUpdates(data.updates);
        }
      })
      .catch(() => {});
    setShowClawHub(false);
  };

  const handleToggleSkill = async (skillId: string, currentlyEnabled: boolean) => {
    const skill = skills.find(s => s.id === skillId);
    if (currentlyEnabled && skill) {
      setSkillToDisable(skill);
      return;
    }

    await executeToggleSkill(skillId, currentlyEnabled);
  };

  const executeToggleSkill = async (skillId: string, currentlyEnabled: boolean) => {
    setTogglingSkill(skillId);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skillId)}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });

      if (res.ok) {
        setSkills((prev) =>
          prev.map((s) =>
            s.id === skillId ? { ...s, enabled: !currentlyEnabled } : s
          )
        );
        if (selectedSkill?.id === skillId) {
          setSelectedSkill((prev) => (prev ? { ...prev, enabled: !currentlyEnabled } : null));
        }
      }
    } catch (error) {
      console.error("Failed to toggle skill:", error);
    } finally {
      setTogglingSkill(null);
      setSkillToDisable(null);
    }
  };

  const handleConfirmDisable = () => {
    if (skillToDisable) {
      executeToggleSkill(skillToDisable.id, true);
    }
  };

  const handleUpdateAll = async () => {
    setIsUpdatingAll(true);
    for (const update of updates.filter(u => u.hasUpdate)) {
      try {
        await fetch(`/api/skills/${encodeURIComponent(update.slug)}/update`, {
          method: "POST",
        });
      } catch (err) {
        console.error(`Failed to update ${update.slug}:`, err);
      }
    }
    setIsUpdatingAll(false);
    setShowUpdateAllConfirm(false);
    window.location.reload();
  };

  // Server already filters, but keep local counts for sidebar badges
  const workspaceCount = skills.filter((s) => s.source === "workspace").length;
  const systemCount = skills.filter((s) => s.source === "system").length;

  // Skills are already filtered server-side; render directly
  const workspaceSkills = skills.filter((s) => s.source === "workspace");
  const systemSkills = skills.filter((s) => s.source === "system");

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: "-1px",
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          Skills Manager
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          Skills disponibles en el sistema OpenClaw
        </p>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowClawHub(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
            }}
          >
            <span>☁️</span> Browse ClawHub
          </button>
          
          {updates.filter(u => u.hasUpdate).length > 0 && (
            <button
              onClick={() => setShowUpdateAllConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "var(--warning)",
                color: "white",
              }}
            >
              <span>⬇️</span> {t("skills.updateAll", { count: updates.filter(u => u.hasUpdate).length })}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <MetricCard icon={Puzzle} value={skills.length} label="Total Skills" />
        <MetricCard
          icon={Puzzle}
          value={workspaceCount}
          label="Workspace Skills"
          changeColor="positive"
        />
        <MetricCard
          icon={Puzzle}
          value={systemCount}
          label="System Skills"
          changeColor="secondary"
        />
      </div>

      <SkillsFilterBar
        searchQuery={searchQuery}
        filterSource={filterSource}
        skillsCount={skills.length}
        workspaceCount={workspaceCount}
        systemCount={systemCount}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilterSource}
      />

      {loading && (
        <div
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "12px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.telemetry.loading")}
          </div>
        </div>
      )}

      {skills.length === 0 && !loading ? (
        <div
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "12px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <Puzzle
            style={{
              width: "48px",
              height: "48px",
              color: "var(--text-muted)",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "var(--text-secondary)" }}>No se encontraron skills</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {workspaceSkills.length > 0 && (filterSource === "all" || filterSource === "workspace") && (
            <div>
              <SectionHeader label="WORKSPACE SKILLS" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                {workspaceSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onClick={() => handleSelectSkill(skill.id)}
                    onToggle={() => handleToggleSkill(skill.id, skill.enabled)}
                    isToggling={togglingSkill === skill.id}
                  />
                ))}
              </div>
            </div>
          )}

          {systemSkills.length > 0 && (filterSource === "all" || filterSource === "system") && (
            <div>
              <SectionHeader label="SYSTEM SKILLS" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                {systemSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onClick={() => handleSelectSkill(skill.id)}
                    onToggle={() => handleToggleSkill(skill.id, skill.enabled)}
                    isToggling={togglingSkill === skill.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SkillsPagination
        page={page}
        totalPages={totalPages}
        total={total}
        loading={loading}
        searchQuery={searchQuery}
        filterSource={filterSource}
        onFetchPage={fetchSkills}
      />

      {(selectedSkill || loadingDetail) && (
        <SkillDetailModal
          skill={selectedSkill}
          loading={loadingDetail}
          onClose={() => { setSelectedSkill(null); setLoadingDetail(false); }}
          onToggle={() => selectedSkill && handleToggleSkill(selectedSkill.id, selectedSkill.enabled)}
          isToggling={togglingSkill === selectedSkill?.id}
        />
      )}

      {showClawHub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setShowClawHub(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ClawHubBrowser
              onInstall={handleInstallFromClawHub}
              onClose={() => setShowClawHub(false)}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={skillToDisable !== null}
        title={t("skills.disableTitle")}
        message={t("skills.disableSkill", { name: skillToDisable?.name || "" })}
        confirmLabel={t("skills.disable")}
        cancelLabel={t("common.cancel")}
        variant="warning"
        isLoading={togglingSkill === skillToDisable?.id}
        onConfirm={handleConfirmDisable}
        onCancel={() => setSkillToDisable(null)}
      />

      <ConfirmDialog
        isOpen={showUpdateAllConfirm}
        title={t("skills.updateAllTitle")}
        message={t("skills.updateAllConfirm", { count: updates.filter(u => u.hasUpdate).length })}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        variant="info"
        isLoading={isUpdatingAll}
        onConfirm={handleUpdateAll}
        onCancel={() => setShowUpdateAllConfirm(false)}
      />
    </div>
  );
}