import { withAdminRoute } from "@/lib/admin-route";
import { handleAdminArtistImageReplace } from "@/lib/admin-artist-image-replace-route";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdminRoute(async ({ actorEmail }) =>
    handleAdminArtistImageReplace(req, await params, actorEmail)
  );
}
