import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { importApprovedArtworkImage } from "@/lib/ingest/import-approved-artwork-image";
import { idParamSchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) {
      return apiError(
        400,
        "invalid_request",
        "Invalid route parameter",
        zodDetails(parsed.error),
      );
    }

    const candidate = await db.ingestExtractedArtwork.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        imageUrl: true,
        createdArtworkId: true,
      },
    });

    if (!candidate) {
      return apiError(404, "not_found", "Artwork candidate not found");
    }
    if (!candidate.createdArtworkId) {
      return apiError(
        409,
        "not_approved",
        "Artwork candidate has not been approved yet",
      );
    }

    const result = await importApprovedArtworkImage({
      appDb: db,
      candidateId: candidate.id,
      runId: candidate.id,
      artworkId: candidate.createdArtworkId,
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      candidateImageUrl: candidate.imageUrl,
      requestId: `manual-import-artwork-${candidate.id}`,
    });

    return NextResponse.json({
      attached: result.attached,
      imageUrl: result.imageUrl,
      warning: result.warning,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    if (error instanceof Error && error.message === "forbidden") {
      return apiError(403, "forbidden", "Forbidden");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
