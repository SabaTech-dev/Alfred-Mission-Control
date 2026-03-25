import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Authentication middleware for Alfred Mission Control.
 *
 * EVERYTHING requires login except:
 * - /login (login page)
 * - /api/auth/login (login endpoint)
 * - /api/auth/logout (logout endpoint)
 * - Static assets (/_next/*, favicon, images, css, js)
 */

function isPublicPath(pathname: string): boolean {
  // Login page and auth endpoints only
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) return true;

  // Static files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js")
  ) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Everything else requires auth
  const token =
    request.cookies.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "") ??
    null;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
