import { z } from "zod";
import { apiError } from "@/lib/api";
import { logAdminAction } from "@/lib/admin-audit";
import { uploadArtworkImageToBlob } from "@/lib/blob/upload-image";
import { db } from "@/lib/db";
import { fetchImageWithGuards } from "@/lib/ingest/fetch-image";
import { assertSafeUrl } from "@/lib/ingest/url-guard";
import { parseBody } from "@/lib/validators";

export type ReplaceArtworkImageDeps = {
  appDb: Pick<typeof db, "artwork" | "artworkImage" | "asset">;
  fetchImageFn: typeof fetchImageWithGuards;
  uploadImageFn: typeof uploadArtworkImageToBlob;
  assertUrlFn: typeof assertSafeUrl;
  logAction: typeof logAdminAction;
};

const defaultDeps: ReplaceArtworkImageDeps = {
  appDb: db,
  fetchImageFn: fetchImageWithGuards,
  uploadImageFn: uploadArtworkImageToBlob,
  assertUrlFn: assertSafeUrl,
  logAction: logAdminAction,
};

const replaceImageBodySchema = z.object({
  sourceUrl: z.string().trim().min(1),
});

export async function handleAdminArtworkImageReplace(
  req: Request,
  params: { id?: string },
  actorEmail: string,
  deps: Partial<ReplaceArtworkImageDeps> = {},
) {
  const resolved = { ...defaultDeps, ...deps };
  const artworkId = params.id;
  if (!artworkId) return apiError(400, "invalid_request", "Invalid route parameter");

  const parsedBody = replaceImageBodySchema.safeParse(await parseBody(req));
  if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload");

  const { sourceUrl } = parsedBody.data;

  try {
    await resolved.assertUrlFn(sourceUrl);
  } catch {
    return apiError(422, "invalid_source_url", "Image source URL is not allowed");
  }

  const artwork = await resolved.appDb.artwork.findUnique({
    where: { id: artworkId },
    select: { id: true, title: true },
  });

  if (!artwork) return apiError(404, "not_found", "Artwork not found");

  let fetched: Awaited<ReturnType<typeof fetchImageWithGuards>>;
  try {
    fetched = await resolved.fetchImageFn(sourceUrl);
  } catch {
    return apiError(422, "fetch_failed", "Could not fetch image from source URL");
  }

  let uploaded: Awaited<ReturnType<typeof uploadArtworkImageToBlob>>;
  try {
    uploaded = await resolved.uploadImageFn({
      artworkId: artwork.id,
      candidateId: artwork.id,
      sourceUrl,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
    });
  } catch {
    return apiError(500, "upload_failed", "Image upload failed");
  }

  const appDbWithTx = resolved.appDb as typeof db;
  const txRunner = appDbWithTx.$transaction?.bind(appDbWithTx) ?? db.$transaction.bind(db);

  const artworkImage = await txRunner(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        ownerUserId: null,
        kind: "IMAGE",
        url: uploaded.url,
        filename: null,
        mime: fetched.contentType,
        sizeBytes: fetched.sizeBytes,
        alt: artwork.title,
      },
      select: { id: true },
    });

    const existing = await tx.artworkImage.findMany({
      where: { artworkId },
      select: { id: true, sortOrder: true },
    });

    if (existing.length > 0) {
      await tx.artworkImage.updateMany({
        where: { artworkId },
        data: { sortOrder: { increment: 1 } },
      });
    }

    const created = await tx.artworkImage.create({
      data: {
        artworkId,
        assetId: asset.id,
        alt: artwork.title,
        sortOrder: 0,
      },
      select: { id: true },
    });

    await tx.artwork.update({
      where: { id: artworkId },
      data: { featuredAssetId: asset.id },
    });

    return created;
  });

  await resolved.logAction({
    actorEmail,
    action: "admin.artwork.image.replace",
    targetType: "artwork",
    targetId: artworkId,
    req,
    metadata: { imageId: artworkImage.id, sourceUrl, uploadedUrl: uploaded.url },
  });

  return Response.json({ imageId: artworkImage.id, url: uploaded.url });
}
