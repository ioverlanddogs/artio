import Link from "next/link";
import type { MyDashboardResponse } from "@/lib/my/dashboard-schema";
import { makeDashboardTabHref } from "./dashboard-tab-href";

type Props = {
  counts: MyDashboardResponse["counts"];
  venueId?: string;
};

function tileClass(status: string, value: number) {
  const classes = ["rounded border p-3 transition-colors hover:bg-muted/40"];
  if (status === "Rejected" && value > 0) classes.push("border-destructive/40 text-destructive");
  if (status === "Draft" && value > 0) classes.push("border-amber-500/30");
  return classes.join(" ");
}

function GroupSection({
  title,
  total,
  tiles,
}: {
  title: string;
  total: number;
  tiles: Array<{ status: string; href: string; value: number; label: string }>;
}) {
  return (
    <section className="space-y-3 rounded border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">Total: {total}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={`${title}-${tile.status}`} href={tile.href} className={tileClass(tile.status, tile.value)}>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="text-2xl font-semibold">{tile.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function StatusTileGroups({ counts, venueId }: Props) {
  const venueTotal = Object.values(counts.venues).reduce((sum, value) => sum + value, 0);
  const eventTotal = Object.values(counts.events).reduce((sum, value) => sum + value, 0);
  const artworkTotal = counts.artwork.Draft + counts.artwork.Published;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Status at a glance</h2>
      <GroupSection
        title="Venues"
        total={venueTotal}
        tiles={(["Draft", "Submitted", "Published", "Rejected"] as const).map((status) => ({
          status,
          href: makeDashboardTabHref("/my/venues", status, venueId),
          value: counts.venues[status],
          label: `Venue ${status.toLowerCase()}`,
        }))}
      />
      <GroupSection
        title="Events"
        total={eventTotal}
        tiles={(["Draft", "Submitted", "Published", "Rejected"] as const).map((status) => ({
          status,
          href: makeDashboardTabHref("/my/events", status, venueId),
          value: counts.events[status],
          label: `Event ${status.toLowerCase()}`,
        }))}
      />
      <GroupSection
        title="Artwork"
        total={artworkTotal}
        tiles={(["Draft", "Published"] as const).map((status) => ({
          status,
          href: makeDashboardTabHref("/my/artwork", status, venueId),
          value: counts.artwork[status],
          label: `Artwork ${status.toLowerCase()}`,
        }))}
      />
    </section>
  );
}
