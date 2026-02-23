"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MyHeaderBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venueId") ?? "";

  const onVenueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete("venueId");
    else params.set("venueId", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-20 rounded border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Publisher Command Center</h1>
          <p className="text-sm text-muted-foreground">Overview and controls for venues, events, artwork, and team.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="venueId">Venue</label>
          <input id="venueId" className="h-9 rounded border px-2 text-sm" placeholder="All venues" value={venueId} onChange={(e) => onVenueChange(e.target.value)} />
          <Button asChild size="sm"><Link href="/my/events/new">+ Event</Link></Button>
          <Button asChild size="sm" variant="secondary"><Link href="/my/venues/new">+ Venue</Link></Button>
        </div>
      </div>
    </header>
  );
}
