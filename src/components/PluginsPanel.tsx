"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Puzzle,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Settings2,
  Search,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";

interface Plugin {
  id: string;
  name: string;
  url: string | null;
  type: string;
  status: string;
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: string;
  updatedAt?: string;
}

const PLUGIN_TYPES: Record<string, { label: string; color: string }> = {
  "third-party": { label: "Third-Party", color: "text-blue-400" },
  "integration": { label: "Integration", color: "text-green-400" },
  "ui-widget": { label: "UI Widget", color: "text-purple-400" },
  "mcp": { label: "MCP Server", color: "text-orange-400" },
};

export default function PluginsPanel() {
  const { t } = useI18n();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPlugin, setNewPlugin] = useState({
    name: "",
    url: "",
    type: "third-party",
  });

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/plugins");
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch (err) {
      console.error("Failed to fetch plugins:", err);
      setError("Failed to load plugins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleInstall = async () => {
    if (!newPlugin.name.trim()) return;
    try {
      const res = await authFetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlugin),
      });
      if (res.ok) {
        setShowInstall(false);
        setNewPlugin({ name: "", url: "", type: "third-party" });
        await fetchPlugins();
      } else {
        const data = await res.json();
        setError(data.error || "Install failed");
      }
    } catch (err) {
      setError("Failed to install plugin");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await authFetch(`/api/plugins/${id}/toggle`, { method: "POST" });
      await fetchPlugins();
    } catch (err) {
      setError("Failed to toggle plugin");
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      await authFetch(`/api/plugins?id=${id}`, { method: "DELETE" });
      await fetchPlugins();
    } catch (err) {
      setError("Failed to uninstall plugin");
    }
  };

  const filtered = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = plugins.filter((p) => p.enabled).length;
  const typeColors = PLUGIN_TYPES;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            Plugins System
          </h2>
          <span className="text-sm text-muted-foreground">
            ({enabledCount}/{plugins.length} active)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPlugins}
            className="rounded-md p-2 hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowInstall(!showInstall)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Install
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Install Form */}
      {showInstall && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Install New Plugin
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Plugin name"
              value={newPlugin.name}
              onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="URL (optional)"
              value={newPlugin.url}
              onChange={(e) => setNewPlugin({ ...newPlugin, url: e.target.value })}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
            <select
              value={newPlugin.type}
              onChange={(e) => setNewPlugin({ ...newPlugin, type: e.target.value })}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {Object.entries(PLUGIN_TYPES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowInstall(false)}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={!newPlugin.name.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {plugins.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-1.5 text-sm"
          />
        </div>
      )}

      {/* Plugins List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading plugins...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Puzzle className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {plugins.length === 0
              ? "No plugins installed yet. Click \"Install\" to add one."
              : "No plugins match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((plugin) => (
            <div
              key={plugin.id}
              className={`rounded-lg border bg-card p-4 transition-opacity ${
                !plugin.enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`mt-0.5 ${plugin.enabled ? "text-green-400" : "text-muted-foreground"}`}>
                    {plugin.enabled ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{plugin.name}</h3>
                      {plugin.url && (
                        <a
                          href={plugin.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium ${typeColors[plugin.type]?.color || "text-muted-foreground"}`}>
                        {typeColors[plugin.type]?.label || plugin.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {new Date(plugin.installedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(plugin.id)}
                    className="rounded-md p-1.5 hover:bg-muted transition-colors"
                    title={plugin.enabled ? "Disable" : "Enable"}
                  >
                    <Power className={`h-4 w-4 ${plugin.enabled ? "text-green-400" : "text-muted-foreground"}`} />
                  </button>
                  <button
                    onClick={() => handleUninstall(plugin.id)}
                    className="rounded-md p-1.5 hover:bg-destructive/10 transition-colors"
                    title="Uninstall"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
