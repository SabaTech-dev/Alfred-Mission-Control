"use client";

import type { SessionListItem } from "@/operations/sessions-list-ops";

export type FilterType = "all" | "main" | "cron" | "subagent" | "direct";

export const FILTER_TABS: Array<{ id: FilterType; labelKey: string; emoji: string }> = [
  { id: "all", labelKey: "sessions.all", emoji: "📋" },
  { id: "main", labelKey: "sessions.main", emoji: "🫙" },
  { id: "cron", labelKey: "sessions.cron", emoji: "🕐" },
  { id: "subagent", labelKey: "sessions.subagents", emoji: "🤖" },
  { id: "direct", labelKey: "sessions.chats", emoji: "💬" },
];

export { SessionListItem };