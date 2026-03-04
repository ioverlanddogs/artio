import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import IngestEventQueueClient from "@/app/(admin)/admin/ingest/_components/ingest-event-queue-client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminIngestEventsPage() {
  const candidates = await db.ingestExtractedEvent.findMany({
    where: {
      status: "PENDING",
      duplicateOfId: null,
    },
    include: {
      venue: { select: { id: true, name: true } },
      run: { select: { id: true, sourceUrl: true } },
    },
    orderBy: [{ confidenceScore: "desc" }, { startAt: "asc" }, { id: "asc" }],
    take: 100,
  });

  return (
    <main className="space-y-4">
      <AdminPageHeader
        title="Event Queue"
        description="All pending extracted event candidates across venues, ordered by confidence."
      />
      <IngestEventQueueClient candidates={candidates} />
    </main>
  );
}
