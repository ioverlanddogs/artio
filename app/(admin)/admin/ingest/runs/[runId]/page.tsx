import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import IngestStatusBadge from "@/app/(admin)/admin/ingest/_components/ingest-status-badge";
import IngestCandidateActions from "@/app/(admin)/admin/ingest/_components/ingest-candidate-actions";
import { getServerBaseUrl } from "@/lib/server/get-base-url";

export const dynamic = "force-dynamic";

type RunDetailResponse = {
  ok: true;
  run: {
    id: string;
    status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
    sourceUrl: string;
    fetchStatus: string | null;
    errorCode: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    venue: { id: string; name: string };
    extractedEvents: Array<{
      id: string;
      title: string;
      startAt: string | null;
      locationText: string | null;
      status: "PENDING" | "APPROVED" | "REJECTED";
      rejectionReason: string | null;
      createdEventId: string | null;
    }>;
  };
  counts: { total: number; pending: number; approved: number; rejected: number };
};

async function fetchRun(runId: string): Promise<RunDetailResponse | null> {
  const baseUrl = await getServerBaseUrl();
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/admin/ingest/runs/${runId}`, { cache: "no-store", headers: cookie ? { cookie } : undefined });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<RunDetailResponse>;
}

export default async function AdminIngestRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const detail = await fetchRun(runId);

  if (!detail) notFound();

  const { run, counts } = detail;

  return (
    <main className="space-y-4">
      <AdminPageHeader
        title="Ingest Run"
        description={`Review extracted candidates for ${run.venue.name}.`}
      />

      <section className="rounded-lg border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Run Metadata</h2>
          <Link href="/admin/ingest" className="text-sm underline">Back to runs</Link>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-muted-foreground">Venue</dt><dd className="font-medium">{run.venue.name}</dd></div>
          <div><dt className="text-muted-foreground">Source URL</dt><dd className="break-all text-xs">{run.sourceUrl}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd><IngestStatusBadge status={run.status} /></dd></div>
          <div><dt className="text-muted-foreground">Started At</dt><dd>{run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-muted-foreground">Finished At</dt><dd>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-muted-foreground">Fetch Status</dt><dd>{run.fetchStatus ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Error Code</dt><dd>{run.errorCode ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Candidates</dt><dd>{counts.total} total</dd></div>
          <div><dt className="text-muted-foreground">Pending</dt><dd>{counts.pending}</dd></div>
        </dl>
      </section>

      <section className="rounded-lg border bg-background p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Extracted Candidates</h2>
          <p className="text-sm text-muted-foreground">Approve or reject pending candidates. Approval creates an unpublished event and submission.</p>
        </div>
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
              {run.extractedEvents.map((candidate) => (
                <tr key={candidate.id} className="border-b align-top">
                  <td className="px-3 py-2 font-medium">{candidate.title}</td>
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
              ))}
              {run.extractedEvents.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>No extracted candidates in this run.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
