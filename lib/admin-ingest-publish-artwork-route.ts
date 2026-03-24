import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateArtworkReadiness } from "@/lib/publish-readiness";

type PublishArtworkDeps = {
  requireAdmin: typeof requireAdmin;
  db: typeof db;
};

const defaultDeps: PublishArtworkDeps = { requireAdmin, db };

export async function handleAdminIngestPublishArtwork(
  _req: NextRequest,
  params: { id: string },
  deps: PublishArtworkDeps = defaultDeps,
) {
  try {
    const actor = await deps.requireAdmin();

    const artwork = await deps.db.artwork.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
        ingestCandidate: { select: { id: true } },
        featuredAssetId: true,
        medium: true,
        year: true,
      },
    });

    if (!artwork || artwork.deletedAt || !artwork.ingestCandidate) return apiError(404, "not_found", "Artwork not found");
    if (artwork.status !== "IN_REVIEW") return apiError(409, "invalid_state", "Artwork must be IN_REVIEW to publish");

    const images = await deps.db.artworkImage.findMany({
      where: { artworkId: artwork.id },
      select: { id: true, assetId: true },
    });

    const readiness = evaluateArtworkReadiness(artwork, images);
    if (!readiness.ready) {
      return apiError(400, "not_ready", "Artwork is not ready to publish", { blocking: readiness.blocking });
    }

    await deps.db.$transaction(async (tx) => {
      await tx.artwork.update({
        where: { id: artwork.id },
        data: { status: "PUBLISHED", isPublished: true },
      });

      await tx.adminAuditLog.create({
        data: {
          actorEmail: actor.email,
          action: "admin.ingest.artwork.published",
          targetType: "artwork",
          targetId: artwork.id,
          metadata: {
            artworkId: artwork.id,
            title: artwork.title,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({ artworkId: artwork.id, published: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && (error.message === "unauthorized" || error.message === "forbidden")) {
      return apiError(error.message === "unauthorized" ? 401 : 403, error.message, error.message === "unauthorized" ? "Authentication required" : "Forbidden");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
