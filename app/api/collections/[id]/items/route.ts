import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { guardUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  let collection: { id: string } | null = null;
  try {
    collection = await db.collection.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "P2010") return apiError(503, "feature_unavailable", "Collections are not yet available");
    throw err;
  }
  if (!collection) return apiError(404, "not_found", "Collection not found");

  const body = await req.json().catch(() => null) as { entityType?: "EVENT" | "ARTIST" | "VENUE" | "ARTWORK"; entityId?: string } | null;
  if (!body?.entityType || !body.entityId) return apiError(400, "invalid_request", "entityType and entityId are required");

  try {
    const item = await db.collectionItem.upsert({
      where: { collectionId_entityType_entityId: { collectionId: id, entityType: body.entityType, entityId: body.entityId } },
      update: {},
      create: { collectionId: id, entityType: body.entityType, entityId: body.entityId },
      select: { id: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "P2010") return apiError(503, "feature_unavailable", "Collections are not yet available");
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  let collection: { id: string } | null = null;
  try {
    collection = await db.collection.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "P2010") return apiError(503, "feature_unavailable", "Collections are not yet available");
    throw err;
  }
  if (!collection) return apiError(404, "not_found", "Collection not found");

  const body = await req.json().catch(() => null) as { entityType?: "EVENT" | "ARTIST" | "VENUE" | "ARTWORK"; entityId?: string } | null;
  if (!body?.entityType || !body.entityId) return apiError(400, "invalid_request", "entityType and entityId are required");

  try {
    await db.collectionItem.deleteMany({ where: { collectionId: id, entityType: body.entityType, entityId: body.entityId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "P2010") return apiError(503, "feature_unavailable", "Collections are not yet available");
    throw err;
  }
}
