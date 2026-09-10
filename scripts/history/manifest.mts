/**
 * The exact list of events to retrieve for, built from the modules the site
 * actually reads.
 *
 * The first pass regex-parsed the capsule TypeScript and silently skipped 21
 * of 165 events — records whose field order or escaping the pattern did not
 * anticipate. Parsing a language with a regular expression is the bug; this
 * imports the module and asks it, so the manifest cannot disagree with the
 * site.
 */
import { writeFileSync } from "node:fs";
import { listDestinations } from "@/lib/destinations/registry";
import { getHistory, getPlaces } from "@/lib/destinations/content";

/** "179 BC" -> -179, "AD 126" -> 126, "1163" -> 1163. */
function toYear(label: string): number | null {
  const bce = /^(\d+)\s*(?:BCE?|B\.C\.)/i.exec(label);
  if (bce) return -Number(bce[1]);
  const ad = /(?:AD\s*)?(\d{1,4})/.exec(label);
  return ad ? Number(ad[1]) : null;
}

const manifest: Record<string, unknown[]> = {};
for (const d of listDestinations()) {
  if (d.id === "sikkim") continue;
  const events = (await getHistory(d.id)) as {
    slug: string; title: string; yearLabel: string;
    shortDescription: string; relatedPlaces: string[];
  }[];
  const places = (await getPlaces(d.id)) as { slug: string; wikipediaUrl?: string }[];
  const urlOf = new Map(places.map((p) => [p.slug, p.wikipediaUrl]));

  manifest[d.id] = events.map((event) => ({
    id: event.slug,
    title: event.title,
    yearLabel: event.yearLabel,
    year: toYear(event.yearLabel),
    summary: event.shortDescription,
    placeIds: event.relatedPlaces,
    /* The subject's own article, via the place the event is about. */
    articleUrl: event.relatedPlaces.map((p) => urlOf.get(p)).find(Boolean) ?? null,
  }));
}

writeFileSync(".data/history-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
const total = Object.values(manifest).reduce((n, e) => n + e.length, 0);
const withUrl = Object.values(manifest).flat().filter((e) => (e as { articleUrl: string | null }).articleUrl).length;
const withYear = Object.values(manifest).flat().filter((e) => (e as { year: number | null }).year !== null).length;
console.log(`${total} events, ${withUrl} with an article, ${withYear} with a parsable year`);
