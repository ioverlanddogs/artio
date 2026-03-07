import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { db } from "@/lib/db";
import { AttendeesClient } from "@/app/my/events/[eventId]/attendees/attendees-client";

export default async function EventAttendeesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/events");

  const { eventId } = await params;

  const event = await db.event.findFirst({
    where: {
      id: eventId,
      venue: { memberships: { some: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } } } },
    },
    select: { id: true, title: true },
  });

  if (!event) notFound();

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Attendees · {event.title}</h1>
      <AttendeesClient eventId={event.id} />
    </main>
  );
}
