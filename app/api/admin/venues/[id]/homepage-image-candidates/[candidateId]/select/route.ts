import { NextRequest } from "next/server";
import { handleVenueHomepageImageSelect } from "@/lib/admin-venue-homepage-image-select-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; candidateId: string }> }) {
  return handleVenueHomepageImageSelect(req, context);
}
