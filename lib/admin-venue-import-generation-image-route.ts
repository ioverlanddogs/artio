import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { addAdminEntityImage } from "@/lib/admin-entity-images-route";
import { uploadVenueImageToBlob } from "@/lib/blob/upload-image";
import { db } from "@/lib/db";
import { fetchImageWithGuards } from "@/lib/ingest/fetch-image";
import { assertSafeUrl } from "@/lib/ingest/url-guard";
import { idParamSchema, parseBody, zodDetails } from "@/lib/validators";

type ImportGenerationVenueImageDeps = {
  appDb: typeof db;
  fetchImage: typeof fetchImageWithGuards;
  uploadVenueImage: typeof uploadVenueImageToBlob;
  addImage: typeof addAdminEntityImage;
};

const defaultDeps: ImportGenerationVenueImageDeps = {
  appDb: db,
  fetchImage: fetchImageWithGuards,
  uploadVenueImage: uploadVenueImageToBlob,
  addImage: addAdminEntityImage,
};

const bodySchema = z.object({
  imageUrl: z.string().trim().min(1),
  setAsFeatured: z.boolean().optional().default(false),
});

export async function handleVenueImportGenerationImage(
  req: Request,
  params: { id?: string },
  actorEmail: string,
  deps: Partial<ImportGenerationVenueImageDeps> = {},
) {
  const resolved = { ...defaultDeps, ...deps };

  const parsedId = idParamSchema.safeParse({ id: params.id });
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  const parsedBody = bodySchema.safeParse(await parseBody(req));
  if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

  const venue = await resolved.appDb.venue.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true },
  });

  if (!venue) return apiError(404, "not_found", "Venue not found");

  try {
    await assertSafeUrl(parsedBody.data.imageUrl);
  } catch {
    return apiError(400, "invalid_image_url", "Invalid image URL");
  }

  let fetched: Awaited<ReturnType<typeof fetchImageWithGuards>>;
  try {
    fetched = await resolved.fetchImage(parsedBody.data.imageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch image URL";
    return apiError(400, "image_fetch_failed", message);
  }

  const uploaded = await resolved.uploadVenueImage({
    venueId: venue.id,
    sourceUrl: parsedBody.data.imageUrl,
    contentType: fetched.contentType,
    bytes: fetched.bytes,
  });

  const created = await resolved.addImage({
    entityType: "venue",
    entityId: venue.id,
    makePrimary: parsedBody.data.setAsFeatured,
    url: uploaded.url,
    contentType: fetched.contentType,
    sizeBytes: fetched.sizeBytes,
    actorEmail,
    req,
  });

  if (created.status !== 201) return created;

  const body = await created.json() as { item: { id: string; url: string; isPrimary: boolean } };
  return NextResponse.json({ ok: true, imageId: body.item.id, url: body.item.url, isPrimary: body.item.isPrimary });
}
