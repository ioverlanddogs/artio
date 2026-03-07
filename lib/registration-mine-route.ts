import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";

type SessionUser = { id: string };
type Status = "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELLED";

type RegistrationRow = {
  id: string;
  confirmationCode: string;
  guestEmail: string;
  status: Status;
  createdAt: Date;
  event: {
    title: string;
    slug: string;
    startAt: Date;
    venue: { name: string } | null;
  };
};

type Deps = {
  requireAuth: () => Promise<SessionUser>;
  listRegistrationsByUserId: (userId: string) => Promise<RegistrationRow[]>;
  now: () => Date;
};

function sortDescByStartAt(a: RegistrationRow, b: RegistrationRow) {
  return b.event.startAt.getTime() - a.event.startAt.getTime();
}

export async function handleGetRegistrationsMine(deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const now = deps.now();
    const rows = await deps.listRegistrationsByUserId(user.id);

    const upcoming = rows
      .filter((row) => row.status === "CONFIRMED" && row.event.startAt.getTime() > now.getTime())
      .sort(sortDescByStartAt);
    const past = rows
      .filter((row) => !(row.status === "CONFIRMED" && row.event.startAt.getTime() > now.getTime()))
      .sort(sortDescByStartAt);

    return NextResponse.json({ upcoming, past }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
