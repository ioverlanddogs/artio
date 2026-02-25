import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { forYouRecommendationsQuerySchema, paramsToObject, zodDetails } from "@/lib/validators";
import { getForYouRecommendations } from "@/lib/recommendations-for-you";
import { hasSessionCookieFromHeader, logAuthDebug } from "@/lib/auth-debug";

export async function handleForYouGet(req: { nextUrl: URL }, deps: {
  requireAuthFn?: typeof requireUser;
  getForYouRecommendationsFn?: typeof getForYouRecommendations;
} = {}) {
  try {
    const user = await (deps.requireAuthFn ?? requireUser)();
    const parsed = forYouRecommendationsQuerySchema.safeParse(paramsToObject(req.nextUrl.searchParams));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid query parameters", zodDetails(parsed.error));

    const result = await (deps.getForYouRecommendationsFn ?? getForYouRecommendations)(db, {
      userId: user.id,
      days: parsed.data.days,
      limit: parsed.data.limit,
    });

    return NextResponse.json({ windowDays: result.windowDays, items: result.items }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    logAuthDebug("api.recommendations.for-you.unauthorized", {
      pathname: req.nextUrl.pathname,
      host: req.nextUrl.host,
      hasCookieHeader: Boolean((req as { headers?: Headers }).headers?.get("cookie") ?? null),
      hasSessionCookieName: hasSessionCookieFromHeader((req as { headers?: Headers }).headers?.get("cookie") ?? null),
      userExists: false,
      redirectTarget: null,
    });
    return apiError(401, "unauthorized", "Login required");
  }
}
