import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getBetaConfig, isEmailAllowed } from "@/lib/beta/access";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import { isAdminEmail } from "@/lib/admin-email";
import { hasSessionCookieFromHeader, logAuthDebug } from "@/lib/auth-debug";

const PUBLIC_BETA_PATHS = new Set(["/beta", "/login"]);

export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const requestId = requestHeaders.get(REQUEST_ID_HEADER) || crypto.randomUUID();
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  const pathname = req.nextUrl.pathname;
  const betaConfig = getBetaConfig();

  if (pathname === "/for-you" || pathname.startsWith("/for-you/")) {
    logAuthDebug("middleware.for-you", {
      pathname,
      hasSessionCookie: hasSessionCookieFromHeader(req.headers.get("cookie")),
      userExists: null,
      redirectTarget: null,
    });
  }


  if (betaConfig.betaMode && !pathname.startsWith("/api") && !PUBLIC_BETA_PATHS.has(pathname)) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const email = token?.email;

    if (!email) {
      const url = new URL("/beta", req.url);
      return NextResponse.redirect(url, {
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }

    if (!isEmailAllowed(email, betaConfig)) {
      const url = new URL("/beta?reason=not_allowed", req.url);
      return NextResponse.redirect(url, {
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const email = token?.email ?? null;

    if (!email) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { [REQUEST_ID_HEADER]: requestId } });
      }
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url, {
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }

    if (!isAdminEmail(email)) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403, headers: { [REQUEST_ID_HEADER]: requestId } });
      }
      const url = new URL("/", req.url);
      return NextResponse.redirect(url, {
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; child-src 'self' blob:; img-src 'self' data: blob: https:; font-src 'self' data: https:; worker-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https:;",
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth|api/health|api/ops/metrics|api/cron|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
