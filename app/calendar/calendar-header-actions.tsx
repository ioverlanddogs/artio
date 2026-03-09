"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CalendarHeaderActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams?.get("view") === "agenda" ? "agenda" : "calendar";

  function setMode(next: "calendar" | "agenda") {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="rounded-md border p-0.5 text-sm">
        <button type="button" className={`rounded px-2 py-1 ${mode === "calendar" ? "bg-foreground text-background" : "text-foreground"}`} onClick={() => setMode("calendar")} aria-pressed={mode === "calendar"}>Month/Week</button>
        <button type="button" className={`rounded px-2 py-1 ${mode === "agenda" ? "bg-foreground text-background" : "text-foreground"}`} onClick={() => setMode("agenda")} aria-pressed={mode === "agenda"}>List</button>
      </div>
      <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => window.dispatchEvent(new Event("calendar:today"))}>Today</button>
      {isAuthenticated ? (
        <a href="/api/calendar-events/saved" className="rounded border px-3 py-1 text-sm" title="Subscribe to your saved events calendar feed">
          Subscribe
        </a>
      ) : null}
    </div>
  );
}
