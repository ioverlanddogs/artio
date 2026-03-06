"use client";

import { useState } from "react";
import { enqueueToast } from "@/lib/toast";

type VenueOption = { id: string; name: string; slug: string };
type EventOption = { id: string; title: string; slug: string; startAt: string };

export function ArtworkRelationsPanel({
  artworkId,
  initialVenues,
  initialEvents,
}: {
  artworkId: string;
  initialVenues: VenueOption[];
  initialEvents: EventOption[];
}) {
  const [venues, setVenues] = useState<VenueOption[]>(initialVenues);
  const [events, setEvents] = useState<EventOption[]>(initialEvents);
  const [venueQuery, setVenueQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [venueResults, setVenueResults] = useState<VenueOption[]>([]);
  const [eventResults, setEventResults] = useState<EventOption[]>([]);
  const [saving, setSaving] = useState(false);

  async function searchVenues(q: string) {
    setVenueQuery(q);
    if (!q.trim()) {
      setVenueResults([]);
      return;
    }
    const res = await fetch(`/api/venues?q=${encodeURIComponent(q)}&limit=8`);
    if (res.ok) setVenueResults((await res.json()).venues ?? []);
  }

  async function searchEvents(q: string) {
    setEventQuery(q);
    if (!q.trim()) {
      setEventResults([]);
      return;
    }
    const res = await fetch(`/api/events?q=${encodeURIComponent(q)}&limit=8`);
    if (res.ok) setEventResults((await res.json()).events ?? []);
  }

  async function saveVenues(updated: VenueOption[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/my/artwork/${artworkId}/venues`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ venueIds: updated.map((v) => v.id) }),
      });
      if (!res.ok) {
        enqueueToast({ title: "Failed to update venues", variant: "error" });
        return;
      }
      setVenues(updated);
      enqueueToast({ title: "Venues updated", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  async function saveEvents(updated: EventOption[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/my/artwork/${artworkId}/events`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventIds: updated.map((e) => e.id) }),
      });
      if (!res.ok) {
        enqueueToast({ title: "Failed to update events", variant: "error" });
        return;
      }
      setEvents(updated);
      enqueueToast({ title: "Events updated", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  function addVenue(venue: VenueOption) {
    if (venues.find((v) => v.id === venue.id)) return;
    const updated = [...venues, venue];
    setVenueResults([]);
    setVenueQuery("");
    void saveVenues(updated);
  }

  function removeVenue(id: string) {
    void saveVenues(venues.filter((v) => v.id !== id));
  }

  function addEvent(event: EventOption) {
    if (events.find((e) => e.id === event.id)) return;
    const updated = [...events, event];
    setEventResults([]);
    setEventQuery("");
    void saveEvents(updated);
  }

  function removeEvent(id: string) {
    void saveEvents(events.filter((e) => e.id !== id));
  }

  return (
    <section className="space-y-4 rounded border p-4">
      <h2 className="text-lg font-semibold">Linked venues & events</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Venues</h3>
        <div className="flex flex-wrap gap-2">
          {venues.map((v) => (
            <span key={v.id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
              {v.name}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                disabled={saving}
                onClick={() => removeVenue(v.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          placeholder="Search venues to link..."
          value={venueQuery}
          onChange={(e) => void searchVenues(e.target.value)}
        />
        {venueResults.length > 0 && (
          <ul className="rounded border bg-background shadow-sm">
            {venueResults
              .filter((v) => !venues.find((x) => x.id === v.id))
              .map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => addVenue(v)}
                  >
                    {v.name}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Events</h3>
        <div className="flex flex-wrap gap-2">
          {events.map((e) => (
            <span key={e.id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
              {e.title}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                disabled={saving}
                onClick={() => removeEvent(e.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          placeholder="Search events to link..."
          value={eventQuery}
          onChange={(e) => void searchEvents(e.target.value)}
        />
        {eventResults.length > 0 && (
          <ul className="rounded border bg-background shadow-sm">
            {eventResults
              .filter((e) => !events.find((x) => x.id === e.id))
              .map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => addEvent(e)}
                  >
                    {e.title}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
