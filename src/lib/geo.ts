import type { Coordinates } from "@/types";

/**
 * Great-circle distance in kilometres.
 *
 * Used for "what is near this?" on the explore map. Straight-line distance is
 * the honest thing to show in Sikkim: road distance between two points can be
 * three times the crow-flies figure, and this project has no routing licence,
 * so the UI says "straight line" rather than implying a driving time.
 */
const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
