import { headers } from "next/headers";

function isAuthDebugEnabled() {
  return process.env.DEBUG_AUTH === "1" || process.env.DEBUG_AUTH === "true";
}

export function hasSessionCookieFromHeader(cookieHeader: string | null) {
  const cookie = cookieHeader ?? "";
  return cookie.includes("next-auth.session-token") || cookie.includes("__Secure-next-auth.session-token");
}

export async function getAuthDebugRequestMeta() {
  try {
    const requestHeaders = await headers();
    const pathname = requestHeaders.get("x-pathname") ?? "unknown";
    const hasSessionCookie = hasSessionCookieFromHeader(requestHeaders.get("cookie"));
    return { pathname, hasSessionCookie };
  } catch {
    return { pathname: "unknown", hasSessionCookie: false };
  }
}

export function logAuthDebug(event: string, data: Record<string, unknown>) {
  if (!isAuthDebugEnabled()) return;
  console.info("[auth-debug]", event, data);
}
