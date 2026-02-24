import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { paramsToObject, searchQuerySchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const parsed = searchQuerySchema.safeParse(paramsToObject(req.nextUrl.searchParams));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid query parameters", zodDetails(parsed.error));
  const { query } = parsed.data;
  const artists = await db.artist.findMany({ where: { isPublished: true, deletedAt: null, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) }, orderBy: { name: "asc" } });
  return NextResponse.json({ items: artists });
}
