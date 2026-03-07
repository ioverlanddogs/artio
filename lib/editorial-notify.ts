export type EditorialNotificationMessage = {
  subject: string;
  text: string;
  html?: string;
  recipients: string[];
};

export interface NotificationSink {
  send(input: EditorialNotificationMessage): Promise<void>;
}

type SiteSettingsReader = {
  siteSettings?: {
    findUnique: (args: {
      where: { id: string };
      select: Record<string, true>;
    }) => Promise<{ editorialNotificationsWebhookUrl: string | null; editorialNotificationsEmailEnabled: boolean } | null>;
  };
};

class LogSink implements NotificationSink {
  async send(input: EditorialNotificationMessage): Promise<void> {
    console.log(JSON.stringify({
      level: "info",
      message: "editorial_notification_logged",
      subject: input.subject,
      recipients: input.recipients,
      preview: input.text.slice(0, 280),
    }));
  }
}

class WebhookSink implements NotificationSink {
  constructor(private readonly webhookUrl: string) {}

  async send(input: EditorialNotificationMessage): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: input.subject,
        text: input.text,
        html: input.html,
        recipients: input.recipients,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed (${response.status})`);
    }
  }
}

class CompositeSink implements NotificationSink {
  constructor(private readonly sinks: NotificationSink[]) {}

  async send(input: EditorialNotificationMessage): Promise<void> {
    for (const sink of this.sinks) {
      await sink.send(input);
    }
  }
}

export async function getEditorialNotificationSink(db?: SiteSettingsReader): Promise<NotificationSink> {
  const logSink = new LogSink();
  const settings = await db?.siteSettings?.findUnique({
    where: { id: "default" },
    select: { editorialNotificationsWebhookUrl: true, editorialNotificationsEmailEnabled: true },
  });
  const webhookUrl = settings?.editorialNotificationsWebhookUrl?.trim() || process.env.EDITORIAL_NOTIFICATIONS_WEBHOOK_URL?.trim();
  const emailEnabled = settings?.editorialNotificationsEmailEnabled ?? (process.env.EDITORIAL_NOTIFICATIONS_EMAIL_ENABLED ?? "false").toLowerCase() === "true";

  if (webhookUrl) {
    return new CompositeSink([logSink, new WebhookSink(webhookUrl)]);
  }

  if (emailEnabled) {
    console.warn("editorial_email_sink_unavailable", {
      message: "EDITORIAL_NOTIFICATIONS_EMAIL_ENABLED=true but no email provider is configured; using log sink only",
    });
  }

  return logSink;
}
