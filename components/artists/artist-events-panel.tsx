"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildLoginRedirectUrl } from "@/lib/auth-redirect";
import { ASSOCIATION_ROLES, DEFAULT_ASSOCIATION_ROLE, normalizeAssociationRole, roleLabel } from "@/lib/association-roles";
import { enqueueToast } from "@/lib/toast";

type EventOption = { id: string; title: string; slug: string; startAt: string | Date };
type Assoc = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: string | null;
  message: string | null;
  event: { id: string; title: string; slug: string; startAt: string | Date; venueName: string | null };
};

export function ArtistEventsPanel({ initialEvents }: { initialEvents: EventOption[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [role, setRole] = useState(DEFAULT_ASSOCIATION_ROLE);
  const [message, setMessage] = useState("");
  const [associations, setAssociations] = useState<{ pending: Assoc[]; approved: Assoc[]; rejected: Assoc[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const filtered = useMemo(() => events.filter((event) => event.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [events, query]);

  useEffect(() => {
    let active = true;
    async function searchEvents() {
      if (!query.trim()) {
        setEvents(initialEvents);
        return;
      }

      const res = await fetch(`/api/events?q=${encodeURIComponent(query)}&query=${encodeURIComponent(query)}&limit=8`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({ items: [] }));
      if (!active) return;
      const nextEvents = Array.isArray(payload.items)
        ? payload.items.map((item: { id: string; title: string; slug: string; startAt: string }) => ({ id: item.id, title: item.title, slug: item.slug, startAt: item.startAt }))
        : [];
      setEvents(nextEvents);
    }

    void searchEvents();
    return () => {
      active = false;
    };
  }, [query, initialEvents]);

  async function loadAssociations() {
    setLoading(true);
    try {
      const res = await fetch("/api/my/artist/events", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = buildLoginRedirectUrl("/my/artist");
        return;
      }
      if (!res.ok) return;
      setAssociations(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssociations();
  }, []);

  async function requestAssociation() {
    if (!selectedEventId) return;
    const res = await fetch("/api/my/artist/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId: selectedEventId, role, message: message || undefined }),
    });
    if (res.status === 401) {
      window.location.href = buildLoginRedirectUrl("/my/artist");
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      enqueueToast({ title: body.message ?? "Failed to request association", variant: "error" });
      return;
    }
    enqueueToast({ title: "Association requested", variant: "success" });
    setMessage("");
    setRole(DEFAULT_ASSOCIATION_ROLE);
    await loadAssociations();
    router.refresh();
  }

  async function cancelAssociation(id: string) {
    const res = await fetch(`/api/my/artist/events/${id}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = buildLoginRedirectUrl("/my/artist");
      return;
    }
    if (!res.ok) {
      enqueueToast({ title: "Failed to cancel request", variant: "error" });
      return;
    }
    enqueueToast({ title: "Request canceled", variant: "success" });
    await loadAssociations();
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-semibold">Events</h2>
      <div className="space-y-2">
        <input className="w-full rounded border px-2 py-1" placeholder="Search events" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="w-full rounded border px-2 py-1" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
          <option value="">Select an event</option>
          {filtered.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </select>
        <select className="w-full rounded border px-2 py-1" value={role} onChange={(e) => setRole(normalizeAssociationRole(e.target.value))}>
          {ASSOCIATION_ROLES.map((roleKey) => <option key={roleKey} value={roleKey}>{roleLabel(roleKey)}</option>)}
        </select>
        <textarea className="w-full rounded border px-2 py-1" rows={3} placeholder="Optional note" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1" onClick={requestAssociation}>Request association</button>
          <button className="rounded border px-3 py-1" onClick={loadAssociations}>Refresh list</button>
        </div>
      </div>

      {loading && associations === null ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : associations ? (
        <div className="space-y-3">
          {["pending", "approved", "rejected"].map((group) => (
            <div key={group}>
              <h3 className="text-sm font-semibold uppercase">{group}</h3>
              <ul className="space-y-2">
                {(associations[group as keyof typeof associations] as Assoc[]).map((item) => {
                  const normalizedRole = normalizeAssociationRole(item.role);
                  return (
                    <li key={item.id} className="rounded border p-2 text-sm">
                      <div className="font-medium">{item.event.title}</div>
                      <div className="text-xs text-muted-foreground">{item.event.venueName ?? "Unknown venue"}</div>
                      <div className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{roleLabel(normalizedRole)}</div>
                      {item.message ? <div className="text-muted-foreground">{item.message}</div> : null}
                      {item.status === "PENDING" ? <button className="mt-1 rounded border px-2 py-1" onClick={() => cancelAssociation(item.id)}>Cancel</button> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
