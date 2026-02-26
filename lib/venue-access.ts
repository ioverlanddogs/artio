import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/http-errors";
import { canManageVenueMembers } from "@/lib/ownership";

export async function requireVenueMemberManager(venueId: string) {
  const user = await requireAuth();
  if (user.role === "ADMIN") return user;

  const membership = await db.venueMembership.findUnique({
    where: { userId_venueId: { userId: user.id, venueId } },
    select: { role: true },
  });

  if (!membership || !canManageVenueMembers(membership.role, false)) {
    throw new ForbiddenError();
  }

  return user;
}
