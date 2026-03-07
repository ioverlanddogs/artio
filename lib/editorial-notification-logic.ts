import { createHash } from "node:crypto";
import type { EditorialNotificationKind, Prisma } from "@prisma/client";
import { getCurationQaSummary } from "@/lib/admin-curation-qa";

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  publishStartsAt: Date | null;
  publishEndsAt: Date | null;
  showOnHome: boolean;
  showOnArtwork: boolean;
};

type RecipientDb = {
  siteSettings?: {
    findUnique: (args: {
      where: { id: string };
      select: Record<string, true>;
    }) => Promise<{ editorialNotifyTo: string | null } | null>;
  };
  user: {
    findMany: (args: {
      where: { role: "ADMIN"; email: { not: null } };
      select: { email: true };
    }) => Promise<Array<{ email: string | null }>>;
  };
};

type NotificationDb = RecipientDb & {
  curatedCollection: {
    findMany: (args: Prisma.CuratedCollectionFindManyArgs) => Promise<CollectionRow[]>;
  };
};

export type EditorialNotificationCandidate = {
  kind: EditorialNotificationKind;
  fingerprint: string;
  subject: string;
  text: string;
  payloadJson: Prisma.InputJsonValue;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDateStamp(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function resolveEditorialNotificationRecipients(db: RecipientDb) {
  const settings = await db.siteSettings?.findUnique({
    where: { id: "default" },
    select: { editorialNotifyTo: true },
  });

  const override = (settings?.editorialNotifyTo ?? process.env.EDITORIAL_NOTIFY_TO ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (override.length > 0) {
    return Array.from(new Set(override));
  }

  const admins = await db.user.findMany({
    where: { role: "ADMIN", email: { not: null } },
    select: { email: true },
  });

  return Array.from(new Set(admins.map((row) => row.email?.trim().toLowerCase()).filter((value): value is string => Boolean(value))));
}

export async function computeEditorialNotificationCandidates(now: Date, db: NotificationDb, deps: { getQaSummary?: typeof getCurationQaSummary } = {}): Promise<EditorialNotificationCandidate[]> {
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayStamp = utcDateStamp(startOfUtcDay(now));

  const [goLiveSoon, expiresSoon, qaSummary] = await Promise.all([
    db.curatedCollection.findMany({
      where: {
        isPublished: true,
        publishStartsAt: { gt: now, lte: windowEnd },
        OR: [{ showOnHome: true }, { showOnArtwork: true }],
      },
      orderBy: [{ publishStartsAt: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, publishStartsAt: true, publishEndsAt: true, showOnHome: true, showOnArtwork: true },
    }),
    db.curatedCollection.findMany({
      where: {
        isPublished: true,
        publishEndsAt: { gt: now, lte: windowEnd },
      },
      orderBy: [{ publishEndsAt: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, publishStartsAt: true, publishEndsAt: true, showOnHome: true, showOnArtwork: true },
    }),
    (deps.getQaSummary ?? getCurationQaSummary)(now),
  ]);

  const notifications: EditorialNotificationCandidate[] = [];

  if (goLiveSoon.length > 0) {
    notifications.push({
      kind: "COLLECTION_GOES_LIVE_SOON",
      fingerprint: `LIVE_SOON:${dayStamp}`,
      subject: `[Editorial] Collections going live in the next 24h (${goLiveSoon.length})`,
      text: goLiveSoon.map((collection) => `- ${collection.title} (${collection.slug}) starts ${collection.publishStartsAt?.toISOString() ?? "n/a"}`).join("\n"),
      payloadJson: { dayStamp, count: goLiveSoon.length, collections: goLiveSoon },
    });
  }

  if (expiresSoon.length > 0) {
    notifications.push({
      kind: "COLLECTION_EXPIRES_SOON",
      fingerprint: `EXPIRES_SOON:${dayStamp}`,
      subject: `[Editorial] Collections expiring in the next 24h (${expiresSoon.length})`,
      text: expiresSoon.map((collection) => `- ${collection.title} (${collection.slug}) ends ${collection.publishEndsAt?.toISOString() ?? "n/a"}`).join("\n"),
      payloadJson: { dayStamp, count: expiresSoon.length, collections: expiresSoon },
    });
  }

  const qaIssues = qaSummary.byCollection
    .filter((collection) => (collection.state === "ACTIVE" || collection.state === "ALWAYS") && collection.isPublished)
    .map((collection) => {
      const issues = [
        collection.homeRank != null && collection.flags.includes("RANK_COLLISION") ? `rankCollision:${collection.homeRank}` : null,
        collection.counts.duplicatesInOtherCollections > 0 ? `duplicates:${collection.counts.duplicatesInOtherCollections}` : null,
        collection.counts.publishBlocked > 0 ? `publishBlocked:${collection.counts.publishBlocked}` : null,
        collection.counts.missingCover > 0 ? `missingCover:${collection.counts.missingCover}` : null,
        collection.counts.unpublishedArtworks > 0 ? `unpublished:${collection.counts.unpublishedArtworks}` : null,
      ].filter((value): value is string => Boolean(value));

      return {
        id: collection.id,
        title: collection.title,
        slug: collection.slug,
        issues,
      };
    })
    .filter((collection) => collection.issues.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (qaIssues.length > 0) {
    const signature = qaIssues.map((collection) => `${collection.id}:${collection.issues.join(",")}`).join("|");
    const hash = createHash("sha256").update(signature).digest("hex").slice(0, 16);
    notifications.push({
      kind: "COLLECTION_QA_ISSUES",
      fingerprint: `QA:${dayStamp}:${hash}`,
      subject: `[Editorial QA] Active published collections with issues (${qaIssues.length})`,
      text: qaIssues.map((collection) => `- ${collection.title} (${collection.slug}): ${collection.issues.join(", ")}`).join("\n"),
      payloadJson: { dayStamp, issueCollections: qaIssues, signatureHash: hash },
    });
  }

  return notifications;
}
