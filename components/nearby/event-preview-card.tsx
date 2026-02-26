"use client";

import Link from "next/link";
import type { MarkerItem } from "@/lib/nearby-map";

export function EventPreviewCard({ event }: { event: MarkerItem }) {
  return (
    <div className="space-y-2 rounded border bg-card p-3 shadow-sm">
      <p className="text-sm font-semibold">{event.title}</p>
      {event.kind === "event" && event.startAt ? <p className="text-xs text-gray-600">{new Date(event.startAt).toLocaleString()}</p> : null}
      {event.kind === "event" && event.venueName ? <p className="text-xs text-gray-600">{event.venueName}</p> : null}
      {event.kind === "venue" && event.city ? <p className="text-xs text-gray-600">{event.city}</p> : null}
      <Link className="inline-block rounded border px-3 py-1 text-sm" href={event.kind === "event" ? `/events/${event.slug}` : `/venues/${event.slug}`}>
        {event.kind === "event" ? "View event" : "View venue"}
      </Link>
    </div>
  );
}
