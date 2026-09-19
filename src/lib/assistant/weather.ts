import "server-only";

import { metric } from "./metrics";
import type { LatLng } from "./types";

/**
 * Current conditions behind one function. The adapter is Open-Meteo's
 * forecast API, enabled only when `WEATHER_PROVIDER=open-meteo`; otherwise
 * weather is NOT CONFIGURED and the Guide says it cannot verify the weather.
 * It never describes conditions it did not fetch.
 */

export interface WeatherResult {
  temperatureC: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  provider: string;
  fetchedAt: string;
}

export type WeatherOutcome = { ok: true; weather: WeatherResult } | { ok: false; reason: "not-configured" | "unavailable" };

const cache = new Map<string, { at: number; weather: WeatherResult }>();
const CACHE_MS = 15 * 60 * 1000;

export function weatherConfigured(): boolean {
  return process.env.WEATHER_PROVIDER === "open-meteo";
}

/** WMO weather codes, in words. Only codes Open-Meteo documents. */
export function describeWeatherCode(code: number | null): string {
  if (code === null) return "conditions not reported";
  if (code === 0) return "clear sky";
  if (code <= 3) return "partly cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code >= 95) return "thunderstorm";
  return "conditions not described";
}

export async function getWeather(at: LatLng): Promise<WeatherOutcome> {
  if (!weatherConfigured()) return { ok: false, reason: "not-configured" };
  const lat = Math.round(at.lat * 100) / 100;
  const lng = Math.round(at.lng * 100) / 100;
  const key = `${lat},${lng}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    metric({ event: "tool", tool: "weather", provider: "open-meteo", cache: "hit", ok: true });
    return { ok: true, weather: hit.weather };
  }
  const started = performance.now();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_hours=6&timezone=Asia%2FKolkata`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
      hourly?: { precipitation_probability?: (number | null)[] };
    };
    const probabilities = (body.hourly?.precipitation_probability ?? []).filter((p): p is number => typeof p === "number");
    const weather: WeatherResult = {
      temperatureC: typeof body.current?.temperature_2m === "number" ? body.current.temperature_2m : null,
      weatherCode: typeof body.current?.weather_code === "number" ? body.current.weather_code : null,
      precipitationProbability: probabilities.length ? Math.max(...probabilities) : null,
      provider: "Open-Meteo",
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, { at: Date.now(), weather });
    metric({ event: "tool", tool: "weather", provider: "open-meteo", cache: "miss", ok: true, ms: Math.round(performance.now() - started) });
    return { ok: true, weather };
  } catch {
    metric({ event: "tool", tool: "weather", provider: "open-meteo", ok: false, ms: Math.round(performance.now() - started) });
    return { ok: false, reason: "unavailable" };
  }
}
