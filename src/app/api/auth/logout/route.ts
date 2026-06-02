import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // JWT is stateless — just clear the cookie
  const response = NextResponse.json({ success: true });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: request.headers.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
