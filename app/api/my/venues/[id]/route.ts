import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireVenueRole } from "@/lib/auth";
import { myVenuePatchSchema, parseBody, venueIdParamSchema, zodDetails } from "@/lib/validators";
import { submissionSubmittedDedupeKey } from "@/lib/notification-keys";
import { buildInAppFromTemplate, enqueueNotification } from "@/lib/notifications";
import { setOnboardingFlagForSession } from "@/lib/onboarding";
import { geocodeBest } from "@/lib/geocode";

export const runtime = "nodejs";

const geocodePatchFields = ["name", "addressLine1", "addressLine2", "city", "postcode", "country"] as const;

function buildVenueGeocodeQuery(fields: {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
}) {
  const parts = [fields.name, fields.addressLine1, fields.addressLine2, fields.city, fields.postcode, fields.country]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return parts.length > 0 ? parts.join(", ") : null;
}

function isSwallowableGeocodeError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const withCode = error as { code?: unknown; message?: unknown };
  return withCode.code === "not_configured" || withCode.code === "provider_error" || withCode.message === "not_configured";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = venueIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    const parsedBody = myVenuePatchSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const user = await requireVenueRole(parsedId.data.id, "EDITOR");

    const existing = await db.venue.findUnique({
      where: { id: parsedId.data.id },
      select: {
        id: true,
        isPublished: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postcode: true,
        country: true,
        lat: true,
        lng: true,
      },
    });
    if (!existing) return apiError(404, "not_found", "Venue not found");

    const { submitForApproval, note, featuredAssetId, ...safeFields } = parsedBody.data;

    if (featuredAssetId) {
      const asset = await db.asset.findUnique({ where: { id: featuredAssetId }, select: { ownerUserId: true } });
      if (!asset || asset.ownerUserId !== user.id) return apiError(403, "forbidden", "Can only use your own uploaded assets");
    }

    const patch = parsedBody.data;
    const hasLatInPatch = Object.prototype.hasOwnProperty.call(patch, "lat");
    const hasLngInPatch = Object.prototype.hasOwnProperty.call(patch, "lng");
    const shouldConsiderGeocode = !hasLatInPatch && !hasLngInPatch
      && geocodePatchFields.some((field) => Object.prototype.hasOwnProperty.call(patch, field));

    const updateData: Record<string, unknown> = { ...safeFields, featuredAssetId: featuredAssetId ?? null };

    if (shouldConsiderGeocode) {
      const query = buildVenueGeocodeQuery({
        name: safeFields.name ?? existing.name,
        addressLine1: safeFields.addressLine1 ?? existing.addressLine1,
        addressLine2: safeFields.addressLine2 ?? existing.addressLine2,
        city: safeFields.city ?? existing.city,
        postcode: safeFields.postcode ?? existing.postcode,
        country: safeFields.country ?? existing.country,
      });

      if (query) {
        try {
          const result = await geocodeBest(query);
          if (result && (existing.lat == null || existing.lng == null)) {
            updateData.lat = result.lat;
            updateData.lng = result.lng;
          }
        } catch (error) {
          if (!isSwallowableGeocodeError(error)) {
            console.warn(`my_venue_update_geocode_failed venueId=${existing.id} city=${safeFields.city ?? existing.city ?? ""} postcode=${safeFields.postcode ?? existing.postcode ?? ""}`);
          }
        }
      }
    }

    const venue = await db.venue.update({ where: { id: existing.id }, data: updateData });

    if (submitForApproval && !existing.isPublished && user.role === "USER") {
      const latest = await db.submission.findFirst({
        where: { targetVenueId: existing.id, type: "VENUE", kind: "PUBLISH" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { status: true },
      });

      if (latest?.status === "SUBMITTED") {
        return NextResponse.json({ error: "ALREADY_SUBMITTED", message: "Submission is already pending review." }, { status: 409 });
      }

      const submission = await db.submission.create({
        data: {
          type: "VENUE",
          kind: "PUBLISH",
          status: "SUBMITTED",
          submitterUserId: user.id,
          venueId: existing.id,
          targetVenueId: existing.id,
          note: note ?? null,
          decisionReason: null,
          submittedAt: new Date(),
          decidedAt: null,
          decidedByUserId: null,
        },
      });

      await enqueueNotification({
        type: "SUBMISSION_SUBMITTED",
        toEmail: user.email,
        dedupeKey: submissionSubmittedDedupeKey(submission.id),
        payload: {
          submissionId: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        },
        inApp: buildInAppFromTemplate(user.id, "SUBMISSION_SUBMITTED", {
          type: "SUBMISSION_SUBMITTED",
          submissionId: submission.id,
          submissionType: "VENUE",
          targetVenueId: existing.id,
        }),
      });
    }

      await setOnboardingFlagForSession(user, "hasCreatedVenue", true, { path: "/api/my/venues/[id]" });

    return NextResponse.json(venue);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    if (error instanceof Error && error.message === "forbidden") {
      return apiError(403, "forbidden", "Venue membership required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
