import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.slice(7) 
    : request.cookies.get("auth_token")?.value ?? null;

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }

  // Decode payload
  const payloadB64 = token.split(".")[0];
  const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
  
  // Validate
  const isValid = await sessionStore.validate(token);
  
  // Get secret prefix for debugging
  const secret = process.env.AUTH_SECRET || "";
  
  return NextResponse.json({
    tokenLength: token.length,
    payload,
    payloadB64,
    secretPrefix: secret.substring(0, 8),
    secretLength: secret.length,
    isValid,
    now: Date.now(),
    expired: payload.exp < Date.now(),
    expiresAt: new Date(payload.exp).toISOString(),
  });
}
