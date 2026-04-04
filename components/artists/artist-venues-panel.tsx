"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildLoginRedirectUrl } from "@/lib/auth-redirect";
import { ASSOCIATION_ROLES, DEFAULT_ASSOCIATION_ROLE, normalizeAssociationRole, roleLabel } from "@/lib/association-roles";
import { enqueueToast } from "@/lib/toast";

type VenueOption = { id: string; name: string; slug: string };
type Assoc = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: string | null;
  message: string | null;
  venue: { id: string; name: string; slug: string; cover: string | null };
};

export function ArtistVenuesPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState(DEFAULT_ASSOCIATION_ROLE);
  const [message, setMessage] = useState("");
  const [associations, setAssociations] = useState<{ pending: Assoc[]; approved: Assoc[]; rejected: Assoc[] } | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAssociations() {
    setLoading(true);
    try {
      const res = await fetch("/api/my/artist/venues", { cache: "no-store" });
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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/quick?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const payload = await res.json().catch(() => ({ venues: [] }));
        const venues = Array.isArray(payload.venues) ? payload.venues : [];
        setResults(venues.slice(0, 10).map((venue: VenueOption) => ({ id: venue.id, name: venue.name, slug: venue.slug })));
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query]);

  async function handleRequest(venueId: string) {
    const res = await fetch("/api/my/artist/venues/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId, role, message: message || undefined }),
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
    setQuery("");
    setResults([]);
    await loadAssociations();
    router.refresh();
  }

  async function cancelAssociation(id: string) {
    const res = await fetch(`/api/my/artist/venues/${id}`, { method: "DELETE" });
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
      <h2 className="text-lg font-semibold">Venues</h2>
      <div className="space-y-2">
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          placeholder="Search for a venue by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
        {results.length > 0 && query.trim().length >= 2 && (
          <ul className="divide-y rounded border text-sm">
            {results.map((venue) => (
              <li key={venue.id} className="flex items-center justify-between p-2">
                <span>{venue.name}</span>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => void handleRequest(venue.id)}
                >
                  Request association
                </button>
              </li>
            ))}
          </ul>
        )}
        <select className="w-full rounded border px-2 py-1" value={role} onChange={(e) => setRole(normalizeAssociationRole(e.target.value))}>
          {ASSOCIATION_ROLES.map((roleKey) => <option key={roleKey} value={roleKey}>{roleLabel(roleKey)}</option>)}
        </select>
        <textarea className="w-full rounded border px-2 py-1" rows={3} placeholder="Optional note" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex gap-2">
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
                      <div className="font-medium">{item.venue.name}</div>
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
