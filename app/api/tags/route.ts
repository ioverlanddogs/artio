import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await enforceRateLimit({
      key: principalRateLimitKey(req, "tags:list"),
      limit: RATE_LIMITS.expensiveReads.limit,
      windowMs: RATE_LIMITS.expensiveReads.windowMs,
    });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    throw error;
  }

  const category = req.nextUrl.searchParams.get("category");
  const items = await db.tag.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ items });
}
