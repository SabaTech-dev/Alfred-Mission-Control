// JWT Utils — Edge-compatible JWT session management using jose
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Use a proper secret key from environment — NO fallback allowed
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable must be set and at least 32 characters long. " +
      "This is required for secure JWT signing."
    );
  }
  return new TextEncoder().encode(secret);
})();

interface SessionPayload extends JWTPayload {
  role: string;
  sub: string; // subject (user identifier)
  iat: number; // issued at
  exp: number; // expiration
}

export const jwtUtils = {
  /**
   * Create a JWT token for session authentication
   * Edge-compatible: uses jose instead of Node.js crypto
   */
  async signToken(payload: Omit<SessionPayload, "iat">, ttlMs: number = 86_400_000): Promise<string> {
    // Security: validate ttlMs to prevent extreme values
    const validatedTtlMs = Math.min(Math.max(ttlMs, 1000), 7 * 24 * 60 * 60 * 1000); // Min 1s, max 7 days
    
    // Security: validate role to prevent injection
    const validatedRole = payload.role && /^[a-zA-Z0-9_-]+$/.test(payload.role) ? payload.role : "user";
    
    const now = Math.floor(Date.now() / 1000); // JWT uses seconds, not milliseconds
    const exp = now + Math.floor(validatedTtlMs / 1000);

    const jwt = await new SignJWT({
      ...payload,
      role: validatedRole,
      iat: now,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(JWT_SECRET);

    return jwt;
  },

  /**
   * Verify a JWT token
   * Edge-compatible: uses jose instead of Node.js crypto
   */
  async verifyToken(token: string): Promise<SessionPayload | null> {
    try {
      // Security: basic token format validation
      if (!token || typeof token !== "string") {
        return null;
      }

      // Split token into parts and validate basic structure
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // Verify the JWT using jose
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Ensure required fields exist
      if (!payload.sub || !payload.role || !payload.iat || !payload.exp) {
        return null;
      }

      return payload as SessionPayload;
    } catch (error) {
      // Invalid token (signature error, expired, malformed, etc.)
      return null;
    }
  },

  /**
   * Extract token from request (Authorization header or cookie)
   */
  getTokenFromRequest(request: { 
    headers?: { get?: (n: string) => string | null }; 
    cookies?: { get?: (n: string) => { value?: string } | undefined } 
  }): string | null {
    const authHeader = request.headers?.get?.("Authorization");
    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
    return request.cookies?.get?.("auth_token")?.value ?? null;
  },

  /**
   * Check if a token is valid (not expired and properly signed)
   * Edge-compatible replacement for sessionStore.validate
   */
  async isValidToken(token: string): Promise<boolean> {
    const payload = await this.verifyToken(token);
    return payload !== null;
  },

  /**
   * Create a session token for authenticated user
   * Edge-compatible replacement for sessionStore.generateToken
   */
  async createSessionToken(ttlMs: number = 86_400_000, data?: { role?: string; sub?: string }): Promise<string> {
    const validatedTtlMs = Math.min(Math.max(ttlMs, 1000), 7 * 24 * 60 * 60 * 1000); // Min 1s, max 7 days
    const validatedRole = data?.role && /^[a-z_]+$/.test(data.role) ? data.role : "user";
    const validatedSub = data?.sub || "admin"; // Default to admin for now

    return await this.signToken({
      sub: validatedSub,
      role: validatedRole,
    }, validatedTtlMs);
  },
};