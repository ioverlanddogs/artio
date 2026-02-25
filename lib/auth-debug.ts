import { headers } from "next/headers";

const AUTH_DEBUG_TRUTHY = new Set(["1", "true", "yes"]);

export function isAuthDebugEnabled() {
  const raw = process.env.DEBUG_AUTH;
  if (!raw) return false;
  return AUTH_DEBUG_TRUTHY.has(raw.trim().toLowerCase());
}

export function hasSessionCookieFromHeader(cookieHeader: string | null) {
  const cookie = cookieHeader ?? "";
  return cookie.includes("next-auth.session-token") || cookie.includes("__Secure-next-auth.session-token");
}

export async function getAuthDebugRequestMeta() {
  try {
    const requestHeaders = await headers();
    const pathname = requestHeaders.get("x-pathname") ?? "unknown";
    const host = requestHeaders.get("host") ?? "unknown";
    const cookieHeader = requestHeaders.get("cookie");
    const hasCookieHeader = Boolean(cookieHeader);
    const hasSessionCookieName = hasSessionCookieFromHeader(cookieHeader);
    return { pathname, host, hasCookieHeader, hasSessionCookieName };
  } catch {
    return { pathname: "unknown", host: "unknown", hasCookieHeader: false, hasSessionCookieName: false };
  }
}

export function logAuthDebug(event: string, data: Record<string, unknown>) {
  if (!isAuthDebugEnabled()) return;
  console.info("[auth-debug]", event, data);
}
