"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type AccessRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedRole: "VIEWER" | "MODERATOR" | "OPERATOR" | "ADMIN";
  reason: string | null;
  user: { id: string; email: string; role: "USER" | "EDITOR" | "ADMIN" };
};

export function AccessRequestsClient() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPending() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/access-requests?status=PENDING", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("Could not load access requests.");
    } else {
      setRequests(Array.isArray(body.requests) ? body.requests : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/access-request/${id}/approve`, { method: "POST" });
    if (!res.ok) setError("Could not approve request.");
    await loadPending();
    setBusyId(null);
  }

  async function reject(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/access-request/${id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rejectionReason: "Not approved at this time" }),
    });
    if (!res.ok) setError("Could not reject request.");
    await loadPending();
    setBusyId(null);
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-semibold">Pending access requests</h2>
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && requests.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : null}
      <ul className="space-y-2">
        {requests.map((item) => (
          <li key={item.id} className="rounded border p-3 text-sm">
            <p><span className="font-medium">{item.user.email}</span> · current role: {item.user.role.toLowerCase()}</p>
            <p>Requested role: {item.requestedRole.toLowerCase()}</p>
            {item.reason ? <p className="text-muted-foreground">Reason: {item.reason}</p> : null}
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" disabled={busyId === item.id} onClick={() => void approve(item.id)}>Approve</Button>
              <Button type="button" size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void reject(item.id)}>Reject</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
