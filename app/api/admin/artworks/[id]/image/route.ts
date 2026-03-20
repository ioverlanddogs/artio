import { withAdminRoute } from "@/lib/admin-route";
import { handleAdminArtworkImageReplace } from "@/lib/admin-artwork-image-replace-route";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdminRoute(async ({ actorEmail }) =>
    handleAdminArtworkImageReplace(req, await params, actorEmail)
  );
}
