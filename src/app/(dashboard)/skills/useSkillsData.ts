"use client";

import { useEffect, useState, useCallback } from "react";
import { Skill, SkillsInitialData, SkillUpdate } from "./SkillsTypes";

const PAGE_SIZE = 50;

export function useSkillsData(initialData?: SkillsInitialData) {
  const [skills, setSkills] = useState<Skill[]>(initialData?.skills ?? []);
  const [loading, setLoading] = useState(!initialData?.skills?.length);
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
  const fetchSkills = useCallback(async (p: number, search?: string, source?: string) => {
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
  }, []);

  // Load skill detail with fullContent on selection
  const handleSelectSkill = useCallback(async (skillId: string) => {
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
  }, [skills]);

  useEffect(() => {
    if (!initialData?.skills?.length) {
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

  const handleInstallFromClawHub = useCallback(() => {
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
  }, [fetchSkills, page, searchQuery, filterSource]);

  const executeToggleSkill = useCallback(async (skillId: string, currentlyEnabled: boolean) => {
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
  }, [selectedSkill]);

  const handleToggleSkill = useCallback((skillId: string, currentlyEnabled: boolean) => {
    const skill = skills.find(s => s.id === skillId);
    if (currentlyEnabled && skill) {
      setSkillToDisable(skill);
      return;
    }
    executeToggleSkill(skillId, currentlyEnabled);
  }, [skills, executeToggleSkill]);

  const handleConfirmDisable = useCallback(() => {
    if (skillToDisable) {
      executeToggleSkill(skillToDisable.id, true);
    }
  }, [skillToDisable, executeToggleSkill]);

  const handleUpdateAll = useCallback(async () => {
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
  }, [updates]);

  // Computed values
  const workspaceCount = skills.filter((s) => s.source === "workspace").length;
  const systemCount = skills.filter((s) => s.source === "system").length;
  const workspaceSkills = skills.filter((s) => s.source === "workspace");
  const systemSkills = skills.filter((s) => s.source === "system");
  const updateCount = updates.filter(u => u.hasUpdate).length;

  return {
    // State
    skills,
    loading,
    searchQuery,
    filterSource,
    selectedSkill,
    loadingDetail,
    togglingSkill,
    showClawHub,
    updates,
    skillToDisable,
    showUpdateAllConfirm,
    isUpdatingAll,
    page,
    totalPages,
    total,
    // Computed
    workspaceCount,
    systemCount,
    workspaceSkills,
    systemSkills,
    updateCount,
    // Actions
    setSearchQuery,
    setFilterSource,
    setSelectedSkill,
    setShowClawHub,
    setSkillToDisable,
    setShowUpdateAllConfirm,
    fetchSkills,
    handleSelectSkill,
    handleToggleSkill,
    handleConfirmDisable,
    handleInstallFromClawHub,
    handleUpdateAll,
    setLoadingDetail,
  };
}
