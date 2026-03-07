import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { parseBody } from "@/lib/validators";

const bodySchema = z.object({ guestEmail: z.string().trim().email() });

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ confirmationCode: string }> }) {
  const { confirmationCode } = await params;
  const parsed = bodySchema.safeParse(await parseBody(req));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload");

  const registration = await db.registration.findUnique({
    where: { confirmationCode },
    select: { id: true, guestEmail: true, status: true },
  });

  if (!registration || registration.guestEmail.toLowerCase() !== parsed.data.guestEmail.toLowerCase()) {
    return apiError(404, "not_found", "Registration not found");
  }

  if (registration.status === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyCancelled: true }, { headers: { "Cache-Control": "no-store" } });
  }

  await db.registration.update({ where: { id: registration.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
