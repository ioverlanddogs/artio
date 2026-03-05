import { NextRequest } from "next/server";
import { handleVenueHomepageImageReject } from "@/lib/admin-venue-homepage-image-reject-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; candidateId: string }> }) {
  return handleVenueHomepageImageReject(req, context);
}
