import { z } from "zod";
import { httpUrlSchema } from "@/lib/validators";

export type EventPublishIssue = {
  field: "title" | "startAt" | "endAt" | "description" | "venueId" | "coverImage" | "ticketUrl";
  message: string;
};

export type EventPublishInput = {
  title: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  description: string | null;
  venueId: string | null;
  ticketUrl: string | null;
  images: Array<{ id: string }>;
};

const eventPublishSchema = z.object({
  title: z.string().trim().min(1, "Event title is required"),
  startAt: z.date({ error: "Start date and time are required" }),
  endAt: z.date().optional().nullable(),
  description: z.string().trim().min(50, "Description must be at least 50 characters"),
  venueId: z.string().uuid("Venue is required"),
  hasCoverImage: z.boolean().refine((value) => value, "Add at least one event image before submitting"),
  ticketUrl: httpUrlSchema.optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.endAt && data.endAt <= data.startAt) {
    ctx.addIssue({ code: "custom", path: ["endAt"], message: "End date must be after start date" });
  }
});

function toDate(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getEventPublishIssues(event: EventPublishInput): EventPublishIssue[] {
  const parsed = eventPublishSchema.safeParse({
    title: event.title ?? "",
    startAt: toDate(event.startAt),
    endAt: toDate(event.endAt),
    description: event.description ?? "",
    venueId: event.venueId ?? "",
    hasCoverImage: event.images.length > 0,
    ticketUrl: event.ticketUrl,
  });

  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => {
    const path = issue.path[0];
    if (path === "title") return { field: "title", message: issue.message };
    if (path === "startAt") return { field: "startAt", message: issue.message };
    if (path === "endAt") return { field: "endAt", message: issue.message };
    if (path === "description") return { field: "description", message: issue.message };
    if (path === "venueId") return { field: "venueId", message: issue.message };
    if (path === "hasCoverImage") return { field: "coverImage", message: issue.message };
    return { field: "ticketUrl", message: issue.message };
  });
}
