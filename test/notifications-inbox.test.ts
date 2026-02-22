import test from "node:test";
import assert from "node:assert/strict";
import type { NotificationInboxStatus, NotificationOutbox, NotificationType } from "@prisma/client";
import { enqueueNotificationWithDb } from "../lib/notifications.ts";
import { markAllNotificationsReadWithDb, markNotificationReadWithDb } from "../lib/notification-inbox.ts";

type NotificationRow = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  dedupeKey: string;
  status: NotificationInboxStatus;
  createdAt: Date;
  readAt: Date | null;
};

function createMemoryDb() {
  const outboxRows = new Map<string, NotificationOutbox>();
  const inboxRows = new Map<string, NotificationRow>();

  const memoryDb = {
    notificationOutbox: {
      upsert: async (args: { where: { dedupeKey: string }; create: Omit<NotificationOutbox, "id" | "createdAt" | "status" | "sentAt" | "errorMessage"> & { type: NotificationType } }) => {
        const key = args.where.dedupeKey;
        const existing = outboxRows.get(key);
        if (existing) return existing;
        const created: NotificationOutbox = {
          id: `outbox-${outboxRows.size + 1}`,
          type: args.create.type,
          toEmail: args.create.toEmail,
          payload: args.create.payload,
          dedupeKey: key,
          status: "PENDING",
          createdAt: new Date(),
          sentAt: null,
          errorMessage: null,
        };
        outboxRows.set(key, created);
        return created;
      },
    },
    notification: {
      upsert: async (args: { where: { dedupeKey: string }; create: Omit<NotificationRow, "id" | "createdAt" | "status" | "href" | "readAt"> & { href?: string | null } }) => {
        const key = args.where.dedupeKey;
        const existing = inboxRows.get(key);
        if (existing) return existing;
        const created: NotificationRow = {
          id: `inbox-${inboxRows.size + 1}`,
          userId: args.create.userId,
          type: args.create.type,
          title: args.create.title,
          body: args.create.body,
          href: args.create.href ?? null,
          dedupeKey: key,
          status: "UNREAD",
          createdAt: new Date(),
          readAt: null,
        };
        inboxRows.set(key, created);
        return created;
      },
      updateMany: async (args: { where: { id?: string; userId: string; readAt?: null }; data: { status: "READ"; readAt: Date } }) => {
        let count = 0;
        for (const row of inboxRows.values()) {
          if (row.userId !== args.where.userId) continue;
          if (args.where.id && row.id !== args.where.id) continue;
          if (args.where.readAt === null && row.readAt !== null) continue;
          row.status = args.data.status;
          row.readAt = args.data.readAt;
          count += 1;
        }
        return { count };
      },
    },
    $transaction: async <T>(ops: Promise<T>[]) => Promise.all(ops),
  };

  return { memoryDb, outboxRows, inboxRows };
}

test("user cannot mark another user's notification as read", async () => {
  const { memoryDb, inboxRows } = createMemoryDb();
  inboxRows.set("dedupe-1", {
    id: "n1",
    userId: "user-1",
    type: "SUBMISSION_APPROVED",
    title: "Approved",
    body: "Body",
    href: null,
    dedupeKey: "dedupe-1",
    status: "UNREAD",
    createdAt: new Date(),
    readAt: null,
  });

  const updated = await markNotificationReadWithDb(memoryDb as never, "user-2", "n1");
  assert.equal(updated, false);
  assert.equal(inboxRows.get("dedupe-1")?.status, "UNREAD");
  assert.equal(inboxRows.get("dedupe-1")?.readAt, null);
});

test("read transitions update unread and read-all states", async () => {
  const { memoryDb, inboxRows } = createMemoryDb();
  inboxRows.set("d1", { id: "n1", userId: "user-1", type: "SUBMISSION_APPROVED", title: "one", body: "", href: null, dedupeKey: "d1", status: "UNREAD", createdAt: new Date(), readAt: null });
  inboxRows.set("d2", { id: "n2", userId: "user-1", type: "SUBMISSION_REJECTED", title: "two", body: "", href: null, dedupeKey: "d2", status: "UNREAD", createdAt: new Date(), readAt: null });

  const oneUpdated = await markNotificationReadWithDb(memoryDb as never, "user-1", "n1");
  assert.equal(oneUpdated, true);
  assert.equal(inboxRows.get("d1")?.status, "READ");
  assert.ok(inboxRows.get("d1")?.readAt);

  const readAllCount = await markAllNotificationsReadWithDb(memoryDb as never, "user-1");
  assert.equal(readAllCount, 1);
  assert.equal(inboxRows.get("d2")?.status, "READ");
  assert.ok(inboxRows.get("d2")?.readAt);
});

test("dedupe prevents duplicate in-app notifications on repeated enqueue", async () => {
  const { memoryDb, outboxRows, inboxRows } = createMemoryDb();

  await enqueueNotificationWithDb(memoryDb as never, {
    type: "SUBMISSION_SUBMITTED",
    toEmail: "person@example.com",
    payload: { submissionId: "sub-1" },
    dedupeKey: "submission:sub-1",
    inApp: {
      userId: "user-1",
      title: "Sent",
      body: "Pending review",
      href: "/my/events/1",
    },
  });

  await enqueueNotificationWithDb(memoryDb as never, {
    type: "SUBMISSION_SUBMITTED",
    toEmail: "person@example.com",
    payload: { submissionId: "sub-1" },
    dedupeKey: "submission:sub-1",
    inApp: {
      userId: "user-1",
      title: "Sent",
      body: "Pending review",
      href: "/my/events/1",
    },
  });

  assert.equal(outboxRows.size, 1);
  assert.equal(inboxRows.size, 1);
});
