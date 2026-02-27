import { NextRequest } from "next/server";
import { requireEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { runVenueIngestExtraction } from "@/lib/ingest/extraction-pipeline";
import { logAdminAction } from "@/lib/admin-audit";
import { handleAdminIngestRun } from "@/lib/admin-ingest-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ venueId: string }> }) {
  return handleAdminIngestRun(req, await params, {
    requireEditorUser: requireEditor,
    appDb: db,
    runExtraction: runVenueIngestExtraction,
    logAction: logAdminAction,
  });
}
