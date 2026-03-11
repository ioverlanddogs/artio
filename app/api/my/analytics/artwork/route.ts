import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getArtworkBreakdown } from "@/lib/artwork-analytics";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function parseWindowDays(value: string | null): 7 | 30 {
  return value === "7" ? 7 : 30;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const artist = await db.artist.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!artist) return apiError(403, "forbidden", "Artist profile required");

    const windowDays = parseWindowDays(request.nextUrl.searchParams.get("windowDays"));
    const artworks = await getArtworkBreakdown(artist.id, windowDays);

    return NextResponse.json({ artworks }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
