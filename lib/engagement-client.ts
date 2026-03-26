"use client";

import { ENGAGEMENT_COOKIE_NAME } from "@/lib/engagement";

type EngagementPayload = {
  surface: "DIGEST" | "NEARBY" | "SEARCH" | "FOLLOWING";
  action: "VIEW" | "CLICK" | "FOLLOW" | "SAVE_SEARCH";
  targetType: "EVENT" | "VENUE" | "ARTIST" | "SAVED_SEARCH" | "DIGEST_RUN";
  targetId: string;
  meta?: {
    digestRunId?: string;
    position?: number;
    query?: string;
    feedback?: "up" | "down";
  };
};

const LAST_VIEW_SENT = new Map<string, number>();
const VIEW_DEBOUNCE_MS = 8_000;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function ensureSessionId() {
  if (typeof window === "undefined") return null;
  const fromStorage = window.localStorage.getItem(ENGAGEMENT_COOKIE_NAME);
  const existing = fromStorage ?? readCookie(ENGAGEMENT_COOKIE_NAME);
  if (existing) {
    if (!fromStorage) window.localStorage.setItem(ENGAGEMENT_COOKIE_NAME, existing);
    return existing;
  }
  const id = crypto.randomUUID();
  window.localStorage.setItem(ENGAGEMENT_COOKIE_NAME, id);
  document.cookie = `${ENGAGEMENT_COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  return id;
}

export function trackEngagement(payload: EngagementPayload) {
  try {
    if (payload.action === "VIEW") {
      const key = `${payload.surface}:${payload.action}:${payload.targetType}:${payload.targetId}:${payload.meta?.position ?? "-"}`;
      const now = Date.now();
      const last = LAST_VIEW_SENT.get(key) ?? 0;
      if (now - last < VIEW_DEBOUNCE_MS) return;
      LAST_VIEW_SENT.set(key, now);
    }
    ensureSessionId();
    void fetch("/api/engagement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) {
          // best-effort analytics — silently discard failures
        }
      })
      .catch(() => undefined);
  } catch {
    // best-effort analytics only
  }
}
