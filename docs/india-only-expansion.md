# India-only expansion — 15 destinations → 18 Indian destinations

SIH 2026 final, Prompt 1. Delivered 2026-09-12/13 on branch `v2-saas`.

TerraStory held 10 Indian and 5 international destinations. The final
version is an India-first platform: the five international destinations are
gone from the active product and eight Indian cities were added, all at
`depth: "capsule"`, through the same retrieval pipeline the existing capsules
came from. Nothing about a destination was written by hand.

## 1. Final registry

| # | Destination | State / UT | Since |
|---|---|---|---|
| 1 | Sikkim | Sikkim | v1 (deep archive) |
| 2 | Jaipur | Rajasthan | Phase B |
| 3 | Delhi | Delhi | Phase 18 |
| 4 | Varanasi | Uttar Pradesh | Phase 18 |
| 5 | Agra | Uttar Pradesh | Phase 18 |
| 6 | Mumbai | Maharashtra | Phase 18 |
| 7 | Kolkata | West Bengal | Phase 18 |
| 8 | Hyderabad | Telangana | Phase 18 |
| 9 | Kochi | Kerala | Phase 18 |
| 10 | Goa | Goa | Phase 18 |
| 11 | **Amritsar** | Punjab | this phase |
| 12 | **Ahmedabad** | Gujarat | this phase |
| 13 | **Lucknow** | Uttar Pradesh | this phase |
| 14 | **Pune** | Maharashtra | this phase |
| 15 | **Mysuru** | Karnataka | this phase |
| 16 | **Madurai** | Tamil Nadu | this phase |
| 17 | **Bhubaneswar** | Odisha | this phase |
| 18 | **Srinagar** | Jammu and Kashmir | this phase |

Indian destinations: **18**. International: **0**. Removed: Kyoto, Paris,
Rome, Istanbul, New York City. `listDestinations()` in
`src/lib/destinations/registry.ts` is the single source of truth; every
surface (home, /destinations, /discover, search, journey, compare, maps,
guide, sitemap, metadata) derives from it. No count is typed anywhere.

## 2. What the eight new cities hold

Retrieved and generated on 2026-09-12 by `scripts/capsules/` (plan → retrieve
→ generate), then enriched by the culture, stays, history, stories, archive
and media passes. Every figure is counted from the generated files.

| Destination | Places | Experiences | Dated events | Stories | Culture (food · festival · craft) | Stays (Wikipedia + NIDHI+ register) | Archive objects | Photographs |
|---|---|---|---|---|---|---|---|---|
| Amritsar | 12 | 6 | 12 | 16 | 20 | 0 + 6 | 7 | 28 |
| Ahmedabad | 17 | 9 | 12 | 11 | 19 | 0 + 12 | 9 | 30 |
| Lucknow | 15 | 5 | 12 | 15 | 16 | 0 + 12 | 18 | 25 |
| Pune | 14 | 7 | 12 | 15 | 16 | 0 + 12 | 13 | 26 |
| Mysuru | 17 | 9 | 12 | 16 | 18 | 3 + 5 | 20 | 37 |
| Madurai | 13 | 5 | 9 | 13 | 13 | 0 + 6 | 11 | 21 |
| Bhubaneswar | 12 | 6 | 12 | 11 | 13 | 1 + 2 | 13 | 21 |
| Srinagar | 17 | 7 | 7 | 16 | 18 | 1 + 7 | 19 | 32 |

Archive-wide after the phase: 17 capsules · 243 places · 195 dated events ·
222 capsule stories · 110 experiences · 254 culture records · 260 archive
objects · 476 capsule photographs · 774 credited images. Sikkim is unchanged.

Each city has a distinct identity derived from its own records rather than
written: the hero identity line and the destination keywords come from
`src/lib/destinations/identity.ts` and `keywords.ts` (interest lift across
the archive), so Amritsar reads as Sikh heritage and Partition memory,
Bhubaneswar as temple architecture and Kalinga heritage, Srinagar as gardens,
lakes and crafts — because that is what their catalogued records carry.

## 3. Sources

- **Places, history, stories, culture**: Wikipedia REST summaries and full
  article text (verbatim spans only), Wikidata for corroborated dates and
  coordinates, Wikimedia Commons for photographs with licence and author.
  Every record cites the URL it was read from and the retrieval date. A title
  that 404s is dropped and reported, never invented.
- **Stays**: Wikidata/Wikipedia discovery found almost nothing for these
  cities (Mysuru 3, Bhubaneswar 1, Srinagar 1, others 0). The Ministry of
  Tourism's **NIDHI+** register (`scripts/capsules/ingest-nidhi.mjs`) supplied
  registered accommodation with the unit's own name, category, address,
  e-mail and telephone: Amritsar 6, Ahmedabad 36, Lucknow 37, Pune 17,
  Mysuru 5, Madurai 6, Bhubaneswar 2, Srinagar 8 in-city entries, published up
  to the 12-per-destination ceiling. Odisha's state code on the register is
  `OD`. Bhubaneswar (2) and Mysuru (5) are genuinely thin; the shortfall is
  published, not filled.
- **Archive**: Wikimedia Commons categories discovered per city; an object is
  admitted only with a stated licence, author and description or date.

Capsules are **not human-reviewed**; every generated file says so.

## 4. Isolation defects caught before publication

1. **Madurai's museum resolved to Delhi's.** "Gandhi Memorial Museum" on
   Wikipedia is the National Gandhi Museum in New Delhi. A distance check of
   every retrieved coordinate against the destination centre found it 2,131 km
   away. Re-planned as "Gandhi Memorial Museum, Madurai".
2. **Two mis-plotted coordinates.** "Vaigai River" carried its source
   coordinate 116 km from Madurai; "Vaital Deula" carried a coordinate 62 km
   from the old town it stands in. Both removed from the plan rather than
   published with a coordinate known to be wrong.
3. **13 titles did not exist under the planned name** (e.g. Pul Kanjari →
   "Pul Kanjri", Rail Museum Mysore → "Railway Museum, Mysore",
   Thiruparankundram → "Subramaniya Swamy Temple, Thiruparankundram").
   Resolved through the search API; five had no article and were dropped.
4. A hidden guard in `scripts/capsules/discover-stays.mjs` refused to run
   unless exactly 15 destinations parsed. Now 18, and asserted.

## 5. Removal of the international destinations

Deleted from production data: capsule files, `.data` retrieval records,
generated stories/history/archive JSON and their importer entries,
`public/images/capsule/<id>` and `public/images/archive/<id>` (56 paths),
image credits (690 → 445 before the new cities landed), focal entries,
`stays-final`/`culture-titles`/manifest entries, the Kyoto entries in
`src/data/sources.ts`, the research scripts' Kyoto source registry and
allowlist, the Kyoto record in `published-knowledge.json`, and the Kyoto-only
`Category:Ryokan` in stay discovery. Code: the navigation, hero, metadata,
guide chips, journey cap (`MAX_JOURNEY_DESTINATIONS` was pinned at 15),
28 QA suites, and every string that said "fifteen" or "six countries".
Historical bug-explanation comments naming Paris or Kyoto were kept where
they explain why code is shaped a certain way.

## 6. New verification

- `pnpm qa:india` (`scripts/qa/india-only.mts`): exactly 18 registered ids,
  all `IN`, unique, inside India's bounding box; no international residue in
  data, images, credits or code; every capsule image under its own
  destination's folder and on disk; every source id resolves in its own
  capsule; no place/story/history name shared across capsules (culture and
  chain-hotel stays are reported, not failed — Diwali is celebrated in more
  than one city); adversarial search terms (monastery, temple, fort, palace,
  museum, lake, market, food, festival…) return only own-destination hrefs;
  sitemap contains only Indian destination routes. 125 checks.
- `pnpm qa:guide`: 450 checks — every destination answered from its own
  records in the guide, with landmark contamination pairs.
- `scripts/qa/global-capsules.mjs` re-targeted to the eight new capsules.
- Retrievers gained `--only=` so new cities can be fetched without re-dating
  the records the other destinations already publish.

## 7. Legitimate gaps

- 24 of the new places have no freely licensed photograph on Commons; their
  cards say so.
- Bhubaneswar has 2 register stays and Mysuru 5; no source publishes more.
- Kedar Gouri Temple, Chausathi Jogini Temple (Hirapur), Ekamra Haat,
  Hall Bazaar, Satkhanda, Empress Garden, Puthu Mandapam and Maharaja Ranjit
  Singh Museum have no Wikipedia article and are absent.
- UNESCO remains uncitable from this environment (Cloudflare 403).
- The capsules await human review, as every capsule has since Phase 18.

## 8. Final battery (production build, 2026-09-13)

`pnpm build` → `next start` → `node scripts/qa/final.mjs` with
`QA_BASE_URL` set. Image cache warmed first (1.2 GB served, 0 stalled).

| | |
|---|---|
| Suites | 41 run, 41 passed |
| Checks | 25,089 passed, 0 failed |
| Timed out | 0 (responsive was 39 min, now 68 s) |
| Build | 1,542 prerendered pages, 18 destination hubs, exit 0 |
| Sitemap | 990 URLs, no removed destination |

Suites with the largest counts: stories 9,532 · archive 5,753 · history 3,193
· culture-module 2,357 · media-provenance 942 · global-capsules 440 · guide
battery 450 (`qa:guide`, run separately) · India isolation 129 (`qa:india`).

Two defects the battery found and this phase fixed on the way: a
`loading.tsx` on searchParams routes made the server answer 200 before
`notFound()` ran (an unknown destination's planner no longer failed safely),
and the generator keyed image credits by record id, so a stay and a place
sharing an id (Mysuru's Lalitha Mahal) overwrote each other's licence row.
Both are documented in the code where they were fixed.
