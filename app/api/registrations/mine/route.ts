import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleGetRegistrationsMine } from "@/lib/registration-mine-route";

export const runtime = "nodejs";

export async function GET() {
  return handleGetRegistrationsMine({
    requireAuth,
    listRegistrationsByUserId: (userId) => db.registration.findMany({
      where: { userId },
      select: {
        id: true,
        confirmationCode: true,
        guestEmail: true,
        status: true,
        createdAt: true,
        event: {
          select: {
            title: true,
            slug: true,
            startAt: true,
            venue: { select: { name: true } },
          },
        },
      },
    }),
    now: () => new Date(),
  });
}
