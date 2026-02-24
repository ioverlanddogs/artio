export function resolveVenueFilterLabel(
  venueId: string,
  venues: Array<{ id: string; name: string }>,
): string {
  const venueName = venues.find((venue) => venue.id === venueId)?.name;
  return `Venue: ${venueName ?? "Selected venue"}`;
}
