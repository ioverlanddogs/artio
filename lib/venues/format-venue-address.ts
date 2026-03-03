export type VenueAddressFields = {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postcode?: string | null;
  country?: string | null;
};

function cleanPart(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

const regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

function isIso3166Alpha2(value: string) {
  if (!/^[A-Z]{2}$/.test(value)) return false;
  const label = regionDisplayNames.of(value);
  return Boolean(label && label !== value && label !== "Unknown Region");
}

export function formatVenueAddress(fields: VenueAddressFields) {
  const parts = [
    cleanPart(fields.addressLine1),
    cleanPart(fields.addressLine2),
    cleanPart(fields.city),
    cleanPart(fields.region),
    cleanPart(fields.postcode),
    cleanPart(fields.country),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(", ") : "";
}

export function buildVenueGeocodeQueries(fields: VenueAddressFields) {
  const name = cleanPart(fields.name);
  const addressLine1 = cleanPart(fields.addressLine1);
  const city = cleanPart(fields.city);
  const postcode = cleanPart(fields.postcode);
  const country = cleanPart(fields.country);

  const queryLadder = [
    [addressLine1, city, postcode, country],
    [name, city, postcode, country],
    [postcode, country],
    [city, country],
  ];

  const queries: string[] = [];
  for (const parts of queryLadder) {
    const query = parts.filter((part): part is string => Boolean(part)).join(", ");
    if (query) queries.push(query);
  }

  return [...new Set(queries)];
}

export function isVenueAddressGeocodeable(fields: VenueAddressFields) {
  const city = cleanPart(fields.city);
  const postcode = cleanPart(fields.postcode);
  const country = cleanPart(fields.country);

  return Boolean(country && (city || postcode));
}

export function normalizeCountryCode(country?: string | null) {
  const value = cleanPart(country)?.toUpperCase();
  if (!value) return undefined;
  if (value === "UK" || value === "UNITED KINGDOM" || value === "GB" || value === "GREAT BRITAIN") return "GB";
  if (isIso3166Alpha2(value)) return value;
  return undefined;
}
