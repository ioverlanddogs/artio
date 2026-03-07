import type { Prisma } from "@prisma/client";
import { validateCronRequest } from "@/lib/cron-auth";
import { createCronRunId } from "@/lib/cron-runtime";
import { notifyGoogleIndexing } from "@/lib/google-event-indexing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type DbLike = {
  event: {
    findMany: (args?: Prisma.EventFindManyArgs) => Promise<Array<{ slug: string }>>;
  };
};

export async function runCronSyncGoogleEvents(headerSecret: string | null, deps: { db: DbLike; now?: Date; notifyFn?: typeof notifyGoogleIndexing } ) {
  const route = "/api/cron/sync-google-events";
  const authFailure = validateCronRequest(headerSecret, { route, method: "GET" });
  if (authFailure) return authFailure;

  const now = deps.now ?? new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cronRunId = createCronRunId();

  const [published, deleted] = await Promise.all([
    deps.db.event.findMany({ where: { isPublished: true, deletedAt: null, updatedAt: { gte: since } }, select: { slug: true } }),
    deps.db.event.findMany({ where: { deletedAt: { gte: since } }, select: { slug: true } }),
  ]);

  let submitted = 0;
  await Promise.all(published.map(async (event) => {
    await (deps.notifyFn ?? notifyGoogleIndexing)(`${APP_URL}/events/${event.slug}`, "URL_UPDATED");
    submitted += 1;
  }));
  await Promise.all(deleted.map(async (event) => {
    await (deps.notifyFn ?? notifyGoogleIndexing)(`${APP_URL}/events/${event.slug}`, "URL_DELETED");
    submitted += 1;
  }));

  return Response.json({ ok: true, cronName: "sync_google_events", cronRunId, submitted });
}
