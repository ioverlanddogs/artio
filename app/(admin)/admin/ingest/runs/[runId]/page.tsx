import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import IngestStatusBadge from "@/app/(admin)/admin/ingest/_components/ingest-status-badge";
import IngestRunCandidates from "@/app/(admin)/admin/ingest/_components/ingest-run-candidates";
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
      status: "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE";
      rejectionReason: string | null;
      createdEventId: string | null;
      duplicateOfId: string | null;
      similarityScore: number | null;
      similarityKey: string;
      clusterKey: string;
      confidenceScore: number;
      confidenceBand: "HIGH" | "MEDIUM" | "LOW" | null;
      confidenceReasons: string[] | null;
    }>;
  };
  counts: { total: number; pending: number; approved: number; rejected: number; duplicates: number; primaries: number };
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
          <div><dt className="text-muted-foreground">Primaries</dt><dd>{counts.primaries}</dd></div>
          <div><dt className="text-muted-foreground">Duplicates</dt><dd>{counts.duplicates}</dd></div>
          <div><dt className="text-muted-foreground">Pending</dt><dd>{counts.pending}</dd></div>
        </dl>
      </section>

      <section className="rounded-lg border bg-background p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Extracted Candidates</h2>
          <p className="text-sm text-muted-foreground">Approve or reject pending candidates. Approval creates an unpublished event and submission.</p>
        </div>
        <IngestRunCandidates candidates={run.extractedEvents} />
</section>
    </main>
  );
}
