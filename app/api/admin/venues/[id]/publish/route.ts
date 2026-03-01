import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleAdminEntityPatch } from "@/lib/admin-entities-route";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const publishRequest = new NextRequest(req.url, {
    method: "PATCH",
    headers: req.headers,
    body: JSON.stringify({ status: "PUBLISHED" }),
  });
  return handleAdminEntityPatch(publishRequest, "venues", await params, { requireAdminUser: requireAdmin, appDb: db });
}
