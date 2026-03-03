import { NextRequest } from "next/server";
import { handleRetryVenueGenerationGeocode } from "@/lib/venue-generation/retry-geocode-run";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  return handleRetryVenueGenerationGeocode(req, context);
}
