import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { handleVenueGenerationPost } from "@/lib/venue-generation/admin-venue-generation-handler";
import { getVenueGenerationRuns } from "@/lib/venue-generation/get-venue-generation-runs";

export const runtime = "nodejs";

export async function GET() {
  noStore();
  try {
    const runs = await getVenueGenerationRuns();
    return NextResponse.json({ runs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function POST(req: NextRequest) {
  noStore();
  return handleVenueGenerationPost(req);
}
