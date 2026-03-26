import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { type SessionUser } from "@/lib/auth";
import { parseBody, engagementBodySchema, zodDetails } from "@/lib/validators";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";
import { ENGAGEMENT_COOKIE_NAME, ENGAGEMENT_SESSION_MAX_AGE_SECONDS, generateSessionId, sanitizeEngagementMeta } from "@/lib/engagement";
import { Prisma } from "@prisma/client";

type EngagementCreate = {
  userId: string | null;
  sessionId: string | null;
  surface: "DIGEST" | "NEARBY" | "SEARCH" | "FOLLOWING";
  action: "VIEW" | "CLICK" | "FOLLOW" | "SAVE_SEARCH";
  targetType: "EVENT" | "VENUE" | "ARTIST" | "SAVED_SEARCH" | "DIGEST_RUN";
  targetId: string;
  metaJson?: Prisma.InputJsonValue | null;
};

type EngagementDeps = {
  createEvent: (input: EngagementCreate) => Promise<void>;
  getSessionUser: () => Promise<SessionUser | null>;
};

export async function handleEngagementPost(req: NextRequest, deps: EngagementDeps) {
  try {
    const parsed = engagementBodySchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid engagement payload", zodDetails(parsed.error));

    const user = await deps.getSessionUser();
    const cookieSessionId = req.cookies.get(ENGAGEMENT_COOKIE_NAME)?.value;
    const sessionId = cookieSessionId && cookieSessionId.length <= 120 ? cookieSessionId : generateSessionId();

    await enforceRateLimit({
      key: user?.id ? principalRateLimitKey(req, "engagement:write", user.id) : `engagement:write:session:${sessionId}:${principalRateLimitKey(req, "engagement", undefined)}`,
      limit: RATE_LIMITS.engagementWrite.limit,
      windowMs: RATE_LIMITS.engagementWrite.windowMs,
      fallbackToMemory: true,
    });


    await deps.createEvent({
      userId: user?.id ?? null,
      sessionId: user?.id ? null : sessionId,
      surface: parsed.data.surface,
      action: parsed.data.action,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      metaJson: sanitizeEngagementMeta(parsed.data.meta),
    });

    const response = NextResponse.json({ ok: true });
    if (!user && !cookieSessionId) {
      response.cookies.set(ENGAGEMENT_COOKIE_NAME, sessionId, {
        maxAge: ENGAGEMENT_SESSION_MAX_AGE_SECONDS,
        sameSite: "lax",
        httpOnly: false,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    return apiError(500, "internal_error", "Could not track engagement event");
  }
}
