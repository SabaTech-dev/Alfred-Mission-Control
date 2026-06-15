"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Webhook,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  headers: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  lastTriggered?: string;
  lastStatus?: number;
  deliveryCount: number;
  failureCount: number;
}

const AVAILABLE_EVENTS = [
  "*",
  "activity.created",
  "activity.error",
  "cron.executed",
  "cron.failed",
  "agent.error",
  "heartbeat.completed",
  "mission.updated",
  "standup.generated",
];

export default function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: ["*"],
    secret: "",
  });

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/webhooks");
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch {
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreate = async () => {
    if (!formData.name || !formData.url) return;
    try {
      await authFetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setFormData({ name: "", url: "", events: ["*"], secret: "" });
      setShowForm(false);
      fetchWebhooks();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authFetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
      fetchWebhooks();
    } catch {
      /* ignore */
    }
  };

  const handleToggle = async (webhook: WebhookEntry) => {
    try {
      await authFetch(`/api/webhooks?id=${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !webhook.enabled }),
      });
      fetchWebhooks();
    } catch {
      /* ignore */
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await authFetch(`/api/webhooks?id=${id}&trigger=true`, { method: "POST" });
      fetchWebhooks();
    } catch {
      /* ignore */
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => {
      const events = prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event];
      return { ...prev, events: events.length === 0 ? ["*"] : events };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Webhook className="h-5 w-5" />
            Webhooks Outbound
          </h2>
          <p className="text-sm text-muted-foreground">
            Notifica a servicios externos cuando ocurren eventos en AMC
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchWebhooks}
            className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-border bg-card p-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Slack Hook"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Secret (HMAC signing)</label>
            <input
              type="text"
              value={formData.secret}
              onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
              placeholder="Optional — used for X-AMC-Signature header"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Events</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`rounded-full px-3 py-1 text-xs font-mono transition-colors ${
                    formData.events.includes(event)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Create Webhook
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading webhooks...
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <Webhook className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No webhooks configured. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <motion.div
              key={wh.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{wh.name}</span>
                    {wh.enabled ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate font-mono">{wh.url}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {wh.events.map((event) => (
                      <span
                        key={event}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                    className="rounded-lg p-2 hover:bg-muted transition-colors"
                    title="Send test"
                  >
                    {testingId === wh.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggle(wh)}
                    className="rounded-lg p-2 hover:bg-muted transition-colors"
                    title={wh.enabled ? "Disable" : "Enable"}
                  >
                    {wh.enabled ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Stats */}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  {wh.deliveryCount} deliveries
                </span>
                {wh.failureCount > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-3 w-3" />
                    {wh.failureCount} failures
                  </span>
                )}
                {wh.lastStatus != null && wh.lastStatus > 0 && (
                  <span className="flex items-center gap-1">
                    {wh.lastStatus >= 200 && wh.lastStatus < 300 ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    HTTP {wh.lastStatus}
                  </span>
                )}
                {wh.lastTriggered && (
                  <span>
                    Last: {new Date(wh.lastTriggered).toLocaleString()}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
