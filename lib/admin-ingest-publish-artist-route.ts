import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";

type PublishArtistDeps = {
  requireAdmin: typeof requireAdmin;
  db: typeof db;
};

const defaultDeps: PublishArtistDeps = { requireAdmin, db };

export async function handleAdminIngestPublishArtist(
  _req: NextRequest,
  params: { id: string },
  deps: PublishArtistDeps = defaultDeps,
) {
  try {
    const actor = await deps.requireAdmin();

    const artist = await deps.db.artist.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, status: true, isAiDiscovered: true, deletedAt: true },
    });

    if (!artist || artist.deletedAt || !artist.isAiDiscovered) return apiError(404, "not_found", "Artist not found");
    if (artist.status !== "IN_REVIEW") return apiError(409, "invalid_state", "Artist must be IN_REVIEW to publish");
    if ((artist.name ?? "").trim().length < 2) return apiError(400, "not_ready", "Artist is not ready to publish");

    await deps.db.$transaction(async (tx) => {
      await tx.artist.update({
        where: { id: artist.id },
        data: { status: "PUBLISHED", isPublished: true },
      });

      await tx.adminAuditLog.create({
        data: {
          actorEmail: actor.email,
          action: "admin.ingest.artist.published",
          targetType: "artist",
          targetId: artist.id,
          metadata: {
            artistId: artist.id,
            name: artist.name,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({ artistId: artist.id, published: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && (error.message === "unauthorized" || error.message === "forbidden")) {
      return apiError(error.message === "unauthorized" ? 401 : 403, error.message, error.message === "unauthorized" ? "Authentication required" : "Forbidden");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
