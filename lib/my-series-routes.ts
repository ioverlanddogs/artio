import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { parseBody, venueIdParamSchema, zodDetails } from "@/lib/validators";
import { ensureUniqueSeriesSlugWithDeps, slugifySeriesTitle } from "@/lib/series-slug";

type SeriesRecord = { id: string; title: string; slug: string };

type GetVenueSeriesDeps = {
  requireVenueRole: (venueId: string, role: "EDITOR" | "OWNER") => Promise<unknown>;
  listSeriesByVenue: (venueId: string) => Promise<SeriesRecord[]>;
};

export async function handleGetVenueSeries(params: Promise<{ id: string }>, deps: GetVenueSeriesDeps) {
  const parsedId = venueIdParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  await deps.requireVenueRole(parsedId.data.id, "EDITOR");
  const series = await deps.listSeriesByVenue(parsedId.data.id);
  return NextResponse.json({ series });
}

const createSeriesSchema = z.object({
  title: z.string().trim().min(1).max(160),
  venueId: z.guid(),
});

type CreateSeriesDeps = {
  requireVenueRole: (venueId: string, role: "EDITOR" | "OWNER") => Promise<unknown>;
  findSeriesBySlug: (slug: string) => Promise<{ id: string } | null>;
  createSeries: (input: { title: string; slug: string; venueId: string }) => Promise<{ id: string; title: string; slug: string; venueId: string | null }>;
};

export async function handleCreateSeries(req: NextRequest, deps: CreateSeriesDeps) {
  const parsed = createSeriesSchema.safeParse(await parseBody(req));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsed.error));

  await deps.requireVenueRole(parsed.data.venueId, "EDITOR");
  const slug = await ensureUniqueSeriesSlugWithDeps({ findBySlug: deps.findSeriesBySlug }, slugifySeriesTitle(parsed.data.title));
  const series = await deps.createSeries({ title: parsed.data.title, slug, venueId: parsed.data.venueId });
  return NextResponse.json(series, { status: 201 });
}
