import type { PrismaClient } from "@prisma/client";
import { validateCronRequest } from "@/lib/cron-auth";
import { createCronRunId, logCronSummary, tryAcquireCronLock } from "@/lib/cron-runtime";
import { importApprovedArtworkImage } from "@/lib/ingest/import-approved-artwork-image";

const ROUTE = "/api/cron/artworks/recover-images";
const CRON_NAME = "recover_artwork_images";
const BATCH_SIZE = 10;

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

export async function runCronRecoverArtworkImages(
  cronSecret: string | null,
  { db }: { db: PrismaClient },
): Promise<Response> {
  const authFailure = validateCronRequest(cronSecret, { route: ROUTE });
  if (authFailure) return withNoStore(authFailure);

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cronRunId = createCronRunId();

  if (process.env.AI_INGEST_IMAGE_ENABLED !== "1") {
    return noStoreJson({
      ok: true,
      cronName: CRON_NAME,
      cronRunId,
      skipped: true,
      reason: "AI_INGEST_IMAGE_ENABLED not set",
    });
  }

  const lock = await tryAcquireCronLock(db, "cron:artwork:recover-images");
  if (!lock.acquired) {
    const summary = {
      ok: false,
      reason: "lock_not_acquired",
      cronName: CRON_NAME,
      cronRunId,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      processedCount: 0,
      errorCount: 0,
      dryRun: false,
      lock: "skipped" as const,
      attached: 0,
      skipped: 0,
      failed: 0,
    };
    logCronSummary(summary);
    return noStoreJson(summary);
  }

  let attached = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const artworks = await db.artwork.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        featuredAssetId: null,
        completenessFlags: { has: "MISSING_IMAGE" },
      },
      select: {
        id: true,
        title: true,
        ingestCandidate: {
          select: {
            id: true,
            sourceUrl: true,
            imageUrl: true,
            sourceEvent: {
              select: {
                venue: {
                  select: { websiteUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { completenessUpdatedAt: "asc" },
      take: BATCH_SIZE,
    });

    for (const artwork of artworks) {
      const candidate = artwork.ingestCandidate;
      try {
        const result = await importApprovedArtworkImage({
          appDb: db,
          candidateId: candidate?.id ?? artwork.id,
          runId: candidate?.id ?? artwork.id,
          artworkId: artwork.id,
          title: artwork.title,
          sourceUrl: candidate?.sourceUrl ?? null,
          candidateImageUrl: candidate?.imageUrl ?? null,
          requestId: `recover-images-${artwork.id}`,
        });

        if (result.attached) attached += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        console.warn("cron_recover_artwork_images_failed", {
          artworkId: artwork.id,
          error,
        });
      }

      try {
        await db.artwork.update({
          where: { id: artwork.id },
          data: { completenessUpdatedAt: null },
        });
      } catch (error) {
        failed += 1;
        console.warn("cron_recover_artwork_images_reset_failed", {
          artworkId: artwork.id,
          error,
        });
      }
    }
  } finally {
    await lock.release();
  }

  const summary = {
    ok: true,
    cronName: CRON_NAME,
    cronRunId,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    processedCount: attached + skipped,
    errorCount: failed,
    dryRun: false,
    lock: "acquired" as const,
    attached,
    skipped,
    failed,
  };

  logCronSummary(summary);
  return noStoreJson(summary);
}
