import { Prisma } from "@prisma/client";
import { validateCronRequest } from "@/lib/cron-auth";
import { createCronRunId, shouldDryRun, tryAcquireCronLock } from "@/lib/cron-runtime";
import { computeEditorialNotificationCandidates, resolveEditorialNotificationRecipients } from "@/lib/editorial-notification-logic";
import { getEditorialNotificationSink } from "@/lib/editorial-notify";
import { logAdminAction } from "@/lib/admin-audit";

type EditorialRecipientsDb = Parameters<typeof resolveEditorialNotificationRecipients>[0];
type EditorialCandidatesDb = Parameters<typeof computeEditorialNotificationCandidates>[1];
type EditorialSinkDb = Parameters<typeof getEditorialNotificationSink>[0];

type CronDb = {
  user: {
    findMany: (args: {
      where: { role: "ADMIN"; email: { not: null } };
      select: { email: true };
    }) => Promise<Array<{ email: string | null }>>;
  };
  curatedCollection: {
    findMany: (args: Prisma.CuratedCollectionFindManyArgs) => Promise<Array<{
      id: string;
      slug: string;
      title: string;
      publishStartsAt: Date | null;
      publishEndsAt: Date | null;
      showOnHome: boolean;
      showOnArtwork: boolean;
    }>>;
  };
  editorialNotificationLog: {
    findUnique: (args: { where: { fingerprint: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: { kind: Prisma.EditorialNotificationLogCreateInput["kind"]; fingerprint: string; payloadJson: Prisma.InputJsonValue; sentTo: string[] } }) => Promise<unknown>;
  };
  $transaction: <T>(input: Promise<T>[]) => Promise<T[]>;
  $queryRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  siteSettings?: {
    findUnique: (args: {
      where: { id: string };
      select: { editorialNotificationsWebhookUrl: true; editorialNotificationsEmailEnabled: true; editorialNotifyTo: true };
    }) => Promise<{ editorialNotificationsWebhookUrl: string | null; editorialNotificationsEmailEnabled: boolean; editorialNotifyTo: string | null } | null>;
  };
};

export async function runEditorialNotificationsCron(
  headerSecret: string | null,
  dryRunRaw: string | null | undefined,
  cronDb: CronDb,
  meta: { requestId?: string; method?: string; req?: Request } = {},
  deps: {
    computeCandidates?: typeof computeEditorialNotificationCandidates;
    resolveRecipients?: typeof resolveEditorialNotificationRecipients;
    sink?: Awaited<ReturnType<typeof getEditorialNotificationSink>>;
    logAdminActionFn?: typeof logAdminAction;
  } = {},
) {
  const route = "/api/cron/editorial-notifications";
  const authFailureResponse = validateCronRequest(headerSecret, { route, ...meta });
  if (authFailureResponse) return authFailureResponse;

  const dryRun = shouldDryRun(dryRunRaw);
  const cronRunId = createCronRunId();
  const now = new Date();
  const lock = await tryAcquireCronLock(cronDb, "cron:editorial-notifications");
  if (!lock.acquired) {
    return Response.json({ ok: true, cronName: "editorial_notifications", cronRunId, dryRun, skipped: "lock_not_acquired" }, { status: 202 });
  }

  try {
    const recipients = await (deps.resolveRecipients ?? resolveEditorialNotificationRecipients)(cronDb as EditorialRecipientsDb);
    const candidates = await (deps.computeCandidates ?? computeEditorialNotificationCandidates)(now, cronDb as EditorialCandidatesDb);
    const details: Array<{ fingerprint: string; kind: string; status: "sent" | "skipped_already_sent" | "dry_run" | "skipped_no_recipients" }> = [];

    if (recipients.length === 0) {
      return Response.json({ ok: true, cronName: "editorial_notifications", cronRunId, dryRun, sent: 0, skipped: candidates.length, details: candidates.map((c) => ({ fingerprint: c.fingerprint, kind: c.kind, status: "skipped_no_recipients" })) });
    }

    const sink = deps.sink ?? await getEditorialNotificationSink(cronDb as EditorialSinkDb);
    let sent = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const existing = await cronDb.editorialNotificationLog.findUnique({ where: { fingerprint: candidate.fingerprint } });
      if (existing) {
        skipped += 1;
        details.push({ fingerprint: candidate.fingerprint, kind: candidate.kind, status: "skipped_already_sent" });
        continue;
      }

      if (dryRun) {
        skipped += 1;
        details.push({ fingerprint: candidate.fingerprint, kind: candidate.kind, status: "dry_run" });
        continue;
      }

      await sink.send({ subject: candidate.subject, text: candidate.text, recipients });
      await cronDb.$transaction([
        cronDb.editorialNotificationLog.create({
          data: {
            kind: candidate.kind,
            fingerprint: candidate.fingerprint,
            payloadJson: candidate.payloadJson,
            sentTo: recipients,
          },
        }),
      ]);
      await (deps.logAdminActionFn ?? logAdminAction)({
        actorEmail: "system:cron",
        action: "EDITORIAL_NOTIFICATION_SENT",
        targetType: "editorial_notification",
        targetId: candidate.fingerprint,
        metadata: { kind: candidate.kind, recipients, dryRun: false },
        req: meta.req,
      });

      sent += 1;
      details.push({ fingerprint: candidate.fingerprint, kind: candidate.kind, status: "sent" });
    }

    return Response.json({ ok: true, cronName: "editorial_notifications", cronRunId, dryRun, sent, skipped, details });
  } finally {
    await lock.release();
  }
}
