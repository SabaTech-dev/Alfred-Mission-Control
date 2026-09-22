/**
 * Sanitizes a login `from` query parameter against open redirects (CWE-601).
 * Only same-origin relative paths are allowed; everything else falls back to "/".
 */
export function sanitizeRedirect(from?: string | null): string {
  if (!from) return "/";
  // Only a single leading "/" is safe; "//", "/\", "\" and schemes are not.
  if (from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\")) {
    return from;
  }
  return "/";
}
