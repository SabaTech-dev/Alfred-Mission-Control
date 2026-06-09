"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Monitor,
  Bot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  Zap,
  Shield,
  Bug,
  Eye,
  Archive,
  FileCode,
  FileText,
  Image,
  Database,
  Cpu,
  Activity,
  Layers,
  RefreshCw,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/i18n/provider";

// ============================================
// Types
// ============================================

type AgentStatus = "online" | "working" | "idle" | "offline" | "error";
type PipelineStage = "backlog" | "in_progress" | "security" | "qa" | "review" | "done";

interface AgentInfo {
  id: string;
  name: string;
  status: AgentStatus;
  lastActivity: string | null;
  activeSessions: number;
  currentTask?: string;
  model?: string;
}

interface TaskInfo {
  id: string;
  title: string;
  stage: PipelineStage;
  agent: string;
  priority: "P0" | "P1" | "P2" | "P3";
  progress: number;
  updatedAt: string;
}

interface ArtifactInfo {
  id: string;
  name: string;
  type: "report" | "file" | "image" | "code" | "data" | "other";
  size: number;
  modified: string;
  agent: string;
  extension: string;
}

interface MemoryEntry {
  file: string;
  title: string;
  snippet: string;
  matches: number;
  path: string;
}

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<AgentStatus, { color: string; bg: string; label: string; icon: typeof Monitor }> = {
  online: { color: "#32D74B", bg: "rgba(50, 215, 75, 0.12)", label: "Online", icon: CheckCircle2 },
  working: { color: "#0A84FF", bg: "rgba(10, 132, 255, 0.12)", label: "Working", icon: Loader2 },
  idle: { color: "#FFD60A", bg: "rgba(255, 214, 10, 0.12)", label: "Idle", icon: Clock },
  offline: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.12)", label: "Offline", icon: AlertTriangle },
  error: { color: "#FF453A", bg: "rgba(255, 69, 58, 0.12)", label: "Error", icon: AlertTriangle },
};

const STAGE_CONFIG: Record<PipelineStage, { color: string; label: string; icon: typeof Monitor }> = {
  backlog: { color: "#6b7280", label: "Backlog", icon: Archive },
  in_progress: { color: "#0A84FF", label: "In Progress", icon: Loader2 },
  security: { color: "#FF453A", label: "Security", icon: Shield },
  qa: { color: "#FFD60A", label: "QA Testing", icon: Bug },
  review: { color: "#8b5cf6", label: "Review", icon: Eye },
  done: { color: "#32D74B", label: "Done", icon: CheckCircle2 },
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  report: FileText,
  code: FileCode,
  image: Image,
  data: Database,
  file: FileText,
  other: FileText,
};

// ============================================
// Helper: time ago
// ============================================

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TabType = "agents" | "pipeline" | "artifacts" | "memory";

// ============================================
// Main Component
// ============================================

export default function AgentOSPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("agents");

  const tabs: { id: TabType; label: string; icon: typeof Monitor }[] = [
    { id: "agents", label: "Agent Status", icon: Cpu },
    { id: "pipeline", label: "Task Pipeline", icon: Layers },
    { id: "artifacts", label: "Output Gallery", icon: Archive },
    { id: "memory", label: "Shared Memory", icon: Activity },
  ];

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8">
        <PageHeader
          title="Agent OS — Command Center"
          subtitle="Layer 5: Unified agent orchestration dashboard"
          helpTitle="Agent OS Dashboard"
          helpDescription="Monitor agent status, track task pipeline, browse artifacts, and search shared memory."
        />

        {/* Agent OS 7-Layer Badge */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {["Foundation", "Memory", "Brain", "Agents", "Command Center", "Production", "Loop"].map((layer, i) => (
            <div
              key={layer}
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: i === 4 ? "var(--accent)" : "var(--card)",
                color: i === 4 ? "var(--bg)" : "var(--text-muted)",
                border: `1px solid ${i === 4 ? "var(--accent)" : "var(--border)"}`,
                fontWeight: i === 4 ? 700 : 400,
              }}
            >
              L{i + 1}: {layer}
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div
          className="flex gap-1 mb-6 rounded-xl p-1 overflow-x-auto"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "agents" && <AgentStatusPanel />}
        {activeTab === "pipeline" && <TaskPipelinePanel />}
        {activeTab === "artifacts" && <ArtifactGalleryPanel />}
        {activeTab === "memory" && <SharedMemoryPanel />}
      </div>
    </ErrorBoundary>
  );
}

// ============================================
// Feature 1: Agent Status Panel
// ============================================

function AgentStatusPanel() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authFetch("/api/agents/status");
      const data = await res.json();
      if (data.agents) {
        setAgents(
          data.agents.map((a: { id: string; name: string; status: string; lastActivity: string; activeSessions: number }) => ({
            id: a.id,
            name: a.name || a.id,
            status: (a.status as AgentStatus) || "offline",
            lastActivity: a.lastActivity || null,
            activeSessions: a.activeSessions || 0,
          }))
        );
      }
      setError(null);
    } catch (e) {
      setError("Failed to fetch agent status");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAgents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  // Aggregate stats
  const online = agents.filter((a) => a.status === "online" || a.status === "working").length;
  const working = agents.filter((a) => a.status === "working").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const offline = agents.filter((a) => a.status === "offline").length;

  return (
    <div>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Agents", value: agents.length, color: "var(--text-primary)" },
          { label: "Online", value: online, color: "#32D74B" },
          { label: "Working", value: working, color: "#0A84FF" },
          { label: "Offline", value: offline, color: "#6b7280" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg p-4 mb-4 flex items-center gap-3"
          style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error)", color: "var(--error)" }}
        >
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const config = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
          const StatusIcon = config.icon;
          return (
            <div
              key={agent.id}
              className="rounded-xl p-4 transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--card)",
                border: `1px solid ${config.color}40`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: config.color,
                      animation: agent.status === "working" ? "pulse 2s infinite" : "none",
                    }}
                  />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {agent.name}
                  </span>
                </div>
                <StatusIcon
                  className="w-4 h-4"
                  style={{ color: config.color, animation: agent.status === "working" ? "spin 2s linear infinite" : "none" }}
                />
              </div>

              <div className="space-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span style={{ color: config.color }}>{config.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Activity</span>
                  <span>{timeAgo(agent.lastActivity)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Sessions</span>
                  <span>{agent.activeSessions}</span>
                </div>
              </div>

              {/* Status bar */}
              <div
                className="mt-3 h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: agent.status === "working" ? "75%" : agent.status === "online" ? "100%" : "25%",
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {agents.length === 0 && !error && (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No agents detected. Ensure OpenClaw is running.</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Feature 3: Task Pipeline Panel
// ============================================

function TaskPipelinePanel() {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<PipelineStage | "all">("all");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch("/api/agent-os/tasks");
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const stages: PipelineStage[] = ["backlog", "in_progress", "security", "qa", "review", "done"];
  const filteredTasks = filterStage === "all" ? tasks : tasks.filter((t) => t.stage === filterStage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Stage Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStage("all")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
          style={{
            backgroundColor: filterStage === "all" ? "var(--accent)" : "var(--card)",
            color: filterStage === "all" ? "#fff" : "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          All ({tasks.length})
        </button>
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const count = tasks.filter((t) => t.stage === stage).length;
          return (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: filterStage === stage ? config.color : "var(--card)",
                color: filterStage === stage ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${filterStage === stage ? config.color : "var(--border)"}`,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: filterStage === stage ? "#fff" : config.color }} />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Pipeline Kanban View */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const stageTasks = tasks.filter((t) => t.stage === stage);
          const Icon = config.icon;
          return (
            <div key={stage} className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {config.label}
                </span>
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: config.color + "20", color: config.color }}
                >
                  {stageTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {stageTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-2 rounded-lg text-xs"
                    style={{ backgroundColor: "var(--bg)", borderLeft: `3px solid ${config.color}` }}
                  >
                    <div className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                      {task.title}
                    </div>
                    <div className="flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
                      <span>{task.agent}</span>
                      <span
                        className="px-1 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor:
                            task.priority === "P0"
                              ? "#FF453A20"
                              : task.priority === "P1"
                              ? "#FF950020"
                              : "var(--border)",
                          color: task.priority === "P0" ? "#FF453A" : task.priority === "P1" ? "#FF9500" : "var(--text-muted)",
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {stageTasks.length > 5 && (
                  <div className="text-center text-xs pt-1" style={{ color: "var(--text-muted)" }}>
                    +{stageTasks.length - 5} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="px-5 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)" }}>
          Task Details ({filteredTasks.length})
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {filteredTasks.slice(0, 20).map((task) => {
            const stageConfig = STAGE_CONFIG[task.stage];
            return (
              <div key={task.id} className="px-5 py-3 flex items-center gap-4 text-sm hover:bg-[var(--accent)]/5 transition-colors">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: stageConfig.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {task.title}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {task.agent} · {timeAgo(task.updatedAt)}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                  style={{ backgroundColor: stageConfig.color + "20", color: stageConfig.color }}
                >
                  {stageConfig.label}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                  style={{
                    backgroundColor:
                      task.priority === "P0"
                        ? "#FF453A20"
                        : task.priority === "P1"
                        ? "#FF950020"
                        : "var(--border)",
                    color: task.priority === "P0" ? "#FF453A" : task.priority === "P1" ? "#FF9500" : "var(--text-muted)",
                  }}
                >
                  {task.priority}
                </span>
                <div className="w-20 shrink-0">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${task.progress}%`, backgroundColor: stageConfig.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No tasks found in the pipeline.</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Feature 4: Output Gallery Panel
// ============================================

function ArtifactGalleryPanel() {
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchArtifacts = useCallback(async () => {
    try {
      let url = "/api/agent-os/artifacts?limit=100";
      if (typeFilter !== "all") url += `&type=${typeFilter}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.artifacts) {
        setArtifacts(data.artifacts);
      }
    } catch (e) {
      console.error("Failed to fetch artifacts:", e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  const filtered = artifacts.filter((a) => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const types = ["all", "report", "code", "image", "data", "file", "other"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all capitalize"
              style={{
                backgroundColor: typeFilter === type ? "var(--accent)" : "var(--card)",
                color: typeFilter === type ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((artifact) => {
          const Icon = TYPE_ICONS[artifact.type] || FileText;
          return (
            <div
              key={artifact.id}
              className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer group"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {artifact.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {artifact.extension || "file"} · {formatBytes(artifact.size)}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <div className="flex justify-between">
                  <span>Agent</span>
                  <span style={{ color: "var(--text-secondary)" }}>{artifact.agent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modified</span>
                  <span style={{ color: "var(--text-secondary)" }}>{timeAgo(artifact.modified)}</span>
                </div>
              </div>

              <div
                className="mt-3 pt-3 flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ borderTop: "1px solid var(--border)", color: "var(--accent)" }}
              >
                <ChevronRight className="w-3 h-3" />
                Open file
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No artifacts found. Generated files will appear here.</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Feature 5: Shared Memory Panel
// ============================================

function SharedMemoryPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<MemoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [memoryFiles, setMemoryFiles] = useState<Array<{ name: string; path: string; modified: string; size: number }>>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  // Load memory file list on mount
  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await authFetch("/api/memory");
        const data = await res.json();
        if (data.files) {
          setMemoryFiles(data.files);
        }
      } catch (e) {
        console.error("Failed to load memory files:", e);
      } finally {
        setFilesLoading(false);
      }
    }
    loadFiles();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await authFetch(`/api/memory/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  return (
    <div>
      {/* Search Bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <Search className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search shared memory (Engram, daily logs, MEMORY.md)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent outline-none text-sm flex-1"
          style={{ color: "var(--text-primary)" }}
        />
        {searching && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />}
        {searchQuery && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
            {results.length} results
          </span>
        )}
      </div>

      {/* Recent Memory Files Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Search Results */}
          {searchQuery.length >= 2 ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="px-5 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)" }}>
                Search Results for "{searchQuery}"
              </div>
              {results.length === 0 && !searching && (
                <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No matches found. Try a different query.</p>
                </div>
              )}
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {results.map((result, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {result.title}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
                        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                      >
                        {result.matches} matches
                      </span>
                    </div>
                    <div className="text-xs pl-6 font-mono" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{result.path}</span>
                    </div>
                    <div className="text-xs mt-2 pl-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {result.snippet}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Shared Memory</p>
              <p className="text-sm">Search across all memory files — MEMORY.md, daily logs, Engram entries.</p>
              <p className="text-sm mt-1">Type at least 2 characters to begin.</p>
            </div>
          )}
        </div>

        {/* Recent Files */}
        <div
          className="rounded-xl overflow-hidden h-fit"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)" }}>
            Memory Files
          </div>
          {filesLoading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : (
            <div className="divide-y text-xs" style={{ borderColor: "var(--border)" }}>
              {memoryFiles.map((file, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[var(--accent)]/5 transition-colors">
                  <div className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                    {file.name}
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>
                    {formatBytes(file.size)} · {timeAgo(file.modified)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
