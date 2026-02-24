import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleAdminEntityRestore } from "@/lib/admin-entities-route";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminEntityRestore(req, "events", await params, { requireAdminUser: requireAdmin, appDb: db });
}
