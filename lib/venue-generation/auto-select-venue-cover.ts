import { fetchImageWithGuards } from "@/lib/ingest/fetch-image";
import { uploadVenueImageToBlob } from "@/lib/blob/upload-image";
import { assertSafeUrl } from "@/lib/ingest/url-guard";

export type AutoSelectResult =
  | { ok: true; venueImageId: string; blobUrl: string }
  | { ok: false; reason: string };

export type AutoSelectDb = {
  asset: {
    create: (args: {
      data: {
        ownerUserId: null;
        kind: "IMAGE";
        url: string;
        filename: null;
        mime: string;
        sizeBytes: number;
        alt: string;
      };
      select: { id: true };
    }) => Promise<{ id: string }>;
  };
  venueImage: {
    create: (args: {
      data: {
        venueId: string;
        assetId: string;
        url: string;
        contentType: string;
        sizeBytes: number;
        isPrimary: boolean;
        sortOrder: number;
      };
    }) => Promise<{ id: string }>;
  };
  venue: {
    update: (args: {
      where: { id: string };
      data: { featuredAssetId: string; featuredImageUrl: null };
    }) => Promise<{ id: string }>;
  };
  venueHomepageImageCandidate: {
    update: (args: {
      where: { id: string };
      data: { status: string; selectedAt: Date; venueImageId: string };
    }) => Promise<{ id: string }>;
  };
};

export type AutoSelectDeps = {
  fetchImage: typeof fetchImageWithGuards;
  uploadImage: typeof uploadVenueImageToBlob;
  assertUrl: typeof assertSafeUrl;
};

export const defaultAutoSelectDeps: AutoSelectDeps = {
  fetchImage: fetchImageWithGuards,
  uploadImage: uploadVenueImageToBlob,
  assertUrl: assertSafeUrl,
};

export async function autoSelectVenueCover(args: {
  venueId: string;
  candidateId: string;
  candidateUrl: string;
  db: AutoSelectDb;
  deps?: Partial<AutoSelectDeps>;
}): Promise<AutoSelectResult> {
  const deps = { ...defaultAutoSelectDeps, ...args.deps };

  try {
    await deps.assertUrl(args.candidateUrl);
  } catch {
    return { ok: false, reason: "unsafe_url" };
  }

  let fetched: Awaited<ReturnType<AutoSelectDeps["fetchImage"]>>;
  try {
    fetched = await deps.fetchImage(args.candidateUrl);
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }

  let uploaded: Awaited<ReturnType<AutoSelectDeps["uploadImage"]>>;
  try {
    uploaded = await deps.uploadImage({
      venueId: args.venueId,
      sourceUrl: args.candidateUrl,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
    });
  } catch {
    return { ok: false, reason: "upload_failed" };
  }

  try {
    const asset = await args.db.asset.create({
      data: {
        ownerUserId: null,
        kind: "IMAGE",
        url: uploaded.url,
        filename: null,
        mime: fetched.contentType,
        sizeBytes: fetched.sizeBytes,
        alt: "Venue cover image",
      },
      select: { id: true },
    });

    const venueImage = await args.db.venueImage.create({
      data: {
        venueId: args.venueId,
        assetId: asset.id,
        url: uploaded.url,
        contentType: fetched.contentType,
        sizeBytes: fetched.sizeBytes,
        isPrimary: true,
        sortOrder: 0,
      },
    });

    await args.db.venue.update({
      where: { id: args.venueId },
      data: { featuredAssetId: asset.id, featuredImageUrl: null },
    });

    await args.db.venueHomepageImageCandidate.update({
      where: { id: args.candidateId },
      data: { status: "selected", selectedAt: new Date(), venueImageId: venueImage.id },
    });

    return { ok: true, venueImageId: venueImage.id, blobUrl: uploaded.url };
  } catch {
    return { ok: false, reason: "unexpected_error" };
  }
}
