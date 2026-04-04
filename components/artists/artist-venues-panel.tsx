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
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VenueOption[]>([]);
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
        setSearchResults(Array.isArray(body.venues) ? body.venues : []);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleRequest() {
    if (!selectedVenueId) {
      enqueueToast({ title: "Select a venue first", variant: "error" });
      return;
    }

    const res = await fetch("/api/my/artist/venues/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId: selectedVenueId, role, message: message || undefined }),
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
    setSelectedVenueId("");
    setSearchQuery("");
    setSearchResults([]);
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

  const selectedVenue = searchResults.find((venue) => venue.id === selectedVenueId);

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-semibold">Venues</h2>
      <div className="space-y-2">
        <div className="space-y-2">
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            placeholder="Search for a venue by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
          {searchResults.length > 0 && (
            <ul className="divide-y rounded border text-sm">
              {searchResults.map((venue) => (
                <li key={venue.id} className="flex items-center justify-between p-2">
                  <span>{venue.name}</span>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => {
                      setSelectedVenueId(venue.id);
                    }}
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
        {selectedVenueId && selectedVenue ? (
          <p className="text-xs text-muted-foreground">
            Selected: {selectedVenue.name}
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
                      <div className="font-medium">{item.venue.name}</div>
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
