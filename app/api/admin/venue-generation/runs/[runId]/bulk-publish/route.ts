import { withAdminRoute } from "@/lib/admin-route";
import { handleAdminVenueGenerationBulkPublish } from "@/lib/admin-venue-generation-bulk-publish-route";

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  return withAdminRoute(async ({ actorEmail }) => handleAdminVenueGenerationBulkPublish(req, { runId }, actorEmail));
}
