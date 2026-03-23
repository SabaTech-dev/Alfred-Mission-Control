import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.AUTH_SECRET || "NOT_SET";
  return NextResponse.json({
    auth_secret_prefix: secret.substring(0, 8),
    auth_secret_length: secret.length,
    admin_password_prefix: (process.env.ADMIN_PASSWORD || "NOT_SET").substring(0, 4),
  });
}
