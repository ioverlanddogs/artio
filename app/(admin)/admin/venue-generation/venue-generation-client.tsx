"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RunItem = {
  id: string;
  name: string;
  city: string | null;
  postcode: string | null;
  country: string;
  status: string;
  reason: string | null;
  venueId: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  contactEmail: string | null;
  featuredImageUrl: string | null;
  socialWarning: string | null;
  geocodeStatus: string;
  geocodeErrorCode: string | null;
  timezoneWarning: string | null;
  createdAt: string | Date;
};

type Run = {
  id: string;
  country: string;
  region: string;
  totalReturned: number;
  totalCreated: number;
  totalSkipped: number;
  totalFailed: number;
  geocodeAttempted: number;
  geocodeSucceeded: number;
  geocodeFailed: number;
  geocodeFailureBreakdown: unknown;
  createdAt: string | Date;
  items: RunItem[];
};

function geocodeRate(run: Run) {
  if (!run.geocodeAttempted) return "0%";
  return `${Math.round((run.geocodeSucceeded / run.geocodeAttempted) * 100)}%`;
}

export function VenueGenerationClient({ initialRuns }: { initialRuns: Run[] }) {
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [runs, setRuns] = useState(initialRuns);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);

  const refreshRuns = async () => {
    const runsRes = await fetch("/api/admin/venue-generation/runs", { cache: "no-store" });
    const runsBody = await runsRes.json();
    if (runsRes.ok && Array.isArray(runsBody?.runs)) setRuns(runsBody.runs);
  };

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          setMessage(null);
          try {
            const response = await fetch("/api/admin/venue-generation", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ country, region }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body?.error?.message ?? "Generation failed");
            setMessage(`${body.totalCreated} venues created, ${body.totalSkipped} skipped, ${body.totalFailed ?? 0} failed.`);
            await refreshRuns();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" required />
        <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" required />
        <Button type="submit" disabled={loading}>{loading ? "Generating…" : "Generate Venues"}</Button>
      </form>

      {message ? <p className="rounded border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <div className="space-y-3 rounded-lg border bg-background p-4">
        <h2 className="text-sm font-semibold">Recent Runs</h2>
        {runs.map((run) => {
          const created = run.items.filter((item) => item.status === "created");
          const skipped = run.items.filter((item) => item.status === "skipped");
          const failed = run.items.filter((item) => item.status === "failed");
          const breakdown = Object.entries((run.geocodeFailureBreakdown && typeof run.geocodeFailureBreakdown === "object" ? run.geocodeFailureBreakdown : {}) as Record<string, number>);

          return (
            <details key={run.id} className="rounded border p-3" open>
              <summary className="cursor-pointer text-sm font-medium">
                {run.region}, {run.country} — created {run.totalCreated}/{run.totalReturned}, skipped {run.totalSkipped}, failed {run.totalFailed}, geocode {geocodeRate(run)}
              </summary>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span>Geocode: attempted {run.geocodeAttempted}, succeeded {run.geocodeSucceeded}, failed {run.geocodeFailed}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryingRunId === run.id}
                    onClick={async () => {
                      setRetryingRunId(run.id);
                      setError(null);
                      setMessage(null);
                      try {
                        const response = await fetch(`/api/admin/venue-generation/runs/${run.id}/retry-geocode`, { method: "POST" });
                        const body = await response.json();
                        if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? "Retry geocoding failed");
                        setMessage(body.message ?? "Retry geocoding completed");
                        await refreshRuns();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Retry geocoding failed");
                      } finally {
                        setRetryingRunId(null);
                      }
                    }}
                  >
                    {retryingRunId === run.id ? "Retrying…" : "Retry geocoding for this run"}
                  </Button>
                </div>

                {breakdown.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground"><th>Error code</th><th>Count</th></tr></thead>
                    <tbody>{breakdown.map(([code, count]) => <tr key={code} className="border-t"><td className="py-1">{code}</td><td>{count}</td></tr>)}</tbody>
                  </table>
                ) : <p className="text-xs text-muted-foreground">No geocode failures recorded.</p>}

                <div>
                  <h3 className="font-medium">Created ({created.length})</h3>
                  <ul className="list-disc space-y-2 pl-5">
                    {created.map((item) => (
                      <li key={item.id}>
                        <div>{item.venueId ? <Link className="underline" href={`/admin/venues/${item.venueId}`}>{item.name}</Link> : item.name} — geocode: {item.geocodeStatus}{item.geocodeErrorCode ? ` (${item.geocodeErrorCode})` : ""}{item.timezoneWarning ? `, timezone: ${item.timezoneWarning}` : ""}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.instagramUrl ? <><a className="underline" href={item.instagramUrl} target="_blank" rel="noreferrer">Instagram</a> <span>(normalized)</span> · </> : null}
                          {item.facebookUrl ? <><a className="underline" href={item.facebookUrl} target="_blank" rel="noreferrer">Facebook</a> <span>(normalized)</span> · </> : null}
                          {item.contactEmail ? <><a className="underline" href={`mailto:${item.contactEmail}`}>Email</a> · </> : null}
                          {item.featuredImageUrl ? <><a className="underline" href={item.featuredImageUrl} target="_blank" rel="noreferrer">Featured image</a> · </> : null}
                          {item.socialWarning ? <span>Warnings: {item.socialWarning}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Skipped ({skipped.length})</h3>
                  <ul className="list-disc pl-5">{skipped.map((item) => <li key={item.id}>{item.name} — {item.reason ?? "skipped"}</li>)}</ul>
                </div>
                <div>
                  <h3 className="font-medium">Failed ({failed.length})</h3>
                  <ul className="list-disc pl-5">{failed.map((item) => <li key={item.id}>{item.name} — {item.reason ?? "failed"}</li>)}</ul>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
