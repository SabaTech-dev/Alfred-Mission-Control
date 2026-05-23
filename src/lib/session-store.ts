// Session store — simple in-memory session management

import { randomUUID } from "crypto";

interface Session {
  token: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export const sessionStore = {
  async validate(token: string): Promise<boolean> {
    const session = sessions.get(token);
    if (!session) return false;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessions.delete(token);
      return false;
    }
    return true;
  },

  async generateToken(ttlMs: number = 86_400_000, data?: { role?: string }): Promise<string> {
    const token = randomUUID();
    sessions.set(token, {
      token,
      role: data?.role || "user",
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
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

  getTokenFromRequest(request: { headers?: { get?: (n: string) => string | null }; cookies?: { get?: (n: string) => { value?: string } | undefined } }): string | null {
    const authHeader = request.headers?.get?.("Authorization");
    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
    return request.cookies?.get?.("auth_token")?.value ?? null;
  },
};
