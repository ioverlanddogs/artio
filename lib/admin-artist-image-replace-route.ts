import { z } from "zod";
import { apiError } from "@/lib/api";
import { logAdminAction } from "@/lib/admin-audit";
import { uploadArtistImageToBlob } from "@/lib/blob/upload-image";
import { db } from "@/lib/db";
import { fetchImageWithGuards } from "@/lib/ingest/fetch-image";
import { assertSafeUrl } from "@/lib/ingest/url-guard";
import { parseBody } from "@/lib/validators";

export type ReplaceArtistImageDeps = {
  appDb: Pick<typeof db, "artist" | "artistImage" | "asset">;
  fetchImageFn: typeof fetchImageWithGuards;
  uploadImageFn: typeof uploadArtistImageToBlob;
  assertUrlFn: typeof assertSafeUrl;
  logAction: typeof logAdminAction;
};

const defaultDeps: ReplaceArtistImageDeps = {
  appDb: db,
  fetchImageFn: fetchImageWithGuards,
  uploadImageFn: uploadArtistImageToBlob,
  assertUrlFn: assertSafeUrl,
  logAction: logAdminAction,
};

const replaceImageBodySchema = z.object({
  sourceUrl: z.string().trim().min(1),
});

export async function handleAdminArtistImageReplace(
  req: Request,
  params: { id?: string },
  actorEmail: string,
  deps: Partial<ReplaceArtistImageDeps> = {},
) {
  const resolved = { ...defaultDeps, ...deps };
  const artistId = params.id;
  if (!artistId) return apiError(400, "invalid_request", "Invalid route parameter");

  const parsedBody = replaceImageBodySchema.safeParse(await parseBody(req));
  if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload");

  const { sourceUrl } = parsedBody.data;

  try {
    await resolved.assertUrlFn(sourceUrl);
  } catch {
    return apiError(422, "invalid_source_url", "Image source URL is not allowed");
  }

  const artist = await resolved.appDb.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true },
  });

  if (!artist) return apiError(404, "not_found", "Artist not found");

  let fetched: Awaited<ReturnType<typeof fetchImageWithGuards>>;
  try {
    fetched = await resolved.fetchImageFn(sourceUrl);
  } catch {
    return apiError(422, "fetch_failed", "Could not fetch image from source URL");
  }

  let uploaded: Awaited<ReturnType<typeof uploadArtistImageToBlob>>;
  try {
    uploaded = await resolved.uploadImageFn({
      artistId: artist.id,
      sourceUrl,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
    });
  } catch {
    return apiError(500, "upload_failed", "Image upload failed");
  }

  const appDbWithTx = resolved.appDb as typeof db;
  const txRunner = appDbWithTx.$transaction?.bind(appDbWithTx) ?? db.$transaction.bind(db);

  const artistImage = await txRunner(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        ownerUserId: null,
        kind: "IMAGE",
        url: uploaded.url,
        filename: null,
        mime: fetched.contentType,
        sizeBytes: fetched.sizeBytes,
        alt: artist.name,
      },
      select: { id: true },
    });

    await tx.artistImage.updateMany({
      where: { artistId },
      data: { isPrimary: false },
    });

    const created = await tx.artistImage.create({
      data: {
        artistId,
        assetId: asset.id,
        url: uploaded.url,
        alt: artist.name,
        contentType: fetched.contentType,
        sizeBytes: fetched.sizeBytes,
        sortOrder: 0,
        isPrimary: true,
      },
      select: { id: true },
    });

    await tx.artist.update({
      where: { id: artistId },
      data: { featuredAssetId: asset.id, featuredImageUrl: null },
    });

    return created;
  });

  await resolved.logAction({
    actorEmail,
    action: "admin.artist.image.replace",
    targetType: "artist",
    targetId: artistId,
    req,
    metadata: { imageId: artistImage.id, sourceUrl, uploadedUrl: uploaded.url },
  });

  return Response.json({ imageId: artistImage.id, url: uploaded.url });
}
