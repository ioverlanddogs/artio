import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchImageWithGuards } from "@/lib/ingest/fetch-image";
import { assertSafeUrl } from "@/lib/ingest/url-guard";
import { uploadVenueImageToBlob } from "@/lib/blob/upload-image";
import { addAdminEntityImage } from "@/lib/admin-entity-images-route";
import { idParamSchema } from "@/lib/validators";

type SelectDeps = {
  requireAdminFn: typeof requireAdmin;
  dbClient: typeof db;
  fetchImageFn: typeof fetchImageWithGuards;
  uploadVenueImageFn: typeof uploadVenueImageToBlob;
  addImageFn: typeof addAdminEntityImage;
  assertUrlFn: typeof assertSafeUrl;
};

const defaultDeps: SelectDeps = {
  requireAdminFn: requireAdmin,
  dbClient: db,
  fetchImageFn: fetchImageWithGuards,
  uploadVenueImageFn: uploadVenueImageToBlob,
  addImageFn: addAdminEntityImage,
  assertUrlFn: assertSafeUrl,
};

export async function handleVenueHomepageImageSelect(
  req: NextRequest,
  context: { params: Promise<{ id: string; candidateId: string }> },
  deps?: Partial<SelectDeps>,
): Promise<NextResponse> {
  const resolved = { ...defaultDeps, ...deps };

  try {
    const admin = await resolved.requireAdminFn();
    const params = await context.params;
    const parsedVenueId = idParamSchema.safeParse({ id: params.id });
    const parsedCandidateId = idParamSchema.safeParse({ id: params.candidateId });
    if (!parsedVenueId.success || !parsedCandidateId.success) return apiError(400, "invalid_request", "Invalid route parameter");

    const venueId = parsedVenueId.data.id;
    const candidateId = parsedCandidateId.data.id;

    const candidate = await resolved.dbClient.venueHomepageImageCandidate.findFirst({
      where: { id: candidateId, venueId },
      select: { id: true, url: true, status: true },
    });
    if (!candidate) return apiError(404, "not_found", "Homepage image candidate not found");
    if (candidate.status !== "pending") {
      return apiError(409, "already_processed", "Candidate has already been selected or rejected");
    }

    try {
      await resolved.assertUrlFn(candidate.url);
    } catch {
      return apiError(400, "unsafe_url", "Candidate URL is not safe to fetch");
    }

    let fetched: Awaited<ReturnType<typeof fetchImageWithGuards>>;
    try {
      fetched = await resolved.fetchImageFn(candidate.url);
    } catch (error) {
      return apiError(400, "image_fetch_failed", error instanceof Error ? error.message : "Failed to fetch image");
    }

    const uploaded = await resolved.uploadVenueImageFn({
      venueId,
      sourceUrl: candidate.url,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
    });

    const imageResponse = await resolved.addImageFn({
      entityType: "venue",
      entityId: venueId,
      makePrimary: false,
      url: uploaded.url,
      contentType: fetched.contentType,
      sizeBytes: fetched.sizeBytes,
      actorEmail: admin.email,
      req,
    });

    if (imageResponse.status !== 201) return imageResponse;
    const imageBody = await imageResponse.json() as { item: { id: string } };

    await resolved.dbClient.venueHomepageImageCandidate.update({
      where: { id: candidateId },
      data: { status: "selected", selectedAt: new Date(), selectedById: admin.id, venueImageId: imageBody.item.id },
    });

    await resolved.dbClient.adminAuditLog.create({
      data: {
        userId: admin.id,
        action: "venue_homepage_image_selected",
        targetType: "venue",
        targetId: venueId,
        metadata: { candidateId, url: candidate.url, venueImageId: imageBody.item.id },
      },
    });

    return NextResponse.json({ ok: true, venueImageId: imageBody.item.id, url: uploaded.url });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
