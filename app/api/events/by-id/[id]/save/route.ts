import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleSaveEvent, handleUnsaveEvent } from "@/lib/event-save-route";
import { publishedEventWhere } from "@/lib/publish-status";

export const runtime = "nodejs";

const deps = {
  requireAuth,
  ensureEventExists: async (eventId: string) => {
    const event = await db.event.findFirst({ where: { id: eventId, deletedAt: null, ...publishedEventWhere() }, select: { id: true } });
    return Boolean(event);
  },
  saveEvent: async ({ userId, eventId }: { userId: string; eventId: string }) => {
    await db.favorite.upsert({
      where: { userId_targetType_targetId: { userId, targetType: "EVENT", targetId: eventId } },
      update: {},
      create: { userId, targetType: "EVENT", targetId: eventId },
    });
  },
  unsaveEvent: async ({ userId, eventId }: { userId: string; eventId: string }) => {
    await db.favorite.deleteMany({ where: { userId, targetType: "EVENT", targetId: eventId } });
  },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleSaveEvent(req, params, deps);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleUnsaveEvent(req, params, deps);
}
