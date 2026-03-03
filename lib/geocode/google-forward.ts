import { ForwardGeocodeError, type ForwardGeocodeArgs } from "@/lib/geocode/forward-types";

type GoogleGeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
  error_message?: string;
};

const REQUEST_TIMEOUT_MS = 8000;

function isAddressTextValid(addressText: string) {
  const trimmed = addressText.trim();
  return trimmed.length >= 3;
}

function normalizeCountryCode(countryCode?: string) {
  const value = countryCode?.trim();
  if (!value) return null;
  if (!/^[A-Za-z]{2}$/.test(value)) return null;
  return value.toUpperCase();
}

export async function geocodeVenueAddressToLatLng(args: ForwardGeocodeArgs): Promise<{ lat: number; lng: number } | null> {
  const queryTexts = (args.queryTexts ?? [args.addressText ?? ""]).map((query) => query.trim()).filter((query) => isAddressTextValid(query));
  if (queryTexts.length === 0) return null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) throw new ForwardGeocodeError("not_configured", "Google Maps API key missing");

  const countryCode = normalizeCountryCode(args.countryCode);

  for (const queryText of queryTexts) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", queryText);
    url.searchParams.set("key", apiKey);
    if (countryCode) url.searchParams.set("components", `country:${countryCode}`);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { method: "GET", cache: "no-store", signal: abortController.signal });
      if (!response.ok) {
        if (response.status >= 500) {
          throw new ForwardGeocodeError("provider_timeout", `Google forward geocode failed with status ${response.status}`, response.status);
        }
        throw new ForwardGeocodeError("provider_error", `Google forward geocode failed with status ${response.status}`, response.status);
      }

      let json: GoogleGeocodeResponse;
      try {
        json = (await response.json()) as GoogleGeocodeResponse;
      } catch {
        throw new ForwardGeocodeError("provider_error", "Google forward geocode returned invalid JSON", response.status);
      }

      if (json.status === "ZERO_RESULTS") continue;
      if (json.status === "OVER_QUERY_LIMIT") throw new ForwardGeocodeError("rate_limited", "Google forward geocode rate limited", 429);
      if (json.status === "REQUEST_DENIED" || json.status === "INVALID_REQUEST") {
        throw new ForwardGeocodeError("provider_error", "Google forward geocode request denied");
      }
      if (json.status !== "OK") {
        throw new ForwardGeocodeError("provider_error", `Google forward geocode failed with status ${json.status ?? "unknown"}`);
      }

      const location = json.results?.[0]?.geometry?.location;
      if (typeof location?.lat === "number" && typeof location?.lng === "number") {
        return { lat: location.lat, lng: location.lng };
      }

      throw new ForwardGeocodeError("provider_error", "Google forward geocode response missing coordinates");
    } catch (error) {
      if (error instanceof ForwardGeocodeError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ForwardGeocodeError("provider_timeout", "Google forward geocode timed out");
      }
      throw new ForwardGeocodeError("provider_error", "Google forward geocode failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
