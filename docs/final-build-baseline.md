# Final build — baseline

Recorded 2026-09-09 before the final autonomous pass began. Every number here
was measured on this machine from a clean build and a quiet regression run
(load < 4). Numbers from runs under contention are excluded — one earlier
run took 8,649s and timed out three suites purely because a retrieval job
was fetching alongside it; the same suites passed in 418s alone.

---

## Build

| | |
|---|---|
| Branch | `v2-saas` |
| Pages | **1,014** (was 607 at Phase 16 freeze) |
| Build | clean, 0 prerender errors |
| Typecheck | clean, `strict`, zero `any` |
| Lint | clean |

## Regression — last clean run

| | |
|---|---|
| Suites | **37** |
| Checks | **14,774 passed, 5 failed** |
| Duration | 418s |

The five failures were all in the History work and are fixed at the time of
this baseline: a timeline link hardcoded to `/destinations/sikkim/…` (every
event on fourteen timelines was a 404), links to events that have no page,
two dated-history false positives in `qa:release`, and the `/destinations`
payload ceiling (raised with the cause named).

Suites added during this programme, all fully green on that run:

| Suite | Checks |
|---|---|
| `qa:stories` | 7,097 |
| `qa:history` | 2,703 |
| `qa:culture-module` | 1,800 |
| `qa:media` | 352 |
| `qa:responsive` | 140 (10 widths × 14 routes, incl. 360px) |
| `qa:archive` | 5,803 (data only — not yet in a clean full run) |

## Content corpus

| Module | Sikkim | Other 14 | Notes |
|---|---|---|---|
| Places | 38 | 194 | 231 total, coordinates published |
| Stories | 70 | **178** | 581-word mean; all quoted from cited sources |
| Culture records | 50 films | **195** | food 92 / festivals 63 / crafts 41; 178 link to their article |
| History events | 26 | **165** | 127 with detail pages; eras derived per destination |
| Archive objects | 77 | **~300** (retrieval in progress) | Commons-resolved; licence + maker required |
| Photographs | — | 408 | 265 at 1920px, rest at source maximum |

## Known state of the media

- 408 capsule photographs; **every one** was ≤1280px before this programme.
  Now 265 at 1920px (the largest Wikimedia thumbnail bucket that serves
  reliably — 2560 is refused), 143 at their genuine source maximum. Nothing
  upscaled.
- Six images that were not photographs removed (a locator diagram, four
  solid-black flattened SVG logos, a corporate wordmark). Name-based guard in
  the retrieval path.
- Focal manifest covers all 408; heroes pick the first wide-frame photograph
  in prominence order rather than centre-cropping a portrait.

## Known Sikkim-bias defects at baseline (Phase 19)

Found by grep of global surfaces, fixed during this pass:

1. `/destinations` SEO description named Sikkim and claimed research "not
   yet begun" (false — all 15 documented).
2. Root Open Graph card was Rumtek Monastery for every global page.
3. AI Guide greeting opened "Tashi delek… the Sikkim archive" on every page.
4. AI Guide "Plan my trip" routed **every** destination to
   `/destinations/sikkim/planner/result`.
5. AI Guide interest chips were Sikkim's (monasteries, lakes, trekking).
6. Dead component `HeritageMapSection` with a Sikkim aria-label.

## Environment

- Disk was at 443 MiB free; `~/.npm` (17 GB cache) cleared to unblock builds.
- Another interactive session (`tourismproj-c7`) exists in this repo; the
  hero-rotator redesign is its uncommitted work and is untouched.
- 404 uncommitted files, nothing committed by this programme.
