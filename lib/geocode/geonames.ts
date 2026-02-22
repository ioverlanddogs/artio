type GeoNamesPlace = {
  name?: string;
  adminName1?: string;
  countryName?: string;
  lat?: string | number | null;
  lng?: string | number | null;
};

type GeoNamesResponse = {
  geonames?: GeoNamesPlace[];
};

export function normalizeGeoNames(geonamesJson: GeoNamesResponse): { results: Array<{ label: string; lat: number; lng: number }> } {
  const results = (geonamesJson.geonames ?? [])
    .map((place) => {
      if (place.lat == null || place.lng == null) return null;
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const labelParts = [place.name, place.adminName1, place.countryName].map((value) => value?.trim()).filter(Boolean);
      return {
        label: labelParts.join(", "),
        lat,
        lng,
      };
    })
    .filter((item): item is { label: string; lat: number; lng: number } => item !== null);

  return { results };
}
