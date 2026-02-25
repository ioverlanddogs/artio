import { createAdminModerationDeps } from "@/lib/admin-moderation-db";
import { db } from "@/lib/db";
import ModerationClient from "@/app/(admin)/admin/moderation/moderation-client";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";

export default async function AdminModerationPage() {
  const items = await createAdminModerationDeps().getQueueItems();
  const details = await Promise.all(items.map(async (item) => {
    if (item.entityType === "ARTIST") {
      const artist = await db.artist.findUnique({ where: { id: item.entityId }, select: { id: true, slug: true, bio: true, avatarImageUrl: true } });
      return { ...item, details: artist };
    }
    if (item.entityType === "VENUE") {
      const venue = await db.venue.findUnique({ where: { id: item.entityId }, select: { id: true, slug: true, city: true, country: true, featuredImageUrl: true } });
      return { ...item, details: venue };
    }
    const event = await db.event.findUnique({ where: { id: item.entityId }, select: { id: true, slug: true, startAt: true, venueId: true } });
    return { ...item, details: event };
  }));

  return (
    <main className="space-y-4">
      <AdminPageHeader
        title="Moderation"
        description="Review submissions and moderation queue items."
      />
      <ModerationClient initialItems={details} />
    </main>
  );
}
