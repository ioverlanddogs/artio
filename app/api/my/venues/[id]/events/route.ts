import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireVenueRole, isAuthError } from "@/lib/auth";
import { myEventCreateSchema, parseBody, venueIdParamSchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = venueIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    const parsed = myEventCreateSchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsed.error));

    const user = await requireVenueRole(parsedId.data.id, "EDITOR");

    const { startAt, endAt, note, images = [], ...eventData } = parsed.data;

    const assetIds = images.map((image) => image.assetId).filter((assetId): assetId is string => Boolean(assetId));
    if (assetIds.length) {
      const ownedCount = await db.asset.count({ where: { id: { in: assetIds }, ownerUserId: user.id } });
      if (ownedCount !== assetIds.length) return apiError(403, "forbidden", "Can only use your own uploaded assets");
    }

    const event = await db.event.create({
      data: {
        ...eventData,
        venueId: parsedId.data.id,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        isPublished: false,
        publishedAt: null,
        images: images.length
          ? {
              create: images.map((image) => ({
                assetId: image.assetId ?? null,
                url: image.url ?? "",
                alt: image.alt ?? null,
                sortOrder: image.sortOrder,
              })),
            }
          : undefined,
      },
    });

    await db.submission.create({
      data: {
        type: "EVENT",
        status: "DRAFT",
        kind: "PUBLISH",
        submitterUserId: user.id,
        venueId: parsedId.data.id,
        targetEventId: event.id,
        note: note ?? null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    if (error instanceof Error && error.message === "forbidden") {
      return apiError(403, "forbidden", "Venue membership required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
