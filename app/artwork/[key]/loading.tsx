import { EntityHeaderSkeleton } from "@/components/entities/entity-header-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function ArtworkDetailSkeleton() {
  return (
    <PageShell className="page-stack">
      <Skeleton className="h-5 w-64" />
      <EntityHeaderSkeleton />
      <div className="rounded-xl border border-border p-6">
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="aspect-[4/3] w-full" />)}
      </div>
      <div className="card-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border p-4">
            <Skeleton className="mb-3 h-28 w-full" />
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export default function Loading() {
  return <ArtworkDetailSkeleton />;
}
