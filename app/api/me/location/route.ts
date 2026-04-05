import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { locationPreferenceSchema, parseBody, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toResponse(location: { locationLabel: string | null; locationLat: number | null; locationLng: number | null; locationRadiusKm: number }) {
  return {
    locationLabel: location.locationLabel,
    lat: location.locationLat,
    lng: location.locationLng,
    radiusKm: location.locationRadiusKm,
  };
}

export async function GET() {
  try {
    const user = await requireAuth();
    const location = await db.user.findUnique({
      where: { id: user.id },
      select: { locationLabel: true, locationLat: true, locationLng: true, locationRadiusKm: true },
    });
    if (!location) return apiError(404, "not_found", "User not found");
    return NextResponse.json(toResponse(location));
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function PUT(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }

  try {
    const parsedBody = locationPreferenceSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const data = parsedBody.data;
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        locationLabel: data.locationLabel ?? null,
        locationLat: data.lat ?? null,
        locationLng: data.lng ?? null,
        locationRadiusKm: data.radiusKm,
      },
      select: { locationLabel: true, locationLat: true, locationLng: true, locationRadiusKm: true },
    });

    return NextResponse.json(toResponse(updated));
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
export const POST = PUT;
