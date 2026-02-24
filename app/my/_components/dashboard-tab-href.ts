export function makeDashboardTabHref(
  path: "/my/venues" | "/my/events" | "/my/artwork",
  status: string,
  venueId?: string,
) {
  const params = new URLSearchParams({ status });
  if (venueId) params.set("venueId", venueId);
  return `${path}?${params.toString()}`;
}
