import { notFound } from "next/navigation";
import EventAdminForm from "@/app/(admin)/admin/_components/EventAdminForm";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import { db } from "@/lib/db";
import { ADMIN_IMAGE_ALT_REQUIRED } from "@/lib/admin-policy";
import { AdminArchiveActions } from "@/app/(admin)/admin/_components/AdminArchiveActions";

export default async function AdminEditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: { eventTags: { include: { tag: true } }, eventArtists: { include: { artist: true } } },
  });
  if (!event) notFound();

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Edit event" backHref="/admin/events" backLabel="Back to events" right={<AdminArchiveActions entity="events" id={event.id} archived={!!event.deletedAt} />} />
      <EventAdminForm
        title="Edit Event"
        endpoint={`/api/admin/events/${id}`}
        method="PATCH"
        eventId={event.id}
        initial={{
          title: event.title,
          slug: event.slug,
          description: event.description,
          timezone: event.timezone,
          startAt: event.startAt.toISOString(),
          endAt: event.endAt?.toISOString(),
          venueId: event.venueId,
          tagSlugs: event.eventTags.map((x) => x.tag.slug),
          artistSlugs: event.eventArtists.map((x) => x.artist.slug),
          isPublished: event.isPublished,
        }}
        altRequired={ADMIN_IMAGE_ALT_REQUIRED}
      />
    </main>
  );
}
