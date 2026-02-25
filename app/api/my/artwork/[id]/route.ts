import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-audit";
import { ensureUniqueArtworkSlugWithDeps, slugifyArtworkTitle } from "@/lib/artwork-slug";
import { requireMyArtworkAccess } from "@/lib/my-artwork-access";
import { idParamSchema, myArtworkPatchSchema, parseBody, zodDetails } from "@/lib/validators";
import { computeArtworkCompleteness } from "@/lib/artwork-completeness";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsedId = idParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  try {
    await requireMyArtworkAccess(parsedId.data.id);
    const artwork = await db.artwork.findUnique({ where: { id: parsedId.data.id }, include: { images: { include: { asset: true }, orderBy: { sortOrder: "asc" } }, venues: true, events: true } });
    if (!artwork) return apiError(404, "not_found", "Artwork not found");
    const completeness = computeArtworkCompleteness(artwork, artwork.images.length);
    return NextResponse.json({ artwork, completeness });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && (error.message === "forbidden" || error.message === "not_found")) return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsedId = idParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  try {
    const { user } = await requireMyArtworkAccess(parsedId.data.id);
    const parsedBody = myArtworkPatchSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const before = await db.artwork.findUnique({ where: { id: parsedId.data.id } });
    if (!before) return apiError(404, "not_found", "Artwork not found");

    const data = { ...parsedBody.data };

    if (data.slug !== undefined) {
      if (data.slug === null) {
        data.slug = null;
      } else {
        data.slug = await ensureUniqueArtworkSlugWithDeps(
          { findBySlug: (candidate) => db.artwork.findUnique({ where: { slug: candidate }, select: { id: true } }) },
          data.slug,
          parsedId.data.id,
        );
      }
    } else if (data.title !== undefined && before.slug === null) {
      data.slug = await ensureUniqueArtworkSlugWithDeps(
        { findBySlug: (candidate) => db.artwork.findUnique({ where: { slug: candidate }, select: { id: true } }) },
        slugifyArtworkTitle(data.title),
        parsedId.data.id,
      );
    }

    const artwork = await db.artwork.update({ where: { id: parsedId.data.id }, data });
    await logAdminAction({ actorEmail: user.email, action: "ARTWORK_UPDATED", targetType: "artwork", targetId: artwork.id, metadata: { before, after: data }, req });
    return NextResponse.json({ artwork });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && (error.message === "forbidden" || error.message === "not_found")) return apiError(403, "forbidden", "Forbidden");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(409, "conflict", "Artwork slug already exists");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
