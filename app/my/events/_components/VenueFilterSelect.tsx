"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function VenueFilterSelect({
  memberships,
  currentVenueId,
}: {
  memberships: { venueId: string; name: string }[];
  currentVenueId: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("venueId", e.target.value);
    else params.delete("venueId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentVenueId ?? ""}
      onChange={onChange}
      className="h-9 rounded border px-2 text-sm"
    >
      <option value="">All venues</option>
      {memberships.map((m) => (
        <option key={m.venueId} value={m.venueId}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
