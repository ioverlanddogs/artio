"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { enqueueToast } from "@/lib/toast";

type SubmissionItem = {
  id: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "DRAFT";
  type: "EVENT" | "VENUE" | "ARTIST";
  note: string | null;
  decisionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  submitter: { email: string; name: string | null };
  venue: { id: string; name: string } | null;
  targetEvent: { id: string; title: string; slug: string } | null;
  targetVenue: { id: string; name: string; slug: string } | null;
  targetArtist: { id: string; name: string; slug: string } | null;
};

export function getSubmissionModerationErrorMessage(status: number) {
  if (status === 401 || status === 403) return "Not authorized.";
  if (status === 409) return "Conflict: this submission was already handled.";
  return "Something went wrong.";
}

export default function SubmissionsModeration({ items }: { items: SubmissionItem[] }) {
  const router = useRouter();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  async function decide(item: SubmissionItem, action: "approve" | "reject") {
    const venueFlow = item.type === "VENUE" || item.type === "ARTIST";
    const endpoint = venueFlow
      ? action === "approve"
        ? `/api/admin/submissions/${item.id}/approve`
        : `/api/admin/submissions/${item.id}/request-changes`
      : `/api/admin/submissions/${item.id}/decision`;

    const payload = venueFlow
      ? action === "approve"
        ? {}
        : { message: reasonById[item.id] || "Please address the requested profile changes and resubmit." }
      : { action, decisionReason: reasonById[item.id] || null };

    setLoadingId(item.id);
    setPendingAction(action);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = getSubmissionModerationErrorMessage(res.status);
        enqueueToast({ title: "Moderation update failed", message, variant: "error" });
        return;
      }

      enqueueToast({
        title: action === "approve" ? "Approved" : item.type === "EVENT" ? "Rejected" : "Changes requested",
        message: action === "approve" ? "Submission approved successfully." : "Moderation decision saved.",
        variant: "success",
      });
      router.refresh();
    } catch {
      enqueueToast({ title: "Moderation update failed", message: "Something went wrong.", variant: "error" });
    } finally {
      setLoadingId(null);
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item) => {
          const isLoading = loadingId === item.id;
          return (
            <li key={item.id} className="border rounded p-3 space-y-2">
              <div className="font-medium">{item.type} — {item.targetEvent?.title ?? item.targetVenue?.name ?? item.targetArtist?.name ?? "Unknown target"}</div>
              <div className="text-sm">Status: {item.status}</div>
              <div className="text-sm">Submitter: {item.submitter.email}</div>
              {item.venue ? <div className="text-sm">Venue: {item.venue.name}</div> : null}
              {item.submittedAt ? <div className="text-sm">Submitted: {new Date(item.submittedAt).toLocaleString()}</div> : null}
              {item.decidedAt ? <div className="text-sm">Decided: {new Date(item.decidedAt).toLocaleString()}</div> : null}
              {item.note ? <div className="text-sm">Note: {item.note}</div> : null}
              {item.status === "REJECTED" && item.decisionReason ? <div className="text-sm text-red-700">Reason: {item.decisionReason}</div> : null}

              <div className="text-sm space-x-3">
                {item.targetEvent ? <Link className="underline" href={`/events/${item.targetEvent.slug}`}>View target</Link> : null}
                {item.targetVenue ? <Link className="underline" href={`/venues/${item.targetVenue.slug}`}>View target</Link> : null}
                {item.targetArtist ? <Link className="underline" href={`/artists/${item.targetArtist.slug}`}>View target</Link> : null}
                {item.targetEvent ? <Link className="underline" href={`/admin/events/${item.targetEvent.id}`}>Edit target</Link> : null}
                {item.targetVenue ? <Link className="underline" href={`/admin/venues/${item.targetVenue.id}`}>Edit target</Link> : null}
                {item.targetArtist ? <Link className="underline" href={`/admin/artists/${item.targetArtist.id}`}>Edit target</Link> : null}
              </div>

              {item.status === "SUBMITTED" ? (
                <>
                  <input
                    className="border rounded p-1 w-full"
                    placeholder={item.type === "EVENT" ? "Rejection reason" : "Requested changes"}
                    value={reasonById[item.id] || ""}
                    disabled={isLoading}
                    onChange={(e) => setReasonById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                  <div className="space-x-2">
                    <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={isLoading} onClick={() => decide(item, "approve")}>{isLoading && pendingAction === "approve" ? "Approving…" : "Approve"}</button>
                    <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={isLoading} onClick={() => decide(item, "reject")}>{isLoading && pendingAction === "reject" ? item.type === "EVENT" ? "Rejecting…" : "Requesting…" : item.type === "EVENT" ? "Reject" : "Request changes"}</button>
                  </div>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
