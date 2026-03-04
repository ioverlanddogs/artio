"use client";

import Link from "next/link";
import IngestCandidateActions from "@/app/(admin)/admin/ingest/_components/ingest-candidate-actions";
import IngestConfidenceBadge from "@/app/(admin)/admin/ingest/_components/ingest-confidence-badge";

type QueueCandidate = {
  id: string;
  title: string;
  startAt: Date | null;
  locationText: string | null;
  confidenceScore: number;
  confidenceBand: string | null;
  confidenceReasons: unknown;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE";
  rejectionReason: string | null;
  createdEventId: string | null;
  venue: { id: string; name: string };
  run: { id: string; sourceUrl: string };
};


function getConfidenceBand(value: string | null): "HIGH" | "MEDIUM" | "LOW" {
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") return value;
  return "LOW";
}

function getConfidenceReasons(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const reasons = value.filter((item): item is string => typeof item === "string");
  return reasons.length > 0 ? reasons : null;
}
export default function IngestEventQueueClient({ candidates }: { candidates: QueueCandidate[] }) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold">Pending Candidates</h2>
        <p className="text-sm text-muted-foreground">Showing up to 100 primary pending candidates from all venues.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2">Confidence</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Start Date</th>
              <th className="px-3 py-2">Venue</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Run Source</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="border-b align-top">
                <td className="px-3 py-2">
                  <IngestConfidenceBadge
                    score={candidate.confidenceScore}
                    band={getConfidenceBand(candidate.confidenceBand)}
                    reasons={getConfidenceReasons(candidate.confidenceReasons)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{candidate.title}</td>
                <td className="px-3 py-2">{candidate.startAt ? new Date(candidate.startAt).toLocaleString() : "—"}</td>
                <td className="px-3 py-2">{candidate.venue.name}</td>
                <td className="px-3 py-2">{candidate.locationText ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/ingest/runs/${candidate.run.id}`} className="underline">Run details</Link>
                  <div className="mt-1 max-w-[280px] truncate text-xs text-muted-foreground" title={candidate.run.sourceUrl}>
                    {candidate.run.sourceUrl}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <IngestCandidateActions
                    candidateId={candidate.id}
                    venueId={candidate.venue.id}
                    status={candidate.status}
                    createdEventId={candidate.createdEventId}
                    rejectionReason={candidate.rejectionReason}
                  />
                </td>
              </tr>
            ))}
            {candidates.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>No pending candidates in the queue.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
