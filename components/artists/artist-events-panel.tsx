"use client";

import { useEffect, useState } from "react";
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

export function ArtistEventsPanel() {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EventOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState(DEFAULT_ASSOCIATION_ROLE);
  const [message, setMessage] = useState("");
  const [associations, setAssociations] = useState<{ pending: Assoc[]; approved: Assoc[]; rejected: Assoc[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/quick?q=${encodeURIComponent(searchQuery)}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json().catch(() => ({}));
        setSearchResults(Array.isArray(body.events) ? body.events : []);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  async function handleRequest() {
    if (!selectedEventId) {
      enqueueToast({ title: "Select an event first", variant: "error" });
      return;
    }

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
    setSelectedEventId("");
    setSearchQuery("");
    setSearchResults([]);
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

  const selectedEvent = searchResults.find((event) => event.id === selectedEventId);

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-semibold">Events</h2>
      <div className="space-y-2">
        <div className="space-y-2">
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            placeholder="Search for an event by title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
          {searchResults.length > 0 && (
            <ul className="divide-y rounded border text-sm">
              {searchResults.map((event) => (
                <li key={event.id} className="flex items-center justify-between p-2">
                  <div>
                    <span>{event.title}</span>
                    {event.startAt ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(event.startAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <select className="w-full rounded border px-2 py-1" value={role} onChange={(e) => setRole(normalizeAssociationRole(e.target.value))}>
          {ASSOCIATION_ROLES.map((roleKey) => <option key={roleKey} value={roleKey}>{roleLabel(roleKey)}</option>)}
        </select>
        <textarea className="w-full rounded border px-2 py-1" rows={3} placeholder="Optional note" value={message} onChange={(e) => setMessage(e.target.value)} />
        {selectedEventId && selectedEvent ? (
          <p className="text-xs text-muted-foreground">
            Selected: {selectedEvent.title}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1" onClick={() => void handleRequest()}>Request association</button>
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
                      {item.status === "PENDING" ? <button className="mt-1 rounded border px-2 py-1" onClick={() => void cancelAssociation(item.id)}>Cancel</button> : null}
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
