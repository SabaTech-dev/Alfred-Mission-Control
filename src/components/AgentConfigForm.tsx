"use client";

export interface AgentConfig {
  id: string;
  name: string;
  type: "assistant" | "specialist" | "worker" | "custom";
  model: string;
  systemPrompt: string;
  skills: string[];
  temperature: number;
  maxTokens: number;
  autoStart: boolean;
  heartbeatInterval: number;
}

export type WizardStep = "template" | "config" | "skills" | "preview";

const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", tier: "fast" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", tier: "smart" },
  { id: "gpt-4o", name: "GPT-4o", tier: "balanced" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "fast" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "fast" },
  { id: "zai/glm-5", name: "GLM-5", tier: "balanced" },
];

const AGENT_TEMPLATES = [
  {
    id: "assistant",
    name: "General Assistant",
    emoji: "🤖",
    description: "Versatile agent for general tasks",
    config: { type: "assistant" as const, model: "claude-sonnet-4-20250514", systemPrompt: "You are a helpful assistant.", skills: [] as string[], temperature: 0.7, maxTokens: 4096 },
  },
  {
    id: "specialist",
    name: "Code Specialist",
    emoji: "💻",
    description: "Expert in coding and debugging",
    config: { type: "specialist" as const, model: "claude-sonnet-4-20250514", systemPrompt: "You are an expert software developer. Focus on writing clean, efficient, and well-documented code.", skills: ["github", "code-analysis"], temperature: 0.3, maxTokens: 8192 },
  },
  {
    id: "worker",
    name: "Task Worker",
    emoji: "⚙️",
    description: "Handles repetitive tasks and automation",
    config: { type: "worker" as const, model: "gpt-4o-mini", systemPrompt: "You are a task-focused agent. Complete tasks efficiently and report results clearly.", skills: [] as string[], temperature: 0.5, maxTokens: 2048 },
  },
  {
    id: "custom",
    name: "Custom Agent",
    emoji: "✨",
    description: "Start from scratch with custom config",
    config: { type: "custom" as const, model: "claude-sonnet-4-20250514", systemPrompt: "", skills: [] as string[], temperature: 0.7, maxTokens: 4096 },
  },
];

const AVAILABLE_SKILLS = [
  { id: "github", name: "GitHub", description: "Repo and issue management" },
  { id: "browser", name: "Browser", description: "Web browsing and scraping" },
  { id: "calendar", name: "Calendar", description: "Calendar management" },
  { id: "email", name: "Email", description: "Email sending and reading" },
  { id: "weather", name: "Weather", description: "Weather information" },
  { id: "slack", name: "Slack", description: "Slack messaging" },
  { id: "telegram", name: "Telegram", description: "Telegram messaging" },
];

interface AgentConfigFormProps {
  step: WizardStep;
  config: AgentConfig;
  selectedTemplate: string | null;
  error: string | null;
  onTemplateSelect: (id: string) => void;
  onConfigChange: (updates: Partial<AgentConfig>) => void;
  onToggleSkill: (skillId: string) => void;
}

export function AgentConfigForm({
  step, config, selectedTemplate, error, onTemplateSelect, onConfigChange, onToggleSkill,
}: AgentConfigFormProps) {
  return (
    <div className="p-6 min-h-[400px]">
      {step === "template" && (
        <div className="grid grid-cols-2 gap-4">
          <p className="col-span-2 text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            Choose a template to get started quickly
          </p>
          {AGENT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onTemplateSelect(template.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? "border-info bg-info-soft dark:bg-info-soft"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
              }`}
            >
              <div className="text-3xl mb-2">{template.emoji}</div>
              <div className="font-medium text-neutral-900 dark:text-white">{template.name}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{template.description}</div>
            </button>
          ))}
        </div>
      )}

      {step === "config" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Agent Name *</label>
            <input
              type="text" value={config.name}
              onChange={(e) => onConfigChange({ name: e.target.value })}
              placeholder="My Agent"
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-info outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Model</label>
            <select
              value={config.model}
              onChange={(e) => onConfigChange({ model: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-info outline-none"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>{model.name} ({model.tier})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">System Prompt</label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => onConfigChange({ systemPrompt: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-info outline-none font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Temperature: {config.temperature}
              </label>
              <input type="range" min="0" max="1" step="0.1" value={config.temperature}
                onChange={(e) => onConfigChange({ temperature: parseFloat(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Max Tokens</label>
              <input type="number" value={config.maxTokens}
                onChange={(e) => onConfigChange({ maxTokens: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-info outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.autoStart}
                onChange={(e) => onConfigChange({ autoStart: e.target.checked })}
                className="rounded border-neutral-300" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Auto-start on system boot</span>
            </label>
          </div>
        </div>
      )}

      {step === "skills" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Select skills to enable for this agent</p>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_SKILLS.map((skill) => (
              <button key={skill.id} onClick={() => onToggleSkill(skill.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  config.skills.includes(skill.id)
                    ? "border-info bg-info-soft dark:bg-info-soft"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                }`}
              >
                <div className="font-medium text-neutral-900 dark:text-white">{skill.name}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{skill.description}</div>
                {config.skills.includes(skill.id) && <span className="text-info text-xs mt-1 block">✓ Selected</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Preview: {config.name || "Unnamed Agent"}</h3>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Type</span>
              <span className="font-medium text-neutral-900 dark:text-white capitalize">{config.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Model</span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {AVAILABLE_MODELS.find((m) => m.id === config.model)?.name || config.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Temperature</span>
              <span className="font-medium text-neutral-900 dark:text-white">{config.temperature}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Max Tokens</span>
              <span className="font-medium text-neutral-900 dark:text-white">{config.maxTokens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Skills</span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {config.skills.length > 0 ? config.skills.join(", ") : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Auto-start</span>
              <span className="font-medium text-neutral-900 dark:text-white">{config.autoStart ? "Yes" : "No"}</span>
            </div>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 text-sm">System Prompt</span>
            <div className="mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg font-mono text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
              {config.systemPrompt || "(empty)"}
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-error-soft text-error dark:text-error rounded-lg text-sm">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export { AGENT_TEMPLATES };
