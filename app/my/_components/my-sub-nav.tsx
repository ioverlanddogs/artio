"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  ["Overview", "/my"],
  ["Venues", "/my/venues"],
  ["Events", "/my/events"],
  ["Artwork", "/my/artwork"],
  ["Artist Profile", "/my/artist"],
  ["Team", "/my/team"],
  ["Analytics", "/my/analytics"],
  ["Settings", "/settings"],
] as const;

export function MySubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venueId");
  const suffix = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";

  return (
    <nav className="overflow-x-auto">
      <ul className="flex min-w-max gap-2 border-b pb-2">
        {tabs.map(([label, href]) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link href={`${href}${suffix}`} className={`rounded px-3 py-1 text-sm ${active ? "bg-foreground text-background" : "bg-muted"}`}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
