import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDbUserForSession } from "@/lib/ensure-db-user-for-session";
import { MyTeamResponseSchema, type MyTeamResponse } from "@/lib/my/dashboard-schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return apiError(401, "unauthorized", "Authentication required");
    const dbUser = await ensureDbUserForSession(session);
    const userId = dbUser?.id ?? session.id;

    const memberships = await db.venueMembership.findMany({
      where: { userId, role: { in: ["OWNER", "EDITOR"] } },
      include: { venue: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    const requestedVenueId = req.nextUrl.searchParams.get("venueId");
    const selectedMembership = memberships.find((m) => m.venueId === requestedVenueId) ?? memberships[0] ?? null;

    if (!selectedMembership) {
      const emptyPayload: MyTeamResponse = {
        selectedVenueId: null,
        venue: null,
        currentUserRole: null,
        members: [],
        invites: [],
      };
      return NextResponse.json(MyTeamResponseSchema.parse(emptyPayload), { headers: { "Cache-Control": "no-store" } });
    }

    const [members, invites] = await Promise.all([
      db.venueMembership.findMany({
        where: { venueId: selectedMembership.venueId },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      }),
      db.venueInvite.findMany({
        where: { venueId: selectedMembership.venueId },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, status: true, createdAt: true, expiresAt: true },
      }),
    ]);

    const now = new Date();
    const payload: MyTeamResponse = {
      selectedVenueId: selectedMembership.venueId,
      venue: selectedMembership.venue,
      currentUserRole: selectedMembership.role,
      members: members.map((member) => ({
        id: member.id,
        role: member.role,
        createdAtISO: member.createdAt.toISOString(),
        user: member.user,
      })),
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status === "PENDING" && invite.expiresAt <= now ? "EXPIRED" : invite.status,
        createdAtISO: invite.createdAt.toISOString(),
        expiresAtISO: invite.expiresAt.toISOString(),
      })),
    };

    return NextResponse.json(MyTeamResponseSchema.parse(payload), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
