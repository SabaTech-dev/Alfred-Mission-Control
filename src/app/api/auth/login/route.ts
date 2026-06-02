import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtUtils } from "@/lib/jwt-utils";
import { validateBody, LoginSchema } from "@/lib/api-validation";
import { verifyPassword, resolvePasswordHash } from "@/lib/password-utils";
import { loginRateLimiter, getClientIp } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const { allowed, retryAfterMs } = loginRateLimiter.check(ip);
  if (!allowed) {
    const retryAfterSec = loginRateLimiter.getRetryAfterSeconds(retryAfterMs);
    return NextResponse.json(
      { success: false, error: "Too many failed attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  const rawBody = await request.json();
  const validation = validateBody(LoginSchema, rawBody);
  if (!validation.success) return validation.error;
  const { password } = validation.data;

  // CRIT-01: bcrypt comparison (supports ADMIN_PASSWORD_HASH or legacy ADMIN_PASSWORD)
  const passwordHash = await resolvePasswordHash();
  const isValid = passwordHash ? await verifyPassword(password, passwordHash) : false;

  if (isValid) {
    loginRateLimiter.clear(ip);

    const ttlMs = 24 * 60 * 60 * 1000;
    const token = await jwtUtils.createSessionToken(ttlMs, { role: "admin" });

    const response = NextResponse.json({
      success: true,
      expiresIn: Math.floor(ttlMs / 1000),
    });

    const isHttps = request.headers.get("x-forwarded-proto") === "https";
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: ttlMs / 1000,
      path: "/",
    });

    return response;
  }

  loginRateLimiter.recordFailure(ip);

  return NextResponse.json(
    { success: false, error: "Invalid password" },
    { status: 401 }
  );
}
