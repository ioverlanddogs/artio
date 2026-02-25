import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { deleteBlobByUrl } from "@/lib/blob-delete";
import { db } from "@/lib/db";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";
import { zodDetails } from "@/lib/validators";
import { z } from "zod";

export const runtime = "nodejs";

const assetIdParamSchema = z.object({ assetId: z.string().uuid() });

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const parsedParams = assetIdParamSchema.safeParse(await params);
    if (!parsedParams.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedParams.error));

    const user = await requireAuth();
    await enforceRateLimit({
      key: principalRateLimitKey(req, `my-assets:delete:${parsedParams.data.assetId}`, user.id),
      limit: RATE_LIMITS.uploads.limit,
      windowMs: RATE_LIMITS.uploads.windowMs,
    });

    const asset = await db.asset.findUnique({
      where: { id: parsedParams.data.assetId },
      select: { id: true, ownerUserId: true, url: true },
    });

    if (!asset || asset.ownerUserId !== user.id) return apiError(403, "forbidden", "Asset ownership required");

    const [venueFeatured, venueImage, eventImage, artistImage, artistFeatured] = await Promise.all([
      db.venue.count({ where: { featuredAssetId: asset.id }, take: 1 }),
      db.venueImage.count({ where: { assetId: asset.id }, take: 1 }),
      db.eventImage.count({ where: { assetId: asset.id }, take: 1 }),
      db.artistImage.count({ where: { assetId: asset.id }, take: 1 }),
      db.artist.count({ where: { featuredAssetId: asset.id }, take: 1 }),
    ]);

    if (venueFeatured || venueImage || eventImage || artistImage || artistFeatured) {
      return apiError(409, "asset_referenced", "Asset is still in use and cannot be deleted");
    }

    await db.asset.delete({ where: { id: asset.id } });
    await deleteBlobByUrl(asset.url);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
