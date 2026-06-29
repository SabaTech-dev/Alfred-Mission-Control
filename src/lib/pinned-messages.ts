/**
 * Pinned chat message helpers.
 *
 * Pin state lives in localStorage under `amc_pinned_messages` as an array
 * of message ids (newest first). A hard cap keeps the pinned tray usable.
 *
 * @module pinned-messages
 */

export const STORAGE_KEY = "amc_pinned_messages";
export const MAX_PINS = 10;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Read pinned message ids from localStorage. */
export function loadPinnedIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Persist pinned ids. */
export function savePinnedIds(ids: string[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/**
 * Toggle an id in the pinned set, enforcing the cap.
 *
 * Removing is idempotent. Adding beyond MAX_PINS evicts the oldest (last)
 * entry and prepends the new one so the most-recently-pinned stays first.
 */
export function togglePin(current: string[], id: string): string[] {
  if (current.includes(id)) {
    return current.filter((existing) => existing !== id);
  }
  const next = [id, ...current];
  return next.slice(0, MAX_PINS);
}
