"use client";

import Image from "next/image";

import { IdentityForm } from "@/hooks/useAgentInspect";

interface AgentIdentityTabProps {
  agentId: string;
  identityForm: IdentityForm;
  setIdentityForm: (form: IdentityForm) => void;
  identitySaving: boolean;
  identitySaveSuccess: boolean;
  identityError: string | null;
  handleSaveIdentity: () => void;
}

export function AgentIdentityTab({
  agentId,
  identityForm,
  setIdentityForm,
  identitySaving,
  identitySaveSuccess,
  identityError,
  handleSaveIdentity,
}: AgentIdentityTabProps) {
  return (
    <>
      {/* Avatar preview */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-2xl overflow-hidden">
          {identityForm.avatar ? (
            identityForm.avatar.startsWith("http") || identityForm.avatar.startsWith("/") ? (
              <Image src={identityForm.avatar} alt="Avatar" width={48} height={48} unoptimized className="w-full h-full object-cover" />
            ) : (
              <span>{identityForm.avatar}</span>
            )
          ) : (
            <span>🎭</span>
          )}
        </div>
        <div>
          <div className="font-medium text-neutral-900 dark:text-white">
            {identityForm.name || agentId}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {identityForm.role || "Agent"}
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={identityForm.name}
            onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-info"
            placeholder="Agent display name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Role
          </label>
          <input
            type="text"
            value={identityForm.role}
            onChange={(e) => setIdentityForm({ ...identityForm, role: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-info"
            placeholder="Agent role"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Avatar (emoji or URL)
          </label>
          <input
            type="text"
            value={identityForm.avatar}
            onChange={(e) => setIdentityForm({ ...identityForm, avatar: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-info"
            placeholder="🤖 or https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Personality
          </label>
          <textarea
            value={identityForm.personality}
            onChange={(e) => setIdentityForm({ ...identityForm, personality: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-info resize-none"
            rows={3}
            placeholder="Describe the agent's personality traits..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Mission
          </label>
          <textarea
            value={identityForm.mission}
            onChange={(e) => setIdentityForm({ ...identityForm, mission: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-info resize-none"
            rows={3}
            placeholder="Agent's personal mission statement..."
          />
        </div>
      </div>

      {/* Status messages */}
      {identityError && (
        <div className="text-sm text-error bg-error-soft dark:bg-error-soft px-3 py-2 rounded-lg">
          {identityError}
        </div>
      )}
      {identitySaveSuccess && (
        <div className="text-sm text-success bg-success-soft dark:bg-success-soft px-3 py-2 rounded-lg">
          Identity saved successfully!
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSaveIdentity}
        disabled={identitySaving}
        className="w-full px-4 py-2 text-sm bg-info hover:bg-info/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {identitySaving ? "Saving..." : "Save Identity"}
      </button>
    </>
  );
}
