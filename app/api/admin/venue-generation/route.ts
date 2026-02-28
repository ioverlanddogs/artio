import { unstable_noStore as noStore } from "next/cache";
import { NextRequest } from "next/server";
import { handleVenueGenerationPost } from "@/lib/venue-generation/admin-venue-generation-handler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  noStore();
  return handleVenueGenerationPost(req);
}
