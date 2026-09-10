# Phase C — Final Product Freeze

TerraStory is frozen. Fifteen destinations, one product.

Phase A gave the landing page a global identity. Phase B gave every destination
records worth exploring. Phase C made the destination pages show them, closed
the last identity leaks, and validated the whole thing.

Coverage per destination is in [destination-coverage.md](destination-coverage.md).
The demo script is [phase-21-sih-demo-flow.md](phase-21-sih-demo-flow.md).

---

## 1 · What Phase C found and fixed

### The destination page did not show the destination

The largest defect, and it was invisible from the data: Phase B tripled what
every destination holds, and **none of it reached the destination's own landing
page**. Paris held 13 catalogued places, 12 dated events and 7 stories, and its
hub rendered a heading, a row of interest chips, a *one-item* "Explore" grid and
a list of other destinations. The archive was one click away on `/discover` and
nothing said so.

`DestinationHighlights` now renders **Places → Historical snapshot → Stories**
on every hub, sampled at six with a link to the rest, and only where records
exist. One component serves all fifteen: `getPlaces`/`getStories`/`getHistory`
return the same shapes for Sikkim's curated corpus and for a capsule's
projection of it, so Sikkim's 53 places and Paris's 13 render through identical
code.

Every hub now reads: **hero → interests → sections → places → history →
stories → (evidence, where published) → related destinations.**

### A prop that was wrong but unreachable

The first draft took `hasPlacePages={capabilities.places === true}` to decide
whether a place links to a route or an anchor. That is **true for a capsule** —
a capsule has place *records*, it just has no place *pages*. It was harmless
only because a capsule record carries `detailHref` and that always won before
the prop was consulted. The prop is gone; the record decides its own link.

### Four legacy identity leaks

`Sikkim Darshan` was still being used as the *product* name in four places:
the planner's metadata ("Tell Sikkim Darshan your interests"), the planner
result's rates-feed disclaimer, a history page's cross-reference, and the
preservation page's description. All four now name TerraStory or the archive
itself. The remaining occurrences are correct — they name Sikkim's actual
archive ("Sikkim Darshan Digital Heritage Archive") or the footer's labelled
"Sikkim archive" link.

## 2 · The product

**TerraStory** — a tourism platform that publishes what it can prove and says
so when it cannot. **Sikkim Darshan** is the deep archive it was built around
and keeps that name on its own pages.

### Fifteen destinations, four depths, all earned

Depth is **computed from coverage**, not typed into a field
(`src/lib/destinations/earned-depth.ts`), by either of two routes — catalogued
records or reviewed research — taking the better:

| Depth | Requires | Destinations |
|---|---|---|
| **Deep archive** | ≥25 records **and** ≥15 events **and** ≥25 stories | Sikkim |
| **Curated** | ≥20 reviewer-approved claims | Jaipur |
| **Researched** | ≥1 reviewer-approved claim | Kyoto |
| **Tourism capsule** | ≥3 catalogued records | the other twelve |

**Only Sikkim meets the deep threshold, on all three axes, and nothing was
promoted to disguise that.** Each destination's shortfall is computed and
available.

### Three ways in, all validated

| Flow | Verified by |
|---|---|
| Interest → destinations → destination → discovery → place → add to trip → planner | `qa:product-flow` §A |
| Destination → hub → discovery → place → add to trip → planner | §B, on Rome |
| Search → place → destination → planner | §C, asserting the result names its owner |

## 3 · Results

| | |
|---|---|
| Build | **319 pages**, 0 warnings |
| QA | **29 suites · 2,407 checks · 0 failures · 296 s** |
| Accessibility | **30 routes, 0 violations** |
| Mobile | 390 / 768 / 1440, **0 horizontal overflow** |
| Security | 0 failures; unknown/foreign/malformed/traversal/case all fail safely |
| Client JS | **3.2 MB / 47 chunks — unchanged since Phase 19** |
| Search index | 286 KB, served from `/api/search-index`, **0 records inlined in any page** |
| Sikkim | **15 / 70 / 26 / 38 / 78 unchanged** |
| AI | **OFF** — no provider, no key, 0 imports from `src/`, 0 pages claiming AI |

### Payload

| Route | Phase B | Phase C | |
|---|---|---|---|
| `/` | 348,598 | 348,598 | **0.0%** |
| `/destinations/paris` | 67,548 | 111,464 | +65.0% |
| `/destinations/sikkim` | 144,716 | 188,282 | +30.1% |
| `/destinations/jaipur` | 204,388 | 243,955 | +19.4% |

The hub growth is the eighteen cards Phase C added, and it is the page that
most needed them — Paris's hub was 67 KB because it was showing almost nothing.
The landing page is unchanged because it shows counts, not content.

### Storage

| | |
|---|---|
| Content source (`src/data`) | 3.2 MB — of which capsules 328 KB |
| Images | 126 MB (capsules 23 MB) |
| Audio guides, 181 files, 12 languages | 156 MB |
| Build output | 397 MB |

## 4 · Environmental, not application

Recorded separately because they are not defects in this codebase:

0. **Playwright suites contend under load.** Run back-to-back immediately
   after a 4,240-URL image warm-up, `qa:stories-map` timed out on
   `page.goto` and reported 41/46. Run on a settled server it passes **46/46**,
   as it has every time since Phase 16. The battery is deterministic on a
   settled server; it is not immune to being started while the optimiser is
   still catching up. Sequence: build → `qa:images` → let it settle → `qa:final`.
1. **The image optimiser stalls on a cold cache.** `qa:immersive` timed out
   waiting for `load` on Sikkim's Rumtek page — 437 KB and a large gallery —
   after a clean rebuild removed `.next/cache/images`. The project's own
   discipline is to run `npm run qa:images` before browser QA; warmed, it
   passes. First cold pass: 4,240 URLs, 8 stalled, 0 failed.
2. **`i.ytimg.com` returns 504 intermittently.** YouTube poster frames for
   Sikkim's culture videos, throttled remotely. One run showed 1 failure, the
   next 0.
3. **UNESCO returns HTTP 403** behind a Cloudflare challenge, which is why the
   source tier could not be raised (§6).
4. **Basemap labels render in local script** since CARTO began requiring an API
   key in Phase 20.

## 5 · The QA command

`npm run qa:final` runs 29 suites and distinguishes genuine failures from
environmental ones. The ones that carry Phase A–C:

| Suite | Covers |
|---|---|
| `qa:product-flow` | the three ways into the product, plus mobile |
| `qa:demo` | the twelve-step SIH walk, clicked, timed |
| `qa:release` | destination identity, metadata ownership, practical-data sweep over every built page, secrets, deployment |
| `qa:capsules` · `qa:global-capsules` | all fourteen capsules, isolation, images, sources, size contract |
| `qa:ux` | chrome ownership, depth vocabulary, counts agreeing across surfaces |
| `qa:a11y` | 30 routes under axe |

**`qa:stories-map` passes 46/46** from a clean build and fresh server. It was
documented as failing from Phase 11, diagnosed in Phase 16 (a `networkidle`
wait on a page with a live Leaflet map) and has passed every run since. **No
assertion was altered to achieve it.**

## 6 · Known limitations

1. **The twelve capsules are not human-reviewed.** 166 places of retrieved,
   quoted, cited text. Every generated file says so. This is the largest
   caveat in the product and the first thing to volunteer.
2. **The source tier is encyclopedic.** 226 sources, all Wikipedia or Wikidata;
   **469 claims, 0 uncited**. UNESCO is unreachable (403) and ASI is an 8.4 MB
   JavaScript application with no retrievable per-monument document. Raising
   the tier needs an API key or per-institution extractors, and is the single
   biggest improvement available to this data.
3. **Only Sikkim earns Deep archive.** The gap is narrower than it was — 53
   records against 9–13 — and it is real and stated.
4. **Agra has 1 story, Kyoto 2**, against a target of 8–15. The selector found
   no more sentences describing practice rather than chronology.
5. **97 of 166 capsule places have no photograph**, by choice: the image budget
   was held flat so Phase B added records rather than megabytes.
6. **No practical data anywhere.** No opening hour, price, availability or
   travel time for any destination. The only price in the product is the
   statutory Sikkim Tourist Trade fee, labelled and sourced.
7. **`reports/` holds ~209 MB of tracked QA screenshots** — not served, not
   built, but it dominates repository size. Left in place because deleting
   tracked evidence is the owner's call.

## 7 · Deployment

`npm run build` → `npm start`. No runtime service, database or key required.
Set `NEXT_PUBLIC_SITE_URL` in production. `.env.example` declares keys with
empty values; no `.env` is tracked. No debug routes: `/demo`, `/pitch`,
`/presentation`, `/showcase`, `/sih`, `/test`, `/debug`, `/admin` all 404,
asserted. 23 pre-Phase-11 Sikkim routes serve permanent single-hop redirects.

**One standing item:** a Groq API key was pasted into this project's chat during
Phase 13. It was never written to a file and appears nowhere in the tree —
`qa:release` scans nine credential patterns across every shipping file and finds
none. **It should still be rotated**, because a key that has been in a
transcript should be treated as disclosed.

## 8 · Frozen

Nothing is committed. The working tree holds the product; review and commit is
the owner's step.
