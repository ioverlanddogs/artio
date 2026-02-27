import { NextRequest } from "next/server";
import { requireEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleAdminIngestRunsList } from "@/lib/admin-ingest-route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleAdminIngestRunsList(req, {
    requireEditorUser: requireEditor,
    appDb: db,
  });
}
