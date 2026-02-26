import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetch-with-timeout";

export class MapboxForwardGeocodeError extends Error {
  constructor(public readonly code: "not_configured" | "provider_error" | "provider_timeout", message: string) {
    super(message);
    this.name = "MapboxForwardGeocodeError";
  }
}

type MapboxForwardResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
    properties?: {
      coordinates?: {
        longitude?: number;
        latitude?: number;
      };
    };
  }>;
};

function isAddressTextValid(addressText: string) {
  const trimmed = addressText.trim();
  return trimmed.length >= 6 && /\d|,/.test(trimmed);
}

export async function geocodeVenueAddressToLatLng(args: {
  addressText: string;
  countryCode?: string;
}): Promise<{ lat: number; lng: number } | null> {
  if (!isAddressTextValid(args.addressText)) return null;

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new MapboxForwardGeocodeError("not_configured", "Mapbox access token missing");

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", args.addressText);
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "address,place,postcode");
  if (args.countryCode) url.searchParams.set("country", args.countryCode);
  url.searchParams.set("access_token", token);

  try {
    const response = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, 5000);
    if (!response.ok) throw new MapboxForwardGeocodeError("provider_error", "Mapbox forward geocode failed");

    const json = (await response.json()) as MapboxForwardResponse;
    const top = json.features?.[0];
    const coordinates = top?.geometry?.coordinates;
    const propsCoordinates = top?.properties?.coordinates;

    const lng = typeof coordinates?.[0] === "number" ? coordinates[0] : propsCoordinates?.longitude;
    const lat = typeof coordinates?.[1] === "number" ? coordinates[1] : propsCoordinates?.latitude;

    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { lat, lng };
  } catch (error) {
    if (error instanceof MapboxForwardGeocodeError) throw error;
    if (error instanceof FetchTimeoutError) throw new MapboxForwardGeocodeError("provider_timeout", "Mapbox forward geocode timed out");
    throw new MapboxForwardGeocodeError("provider_error", "Mapbox forward geocode failed");
  }
}
