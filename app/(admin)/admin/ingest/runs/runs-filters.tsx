"use client";

import { usePathname, useRouter } from "next/navigation";

type Props = {
  venues: Array<{ id: string; name: string }>;
  currentVenueId: string | null;
  currentStatus: string | null;
  currentPage: number;
  totalPages: number;
  totalRuns: number;
};

export function RunsFilters({
  venues,
  currentVenueId,
  currentStatus,
  currentPage,
  totalPages,
  totalRuns,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key !== "page") {
      params.delete("page");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3">
      <label className="sr-only" htmlFor="runs-filter-venue">Venue</label>
      <select
        id="runs-filter-venue"
        className="rounded border bg-background px-3 py-1.5 text-sm"
        value={currentVenueId ?? ""}
        onChange={(e) => update("venueId", e.target.value || null)}
      >
        <option value="">All venues</option>
        {venues.map((venue) => (
          <option key={venue.id} value={venue.id}>{venue.name}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="runs-filter-status">Status</label>
      <select
        id="runs-filter-status"
        className="rounded border bg-background px-3 py-1.5 text-sm"
        value={currentStatus ?? ""}
        onChange={(e) => update("status", e.target.value || null)}
      >
        <option value="">All statuses</option>
        <option value="SUCCEEDED">Succeeded</option>
        <option value="FAILED">Failed</option>
        <option value="RUNNING">Running</option>
        <option value="PENDING">Pending</option>
      </select>

      <span className="ml-auto text-xs text-muted-foreground">
        {totalRuns} run{totalRuns !== 1 ? "s" : ""}
      </span>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => update("page", String(currentPage - 1))}
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground">{currentPage} / {totalPages}</span>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => update("page", String(currentPage + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
