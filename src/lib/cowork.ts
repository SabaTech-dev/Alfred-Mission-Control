/**
 * Cowork layout helpers — localStorage-backed persistence for the multi-agent
 * collaboration panel.
 *
 * Storage key is fixed (`amc_cowork_layout`) per the feature spec. Panel count
 * is always clamped to the supported 2-4 range.
 *
 * @module cowork
 */

export const STORAGE_KEY = "amc_cowork_layout";

export const MIN_PANELS = 2;
export const MAX_PANELS = 4;

export interface CoworkLayout {
  /** Number of agent panels (2-4). */
  panels: number;
  /** Selected agent ids, one per panel. */
  agents: string[];
}

export const DEFAULT_LAYOUT: CoworkLayout = {
  panels: 2,
  agents: [],
};

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function clampPanels(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_LAYOUT.panels;
  return Math.min(MAX_PANELS, Math.max(MIN_PANELS, Math.round(n)));
}

function isValidLayout(raw: unknown): raw is CoworkLayout {
  if (typeof raw !== "object" || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.agents) || !obj.agents.every((a) => typeof a === "string")) {
    return false;
  }
  return true;
}

/** Read the persisted cowork layout. Falls back to DEFAULT_LAYOUT on any error. */
export function loadLayout(): CoworkLayout {
  if (!isBrowser()) return { ...DEFAULT_LAYOUT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const parsed: unknown = JSON.parse(raw);
    if (!isValidLayout(parsed)) return { ...DEFAULT_LAYOUT };
    return {
      panels: clampPanels(parsed.panels),
      agents: parsed.agents,
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

/** Persist a cowork layout, clamping panels and trimming agents to that count. */
export function saveLayout(layout: CoworkLayout): void {
  if (!isBrowser()) return;
  const panels = clampPanels(layout.panels);
  const agents = Array.isArray(layout.agents)
    ? layout.agents.filter((a) => typeof a === "string").slice(0, panels)
    : [];
  const normalized: CoworkLayout = { panels, agents };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Quota or serialization errors are non-fatal for layout persistence.
  }
}
