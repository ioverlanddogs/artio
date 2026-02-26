import { geocodeVenueAddressToLatLng } from "@/lib/geocode/mapbox-forward";
import { formatVenueAddress, isVenueAddressGeocodeable, normalizeCountryCode, type VenueAddressFields } from "@/lib/venues/format-venue-address";

type LatLng = { lat: number; lng: number };

export type VenueGeocodeFields = VenueAddressFields & { lat?: number | null; lng?: number | null };

export async function geocodeForVenueCreate(input: VenueGeocodeFields, geocodeFn = geocodeVenueAddressToLatLng) {
  if (input.lat != null || input.lng != null) return { lat: input.lat ?? null, lng: input.lng ?? null };
  if (!isVenueAddressGeocodeable(input)) return { lat: null, lng: null };

  const addressText = formatVenueAddress(input);
  if (!addressText) return { lat: null, lng: null };

  const result = await geocodeFn({
    addressText,
    countryCode: normalizeCountryCode(input.country),
  });

  if (!result) return { lat: null, lng: null };
  return result;
}

export async function geocodeForVenueUpdate(args: {
  existing: VenueGeocodeFields;
  patch: Partial<VenueGeocodeFields>;
}, geocodeFn = geocodeVenueAddressToLatLng): Promise<LatLng | null> {
  const hasAddressChange = ["addressLine1", "addressLine2", "city", "region", "postcode", "country"].some((field) => Object.prototype.hasOwnProperty.call(args.patch, field));
  const hasManualLatLng = Object.prototype.hasOwnProperty.call(args.patch, "lat") || Object.prototype.hasOwnProperty.call(args.patch, "lng");

  if (!hasAddressChange || hasManualLatLng) return null;

  const merged = {
    addressLine1: args.patch.addressLine1 ?? args.existing.addressLine1,
    addressLine2: args.patch.addressLine2 ?? args.existing.addressLine2,
    city: args.patch.city ?? args.existing.city,
    region: args.patch.region ?? args.existing.region,
    postcode: args.patch.postcode ?? args.existing.postcode,
    country: args.patch.country ?? args.existing.country,
  };

  if (!isVenueAddressGeocodeable(merged)) return null;
  const addressText = formatVenueAddress(merged);
  if (!addressText) return null;

  return geocodeFn({
    addressText,
    countryCode: normalizeCountryCode(merged.country),
  });
}
