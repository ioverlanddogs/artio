"use client";

import { useState } from "react";
import { normalizeAssociationRole, roleLabel } from "@/lib/association-roles";
import { enqueueToast } from "@/lib/toast";

type RequestItem = {
  id: string;
  role: string | null;
  message: string | null;
  artist: { id: string; name: string; slug: string };
};

export default function VenueArtistRequestsPanel({ venueId, initialRequests }: { venueId: string; initialRequests: RequestItem[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function moderateRequest(associationId: string, action: "approve" | "reject") {
    setPendingId(associationId);
    try {
      const res = await fetch(`/api/my/venues/${venueId}/artist-requests/${associationId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        enqueueToast({ title: `Failed to ${action} request`, variant: "error" });
        return;
      }
      enqueueToast({ title: `Request ${action === "approve" ? "approved" : "rejected"}`, variant: "success" });
      setRequests((prev) => prev.filter((row) => row.id !== associationId));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-semibold">Artist requests</h2>
      {requests.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : (
        <ul className="space-y-2">
          {requests.map((request) => (
            <li key={request.id} className="rounded border p-3">
              <p className="font-medium">{request.artist.name}</p>
              <p className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{roleLabel(normalizeAssociationRole(request.role))}</p>
              {request.message ? <p className="text-sm text-muted-foreground">{request.message}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  disabled={pendingId !== null}
                  onClick={() => void moderateRequest(request.id, "approve")}
                >
                  {pendingId === request.id ? "…" : "Approve"}
                </button>
                <button
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  disabled={pendingId !== null}
                  onClick={() => void moderateRequest(request.id, "reject")}
                >
                  {pendingId === request.id ? "…" : "Reject"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
