export function CalendarHeaderActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) return null;

  return <a href="/api/calendar-events/saved" className="rounded border px-3 py-1 text-sm" title="Subscribe to your saved events calendar feed">Subscribe</a>;
}
