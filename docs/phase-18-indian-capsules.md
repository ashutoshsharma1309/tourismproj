# Phase 18 — Indian Tourism Capsule Expansion

Eight Indian destinations, at capsule depth, built on the Phase 17 framework.
This is the first phase in eighteen to add real tourism content — so the
question that governed every decision was not *what should we say about
Delhi?* but *what can we cite?*

---

## 1. Destinations added

| Destination | Scope | Places | History | Stories | Experiences | Photographs |
|---|---|---|---|---|---|---|
| Delhi | Mughal and colonial monuments of the capital | 6 | 5 | 3 | 4 | 5 |
| Agra | The Mughal capital and its imperial architecture | 5 | 5 | 2 | 3 | 5 |
| Varanasi | The riverfront city and its sacred geography | 5 | 5 | 3 | 4 | 5 |
| Mumbai | The colonial waterfront and the island city's monuments | 5 | 5 | 3 | 3 | 4 |
| Kolkata | The colonial capital and its institutions | 5 | 5 | 2 | 3 | 4 |
| Hyderabad | The Qutb Shahi and Nizami city | 5 | 5 | 2 | 4 | 4 |
| Kochi | The spice port and its layered colonial quarter | 5 | 5 | 2 | 5 | 5 |
| Goa | The churches and forts of Portuguese Goa | 6 | 4 | 2 | 4 | 4 |
| **Total** | | **42** | **39** | **19** | **30** | **36** |

All eight declare `depth: "capsule"`. **Sikkim is untouched** and remains the
only `deep` destination. Jaipur and Kyoto still declare `depth: "planned"` in
the registry and present as `Curated` and `Researched`, because the badge a
destination shows is earned from the research knowledge it holds rather than
read from that field. (Phase 19 note: the original wording here said they
"remain curated and researched", which read as a claim about the registry
field and is not what it says.)

## 2. How the content was produced

Three scripts, in order, none of which writes a sentence about a destination:

**`scripts/capsules/plan.mjs`** — the only file holding a human decision:
which destinations, which pages to read, what category each place is, and
which interest themes it carries. It asserts no fact about the world.

**`scripts/capsules/retrieve.mjs`** — fetches each place's Wikipedia REST
summary, its plain-text lead section, its published coordinates, its lead
photograph and that photograph's Commons licence; records the whole response
in `.data/capsules/<id>.json` (gitignored). Rate-limited at 1.1 s with
exponential backoff, identifying User-Agent, the whole Wikimedia contract this
repo has kept since Phase 1. **It drops what it cannot find**: two planned
places 404'd (`Marble Palace, Kolkata`, `Church of St. Francis of Assisi,
Goa`), were reported rather than invented, and were re-planned against the
titles the search API actually returned.

**`scripts/capsules/generate.mjs`** — emits
`src/data/destinations/capsules/<id>.ts` from those records.

**The rule the generator obeys: it writes no sentence of its own about a
destination.**

- A place's `summary` is the first two sentences of the retrieved extract,
  verbatim.
- A history entry's `summary` is a retrieved sentence containing a year,
  verbatim, with that year parsed out. Entries are taken round-robin across
  places so a capsule's history is not one monument's article.
- A story's `summary` is a retrieved sentence that describes a practice rather
  than a date — selected by keyword, verbatim, `claimType: "documented
  history"` because an encyclopaedia is what it came from.
- The **only** prose the generator authors is an experience's explanation —
  *"4 of the catalogued records here carry it: Red Fort, Qutb Minar…"* — which
  is a statement about the file it is writing, and true by construction.

Re-running the two scripts on the same records produces byte-identical output.

## 3. Verification approach

Every item cites a source; every source is a URL that was actually fetched on
2026-08-27, with its `retrievalMethod` recorded as `web-search`. The capsule
validator (Phase 17) runs at the load boundary and refuses a file that breaks
any of it — including, added this phase, **a source marked `model-proposed`,
which may never be published**: a model suggesting a citation is not a
citation.

What is *not* claimed: these capsules are **not human-reviewed**. The
retrieval is real, the spans are verbatim and the citations resolve, but no
editor has read them against the sources. Every generated file says so in its
header, and `reviewedBy` reads
`"scripts/capsules (retrieved; pending human review)"` rather than a person's
name. That review is the honest next step.

Confidence is `medium` throughout — the archive's own grading for Wikipedia,
unchanged from how Sikkim's place records cite it.

## 4. Images

36 photographs, one per place where Commons had a freely licensed lead image:
fetched at 1,280 px, vendored to `public/images/capsule/<destination>/`, and
credited in `src/data/generated/image-credits.json` with licence, licence URL,
attribution and Commons file page. **Six places have no photograph** and the
card says so rather than borrowing one.

Licences present: CC BY-SA 4.0/3.0/2.0, CC BY 4.0/3.0/2.5/2.0, GFDL 1.2, FAL.
No image without a licence was kept.

## 5. Storage impact

| | Size |
|---|---|
| Capsule source (8 files) | **112 KB** |
| Capsule photographs (36 files) | **10 MB** |
| Sikkim, for comparison | ~4 MB source + 347 photographs |
| Build | **295 → 327 pages** |

The 32 new pages are the eight destinations' section index pages. **A capsule's
bytes reach only its own destination's pages** — the importers are lazy — and
the discovery page for a capsule destination is 60–80 KB against Sikkim's
309 KB.

## 6. Two content leaks found and fixed

This is the part of the phase that mattered most.

### 6.1 Detail routes generated another destination's slugs

The first build produced **1,399 pages instead of 295**. Three detail routes
built their static params from *statically imported Sikkim modules*, crossed
with every destination holding the capability:

```
/destinations/agra/places/aritar        → rendered Sikkim's record under Agra
/destinations/delhi/stories/<any>       → 70 Sikkim stories, eight times over
/destinations/goa/history/<any>         → 26 Sikkim events, eight times over
```

1,072 leaked pages. It was invisible for fifteen phases because Sikkim was the
only destination with content.

**Fixed** by asking the content layer per destination
(`await getPlaces(destinationId)`) instead of importing one destination's
module, and by restricting each detail route to records that carry the deep
shape — `provenance` for a place, `content` for a story, `description` for an
event. A capsule place has none of those, so it gets no page; its record *is*
its anchored discovery card, and `capsulePlaces()` points its link there.

### 6.2 Section indexes rendered Sikkim's archive

`/destinations/delhi/stories` served **"Stories of Sikkim — 70 stories across
19 categories"**. The index pages were gated on the `stories` and `history`
capabilities, which are true for a capsule, but they render Sikkim's modules.

**Fixed** by splitting the capability in two, which is a distinction the model
needed anyway:

- `stories` / `history` — this destination HAS such records (drives discovery,
  the planner, the knowledge graph)
- `storyPages` / `historyPages` — those records are long-form enough to carry
  their own pages (drives the section routes and the sitemap)

Both are derived from content presence, as every capability in this project
is. Delhi's `/stories` and `/history` now 404; its stories and history render
on its discovery page, where two-sentence entries belong.

### 6.3 The sitemap advertised pages that do not exist

Found by the check written for 6.1: the sitemap listed
`/destinations/delhi/places/red-fort`. Records that name their own link
(`detailHref`) are now skipped in the detail loop, because they live inside a
page the sitemap already lists.

## 7. Integration

- **Discovery** — capsule destinations get themed groups, cards with
  countable why-lines, interest provenance and add-to-trip. Interests come
  from the capsule's own themes rather than a category table written for
  Sikkim's vocabulary; without that fix Varanasi's ghats came out as
  "Heritage" and nothing else, and Religious heritage counted 1 instead of 4.
- **Planner** — works unchanged. Delhi's default plan: Humayun's tomb, India
  Gate, Red Fort, Jama Masjid, Lotus Temple, Qutb Minar, ordered by published
  coordinates with straight-line labels and no invented travel time.
- **Search** — each capsule owns a group in the ⌘K index with its own
  `destinationId` and name, so its places are visible in scope, attributed in
  global search, and never presented as another destination's.
- **Comparison and global intelligence** — the eight appear in interest-first
  matching and in the comparison table, described as coverage rather than
  ranked.

## 8. QA results

New suite — `npm run qa:capsules`, **173 checks, 0 failed**, structured around
the nine the brief asked for. Section 3 is the leak regression: for each of the
eight destinations it asserts no detail pages exist from another corpus, that
Sikkim's slugs 404, that no Sikkim record name appears, and that every
discovery link stays inside the destination.

| Suite | Result |
|---|---|
| **qa:capsules** (new) | **173 / 0** |
| qa:content-framework | 71 / 0 |
| qa:destination | 81 / 0 |
| qa:route-migration | 86 / 0 |
| qa:global-explore | 74 / 0 |
| qa:discovery | 106 / 0 |
| qa:global-intelligence | 102 / 0 |
| qa:planner | 85 / 0 |
| typecheck · lint · build | 0 · 0 · 327/327 |

**Full battery: 24 suites, 1,589 checks, 0 failures, 471 s** (`npm run
qa:final`), on a clean build with the image cache warmed — 3,920 optimizer
URLs, 0 failed, 0 stalled.

**Six existing suites were updated, none weakened.** Each had an assertion
pinned to a world where Sikkim was the only destination with content:

| Suite | Was | Now |
|---|---|---|
| qa:destination | "All 14 planned destinations are depth:planned" | every destination declares a depth its content supports (capsule ⇒ has a capsule; planned ⇒ has none) |
| qa:destination | every non-Sikkim destination renders explicit absence | that, for destinations that genuinely have nothing — read from the registry, not listed |
| qa:route-migration | no non-Sikkim directory in build output | no non-Sikkim **detail-page subdirectory** — 404 shells are not content |
| qa:route-migration | no `/destinations/<not-sikkim>/<section>` in the sitemap | **every advertised URL resolves**, checked against build output |
| qa:global-explore | exactly 12 destinations marked unresearched | the number derived from the registry and the capsule list |
| qa:global-intelligence | `/discover` under 120 KB | under 220 KB **plus a new per-card ceiling**, so content growth passes and cost creep fails |

## 9. Limitations

1. **Not human-reviewed.** The strongest caveat, stated in every generated
   file. A person should read all 100 spans against their sources before this
   is shown to judges.
2. **One source type.** Every citation is Wikipedia. Official sources (ASI,
   UNESCO, state tourism boards) would raise confidence above `medium` and are
   the obvious next retrieval pass — the source-tier machinery from Phase 4
   already exists for it.
3. **Capsule stories are encyclopaedic description, not narrative.** They are
   selected by keyword from a lead section: honest, cited, and thinner than
   what "cultural story" suggests. Sikkim's 70 hand-written stories remain a
   different kind of thing.
4. **A capsule place has no page of its own**, by design. Its record is an
   anchored card on the discovery page.
5. **Six places have no photograph and five have no coordinate** — genuinely
   absent, left absent.
6. **A capsule's planner day is one group.** The planner groups by
   administrative area and a capsule has one scope line, so a capsule
   destination produces a single-area itinerary.
7. **`i.ytimg.com` poster frames fail under throttling.** One image audit
   during this phase reported 517 failures, every one a YouTube thumbnail for
   Sikkim's culture videos; the next run of the same audit returned 3,920/3,920
   with none. Pre-existing, remote and intermittent — unrelated to capsules,
   but worth knowing before a demo.

## 10. Adding the next city

Unchanged from Phase 17, now with a retrieval path:

```
1. add it to scripts/capsules/plan.mjs        (titles, categories, themes)
2. node scripts/capsules/retrieve.mjs --only <id>
3. node scripts/capsules/generate.mjs
4. add the id to capsules/ids.ts AND capsules/index.ts
5. set depth: "capsule" in src/data/destinations/planned.ts
6. npm run qa:capsules && npm run build
```

Nothing else changes: discovery, the planner, search, comparison and the
global layer pick it up from the capability model.
