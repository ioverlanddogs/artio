export type VenueAddressFields = {
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
  if (value.length === 2) return value;
  return undefined;
}
