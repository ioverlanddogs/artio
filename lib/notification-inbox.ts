import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { buildNotification, NotificationTemplatePayload } from "@/lib/notification-templates";

type InboxDb = Pick<typeof db, "notification">;

type MarkReadBatchParams = {
  userId: string;
  notificationIds: string[];
};

export function buildInboxNotification(type: NotificationType, payload: NotificationTemplatePayload) {
  return buildNotification({ type, payload });
}

export async function markNotificationReadWithDb(inboxDb: InboxDb, userId: string, notificationId: string) {
  const now = new Date();
  const result = await inboxDb.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { status: "READ", readAt: now },
  });
  return result.count > 0;
}

export async function markNotificationsReadWithDb(inboxDb: InboxDb, params: MarkReadBatchParams) {
  if (!params.notificationIds.length) return 0;
  const now = new Date();
  const result = await inboxDb.notification.updateMany({
    where: { userId: params.userId, id: { in: params.notificationIds }, readAt: null },
    data: { status: "READ", readAt: now },
  });

  return result.count;
}

export async function markAllNotificationsReadWithDb(inboxDb: InboxDb, userId: string) {
  const now = new Date();
  const result = await inboxDb.notification.updateMany({
    where: { userId, readAt: null },
    data: { status: "READ", readAt: now },
  });
  return result.count;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return markNotificationReadWithDb(db, userId, notificationId);
}

export async function markAllNotificationsRead(userId: string) {
  return markAllNotificationsReadWithDb(db, userId);
}
