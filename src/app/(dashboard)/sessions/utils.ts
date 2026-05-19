import type { SessionListItem } from "@/operations/sessions-list-ops";

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function shortModel(model: string): string {
  const m = model.replace("anthropic/", "").replace("claude-", "");
  const parts = m.split("-");
  if (parts.length >= 2) {
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const ver = parts.slice(1).join(".");
    return `${name} ${ver}`;
  }
  return model;
}

export function typeColor(type: SessionListItem["type"]): string {
  switch (type) {
    case "main":
      return "var(--accent)";
    case "cron":
      return "#a78bfa";
    case "subagent":
      return "#60a5fa";
    case "direct":
      return "#4ade80";
    default:
      return "var(--text-muted)";
  }
}