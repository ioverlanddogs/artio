import { validateCronRequest } from "@/lib/cron-auth";
import { tryAcquireCronLock } from "@/lib/cron-runtime";

const ROUTE = "/api/cron/events/archive";
const ARCHIVE_BATCH_SIZE = 20;
const STALE_VENUE_DAYS = 90;
const STALE_EVENT_GRACE_DAYS = 7;

type CronArchiveDb = {
  event: {
    findMany: (args: {
      where: {
        status: "PUBLISHED";
        isPublished: true;
        deletedAt: null;
        OR: Array<
          | { endAt: { lt: Date } }
          | { endAt: null; startAt: { lt: Date } }
        >;
      };
      select: { id: true; title: true; startAt: true };
      take: number;
    }) => Promise<Array<{ id: string; title: string; startAt: Date }>>;
    update: (args: {
      where: { id: string };
      data: { status: "ARCHIVED"; isPublished: false };
    }) => Promise<unknown>;
  };
  venue: {
    findMany: (args: {
      where: {
        status: "PUBLISHED";
        deletedAt: null;
        events: {
          none: {
            startAt: { gte: Date };
            deletedAt: null;
          };
        };
        ingestRuns: {
          none: {
            status: "SUCCEEDED";
            createdAt: { gte: Date };
          };
        };
      };
      select: { id: true; name: true };
      take: number;
    }) => Promise<Array<{ id: string; name: string }>>;
  };
  $queryRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

function noStoreJson(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

export async function runCronArchiveEvents(
  headerSecret: string | null,
  { db }: { db: CronArchiveDb },
) {
  const authFailureResponse = validateCronRequest(headerSecret, { route: ROUTE });
  if (authFailureResponse) {
    return withNoStore(authFailureResponse);
  }

  const lock = await tryAcquireCronLock(db, "cron:archive:events");
  if (!lock.acquired) {
    return noStoreJson({ archivedEvents: 0, staleVenuesLogged: 0, skipped: true, reason: "lock_not_acquired" });
  }

  try {
    const cutoff = new Date();
    const staleEventCutoff = new Date(cutoff.getTime() - STALE_EVENT_GRACE_DAYS * 24 * 60 * 60 * 1000);

    const eventsToArchive = await db.event.findMany({
      where: {
        status: "PUBLISHED",
        isPublished: true,
        deletedAt: null,
        OR: [
          { endAt: { lt: cutoff } },
          { endAt: null, startAt: { lt: staleEventCutoff } },
        ],
      },
      select: { id: true, title: true, startAt: true },
      take: 200,
    });

    let archivedEvents = 0;

    for (let i = 0; i < eventsToArchive.length; i += ARCHIVE_BATCH_SIZE) {
      const batch = eventsToArchive.slice(i, i + ARCHIVE_BATCH_SIZE);
      await Promise.all(batch.map(async (event) => {
        try {
          await db.event.update({
            where: { id: event.id },
            data: { status: "ARCHIVED", isPublished: false },
          });
          archivedEvents += 1;
        } catch (error) {
          console.warn({
            event: "event_archive_failed",
            eventId: event.id,
            eventTitle: event.title,
            error,
          });
        }
      }));
    }

    const staleCutoff = new Date(Date.now() - STALE_VENUE_DAYS * 24 * 60 * 60 * 1000);
    const staleVenues = await db.venue.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        events: {
          none: {
            startAt: { gte: new Date() },
            deletedAt: null,
          },
        },
        ingestRuns: {
          none: {
            status: "SUCCEEDED",
            createdAt: { gte: staleCutoff },
          },
        },
      },
      select: { id: true, name: true },
      take: 50,
    });

    for (const venue of staleVenues) {
      console.warn({
        event: "stale_venue_detected",
        venueId: venue.id,
        venueName: venue.name,
      });
    }

    return noStoreJson({
      archivedEvents,
      staleVenuesLogged: staleVenues.length,
    });
  } finally {
    await lock.release();
  }
}
