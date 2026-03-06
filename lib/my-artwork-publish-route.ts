import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import type { AdminAuditInput } from "@/lib/admin-audit";
import { evaluateArtworkReadiness } from "@/lib/publish-readiness";

type SessionUser = { id: string; email: string };

type ArtworkPublishRecord = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  medium: string | null;
  featuredAssetId: string | null;
  isPublished: boolean;
};

type Deps = {
  requireMyArtworkAccess: (artworkId: string) => Promise<{ user: SessionUser }>;
  findArtworkById: (artworkId: string) => Promise<ArtworkPublishRecord | null>;
  listArtworkImages: (artworkId: string) => Promise<Array<{ id: string; assetId: string }>>;
  updateArtworkPublishState: (artworkId: string, input: { isPublished: boolean; status?: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "REJECTED"; featuredAssetId?: string }) => Promise<ArtworkPublishRecord>;
  createArtworkSubmission: (artworkId: string, userId: string) => Promise<{ id: string }>;
  logAdminAction: (input: AdminAuditInput) => Promise<void>;
};

export async function handlePatchArtworkPublish(req: NextRequest, input: { artworkId: string; isPublished: boolean }, deps: Deps) {
  try {
    const { user } = await deps.requireMyArtworkAccess(input.artworkId);

    if (!input.isPublished) {
      const artwork = await deps.updateArtworkPublishState(input.artworkId, { isPublished: false, status: "DRAFT" });
      await deps.logAdminAction({ actorEmail: user.email, action: "ARTWORK_PUBLISH_TOGGLED", targetType: "artwork", targetId: artwork.id, metadata: { isPublished: artwork.isPublished }, req });
      return NextResponse.json({ artwork });
    }

    const artwork = await deps.findArtworkById(input.artworkId);
    if (!artwork) return apiError(404, "not_found", "Artwork not found");
    const images = await deps.listArtworkImages(input.artworkId);

    const readiness = evaluateArtworkReadiness(artwork, images);
    if (!readiness.ready) {
      console.warn("FAIL_REASON=NOT_READY entity=artwork");
      return NextResponse.json({
        error: "NOT_READY",
        message: "Complete required fields before submitting.",
        blocking: readiness.blocking,
        warnings: readiness.warnings,
      }, { status: 400 });
    }

    let featuredAssetId = artwork.featuredAssetId;
    if (!featuredAssetId && images.length > 0) featuredAssetId = images[0]?.assetId ?? undefined;

    await deps.updateArtworkPublishState(input.artworkId, {
      isPublished: false,
      status: "IN_REVIEW",
      ...(featuredAssetId ? { featuredAssetId } : {}),
    });
    const submission = await deps.createArtworkSubmission(input.artworkId, user.id);

    await deps.logAdminAction({
      actorEmail: user.email,
      action: "ARTWORK_SUBMITTED_FOR_REVIEW",
      targetType: "artwork",
      targetId: input.artworkId,
      metadata: { submissionId: submission.id },
      req,
    });
    return NextResponse.json({
      outcome: "submitted",
      message: "Your artwork has been submitted for review.",
      submissionId: submission.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && (error.message === "forbidden" || error.message === "not_found")) return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
