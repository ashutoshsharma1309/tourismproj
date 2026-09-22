import "server-only";

import { metric } from "./metrics";
import type { LatLng } from "./types";

/**
 * Road routing behind one function, so no page knows which service answers.
 *
 * The adapter is OSRM's HTTP API, pointed at whatever server
 * `ROUTING_OSRM_URL` names — a self-hosted OSRM on OpenStreetMap data in
 * production. Without that variable routing is NOT CONFIGURED and every caller
 * shows straight-line distance, labelled as such. Nothing here estimates a
 * road distance or a travel time: either a router returned one or there is
 * none.
 *
 * Coordinates sent to the router are rounded to about 100 m. A route from the
 * traveller's position therefore never discloses more precision than the
 * question needs.
 */

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: LatLng[];
  provider: string;
  fetchedAt: string;
}

export type RouteOutcome = { ok: true; route: RouteResult } | { ok: false; reason: "not-configured" | "no-route" | "unavailable" };

const TIMEOUT_MS = 6_000;
const cache = new Map<string, { at: number; outcome: RouteOutcome }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

const round = (n: number) => Math.round(n * 1000) / 1000;

export function routingConfigured(): boolean {
  return Boolean(process.env.ROUTING_OSRM_URL);
}

export async function getRoute(input: { origin: LatLng; destination: LatLng; mode?: "driving" }): Promise<RouteOutcome> {
  const base = process.env.ROUTING_OSRM_URL?.replace(/\/+$/, "");
  if (!base) return { ok: false, reason: "not-configured" };
  const o = { lat: round(input.origin.lat), lng: round(input.origin.lng) };
  const d = { lat: round(input.destination.lat), lng: round(input.destination.lng) };
  const key = `${o.lat},${o.lng};${d.lat},${d.lng}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    metric({ event: "tool", tool: "route", provider: "osrm", cache: "hit", ok: hit.outcome.ok });
    return hit.outcome;
  }

  const started = performance.now();
  const url = `${base}/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=simplified&geometries=geojson&alternatives=false&steps=false`;
  let outcome: RouteOutcome;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "TerraStory-Guide/1.0 (tourism archive)" },
    });
    if (!response.ok) {
      outcome = { ok: false, reason: "unavailable" };
    } else {
      const body = (await response.json()) as {
        code?: string;
        routes?: { distance: number; duration: number; geometry?: { coordinates?: [number, number][] } }[];
      };
      const route = body.code === "Ok" ? body.routes?.[0] : undefined;
      outcome = route
        ? {
            ok: true,
            route: {
              distanceKm: Math.round(route.distance / 100) / 10,
              durationMinutes: Math.round(route.duration / 60),
              geometry: (route.geometry?.coordinates ?? []).slice(0, 2000).map(([lng, lat]) => ({ lat, lng })),
              provider: "OSRM (OpenStreetMap)",
              fetchedAt: new Date().toISOString(),
            },
          }
        : { ok: false, reason: "no-route" };
    }
  } catch {
    outcome = { ok: false, reason: "unavailable" };
  }
  metric({ event: "tool", tool: "route", provider: "osrm", cache: "miss", ok: outcome.ok, ms: Math.round(performance.now() - started) });
  if (outcome.ok || outcome.reason === "no-route") cache.set(key, { at: Date.now(), outcome });
  return outcome;
}

export interface Leg {
  distanceKm: number;
  durationMinutes: number;
}

/**
 * One request for a whole day's stops: the router returns each leg of the
 * route through every waypoint in order. A plan of six stops is one call,
 * not six.
 */
export async function getLegs(points: LatLng[]): Promise<{ ok: true; legs: Leg[]; provider: string } | { ok: false; reason: "not-configured" | "no-route" | "unavailable" }> {
  const base = process.env.ROUTING_OSRM_URL?.replace(/\/+$/, "");
  if (!base) return { ok: false, reason: "not-configured" };
  if (points.length < 2) return { ok: true, legs: [], provider: "OSRM (OpenStreetMap)" };
  const path = points.map((p) => `${round(p.lng)},${round(p.lat)}`).join(";");
  const started = performance.now();
  try {
    const response = await fetch(`${base}/route/v1/driving/${path}?overview=false&steps=false`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "TerraStory-Guide/1.0 (tourism archive)" },
    });
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const body = (await response.json()) as { code?: string; routes?: { legs?: { distance: number; duration: number }[] }[] };
    const legs = body.code === "Ok" ? body.routes?.[0]?.legs : undefined;
    metric({ event: "tool", tool: "route-legs", provider: "osrm", ok: Boolean(legs), ms: Math.round(performance.now() - started) });
    if (!legs || legs.length !== points.length - 1) return { ok: false, reason: "no-route" };
    return {
      ok: true,
      provider: "OSRM (OpenStreetMap)",
      legs: legs.map((l) => ({ distanceKm: Math.round(l.distance / 100) / 10, durationMinutes: Math.round(l.duration / 60) })),
    };
  } catch {
    metric({ event: "tool", tool: "route-legs", provider: "osrm", ok: false, ms: Math.round(performance.now() - started) });
    return { ok: false, reason: "unavailable" };
  }
}
