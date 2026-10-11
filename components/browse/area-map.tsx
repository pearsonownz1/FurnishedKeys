"use client";

import { approximateCircle } from "@/lib/geo";
import {
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export type MapPoint = {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  priceLabel: string;
};

type AreaMapProps = {
  points: MapPoint[];
  activeId: string | null;
  onActive?: (id: string) => void;
  center: { lat: number; lng: number } | null;
  showPrices?: boolean;
  navigate?: boolean;
  showNote?: boolean;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

setWorkerUrl("/maplibre-worker");

function markerClass(active: boolean): string {
  return active
    ? "cursor-pointer rounded-[2px] border border-pine bg-pine px-2 py-1 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(27,30,28,0.06)]"
    : "cursor-pointer rounded-[2px] border border-ink bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-[0_1px_2px_rgba(27,30,28,0.06)]";
}

function paintActive(map: MapLibreMap, activeId: string | null) {
  if (!map.getLayer("areas-fill")) return;
  map.setPaintProperty("areas-fill", "fill-opacity", [
    "case",
    ["==", ["get", "id"], activeId ?? ""],
    0.28,
    0.12,
  ]);
}

export function AreaMap({
  points,
  activeId,
  onActive,
  center,
  showPrices = true,
  navigate = true,
  showNote = true,
}: AreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pointsRef = useRef(points);
  const activeRef = useRef(activeId);
  const onActiveRef = useRef(onActive);
  const router = useRouter();

  useEffect(() => {
    pointsRef.current = points;
    activeRef.current = activeId;
    onActiveRef.current = onActive;
  });

  const pointKey = points
    .map((point) => `${point.id}:${point.lat}:${point.lng}:${point.priceLabel}`)
    .join("|");

  useEffect(() => {
    const node = containerRef.current;
    if (!node || mapRef.current) return;
    const map = new MapLibreMap({
      container: node,
      style: STYLE_URL,
      center: [center?.lng ?? 0, center?.lat ?? 0],
      zoom: 9,
      maxZoom: 12,
      attributionControl: { compact: false },
    });
    mapRef.current = map;
    const resize = () => map.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const apply = () => {
      if (cancelled) return;
      const current = pointsRef.current;
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: current.map((point) => ({
          type: "Feature",
          properties: { id: point.id },
          geometry: {
            type: "Polygon",
            coordinates: [approximateCircle(point.lng, point.lat)],
          },
        })),
      };

      const existing = map.getSource("areas");
      if (existing instanceof GeoJSONSource) {
        existing.setData(data);
      } else if (!existing) {
        map.addSource("areas", { type: "geojson", data });
        map.addLayer({
          id: "areas-fill",
          type: "fill",
          source: "areas",
          paint: { "fill-color": "#2e4a3b", "fill-opacity": 0.12 },
        });
        map.addLayer({
          id: "areas-line",
          type: "line",
          source: "areas",
          paint: {
            "line-color": "#2e4a3b",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (showPrices) {
        for (const point of current) {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.id = point.id;
          button.textContent = point.priceLabel;
          button.className = markerClass(point.id === activeRef.current);
          button.addEventListener("mouseenter", () => onActiveRef.current?.(point.id));
          button.addEventListener("focus", () => onActiveRef.current?.(point.id));
          if (navigate) {
            button.addEventListener("click", () => {
              router.push(`/rentals/${point.slug}`);
            });
          }
          const marker = new Marker({ element: button, anchor: "center" })
            .setLngLat([point.lng, point.lat])
            .addTo(map);
          markersRef.current.push(marker);
        }
      }

      if (current.length > 0) {
        const bounds = new LngLatBounds();
        for (const point of current) {
          for (const coord of approximateCircle(point.lng, point.lat, 800, 12)) {
            bounds.extend(coord);
          }
        }
        map.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });
      } else if (center) {
        map.jumpTo({ center: [center.lng, center.lat], zoom: 9 });
      }
      paintActive(map, activeRef.current);
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);

    return () => {
      cancelled = true;
    };
  }, [pointKey, showPrices, navigate, router, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) paintActive(map, activeId);
    for (const marker of markersRef.current) {
      const element = marker.getElement();
      element.className = markerClass(element.dataset.id === activeId);
      element.style.zIndex = element.dataset.id === activeId ? "2" : "1";
    }
  }, [activeId]);

  return (
    <div className="relative h-full w-full bg-[#e8e6df]">
      <div ref={containerRef} className="h-full w-full" aria-label="Approximate areas" />
      {showNote ? (
        <p className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[240px] rounded-[2px] bg-surface px-2.5 py-2 text-xs text-muted shadow-[0_1px_2px_rgba(27,30,28,0.06)]">
          Approximate areas. Exact address is shared after the owner accepts.
        </p>
      ) : null}
    </div>
  );
}
