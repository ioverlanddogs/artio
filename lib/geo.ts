export function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const safeCos = Math.max(Math.cos((lat * Math.PI) / 180), 0.000001);
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * safeCos);

  return {
    minLat: Math.max(-90, lat - latDelta),
    maxLat: Math.min(90, lat + latDelta),
    minLng: Math.max(-180, lng - lngDelta),
    maxLng: Math.min(180, lng + lngDelta),
  };
}

export function distanceKm(originLat: number, originLng: number, pointLat: number, pointLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(pointLat - originLat);
  const dLng = toRad(pointLng - originLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(originLat)) * Math.cos(toRad(pointLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadiusKm(originLat: number, originLng: number, pointLat: number, pointLng: number, radiusKm: number) {
  return distanceKm(originLat, originLng, pointLat, pointLng) <= radiusKm;
}
