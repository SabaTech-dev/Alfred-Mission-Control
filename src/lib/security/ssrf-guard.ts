/**
 * SSRF guard — blocks private/internal IP ranges and loopback.
 * Used by API routes that accept user-supplied URLs.
 */

/**
 * Checks if a hostname resolves to or is a private/internal IP.
 * Blocks: loopback (127.x), private (10.x, 172.16-31.x, 192.168.x),
 * link-local (169.254.x), unique local (fc00::/7), and IPv6 loopback (::1).
 */
export function isPrivateIP(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv6 loopback
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;

  // IPv4 loopback
  if (host === "localhost" || host.startsWith("127.")) return true;

  // Private ranges (RFC 1918)
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;

  // 172.16.0.0 – 172.31.255.255
  const parts = host.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  // Link-local (169.254.x.x) — includes cloud metadata
  if (host.startsWith("169.254.")) return true;

  // Carrier-grade NAT (100.64.x.x)
  if (host.startsWith("100.64.")) return true;

  // IPv6 unique local addresses (fc00::/7)
  if (host.startsWith("fc") || host.startsWith("fd")) return true;

  // IPv6 link-local (fe80::/10)
  if (host.startsWith("fe80:") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true;

  return false;
}
