import { geocodeVenueAddressToLatLng as geocodeWithMapbox } from "@/lib/geocode/mapbox-forward";
import { geocodeVenueAddressToLatLng as geocodeWithGoogle } from "@/lib/geocode/google-forward";
import type { ForwardGeocodeArgs } from "@/lib/geocode/forward-types";

export { ForwardGeocodeError, type ForwardGeocodeArgs, type ForwardGeocodeErrorCode } from "@/lib/geocode/forward-types";

function currentProvider() {
  const provider = process.env.GEOCODER_PROVIDER?.trim().toLowerCase();
  if (provider === "google") return "google" as const;
  return "mapbox" as const;
}

export async function forwardGeocodeVenueAddressToLatLng(args: ForwardGeocodeArgs): Promise<{ lat: number; lng: number } | null> {
  if (currentProvider() === "google") {
    return geocodeWithGoogle(args);
  }
  return geocodeWithMapbox(args);
}
