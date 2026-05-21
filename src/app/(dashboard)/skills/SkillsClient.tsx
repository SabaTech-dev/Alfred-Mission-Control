"use client";

import { ClawHubBrowser } from "@/components/ClawHubBrowser";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useI18n } from "@/i18n/provider";
import { SkillDetailModal } from "./SkillDetailModal";
import { SkillsPagination } from "./SkillsPagination";
import { SkillsFilterBar } from "./SkillsFilterBar";
import { SkillsHeader } from "./SkillsHeader";
import { SkillsContent } from "./SkillsContent";
import { useSkillsData } from "./useSkillsData";

export default function SkillsClient(props?: { initialData?: { skills: import("./SkillsTypes").Skill[] } }) {
  const { t } = useI18n();
  const {
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
    workspaceCount,
    systemCount,
    workspaceSkills,
    systemSkills,
    updateCount,
    setSearchQuery,
    setFilterSource,
    setSelectedSkill,
    setShowClawHub,
    setSkillToDisable,
    setShowUpdateAllConfirm,
    setLoadingDetail,
    fetchSkills,
    handleSelectSkill,
    handleToggleSkill,
    handleConfirmDisable,
    handleInstallFromClawHub,
    handleUpdateAll,
  } = useSkillsData(props?.initialData);

  return (
    <div style={{ padding: "24px" }}>
      <SkillsHeader
        totalSkills={skills.length}
        workspaceCount={workspaceCount}
        systemCount={systemCount}
        updateCount={updateCount}
        showClawHub={showClawHub}
        onShowClawHub={() => setShowClawHub(true)}
        onUpdateAll={() => setShowUpdateAllConfirm(true)}
      />

      <SkillsFilterBar
        searchQuery={searchQuery}
        filterSource={filterSource}
        skillsCount={skills.length}
        workspaceCount={workspaceCount}
        systemCount={systemCount}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilterSource}
      />

      <SkillsContent
        loading={loading}
        skills={skills}
        workspaceSkills={workspaceSkills}
        systemSkills={systemSkills}
        filterSource={filterSource}
        togglingSkill={togglingSkill}
        onSelectSkill={handleSelectSkill}
        onToggleSkill={handleToggleSkill}
      />

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
        message={t("skills.updateAllConfirm", { count: updateCount })}
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
