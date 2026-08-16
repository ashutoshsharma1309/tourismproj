"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";
import type { Map as LeafletMapInstance } from "leaflet";

import { cn } from "@/lib/cn";
import type { Coordinates } from "@/types";

export interface MapMarker {
  position: Coordinates;
  title: string;
  subtitle?: string;
  /** Optional link rendered as a "View details" button in the popup. */
  href?: string;
  /** Dot colour — defaults to temple-tank jade. */
  color?: string;
}

export interface LeafletMapProps {
  markers: MapMarker[];
  center?: Coordinates;
  zoom?: number;
  /** Optional route line (trip planner). */
  polyline?: Coordinates[];
  className?: string;
}

const SIKKIM_CENTER: Coordinates = { lat: 27.42, lng: 88.45 };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Reusable Leaflet map over OpenStreetMap tiles with palette-coloured dot
 * markers and optional route polyline. Import ONLY via next/dynamic with
 * `ssr: false` from a client component — Leaflet needs a real window.
 */
export default function LeafletMap({
  markers,
  center,
  zoom,
  polyline,
  className,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);

  useEffect(() => {
    function init() {
      const container = containerRef.current;
      if (!container || mapRef.current) return;

      const map = L.map(container, {
        center: center
          ? [center.lat, center.lng]
          : markers.length
            ? [markers[0]!.position.lat, markers[0]!.position.lng]
            : [SIKKIM_CENTER.lat, SIKKIM_CENTER.lng],
        zoom: zoom ?? 9,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const marker of markers) {
        const colour = marker.color ?? "#43614d";
        const icon = L.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${colour};border:3px solid #ffffff;box-shadow:0 1px 4px rgba(12,31,38,0.4)"></span>`,
        });
        const popup = [
          `<strong style="font-size:14px">${escapeHtml(marker.title)}</strong>`,
          marker.subtitle ? `<div style="color:#5d5647;margin-top:2px">${escapeHtml(marker.subtitle)}</div>` : "",
          marker.href
            ? `<a href="${escapeHtml(marker.href)}" style="display:inline-block;margin-top:8px;padding:6px 14px;border-radius:9999px;background:#43614d;color:#fff;text-decoration:none;font-weight:500">View details</a>`
            : "",
        ].join("");
        L.marker([marker.position.lat, marker.position.lng], { icon, title: marker.title })
          .addTo(map)
          .bindPopup(popup);
        bounds.extend([marker.position.lat, marker.position.lng]);
      }

      if (polyline && polyline.length > 1) {
        L.polyline(
          polyline.map((p) => [p.lat, p.lng]),
          { color: "#e39b2c", weight: 3, dashArray: "6 8" },
        ).addTo(map);
      }

      if (!center && markers.length > 1) {
        map.fitBounds(bounds.pad(0.2));
      }
    }

    init();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is initialised once per mount; callers remount via `key` to change data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("z-0 min-h-100 w-full rounded-xl border", className)}
      role="region"
      aria-label="Map"
    />
  );
}
