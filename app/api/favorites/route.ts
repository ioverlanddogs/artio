import { NextRequest, NextResponse } from "next/server";
import { FavoriteTargetType } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { guardUser } from "@/lib/auth-guard";
import { favoriteBodySchema, parseBody, zodDetails } from "@/lib/validators";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;
  try {
    const targetTypeParam = req.nextUrl.searchParams.get("targetType");
    const targetType = targetTypeParam && targetTypeParam in FavoriteTargetType ? targetTypeParam as FavoriteTargetType : undefined;
    const items = await db.favorite.findMany({
      where: {
        userId: user.id,
        ...(targetType ? { targetType } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch {
    return apiError(500, "internal_error", "Failed to fetch favorites");
  }
}

export async function POST(req: NextRequest) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;
  try {
    const parsed = favoriteBodySchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid favorite payload", zodDetails(parsed.error));

    await enforceRateLimit({
      key: principalRateLimitKey(req, "favorites:write", user.id),
      limit: RATE_LIMITS.favoritesWrite.limit,
      windowMs: RATE_LIMITS.favoritesWrite.windowMs,
    });

    const item = await db.favorite.upsert({
      where: { userId_targetType_targetId: { userId: user.id, targetType: parsed.data.targetType, targetId: parsed.data.targetId } },
      update: {},
      create: { userId: user.id, targetType: parsed.data.targetType, targetId: parsed.data.targetId },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    return apiError(500, "internal_error", "Failed to save favorite");
  }
}

export async function DELETE(req: NextRequest) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;
  try {
    const parsed = favoriteBodySchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid favorite payload", zodDetails(parsed.error));

    await db.favorite.deleteMany({
      where: { userId: user.id, targetType: parsed.data.targetType, targetId: parsed.data.targetId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return apiError(500, "internal_error", "Failed to remove favorite");
  }
}
