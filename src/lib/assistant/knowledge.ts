import "server-only";

import {
  getCapsule,
  getHistory,
  getPlaces,
  getSites,
  getSources,
  getStays,
  getStories,
} from "@/lib/destinations/content";
import { STAY_SOURCES } from "@/data/hotels";
import { getDestination, listDestinations } from "@/lib/destinations/registry";
import { distanceKm } from "@/lib/geo";

import type { LatLng } from "./types";
import { fold, nameMatch, nameScore, tokens } from "./text";

/**
 * The Guide's knowledge: TerraStory's own published records, flattened into
 * one shape, each carrying the source it cites.
 *
 * This is the ONLY material an answer may be built from. The language model,
 * when one is used, receives a handful of these records for the question in
 * hand — never the database, never a query language — and every citation it
 * returns must be one of their ids.
 *
 * Coordinates are carried only where the record publishes one. A record
 * without them is never placed on a map and never given a distance.
 */

export type RecordKind = "monastery" | "place" | "history" | "story" | "food" | "festival" | "craft" | "experience" | "stay";

export interface KnowledgeRecord {
  /** `${destinationId}/${kind}:${slug}` — stable and unique across the archive. */
  id: string;
  destinationId: string;
  destinationName: string;
  kind: RecordKind;
  name: string;
  category: string | null;
  /** The record's own words: what an answer may say about it. */
  text: string;
  /** Short form for cards. */
  summary: string;
  coords: LatLng | null;
  href: string;
  source: { name: string | null; url: string | null };
  themes: string[];
  /** Monasteries: stated facts that answers commonly need. */
  facts?: { tradition?: string; established?: number | string; district?: string; hours?: { summary: string; caveat: string | null; status: string } };
}

type Cache = { built: number; records: KnowledgeRecord[] };
let cache: Cache | null = null;
const TTL_MS = 10 * 60 * 1000;

/* Record prose is a string, or an array of paragraphs in the deep format. */
const clip = (text: unknown, max: number) => {
  const raw = Array.isArray(text) ? text.filter((t) => typeof t === "string").join(" ") : typeof text === "string" ? text : "";
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  return stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
};

type SourceLike = { name?: string; title?: string; publisher?: string; url?: string };
const firstSource = (sources: unknown): { name: string | null; url: string | null } => {
  const list = Array.isArray(sources) ? (sources as SourceLike[]) : [];
  const s = list.find((x) => x && typeof x.url === "string");
  return s ? { name: s.name ?? s.title ?? s.publisher ?? null, url: s.url ?? null } : { name: null, url: null };
};

async function sikkimRecords(): Promise<KnowledgeRecord[]> {
  const destinationName = getDestination("sikkim")?.name ?? "Sikkim";
  const [sites, places, history, stories, sources, stays] = await Promise.all([
    getSites("sikkim"),
    getPlaces("sikkim"),
    getHistory("sikkim"),
    getStories("sikkim"),
    getSources("sikkim"),
    getStays("sikkim"),
  ]);
  const sourceName = new Map((sources as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  const base = { destinationId: "sikkim", destinationName };
  const out: KnowledgeRecord[] = [];

  for (const m of sites as unknown as {
    slug: string; name: string; district: string; tradition: string; establishedYear: number | string; description: string;
    significance?: string; history?: string[]; architecture?: string; coordinates?: LatLng;
    provenance?: { sourceId?: string; sourceUrl?: string };
    visitingHours?: { status: string; summary: string; provenance?: { caveat?: string } };
  }[]) {
    out.push({
      ...base,
      id: `sikkim/monastery:${m.slug}`,
      kind: "monastery",
      name: m.name,
      category: "Monastery",
      text: clip([m.description, m.significance, ...(m.history ?? []), m.architecture].filter(Boolean).join(" "), 1400),
      summary: clip(m.description, 240),
      coords: m.coordinates ?? null,
      href: `/destinations/sikkim/monasteries/${m.slug}`,
      source: { name: m.provenance?.sourceId ? (sourceName.get(m.provenance.sourceId) ?? m.provenance.sourceId) : null, url: m.provenance?.sourceUrl ?? null },
      themes: ["monasteries", "spirituality", "heritage"],
      facts: {
        tradition: m.tradition,
        established: m.establishedYear,
        district: m.district,
        hours: m.visitingHours
          ? { summary: m.visitingHours.summary, status: m.visitingHours.status, caveat: m.visitingHours.provenance?.caveat ?? null }
          : undefined,
      },
    });
  }

  for (const p of places as unknown as {
    slug: string; name: string; category: string; district: string; description: string; coordinates?: LatLng;
    wikipediaUrl?: string; provenance?: { sourceId?: string; sourceUrl?: string };
  }[]) {
    out.push({
      ...base,
      id: `sikkim/place:${p.slug}`,
      kind: "place",
      name: p.name,
      category: p.category,
      text: clip(`${p.description} (${p.category}, ${p.district} district.)`, 900),
      summary: clip(p.description, 240),
      coords: p.coordinates ?? null,
      href: `/destinations/sikkim/places/${p.slug}`,
      source: {
        name: p.provenance?.sourceId ? (sourceName.get(p.provenance.sourceId) ?? p.provenance.sourceId) : p.wikipediaUrl ? "Wikipedia" : null,
        url: p.provenance?.sourceUrl ?? p.wikipediaUrl ?? null,
      },
      themes: [],
    });
  }

  for (const h of history as unknown as { slug: string; title: string; yearLabel?: string; shortDescription?: string; description?: string | string[]; sources?: unknown }[]) {
    out.push({
      ...base,
      id: `sikkim/history:${h.slug}`,
      kind: "history",
      name: `${h.yearLabel ? `${h.yearLabel}: ` : ""}${h.title}`,
      category: "History",
      text: clip(h.description ?? h.shortDescription, 900),
      summary: clip(h.shortDescription ?? h.description, 240),
      coords: null,
      href: `/destinations/sikkim/history/${h.slug}`,
      source: firstSource(h.sources),
      themes: ["history"],
    });
  }

  for (const s of stories as unknown as { slug: string; title: string; category?: string; summary?: string; sources?: unknown }[]) {
    const food = /food|cuisine|dish/i.test(s.category ?? "");
    out.push({
      ...base,
      id: `sikkim/story:${s.slug}`,
      kind: food ? "food" : "story",
      name: s.title,
      category: s.category ?? null,
      text: clip(s.summary, 900),
      summary: clip(s.summary, 240),
      coords: null,
      href: `/destinations/sikkim/stories/${s.slug}`,
      source: firstSource(s.sources),
      themes: [],
    });
  }
  /* Documented stays: the department's star-category register. Name,
     category and district only — never a rate, a rating or availability, and
     no telephone recited in an answer (the stay's page shows what the
     register publishes, with its date). */
  for (const stay of stays as unknown as { slug: string; name: string; starCategory: string; district: string; latitude: number | null; longitude: number | null }[]) {
    out.push({
      ...base,
      id: `sikkim/stay:${stay.slug}`,
      kind: "stay",
      name: stay.name,
      category: `${stay.starCategory} (register)`,
      text: clip(`${stay.name}: ${stay.starCategory} hotel in ${stay.district} district, listed in the Sikkim tourism department's hotel register as retrieved on ${STAY_SOURCES.register.retrievedAt}.`, 400),
      summary: `${stay.starCategory} hotel, ${stay.district} district (state register)`,
      coords: stay.latitude !== null && stay.longitude !== null ? { lat: stay.latitude, lng: stay.longitude } : null,
      href: `/destinations/sikkim/stays/${stay.slug}`,
      source: { name: STAY_SOURCES.register.name, url: STAY_SOURCES.register.url },
      themes: [],
    });
  }
  return out;
}

async function capsuleRecords(destinationId: string): Promise<KnowledgeRecord[]> {
  const capsule = await getCapsule(destinationId);
  if (!capsule) return [];
  const destinationName = getDestination(destinationId)?.name ?? destinationId;
  const base = { destinationId, destinationName };
  const sources = new Map(capsule.sources.map((s) => [s.id, s]));
  const sourceOf = (ids: string[] | undefined) => {
    const s = (ids ?? []).map((id) => sources.get(id)).find(Boolean);
    return s ? { name: s.publisher ? `${s.publisher} — ${s.title}` : s.title, url: s.url } : { name: null, url: null };
  };
  const [places, history, stories] = await Promise.all([getPlaces(destinationId), getHistory(destinationId), getStories(destinationId)]);
  const placeMeta = new Map((places as unknown as { slug: string; detailHref?: string; interests?: string[] }[]).map((p) => [p.slug, p]));
  const out: KnowledgeRecord[] = [];

  for (const p of capsule.places) {
    const meta = placeMeta.get(p.id);
    out.push({
      ...base,
      id: `${destinationId}/place:${p.id}`,
      kind: "place",
      name: p.name,
      category: p.category,
      text: clip(p.summary, 900),
      summary: clip(p.summary, 240),
      coords: p.coordinates ?? null,
      href: meta?.detailHref ?? `/destinations/${destinationId}/discover#place-${p.id}`,
      source: sourceOf(p.sourceIds),
      themes: meta?.interests ?? [],
    });
  }
  for (const h of history as unknown as { slug: string; title: string; yearLabel?: string; shortDescription?: string; detailHref?: string; sources?: unknown }[]) {
    out.push({
      ...base,
      id: `${destinationId}/history:${h.slug}`,
      kind: "history",
      name: `${h.yearLabel ? `${h.yearLabel}: ` : ""}${h.title}`,
      category: "History",
      text: clip(h.shortDescription, 900),
      summary: clip(h.shortDescription, 240),
      coords: null,
      href: h.detailHref ?? `/destinations/${destinationId}/history`,
      source: firstSource(h.sources),
      themes: ["history"],
    });
  }
  for (const s of stories as unknown as { slug: string; title: string; category?: string; summary?: string; detailHref?: string; sources?: unknown }[]) {
    out.push({
      ...base,
      id: `${destinationId}/story:${s.slug}`,
      kind: "story",
      name: s.title,
      category: s.category ?? null,
      text: clip(s.summary, 900),
      summary: clip(s.summary, 240),
      coords: null,
      href: s.detailHref ?? `/destinations/${destinationId}/stories/${s.slug}`,
      source: firstSource(s.sources),
      themes: [],
    });
  }
  for (const c of capsule.culture) {
    out.push({
      ...base,
      id: `${destinationId}/${c.kind}:${c.id}`,
      kind: c.kind,
      name: c.name,
      category: c.kind,
      text: clip(c.summary, 900),
      summary: clip(c.summary, 240),
      coords: null,
      href: `/destinations/${destinationId}/culture#${c.kind}`,
      source: sourceOf(c.sourceIds),
      themes: [],
    });
  }
  for (const s of capsule.stays) {
    out.push({
      ...base,
      id: `${destinationId}/stay:${s.id}`,
      kind: "stay",
      name: s.name,
      category: s.category ?? "Stay",
      text: clip(s.summary, 700),
      summary: clip(s.summary, 240),
      coords: s.coordinates ?? null,
      href: `/destinations/${destinationId}/stays/${s.id}`,
      source: sourceOf(s.sourceIds),
      themes: [],
    });
  }
  for (const e of capsule.experiences) {
    out.push({
      ...base,
      id: `${destinationId}/experience:${e.id}`,
      kind: "experience",
      name: e.title,
      category: "Experience",
      text: clip(e.explanation, 700),
      summary: clip(e.explanation, 240),
      coords: null,
      href: `/destinations/${destinationId}/discover#experience-intelligence`,
      source: { name: null, url: null },
      themes: [...e.themes],
    });
  }
  return out;
}

/** Every record, built once and kept for ten minutes. */
export async function allRecords(): Promise<KnowledgeRecord[]> {
  if (cache && Date.now() - cache.built < TTL_MS) return cache.records;
  const destinations = listDestinations();
  const lists = await Promise.all(destinations.map((d) => (d.id === "sikkim" ? sikkimRecords() : capsuleRecords(d.id))));
  /* A record that cites nothing is not something to state to a traveller. */
  const records = lists.flat().filter((r) => r.text.length > 0 && (r.source.url !== null || r.kind === "experience"));
  cache = { built: Date.now(), records };
  return records;
}

export async function recordsFor(destinationId: string | null): Promise<KnowledgeRecord[]> {
  const all = await allRecords();
  return destinationId ? all.filter((r) => r.destinationId === destinationId) : all;
}

export async function recordById(id: string): Promise<KnowledgeRecord | null> {
  return (await allRecords()).find((r) => r.id === id) ?? null;
}

const PLACE_KINDS: RecordKind[] = ["monastery", "place", "stay"];

/**
 * The places a question names, in the order it names them. Speech-to-text
 * spellings are tolerated ("Pemiang Tsieng" → Pemayangtse) by trigram
 * similarity; a score under 0.55 is not a match. Each place claims the span
 * of the question it matched, and a later candidate cannot claim an
 * overlapping span — so "Hawa Mahal … Amber Fort" yields those two, not a
 * third place that shares a word with one of them.
 */
export async function resolvePlaces(question: string, destinationId: string | null, limit = 3): Promise<KnowledgeRecord[]> {
  const pool = (await recordsFor(destinationId)).filter((r) => PLACE_KINDS.includes(r.kind));
  const scored = pool
    .map((r) => ({ r, m: nameMatch(question, r.name) }))
    .filter((x) => x.m.score >= 0.55)
    /* Monasteries and places before stays that happen to share a name. */
    .sort((a, b) => b.m.score - a.m.score || kindRank(a.r.kind) - kindRank(b.r.kind));
  const claimed: [number, number][] = [];
  const seen = new Set<string>();
  const chosen: { r: KnowledgeRecord; start: number }[] = [];
  for (const { r, m } of scored) {
    if (claimed.some(([s, e]) => m.start < e && s < m.end)) continue;
    const key = fold(r.name);
    if (seen.has(key)) continue;
    seen.add(key);
    claimed.push([m.start, m.end]);
    chosen.push({ r, start: m.start });
    if (chosen.length >= limit) break;
  }
  return chosen.sort((a, b) => a.start - b.start).map((x) => x.r);
}

const kindRank = (kind: RecordKind) => (kind === "monastery" ? 0 : kind === "place" ? 1 : 2);

/** A place page's record, from its URL slug. */
export async function recordForPage(destinationId: string | null, slug: string | null): Promise<KnowledgeRecord | null> {
  if (!destinationId || !slug) return null;
  const records = await recordsFor(destinationId);
  return (
    records.find((r) => r.id === `${destinationId}/monastery:${slug}`) ??
    records.find((r) => r.id === `${destinationId}/place:${slug}`) ??
    null
  );
}

/**
 * Retrieval for a question: the destination's records ranked by how many of
 * the question's words they contain, names weighted over text. Only the top
 * few go to the model — the prompt is a handful of records, never the archive.
 */
export async function retrieve(question: string, destinationId: string | null, kinds: RecordKind[] | null, limit = 6): Promise<KnowledgeRecord[]> {
  const words = tokens(question);
  const pool = (await recordsFor(destinationId)).filter((r) => !kinds || kinds.includes(r.kind));
  if (words.length === 0) return pool.slice(0, limit);
  const scored = pool.map((r) => {
    const name = fold(r.name);
    const text = fold(`${r.text} ${r.category ?? ""} ${r.themes.join(" ")}`);
    let score = 0;
    for (const w of words) {
      const re = new RegExp(`\\b${w}`);
      if (re.test(name)) score += 3;
      else if (re.test(text)) score += 1;
    }
    score += nameScore(question, r.name) >= 0.6 ? 4 : 0;
    return { r, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}

/** Records with coordinates nearest a point. Geography, never keyword similarity. */
export async function nearest(
  origin: LatLng,
  options: { destinationId?: string | null; kinds?: RecordKind[]; limit?: number; maxKm?: number; excludeId?: string } = {},
): Promise<{ record: KnowledgeRecord; km: number }[]> {
  const kinds = options.kinds ?? ["monastery", "place"];
  const pool = (await recordsFor(options.destinationId ?? null)).filter(
    (r) => r.coords && kinds.includes(r.kind) && r.id !== options.excludeId,
  );
  return pool
    .map((record) => ({ record, km: distanceKm(origin, record.coords!) }))
    .filter((x) => x.km <= (options.maxKm ?? 60))
    .sort((a, b) => a.km - b.km)
    .slice(0, options.limit ?? 6);
}

/** The destination whose records lie nearest a point — "where am I?". */
export async function destinationNear(origin: LatLng): Promise<{ destinationId: string; km: number } | null> {
  const all = (await allRecords()).filter((r) => r.coords);
  let best: { destinationId: string; km: number } | null = null;
  for (const r of all) {
    const km = distanceKm(origin, r.coords!);
    if (!best || km < best.km) best = { destinationId: r.destinationId, km };
  }
  return best && best.km <= 80 ? best : null;
}
