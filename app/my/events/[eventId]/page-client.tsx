"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enqueueToast } from "@/lib/toast";
import { FeaturedEventImagePanel } from "@/app/my/events/_components/FeaturedEventImagePanel";
import { EVENT_TYPE_OPTIONS, type EventTypeOption, getEventTypeLabel } from "@/lib/event-types";

function toUtcDatetimeLocal(isoString: string): string {
  return isoString.slice(0, 16).replace("Z", "").split(".")[0]!.slice(0, 16);
}

type VenueOption = { id: string; name: string };
type SeriesOption = { id: string; title: string; slug: string };

type EventEditorProps = {
  event: {
    id: string;
    title: string;
    venueId: string | null;
    seriesId: string | null;
    startAt: string;
    endAt: string | null;
    ticketUrl: string | null;
    description: string | null;
    eventType: EventTypeOption | null;
    featuredAssetId: string | null;
    featuredAsset: { url: string | null } | null;
  };
  venues: VenueOption[];
};

export function EventEditorForm({ event, venues }: EventEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [venueId, setVenueId] = useState(event.venueId ?? "");
  const [seriesId, setSeriesId] = useState(event.seriesId ?? "");
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [startAt, setStartAt] = useState(toUtcDatetimeLocal(event.startAt));
  const [endAt, setEndAt] = useState(event.endAt ? toUtcDatetimeLocal(event.endAt) : "");
  const [ticketUrl, setTicketUrl] = useState(event.ticketUrl ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [eventType, setEventType] = useState<EventTypeOption>(event.eventType ?? "OTHER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSeries() {
      if (!venueId) {
        setSeriesOptions([]);
        setSeriesId("");
        return;
      }
      try {
        const res = await fetch(`/api/my/venues/${venueId}/series`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSeriesOptions([]);
          enqueueToast({ title: "Could not load series for this venue.", variant: "error" });
          return;
        }
        setSeriesOptions(Array.isArray(body?.series) ? body.series : []);
      } catch {
        setSeriesOptions([]);
        enqueueToast({ title: "Could not load series for this venue.", variant: "error" });
      }
    }
    void loadSeries();
  }, [venueId]);

  async function onCreateSeries() {
    if (!venueId || !newSeriesTitle.trim()) return;
    setIsCreatingSeries(true);
    const res = await fetch("/api/my/series", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: newSeriesTitle, venueId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      enqueueToast({ title: body?.error?.message ?? "Failed to create series", variant: "error" });
      setIsCreatingSeries(false);
      return;
    }
    setSeriesOptions((current) => [...current, body].sort((a, b) => a.title.localeCompare(b.title)));
    setSeriesId(body.id);
    setNewSeriesTitle("");
    setIsCreatingSeries(false);
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/my/events/${event.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        venueId: venueId || null,
        seriesId: seriesId || null,
        startAt: new Date(startAt + ":00Z").toISOString(),
        endAt: endAt ? new Date(endAt + ":00Z").toISOString() : null,
        ticketUrl: ticketUrl || null,
        description: description || null,
        eventType,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to save event");
      setSaving(false);
      return;
    }

    enqueueToast({ title: "Event saved", variant: "success" });
    router.refresh();
    setSaving(false);
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <section className="space-y-3 rounded border p-4">
        <label className="block" id="title"><span className="text-sm">Title</span><input className="w-full rounded border p-2" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block" id="eventType">
          <span className="text-sm">Event type</span>
          <select className="w-full rounded border p-2" value={eventType} onChange={(e) => setEventType(e.target.value as EventTypeOption)}>
            {EVENT_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{getEventTypeLabel(value)}</option>)}
          </select>
        </label>
        <label className="block" id="venueId">
          <span className="text-sm">Venue (optional)</span>
          <select className="w-full rounded border p-2" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">No venue yet</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <div className="space-y-2">
          <label className="block" id="seriesId">
            <span className="text-sm">Part of a series (optional)</span>
            <select className="w-full rounded border p-2" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={!venueId}>
              <option value="">Not part of a series</option>
              {seriesOptions.map((series) => <option key={series.id} value={series.id}>{series.title}</option>)}
            </select>
          </label>
          {venueId ? (
            <div className="flex gap-2">
              <input
                className="w-full rounded border p-2"
                value={newSeriesTitle}
                onChange={(e) => setNewSeriesTitle(e.target.value)}
                placeholder="Create new series title"
              />
              <Button type="button" variant="outline" onClick={() => void onCreateSeries()} disabled={isCreatingSeries || !newSeriesTitle.trim()}>
                {isCreatingSeries ? "Creating..." : "Create"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded border p-4">
        {/* Dates stored and displayed in UTC */}
        <label className="block" id="startAt"><span className="text-sm">Start at (UTC)</span><input className="w-full rounded border p-2" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></label>
        <label className="block" id="endAt"><span className="text-sm">End at (UTC, optional)</span><input className="w-full rounded border p-2" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></label>
      </section>

      <section className="space-y-3 rounded border p-4">
        <label className="block" id="description"><span className="text-sm">Description</span><textarea className="w-full rounded border p-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="block" id="ticketUrl"><span className="text-sm">Ticket URL</span><input className="w-full rounded border p-2" type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} /></label>
      </section>

      <section className="space-y-3 rounded border p-4">
        <FeaturedEventImagePanel eventId={event.id} featuredAssetId={event.featuredAssetId} featuredImageUrl={event.featuredAsset?.url ?? null} />
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
