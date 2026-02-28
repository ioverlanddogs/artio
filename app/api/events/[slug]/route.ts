import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { slugParamSchema, zodDetails } from "@/lib/validators";
import { publishedEventWhere } from "@/lib/publish-status";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = slugParamSchema.safeParse(await params);
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsed.error));
  const event = await db.event.findFirst({ where: { slug: parsed.data.slug, ...publishedEventWhere() }, include: { venue: true, images: { include: { asset: { select: { url: true } } } }, eventTags: { include: { tag: true } }, eventArtists: { include: { artist: true } } } });
  if (!event) return apiError(404, "not_found", "Event not found");
  return NextResponse.json(event);
}
