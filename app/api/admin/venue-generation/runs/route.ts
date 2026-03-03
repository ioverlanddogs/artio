import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  noStore();
  try {
    await requireAdmin();
    const runs = await db.venueGenerationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        country: true,
        region: true,
        totalReturned: true,
        totalCreated: true,
        totalSkipped: true,
        totalFailed: true,
        geocodeAttempted: true,
        geocodeSucceeded: true,
        geocodeFailed: true,
        geocodeFailureBreakdown: true,
        triggeredById: true,
        createdAt: true,
        items: {
          orderBy: { createdAt: "asc" },
          take: 200,
          select: {
            id: true,
            name: true,
            city: true,
            postcode: true,
            country: true,
            status: true,
            reason: true,
            venueId: true,
            geocodeStatus: true,
            geocodeErrorCode: true,
            createdAt: true,
          },
        },
      },
    });
    return NextResponse.json({ runs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
