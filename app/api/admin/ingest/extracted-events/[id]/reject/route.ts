import { NextRequest } from "next/server";
import { requireEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-audit";
import { handleAdminIngestReject } from "@/lib/admin-ingest-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminIngestReject(req, await params, {
    requireEditorUser: requireEditor,
    appDb: db,
    logAction: logAdminAction,
  });
}
