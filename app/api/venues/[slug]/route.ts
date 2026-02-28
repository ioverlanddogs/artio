import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { slugParamSchema, zodDetails } from "@/lib/validators";
import { publishedEventWhere, publishedVenueWhere } from "@/lib/publish-status";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = slugParamSchema.safeParse(await params);
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsed.error));
  const venue = await db.venue.findFirst({ where: { slug: parsed.data.slug, ...publishedVenueWhere() }, include: { events: { where: publishedEventWhere(), orderBy: { startAt: "asc" } } } });
  if (!venue) return apiError(404, "not_found", "Venue not found");
  return NextResponse.json(venue);
}
