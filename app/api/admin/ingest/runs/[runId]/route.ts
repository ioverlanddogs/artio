import { NextRequest } from "next/server";
import { requireEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleAdminIngestRunGet } from "@/lib/admin-ingest-route";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  return handleAdminIngestRunGet(req, await params, {
    requireEditorUser: requireEditor,
    appDb: db,
  });
}
