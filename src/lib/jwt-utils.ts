// JWT Utils — Edge-compatible JWT session management using jose
// CRIT-02: JWT rotation with multi-secret support via kid header
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

interface KeyEntry {
  kid: string;
  secret: string;
}

interface SessionPayload extends JWTPayload {
  role: string;
  sub: string;
  iat: number;
  exp: number;
}

/**
 * Parse JWT secrets configuration from environment.
 *
 * Priority:
 * 1. JWT_SECRETS — JSON array of { kid, secret } for rotation
 * 2. JWT_SECRET — single legacy secret (backward compat)
 */
function loadKeys(): { entries: KeyEntry[]; currentKid: string | null } {
  const secretsJson = process.env.JWT_SECRETS;
  if (secretsJson) {
    try {
      const entries: KeyEntry[] = JSON.parse(secretsJson);
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error("JWT_SECRETS must be a non-empty array");
      }
      for (const e of entries) {
        if (!e.kid || !e.secret || e.secret.length < 32) {
          throw new Error(
            `Invalid key entry for kid="${e.kid}": secret must be at least 32 chars`
          );
        }
      }
      const currentKid = process.env.JWT_CURRENT_KID || entries[entries.length - 1].kid;
      return { entries, currentKid };
    } catch (e) {
      throw new Error(
        `Invalid JWT_SECRETS: ${e instanceof Error ? e.message : "parse error"}. ` +
        "Expected JSON array: [{\"kid\":\"k1\",\"secret\":\"32+chars\"}]"
      );
    }
  }

  // Legacy single-secret mode
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET or JWT_SECRETS environment variable must be set. " +
      "JWT_SECRET must be at least 32 characters long. " +
      "For rotation, use JWT_SECRETS=[{\"kid\":\"k1\",\"secret\":\"...\"}]"
    );
  }
  return { entries: [{ kid: "legacy", secret }], currentKid: "legacy" };
}

// Module-level key cache (re-initialized on each import = per-request in dev, once in prod)
const keyCache = loadKeys();

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function findKey(kid: string): KeyEntry | undefined {
  return keyCache.entries.find((k) => k.kid === kid);
}

export const jwtUtils = {
  /**
   * Sign a JWT token with the current key (identified by kid).
   * Includes kid in the protected header for rotation support.
   */
  async signToken(
    payload: Omit<SessionPayload, "iat">,
    ttlMs: number = 86_400_000
  ): Promise<string> {
    // Security: validate ttlMs to prevent extreme values
    const validatedTtlMs = Math.min(
      Math.max(ttlMs, 1000),
      7 * 24 * 60 * 60 * 1000
    ); // Min 1s, max 7 days

    // Security: validate role to prevent injection
    const validatedRole: string =
      typeof payload.role === "string" && /^[a-zA-Z0-9_-]+$/.test(payload.role)
        ? payload.role
        : "user";

    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.floor(validatedTtlMs / 1000);

    const currentKey = findKey(keyCache.currentKid!);
    if (!currentKey) {
      throw new Error(`Current signing key "${keyCache.currentKid}" not found`);
    }

    const jwt = await new SignJWT({
      ...payload,
      role: validatedRole,
      iat: now,
    })
      .setProtectedHeader({ alg: "HS256", kid: currentKey.kid })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(encodeSecret(currentKey.secret));

    return jwt;
  },

  /**
   * Verify a JWT token.
   * Uses kid from header to select the verifying key.
   * Falls back to trying all keys if kid is missing or not found.
   */
  async verifyToken(token: string): Promise<SessionPayload | null> {
    try {
      if (!token || typeof token !== "string") {
        return null;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // Try to extract kid from header (best-effort, don't fail on parse)
      let preferredKid: string | undefined;
      try {
        const header = JSON.parse(atob(parts[0]));
        preferredKid = header.kid;
      } catch {
        // Malformed header — will try all keys
      }

      // Try keys in order: matching kid first, then all others
      const keysToTry = preferredKid
        ? [
            ...keyCache.entries.filter((k) => k.kid === preferredKid),
            ...keyCache.entries.filter((k) => k.kid !== preferredKid),
          ]
        : keyCache.entries;

      for (const keyEntry of keysToTry) {
        try {
          const { payload } = await jwtVerify(
            token,
            encodeSecret(keyEntry.secret)
          );
          if (!payload.sub || !payload.role || !payload.iat || !payload.exp) {
            continue;
          }
          return payload as SessionPayload;
        } catch {
          continue; // Try next key
        }
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * Extract token from request (Authorization header or cookie)
   */
  getTokenFromRequest(request: {
    headers?: { get?: (n: string) => string | null };
    cookies?: {
      get?: (n: string) => { value?: string } | undefined;
    };
  }): string | null {
    const authHeader = request.headers?.get?.("Authorization");
    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
    return request.cookies?.get?.("auth_token")?.value ?? null;
  },

  /**
   * Check if a token is valid (not expired and properly signed)
   */
  async isValidToken(token: string): Promise<boolean> {
    const payload = await this.verifyToken(token);
    return payload !== null;
  },

  /**
   * Create a session token for authenticated user
   */
  async createSessionToken(
    ttlMs: number = 86_400_000,
    data?: { role?: string; sub?: string }
  ): Promise<string> {
    const validatedTtlMs = Math.min(
      Math.max(ttlMs, 1000),
      7 * 24 * 60 * 60 * 1000
    );
    const validatedRole =
      data?.role && /^[a-z_]+$/.test(data.role) ? data.role : "user";
    const validatedSub = data?.sub || "admin";

    return await this.signToken(
      {
        sub: validatedSub,
        role: validatedRole,
      },
      validatedTtlMs
    );
  },
};
