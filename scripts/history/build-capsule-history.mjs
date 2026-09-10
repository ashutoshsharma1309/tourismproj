/**
 * Shape retrieved history into the HistoryEvent contract the engine renders.
 *
 * Nothing downstream changes, for the same reason the stories pass changed
 * nothing: `history/[slug]` generates params for any event carrying
 * `description`, and `resolveCapabilities` derives `historyPages` from the
 * same field. An event that arrives in that shape gets a detail page, a
 * timeline entry and a nav link without a route being touched.
 *
 * Three links are made here, all from ids that already exist:
 *   relatedPlaces  — the event's own placeIds.
 *   relatedStories — a story about the same subject, when one exists.
 *   era            — the historiographic band the year falls in. A band, not
 *                    a claim about the destination; see lib/destinations/eras.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = ".data/history";
const OUT_DIR = "src/data/generated/history";
const STORIES = "src/data/generated/stories";
/*
 * The COMPLETE event list. Enrichment adds prose to some of them; it must not
 * remove the rest. Building only from the enriched set cut Goa's timeline
 * from eleven events to three and Jaipur's from twelve to seven — deleting
 * true, dated, sourced records because their article had no History section.
 * An event without prose still belongs on the timeline; it just gets no page.
 */
const MANIFEST = JSON.parse(readFileSync(".data/history-manifest.json", "utf8"));

/* Mirrors src/lib/destinations/eras.ts. Kept in step by qa:history. */
const ERAS = [
  { id: "ancient", label: "Ancient", from: -Infinity, to: 500 },
  { id: "medieval", label: "Medieval", from: 500, to: 1500 },
  { id: "early-modern", label: "Early modern", from: 1500, to: 1800 },
  { id: "modern", label: "Modern", from: 1800, to: 1945 },
  { id: "contemporary", label: "Contemporary", from: 1945, to: Infinity },
];
const eraOf = (year) => ERAS.find((e) => year >= e.from && year < e.to) ?? ERAS[ERAS.length - 1];

/** A minus sign is storage, not a label a reader should ever see. */
const yearLabel = (year) => (year < 0 ? `${Math.abs(year)} BCE` : `AD ${year}`);

const readingMinutes = (words) => Math.max(2, Math.round(words / 200));

mkdirSync(OUT_DIR, { recursive: true });
const written = [];
let grand = 0;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const store = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  const id = store.destinationId;

  /*
   * Stories are about culture subjects; events are about places. They share
   * no subject, so matching on the name found nothing — correctly, and
   * uselessly. What they DO share is places: a story carries `relatedPlaces`,
   * an event carries `placeIds`, and both are ids from the same capsule. An
   * event at Notre-Dame links to a story that names Notre-Dame, or to
   * nothing.
   */
  let storiesByPlace = new Map();
  try {
    const stories = JSON.parse(readFileSync(join(STORIES, `${id}.json`), "utf8"));
    for (const story of stories) {
      for (const place of story.relatedPlaces ?? []) {
        if (!storiesByPlace.has(place)) storiesByPlace.set(place, []);
        storiesByPlace.get(place).push(story.slug);
      }
    }
  } catch { /* a destination may have no stories; that is not an error here */ }

  const enrichedById = new Map(store.events.map((event) => [event.id, event]));
  const events = (MANIFEST[id] ?? [])
    .map((base) => {
      const event = { ...base, ...(enrichedById.get(base.id) ?? {}) };
      const era = eraOf(event.year);
      /* Stories that name a place this event happened at. */
      const related = [
        ...new Set((event.placeIds ?? []).flatMap((place) => storiesByPlace.get(place) ?? [])),
      ].slice(0, 3);

      return {
        slug: event.id,
        destinationId: id,
        sortYear: event.year,
        /* The capsule's own `period` string is preferred: it is what the
           source said. `yearLabel` is the fallback and never adds precision. */
        yearLabel: event.period || yearLabel(event.year),
        title: event.title,
        era: era.label,
        eraId: era.id,
        shortDescription: event.summary,
        /* Absent where the source had no history section to quote — which is
           what keeps this event off the detail route rather than giving it a
           page with one sentence on it. */
        ...(event.description ? { description: event.description } : {}),
        /*
         * `hrefFor` builds /history/<slug> for any record without a
         * `detailHref`, so an event with no page got a link to a 404 — from
         * the hub, the homepage and the global chronology, all at once. A
         * page-less event links to its own entry on the timeline instead:
         * a real target, and the honest one.
         */
        ...(event.description
          ? {}
          : { detailHref: `/destinations/${id}/history#${event.id}` }),
        keyFacts: event.keyFacts ?? [],
        imageKey: null,
        relatedMonasteries: [],
        relatedPlaces: event.placeIds ?? [],
        relatedStories: related,
        sources: event.source
          ? [
              {
                name: event.source.name,
                url: event.source.url,
                type: event.source.type,
                covers: `The account on this page, quoted under ${event.source.licence}.`,
              },
            ]
          : [{ name: `Wikipedia — ${event.title}`, url: event.articleUrl, type: "encyclopedia", covers: "The summary on the timeline." }],
        verification: "verified",
        lastVerifiedAt: event.source?.retrievedAt ?? new Date().toISOString().slice(0, 10),
        readingMinutes: event.words ? readingMinutes(event.words) : null,
      };
    })
    .sort((a, b) => a.sortYear - b.sortYear);

  writeFileSync(join(OUT_DIR, `${id}.json`), `${JSON.stringify(events, null, 2)}\n`);
  written.push(id);
  grand += events.length;

  const bands = [...new Set(events.map((e) => e.era))];
  const withPage = events.filter((e) => e.description).length;
  console.log(
    `${id.padEnd(15)} ${String(events.length).padStart(3)} events  ${String(withPage).padStart(3)} with a page  ${bands.length} eras (${bands.join(", ")})`,
  );
}

const index =
  `/* GENERATED by scripts/history/build-capsule-history.mjs — do not edit. */\n` +
  `const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {\n` +
  written.map((id) => `  "${id}": () => import("./${id}.json"),`).join("\n") +
  `\n};\n\n` +
  `export function hasEditorialHistory(destinationId: string): boolean {\n` +
  `  return destinationId in LOADERS;\n}\n\n` +
  `export async function editorialHistory(destinationId: string): Promise<unknown[]> {\n` +
  `  const load = LOADERS[destinationId];\n` +
  `  if (!load) return [];\n` +
  `  return (await load()).default as unknown[];\n}\n`;
writeFileSync(join(OUT_DIR, "index.ts"), index);
console.log(`\n${grand} events -> ${OUT_DIR} (${written.length} destinations)`);
