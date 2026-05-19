"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { AgentConfigForm, AgentConfig, WizardStep, AGENT_TEMPLATES } from "@/components/AgentConfigForm";

const ALL_STEPS: WizardStep[] = ["template", "config", "skills", "preview"];

interface AgentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (agent: AgentConfig) => Promise<void>;
}

export function AgentCreateModal({ isOpen, onClose, onCreate }: AgentCreateModalProps) {
  const [step, setStep] = useState<WizardStep>("template");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AgentConfig>({
    id: "",
    name: "",
    type: "assistant",
    model: "claude-sonnet-4-20250514",
    systemPrompt: "You are a helpful assistant.",
    skills: [],
    temperature: 0.7,
    maxTokens: 4096,
    autoStart: true,
    heartbeatInterval: 30,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setConfig((prev) => ({
      ...prev,
      type: template.config.type,
      model: template.config.model,
      systemPrompt: template.config.systemPrompt,
      skills: template.config.skills,
      temperature: template.config.temperature,
      maxTokens: template.config.maxTokens,
      name: prev.name || template.name,
    }));
  };

  const handleConfigChange = (updates: Partial<AgentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const toggleSkill = (skillId: string) => {
    setConfig((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId],
    }));
  };

  const handleNext = () => {
    const currentIndex = ALL_STEPS.indexOf(step);
    if (currentIndex < ALL_STEPS.length - 1) {
      setStep(ALL_STEPS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = ALL_STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(ALL_STEPS[currentIndex - 1]);
    }
  };

  const handleCreate = async () => {
    if (!config.id) {
      config.id = `agent-${Date.now()}`;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = useCallback(() => {
    switch (step) {
      case "template":
        return selectedTemplate !== null;
      case "config":
        return config.name.trim().length > 0;
      case "skills":
        return true;
      case "preview":
        return true;
      default:
        return false;
    }
  }, [step, selectedTemplate, config.name]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Create New Agent
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mt-4">
            {ALL_STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-info text-white"
                      : i < ALL_STEPS.indexOf(step)
                      ? "bg-success text-white"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      i < ALL_STEPS.indexOf(step)
                        ? "bg-success"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <AgentConfigForm
          step={step}
          config={config}
          selectedTemplate={selectedTemplate}
          error={error}
          onTemplateSelect={handleTemplateSelect}
          onConfigChange={handleConfigChange}
          onToggleSkill={toggleSkill}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
          <button
            onClick={step === "template" ? onClose : handleBack}
            className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {step === "template" ? "Cancel" : "Back"}
          </button>

          {step === "preview" ? (
            <button
              onClick={handleCreate}
              disabled={!canProceed() || isCreating}
              className="px-6 py-2 bg-info hover:bg-info disabled:bg-neutral-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isCreating && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isCreating ? "Creating..." : "Create Agent"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-info hover:bg-info disabled:bg-neutral-400 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default AgentCreateModal;
