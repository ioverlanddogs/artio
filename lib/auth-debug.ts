import { headers } from "next/headers";

const AUTH_DEBUG_TRUTHY = new Set(["1", "true", "yes"]);

export function isAuthDebugEnabled() {
  const raw = process.env.DEBUG_AUTH;
  if (!raw) return false;
  return AUTH_DEBUG_TRUTHY.has(raw.trim().toLowerCase());
}

export function hasSessionCookieFromHeader(cookieHeader: string | null) {
  return getSessionCookiePresence(cookieHeader) !== "none";
}

export type SessionCookiePresence = "none" | "secure" | "plain" | "both";

export function getSessionCookiePresence(cookieHeader: string | null): SessionCookiePresence {
  const cookie = cookieHeader ?? "";
  const hasSecure = /(?:^|;\s*)__Secure-next-auth\.session-token=/.test(cookie);
  const hasPlain = /(?:^|;\s*)next-auth\.session-token=/.test(cookie);
  if (hasSecure && hasPlain) return "both";
  if (hasSecure) return "secure";
  if (hasPlain) return "plain";
  return "none";
}

export async function getAuthDebugRequestMeta() {
  try {
    const requestHeaders = await headers();
    const pathname = requestHeaders.get("x-pathname") ?? "unknown";
    const host = requestHeaders.get("host") ?? "unknown";
    const cookieHeader = requestHeaders.get("cookie");
    const hasCookieHeader = Boolean(cookieHeader);
    const hasSessionCookieName = getSessionCookiePresence(cookieHeader);
    return { pathname, host, hasCookieHeader, hasSessionCookieName };
  } catch {
    return { pathname: "unknown", host: "unknown", hasCookieHeader: false, hasSessionCookieName: "none" as const };
  }
}

export function logAuthDebug(event: string, data: Record<string, unknown>) {
  if (!isAuthDebugEnabled()) return;
  console.info("[auth-debug]", event, data);
}
