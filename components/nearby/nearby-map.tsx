"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EventPreviewCard } from "@/components/nearby/event-preview-card";
import { getMarkerItems, MAX_MAP_MARKERS, type MarkerItem, type NearbyMapItem } from "@/lib/nearby-map";

type NearbyMapProps = {
  items: NearbyMapItem[];
  lat: string;
  lng: string;
  radiusKm: string;
  days: number;
  onSearchArea: (center: { lat: number; lng: number }) => Promise<void>;
};

const USER_RADIUS_SOURCE_ID = "nearby-user-radius";

export function NearbyMap({ items, lat, lng, radiusKm, days, onSearchArea }: NearbyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerRefs = useRef<Array<{ remove: () => void }>>([]);
  const userMarkerRef = useRef<{ remove: () => void } | null>(null);
  const [selected, setSelected] = useState<MarkerItem | null>(null);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [isMapboxUnavailable, setIsMapboxUnavailable] = useState(false);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const { markers, omittedCount } = useMemo(() => getMarkerItems(items), [items]);

  const fitToResults = () => {
    const map = mapRef.current as { fitBounds?: (bounds: unknown, opts?: { padding?: number; maxZoom?: number }) => void } | null;
    if (!map?.fitBounds || markers.length === 0) return;
    import("mapbox-gl").then((mb) => {
      const mapboxgl = mb.default ?? mb;
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((markerEvent) => bounds.extend([markerEvent.lng, markerEvent.lat]));
      if (!bounds.isEmpty()) map.fitBounds?.(bounds, { padding: 40, maxZoom: 12 });
    }).catch(() => {
      // noop
    });
  };

  useEffect(() => {
    if (typeof window === "undefined" || !mapToken || !mapContainerRef.current || mapRef.current) return;

    let isCancelled = false;
    void (async () => {
      try {
        const mb = await import("mapbox-gl");
        if (isCancelled) return;
        const mapboxgl = mb.default ?? mb;
        mapboxgl.accessToken = mapToken;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current as HTMLDivElement,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [0, 0],
          zoom: 2,
        });
        mapRef.current = map;
        setIsMapboxUnavailable(false);
      } catch {
        if (!isCancelled) setIsMapboxUnavailable(true);
      }
    })();

    return () => {
      isCancelled = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      const map = mapRef.current as { remove?: () => void } | null;
      map?.remove?.();
      mapRef.current = null;
    };
  }, [mapToken]);

  useEffect(() => {
    const map = mapRef.current as { addTo?: unknown } | null;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    import("mapbox-gl").then((mb) => {
      const mapboxgl = mb.default ?? mb;
      markers.forEach((markerItem) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = markerItem.kind === "event" ? "h-3 w-3 rounded-full border border-gray-900 bg-blue-500" : "h-3 w-3 rounded-full border border-gray-900 bg-emerald-500";
        el.setAttribute("aria-label", `Show ${markerItem.title}`);
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([markerItem.lng, markerItem.lat]).addTo(map);
        el.addEventListener("click", () => setSelected(markerItem));
        markerRefs.current.push(marker);
      });
    }).catch(() => {
      // noop
    });
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current as { fitBounds?: (bounds: unknown, opts?: { padding?: number; maxZoom?: number }) => void } | null;
    if (!map || !map.fitBounds || markers.length === 0) return;
    import("mapbox-gl").then((mb) => {
      const mapboxgl = mb.default ?? mb;
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((markerEvent) => bounds.extend([markerEvent.lng, markerEvent.lat]));
      if (!bounds.isEmpty()) map.fitBounds?.(bounds, { padding: 40, maxZoom: 12 });
    }).catch(() => {
      // noop
    });
  }, [days, markers, radiusKm]);

  useEffect(() => {
    const map = mapRef.current as { getSource?: (id: string) => { setData: (data: unknown) => void } | undefined; addSource?: (id: string, source: unknown) => void; addLayer?: (layer: unknown) => void } | null;
    const numericLat = Number.parseFloat(lat);
    const numericLng = Number.parseFloat(lng);
    const numericRadius = Number.parseFloat(radiusKm);
    if (!map || !Number.isFinite(numericLat) || !Number.isFinite(numericLng) || !Number.isFinite(numericRadius)) return;

    import("mapbox-gl").then((mb) => {
      const mapboxgl = mb.default ?? mb;
      userMarkerRef.current?.remove();
      const el = document.createElement("div");
      el.className = "h-3 w-3 rounded-full border-2 border-white bg-black shadow";
      userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([numericLng, numericLat]).addTo(map);

      const circle = createCircle([numericLng, numericLat], numericRadius, 64);
      const existingSource = map.getSource?.(USER_RADIUS_SOURCE_ID);
      if (existingSource) {
        existingSource.setData(circle);
      } else {
        map.addSource?.(USER_RADIUS_SOURCE_ID, { type: "geojson", data: circle });
        map.addLayer?.({
          id: `${USER_RADIUS_SOURCE_ID}-fill`,
          type: "fill",
          source: USER_RADIUS_SOURCE_ID,
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 },
        });
        map.addLayer?.({
          id: `${USER_RADIUS_SOURCE_ID}-line`,
          type: "line",
          source: USER_RADIUS_SOURCE_ID,
          paint: { "line-color": "#2563eb", "line-width": 1.5 },
        });
      }
    }).catch(() => {
      // noop
    });
  }, [lat, lng, radiusKm]);

  if (!mapToken) {
    return (
      <div className="rounded border border-dashed p-4 text-sm text-gray-700">
        <p className="font-medium">Map token not configured.</p>
        <p className="mt-1">Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable map rendering. List view is still available.</p>
      </div>
    );
  }

  if (isMapboxUnavailable) {
    return (
      <div className="rounded border border-dashed p-4 text-sm text-gray-700">
        <p className="font-medium">Map view unavailable (mapbox not installed). Use List view.</p>
      </div>
    );
  }

  if (markers.length === 0) {
    return <p className="text-sm text-gray-600">No events or venues found in this area. Increase radius or try another area.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Event marker</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Venue marker</span>
        <span>Showing up to {MAX_MAP_MARKERS} results.</span>
      </div>
      {omittedCount > 0 ? <p className="text-xs text-amber-700">{omittedCount} additional markers omitted. Reduce radius/days to see more.</p> : null}
      <div ref={mapContainerRef} className="h-[420px] w-full rounded border" aria-label="Nearby map" />
      <div className="flex flex-wrap gap-2">
        <button className="rounded border px-3 py-1 text-sm" type="button" onClick={fitToResults}>Center on results</button>
        <button
          className="rounded border px-3 py-1 text-sm"
          type="button"
          onClick={async () => {
            const map = mapRef.current as { getCenter?: () => { lat: number; lng: number } } | null;
            if (!map?.getCenter) return;
            const center = map.getCenter();
            setIsSearchingArea(true);
            try {
              await onSearchArea({ lat: center.lat, lng: center.lng });
            } finally {
              setIsSearchingArea(false);
            }
          }}
          disabled={isSearchingArea}
        >
          {isSearchingArea ? "Searching area..." : "Search this area"}
        </button>
      </div>
      {selected ? (
        <>
          <div className="hidden md:block"><EventPreviewCard event={selected} /></div>
          <div className="fixed inset-x-0 bottom-16 z-20 border-t bg-card p-3 shadow-lg md:hidden"><EventPreviewCard event={selected} /></div>
        </>
      ) : <p className="text-xs text-gray-600">Select a marker to preview.</p>}
    </div>
  );
}

function createCircle(center: [number, number], radiusKm: number, points: number) {
  const [lng, lat] = center;
  const kmPerDegreeLat = 110.574;
  const kmPerDegreeLng = 111.32 * Math.cos((lat * Math.PI) / 180);
  const coordinates: number[][] = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const dLat = (radiusKm / kmPerDegreeLat) * Math.sin(angle);
    const dLng = (radiusKm / kmPerDegreeLng) * Math.cos(angle);
    coordinates.push([lng + dLng, lat + dLat]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}
