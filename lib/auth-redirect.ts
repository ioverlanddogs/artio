import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/login-next";

export function buildLoginRedirectUrl(nextPath: string) {
  const sanitizedNextPath = sanitizeNextPath(nextPath, "/");
  return `/login?next=${encodeURIComponent(sanitizedNextPath)}`;
}

export function redirectToLogin(nextPath: string): never {
  redirect(buildLoginRedirectUrl(nextPath));
}
