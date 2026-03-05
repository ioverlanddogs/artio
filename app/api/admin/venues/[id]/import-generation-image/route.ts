import { withAdminRoute } from "@/lib/admin-route";
import { handleVenueImportGenerationImage } from "@/lib/admin-venue-import-generation-image-route";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdminRoute(async ({ actorEmail }) => handleVenueImportGenerationImage(req, await params, actorEmail));
}
