import { z } from "zod";
import { getBoundingBox, isWithinRadiusKm } from "@/lib/geo";

export const digestSnapshotItemSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  startAt: z.iso.datetime({ offset: true }).or(z.iso.datetime({ local: true })),
  venueName: z.string().trim().min(1).nullable(),
});

export const digestSnapshotItemsSchema = z.array(digestSnapshotItemSchema);

export type DigestPreferenceUser = {
  digestEnabled: boolean;
  digestEventsOnly: boolean;
  digestRadiusKm: number | null;
  digestMaxEvents: number;
  locationLat: number | null;
  locationLng: number | null;
};

type DigestEvent = {
  lat: number | null;
  lng: number | null;
  venue: { lat: number | null; lng: number | null } | null;
};

export function filterEventsByRadius<T extends DigestEvent>(events: T[], user: DigestPreferenceUser): T[] {
  if (user.digestRadiusKm == null || user.locationLat == null || user.locationLng == null) return events;
  const box = getBoundingBox(user.locationLat, user.locationLng, user.digestRadiusKm);
  const originLat = user.locationLat;
  const originLng = user.locationLng;
  const radiusKm = user.digestRadiusKm;
  return events.filter((event) => {
    const lat = event.lat ?? event.venue?.lat;
    const lng = event.lng ?? event.venue?.lng;
    if (lat == null || lng == null) return false;
    // Bounding box is a fast pre-filter; isWithinRadiusKm does the exact circle check
    if (lat < box.minLat || lat > box.maxLat || lng < box.minLng || lng > box.maxLng) return false;
    return isWithinRadiusKm(originLat, originLng, lat, lng, radiusKm);
  });
}

export function isoWeekStamp(input: Date) {
  const d = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function digestDedupeKey(savedSearchId: string, date: Date = new Date()) {
  return `digest:${savedSearchId}:${isoWeekStamp(date)}`;
}
