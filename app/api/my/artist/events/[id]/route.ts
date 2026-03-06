import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const artist = await db.artist.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!artist) return NextResponse.json({ error: "forbidden", message: "Artist profile required" }, { status: 403 });

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) return NextResponse.json({ error: "invalid_request", message: "Invalid route parameter" }, { status: 400 });

    const association = await db.artistEventAssociation.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, artistId: true, status: true },
    });

    if (!association || association.artistId !== artist.id) {
      return NextResponse.json({ error: "forbidden", message: "Association not owned by artist" }, { status: 403 });
    }

    if (association.status !== "PENDING") {
      return NextResponse.json({ error: "invalid_request", message: "Only pending requests can be cancelled" }, { status: 400 });
    }

    await db.artistEventAssociation.delete({ where: { id: association.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return NextResponse.json({ error: "unauthorized", message: "Authentication required" }, { status: 401 });
    return NextResponse.json({ error: "invalid_request", message: "Unexpected server error" }, { status: 500 });
  }
}
