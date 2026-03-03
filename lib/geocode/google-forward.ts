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
const MAX_LOG_BODY_CHARS = 200;
const MAX_LOG_QUERY_CHARS = 80;

function truncateForLog(value: string, maxChars: number) {
  return value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
}

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
      const responseBody = await response.text();
      const responseBodySnippet = truncateForLog(responseBody, MAX_LOG_BODY_CHARS);

      let json: GoogleGeocodeResponse;
      try {
        json = JSON.parse(responseBody) as GoogleGeocodeResponse;
      } catch {
        console.warn("Google forward geocode returned invalid JSON", {
          status: response.status,
          bodySnippet: responseBodySnippet,
        });
        throw new ForwardGeocodeError("provider_error", "Google forward geocode returned invalid JSON", response.status);
      }

      if (!response.ok) {
        console.warn("Google forward geocode HTTP error", {
          status: response.status,
          bodySnippet: responseBodySnippet,
          googleStatus: json.status,
        });
        throw new ForwardGeocodeError("provider_error", `Google forward geocode failed with status ${response.status}`, response.status);
      }

      if (json.status === "ZERO_RESULTS") continue;
      if (json.status === "OVER_QUERY_LIMIT") throw new ForwardGeocodeError("rate_limited", "Google forward geocode rate limited", 429);
      if (json.status === "REQUEST_DENIED") {
        console.warn("Google forward geocode request denied", {
          googleStatus: json.status,
          errorMessage: json.error_message,
          hint: "Likely billing/API/key restriction",
        });
        throw new ForwardGeocodeError("provider_error", "Google forward geocode request denied");
      }
      if (json.status === "INVALID_REQUEST") {
        console.warn("Google forward geocode invalid request", {
          googleStatus: json.status,
          errorMessage: json.error_message,
          queryText: truncateForLog(queryText, MAX_LOG_QUERY_CHARS),
        });
        throw new ForwardGeocodeError("provider_error", "Google forward geocode request denied");
      }
      if (json.status !== "OK") {
        console.warn("Google forward geocode unexpected status", {
          googleStatus: json.status,
          errorMessage: json.error_message,
        });
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
