import { NextRequest } from "next/server";
import { handleAdminIngestPublishArtist } from "@/lib/admin-ingest-publish-artist-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminIngestPublishArtist(req, await params);
}
