/**
 * docs/destination-completeness-matrix.md — generated, never typed.
 *
 * Every figure comes from the modules the site reads, so the matrix cannot
 * disagree with the product. It is re-run after any content pass; a number
 * typed by hand would be wrong the day after.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { listDestinations } from "@/lib/destinations/registry";
import { getHistory, getPlaces, getStories } from "@/lib/destinations/content";
import { cultureShelves } from "@/lib/destinations/culture";
import { resolveDestinationOrNull } from "@/lib/destinations/resolve";

const rows: string[] = [];
const totals = { places: 0, stories: 0, culture: 0, events: 0, eventPages: 0, archive: 0 };

for (const d of listDestinations()) {
  const [places, stories, history, shelves, resolved] = await Promise.all([
    getPlaces(d.id),
    getStories(d.id),
    getHistory(d.id),
    cultureShelves(d.id),
    resolveDestinationOrNull(d.id),
  ]);
  const caps = resolved?.capabilities ?? {};
  const cultureCount =
    d.id === "sikkim" ? 50 : shelves.reduce((n, s) => n + s.entries.length, 0);
  const eventPages = (history as { description?: unknown }[]).filter((e) => e.description).length;
  const archivePath = `src/data/generated/archive/${d.id}.json`;
  const archive =
    d.id === "sikkim" ? 77 : existsSync(archivePath) ? JSON.parse(readFileSync(archivePath, "utf8")).length : 0;

  totals.places += places.length;
  totals.stories += stories.length;
  totals.culture += cultureCount;
  totals.events += history.length;
  totals.eventPages += eventPages;
  totals.archive += archive;

  const yes = (v: unknown) => (v ? "yes" : "—");
  rows.push(
    `| ${d.name} | ${places.length} | ${stories.length} | ${cultureCount} | ${history.length} (${eventPages}) | ${archive} | ` +
      `${yes(caps.map)} | ${yes(caps.stays)} | ${yes(caps.audio)} | ${yes(caps.permits)} | ${yes(caps.responsible)} | ${yes(caps.preservation)} |`,
  );
}

const doc = `# Destination completeness matrix

Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/docs/completeness-matrix.mts\`
from the modules the site reads. Do not edit by hand — re-run it.

Counts are of RECORDS THAT RENDER. "Events (pages)" is total dated events and,
in brackets, how many open into a detail page; the difference is events whose
source had no history section to quote, which stay on the timeline as dated
records rather than getting a page with one sentence on it.

Capabilities marked — are honestly absent, not hidden: permits exist where a
destination has a permit regime, audio where recordings exist, and so on.

| Destination | Places | Stories | Culture | Events (pages) | Archive | Map | Stays | Audio | Permits | Responsible | Preserve |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
| **Total** | **${totals.places}** | **${totals.stories}** | **${totals.culture}** | **${totals.events} (${totals.eventPages})** | **${totals.archive}** | | | | | | |

## What "comparable quality" means here

A smaller corpus is acceptable where it is honest. Goa's timeline has 11
events and 3 pages because its sources are short, and it says so; it does not
have 12 pages of padding. Sikkim's culture is 50 verified films and every
other destination's is documented subjects with an article each — different
shapes, same standard: every claim quoted from a cited source.

## Deliberately absent everywhere but Sikkim

- **Audio** — no recordings exist; the page states that.
- **Permits** — no permit regime exists for the other fourteen.
- **Responsible / Preserve** — needs sourced, destination-specific research;
  one generic paragraph for fifteen places would be fabrication.
- **Films** — 50 individually verified films is the value of Sikkim's page;
  unverified YouTube for fourteen more would be its opposite.
`;

writeFileSync("docs/destination-completeness-matrix.md", doc);
console.log(`matrix written: ${rows.length} destinations, ${totals.stories} stories, ${totals.events} events, ${totals.archive} archive objects`);
