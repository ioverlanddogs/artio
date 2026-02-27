"use client";

import { Fragment, useMemo, useState } from "react";
import IngestStatusBadge from "@/app/(admin)/admin/ingest/_components/ingest-status-badge";
import IngestCandidateActions from "@/app/(admin)/admin/ingest/_components/ingest-candidate-actions";

type Candidate = {
  id: string;
  title: string;
  startAt: string | null;
  locationText: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE";
  rejectionReason: string | null;
  createdEventId: string | null;
  duplicateOfId: string | null;
  similarityScore: number | null;
};

export default function IngestRunCandidates({ candidates }: { candidates: Candidate[] }) {
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const primaryCandidates = candidates
      .filter((candidate) => candidate.status !== "DUPLICATE")
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

    const duplicatesByPrimary = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      if (candidate.status !== "DUPLICATE" || !candidate.duplicateOfId) continue;
      const rows = duplicatesByPrimary.get(candidate.duplicateOfId) ?? [];
      rows.push(candidate);
      duplicatesByPrimary.set(candidate.duplicateOfId, rows);
    }

    for (const rows of duplicatesByPrimary.values()) {
      rows.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    }

    return { primaryCandidates, duplicatesByPrimary };
  }, [candidates]);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showDuplicates} onChange={(event) => setShowDuplicates(event.target.checked)} />
        Show duplicates
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Start Date</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grouped.primaryCandidates.map((candidate) => {
              const duplicates = grouped.duplicatesByPrimary.get(candidate.id) ?? [];
              const isExpanded = expanded[candidate.id] ?? false;

              return (
                <Fragment key={candidate.id}>
                  <tr key={candidate.id} className="border-b align-top">
                    <td className="px-3 py-2 font-medium">
                      {candidate.title}
                      {duplicates.length > 0 ? (
                        <button
                          className="ml-2 text-xs underline"
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [candidate.id]: !isExpanded }))}
                        >
                          +{duplicates.length} duplicates
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{candidate.startAt ? new Date(candidate.startAt).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2">{candidate.locationText ?? "—"}</td>
                    <td className="px-3 py-2"><IngestStatusBadge status={candidate.status} /></td>
                    <td className="px-3 py-2">
                      <IngestCandidateActions
                        candidateId={candidate.id}
                        status={candidate.status}
                        createdEventId={candidate.createdEventId}
                        rejectionReason={candidate.rejectionReason}
                      />
                    </td>
                  </tr>
                  {showDuplicates && isExpanded ? duplicates.map((duplicate) => (
                    <tr key={duplicate.id} className="border-b align-top bg-muted/20">
                      <td className="px-3 py-2 pl-8">
                        {duplicate.title}
                        <div className="text-xs text-muted-foreground" title={duplicate.similarityScore !== null ? `Similarity ${duplicate.similarityScore}` : undefined}>
                          Duplicate of {candidate.title}
                        </div>
                      </td>
                      <td className="px-3 py-2">{duplicate.startAt ? new Date(duplicate.startAt).toLocaleString() : "—"}</td>
                      <td className="px-3 py-2">{duplicate.locationText ?? "—"}</td>
                      <td className="px-3 py-2"><IngestStatusBadge status={duplicate.status} /></td>
                      <td className="px-3 py-2"><span className="text-xs text-muted-foreground">No actions</span></td>
                    </tr>
                  )) : null}
                </Fragment>
              );
            })}
            {grouped.primaryCandidates.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={5}>No extracted candidates in this run.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
