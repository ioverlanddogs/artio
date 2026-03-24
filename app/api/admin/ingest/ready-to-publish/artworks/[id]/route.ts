import { NextRequest } from "next/server";
import { handleAdminIngestPublishArtwork } from "@/lib/admin-ingest-publish-artwork-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminIngestPublishArtwork(req, await params);
}
