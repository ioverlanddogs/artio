import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { guardUser } from "@/lib/auth-guard";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;
  try {
    const collections = await db.collection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, isPublic: true, _count: { select: { items: true } } },
    });
    return NextResponse.json({ items: collections });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "P2010") return NextResponse.json({ items: [] });
    return apiError(500, "internal_error", "Unexpected error");
  }
}

export async function POST(req: NextRequest) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => null) as { title?: string; description?: string; isPublic?: boolean } | null;
  const title = body?.title?.trim();
  if (!title || title.length < 2) return apiError(400, "invalid_request", "Title is required");

  try {
    await enforceRateLimit({
      key: principalRateLimitKey(req, "collections:create", user.id),
      limit: RATE_LIMITS.collectionCreate.limit,
      windowMs: RATE_LIMITS.collectionCreate.windowMs,
      fallbackToMemory: true,
    });
    try {
      const created = await db.collection.create({
        data: { userId: user.id, title: title.slice(0, 80), description: body?.description?.trim().slice(0, 280), isPublic: body?.isPublic ?? true },
        select: { id: true, title: true, description: true, isPublic: true },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2021" || code === "P2010") return apiError(503, "feature_unavailable", "Collections are not yet available");
      return apiError(500, "internal_error", "Unexpected error");
    }
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    return apiError(500, "internal_error", "Failed to create collection");
  }
}
