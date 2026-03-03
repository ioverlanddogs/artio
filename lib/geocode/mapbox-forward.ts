import { ForwardGeocodeError, type ForwardGeocodeArgs } from "@/lib/geocode/forward-types";

export class MapboxForwardGeocodeError extends ForwardGeocodeError {
  constructor(
    code: "not_configured" | "provider_error" | "provider_timeout" | "rate_limited",
    message: string,
    status?: number,
  ) {
    super(code, message, status);
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
  return trimmed.length >= 3;
}

export async function geocodeVenueAddressToLatLng(args: ForwardGeocodeArgs): Promise<{ lat: number; lng: number } | null> {
  const REQUEST_TIMEOUT_MS = 8000;
  const queryTexts = (args.queryTexts ?? [args.addressText ?? ""]).map((query) => query.trim()).filter((query) => isAddressTextValid(query));
  if (queryTexts.length === 0) return null;

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new MapboxForwardGeocodeError("not_configured", "Mapbox access token missing");

  for (const queryText of queryTexts) {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", queryText);
    url.searchParams.set("limit", "1");
    url.searchParams.set("types", "address,poi,place,postcode");
    url.searchParams.set("autocomplete", "false");
    if (args.countryCode) url.searchParams.set("country", args.countryCode);
    url.searchParams.set("access_token", token);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { method: "GET", cache: "no-store", signal: abortController.signal });
      if (response.status === 429) throw new MapboxForwardGeocodeError("rate_limited", "Mapbox forward geocode rate limited", 429);
      if (!response.ok) throw new MapboxForwardGeocodeError("provider_error", `Mapbox forward geocode failed with status ${response.status}`, response.status);

      let json: MapboxForwardResponse;
      try {
        json = (await response.json()) as MapboxForwardResponse;
      } catch {
        throw new MapboxForwardGeocodeError("provider_error", "Mapbox forward geocode returned invalid JSON", response.status);
      }

      if (!Array.isArray(json.features)) {
        throw new MapboxForwardGeocodeError("provider_error", "Mapbox forward geocode response missing features array", response.status);
      }

      if (json.features.length === 0) continue;

      const top = json.features?.[0];
      const coordinates = top?.geometry?.coordinates;
      const propsCoordinates = top?.properties?.coordinates;

      const lng = typeof coordinates?.[0] === "number" ? coordinates[0] : propsCoordinates?.longitude;
      const lat = typeof coordinates?.[1] === "number" ? coordinates[1] : propsCoordinates?.latitude;

      if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
      }

      throw new MapboxForwardGeocodeError("provider_error", "Mapbox forward geocode response missing coordinates", response.status);
    } catch (error) {
      if (error instanceof MapboxForwardGeocodeError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new MapboxForwardGeocodeError("provider_timeout", "Mapbox forward geocode timed out");
      }
      throw new MapboxForwardGeocodeError("provider_error", "Mapbox forward geocode failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
