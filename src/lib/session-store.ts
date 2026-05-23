// Session store — simple in-memory session management

import { randomUUID } from "crypto";

interface Session {
  token: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

// Security: limit max sessions to prevent memory exhaustion
const MAX_SESSIONS = 1000;
const sessions = new Map<string, Session>();

export const sessionStore = {
  async validate(token: string): Promise<boolean> {
    // Security: validate token format (UUID)
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      return false;
    }
    const session = sessions.get(token);
    if (!session) return false;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessions.delete(token);
      return false;
    }
    return true;
  },

  async generateToken(ttlMs: number = 86_400_000, data?: { role?: string }): Promise<string> {
    // Security: validate ttlMs to prevent extreme values
    const validatedTtlMs = Math.min(Math.max(ttlMs, 1000), 7 * 24 * 60 * 60 * 1000); // Min 1s, max 7 days
    
    // Security: validate role to prevent injection
    const validatedRole = data?.role && /^[a-z_]+$/.test(data.role) ? data.role : "user";
    
    // Security: cleanup expired sessions first to prevent memory exhaustion
    await this.clearRevoked();
    
    // Security: enforce max session limit
    if (sessions.size >= MAX_SESSIONS) {
      throw new Error("Maximum sessions reached");
    }
    
    const token = randomUUID();
    sessions.set(token, {
      token,
      role: validatedRole,
      createdAt: Date.now(),
      expiresAt: Date.now() + validatedTtlMs,
    });
    return token;
  },

  async invalidate(token: string): Promise<void> {
    sessions.delete(token);
  },

  async clearRevoked(): Promise<number> {
    const now = Date.now();
    let cleared = 0;
    for (const [token, session] of sessions) {
      if (session.expiresAt && now > session.expiresAt) {
        sessions.delete(token);
        cleared++;
      }
    }
    return cleared;
  },

  // Security: get current session count for monitoring
  getSessionCount(): number {
    return sessions.size;
  },

  getTokenFromRequest(request: { headers?: { get?: (n: string) => string | null }; cookies?: { get?: (n: string) => { value?: string } | undefined } }): string | null {
    const authHeader = request.headers?.get?.("Authorization");
    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
    return request.cookies?.get?.("auth_token")?.value ?? null;
  },
};
