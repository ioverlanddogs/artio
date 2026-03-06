import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { artistListQuerySchema, paramsToObject, zodDetails } from "@/lib/validators";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await enforceRateLimit({
      key: principalRateLimitKey(req, "public:artists:list"),
      ...RATE_LIMITS.publicRead,
    });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    throw error;
  }

  const parsed = artistListQuerySchema.safeParse(paramsToObject(req.nextUrl.searchParams));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid query parameters", zodDetails(parsed.error));

  const { query, page, pageSize } = parsed.data;
  const where = {
    isPublished: true,
    deletedAt: null,
    ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    db.artist.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, slug: true, name: true, bio: true, avatarImageUrl: true },
    }),
    db.artist.count({ where }),
  ]);

  return NextResponse.json({ items, page, pageSize, total });
}
