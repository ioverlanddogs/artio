export type SearchFilters = {
  query?: string;
  from?: string;
  to?: string;
  days?: string;
  tags?: string;
  venue?: string;
  artist?: string;
  lat?: string;
  lng?: string;
  radiusKm?: string;
  limit?: string;
};

export function serializeFilters(filters: SearchFilters) {
  return JSON.stringify(filters);
}

export function deserializeFilters(value: string | null): SearchFilters {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as SearchFilters;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const FILTER_LABELS: Record<string, string> = {
  query: "Search",
  from: "From",
  to: "To",
  days: "Days",
  tags: "Tags",
  venue: "Venue",
  artist: "Artist",
  lat: "Lat",
  lng: "Lng",
  radiusKm: "Radius (km)",
  limit: "Limit",
};

export function buildActiveFilterChips(filters: SearchFilters) {
  return Object.entries(filters)
    .filter(([, value]) => typeof value === "string" && value.trim() !== "")
    .map(([key, value]) => {
      let label = value as string;
      if ((key === "from" || key === "to") && label) {
        const date = new Date(label);
        if (!Number.isNaN(date.getTime())) {
          label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        }
      }
      return { key, label: `${FILTER_LABELS[key] ?? key}: ${label}` };
    });
}
