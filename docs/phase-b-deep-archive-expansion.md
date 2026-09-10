# Phase B — Deep Archive Expansion

Fourteen destinations went from "this page exists" to "I can actually explore
this place here". Sikkim was not touched.

Counts, storage and the source audit are in
[destination-coverage.md](destination-coverage.md). This document is the method
and the decisions.

---

## 1 · What changed

| | Before | After |
|---|---|---|
| Destinations with catalogued places | 13 | **15** |
| Places outside Sikkim | 66 | **166** |
| Dated events outside Sikkim | 60 | **154** |
| Stories outside Sikkim | 27 | **66** |
| Experiences outside Sikkim | 46 | **83** |
| Relationships outside Sikkim | — | **694** |
| Jaipur | 35 approved claims, **0 places** | 35 claims **and 9 places** |
| Kyoto | 15 approved claims, **0 places** | 15 claims **and 10 places** |
| Capsule source | 172 KB | **328 KB** |
| Capsule images | 19 MB / 60 files | **23 MB / 70 files** |
| Client JS | 3.2 MB / 47 chunks | **3.2 MB / 47 chunks** |

Every destination now holds **9–13 catalogued places**, against a target of
10–20. No architecture was added: the same `scripts/capsules/` pipeline, the
same `DestinationCapsule` contract, the same planner, the same discovery.

## 2 · Method

`plan.mjs` → `retrieve.mjs` → `generate.mjs`, unchanged in shape.

**104 candidate titles were verified before any retrieval.** 95 resolved, 9 did
not; six were recovered through the search API with their correct titles and
**three were dropped** because no article exists — Panna Meena ka Kund, Jew
Town Kochi, Kerala Folklore Museum. They are absent rather than substituted.

**167 places retrieved, 0 dropped in retrieval.** One was dropped later (see
§4). Every sentence that reaches a page is a span copied verbatim from a
response that was stored, with the URL beside it.

### Images held flat on purpose

Every new place on an existing destination carries `image: false`. The image
budget stays at **4–6 photographs per destination**, inside the brief's 3–8
target, because the aim was more verified *records*, not more megabytes. The
only new images are Jaipur's and Kyoto's first five each — they had none.

167 places, 70 photographs. **97 places show no photograph and say so** rather
than borrowing one.

## 3 · Depth is now earned

`depth` was a field somebody typed. It is now graded from coverage by
`src/lib/destinations/earned-depth.ts`, against thresholds stated once and
reproduced in [destination-coverage.md](destination-coverage.md).

A destination qualifies by either of two routes — a catalogued archive or
reviewed research — and takes the better of the two. That distinction was a bug
in the first draft: an if/else chain graded Kyoto by whichever branch came
first and quietly discarded its fifteen approved claims to call it a capsule.

**Only Sikkim meets the deep threshold, on all three axes**, and no capsule was
promoted to disguise that. Each one's shortfall is computed and available —
Paris is short on records (13 of 25) and stories (7 of 25).

## 4 · Three real defects, all caught by the validator

The capsule validator was extended this phase with the §31 checks — duplicate
ids, empty titles, implausible years, unknown interests, duplicate claims. It
earned its keep immediately, by **failing closed and dropping two whole
destinations** from the build rather than publishing them broken.

1. **`Ram Bagh` is a disambiguation page.** It resolves with HTTP 200 and an
   extract reading *"Ram Bagh may refer to the following places:"* — five of
   them, in four countries. Not a 404, so the existing guard passed it, and the
   generator produced a place with no summary. Agra's entire capsule was
   dropped. Fixed three ways: the correct title (`Aram Bagh, Agra`), a
   **disambiguation guard in retrieval**, and a generator rule that drops a
   place it cannot summarise rather than emitting an empty one.
2. **`marble-palace` was planned twice** — once in Phase 18 and again by me.
   Kolkata's capsule was dropped for a duplicate place id.
3. Both were invisible until the validator refused them, which is the failure
   working correctly and in the right place.

## 5 · Eleven checks were re-pointed, none weakened

Phase B changed two facts the test suite had encoded: Jaipur and Kyoto had no
visitable records, and a capsule held 5–7 places. 61 checks failed across 8
suites — all of them describing the *old* product.

| Suite | Asserted | Now asserts |
|---|---|---|
| `qa:planner` | Jaipur, having nothing, shows no itinerary | **a stronger guarantee**: asked for 7 days from 2 days of records, the planner says so and renders 2 |
| `qa:planner` | the sitemap omits Jaipur's planner | planner and discovery URLs cover exactly the same destinations |
| `qa:discovery` | Jaipur invents no cards | Jaipur shows only photographs it owns; no group is advertised with zero records |
| `qa:global-intelligence` | a knowledge-only destination says so | approved knowledge and catalogued records stay **separate columns**, never one blended score |
| `qa:capsules` | every capsule declares `depth: "capsule"` | declares a depth its records support — Jaipur may declare `curated` |
| `qa:capsules` | one search group per destination | at least one; Jaipur and Kyoto correctly own **two**, capsule and research |
| `qa:global-capsules` | 5–7 places | 10–20 places, 8–15 events — the Phase B contract, still bounded on both sides |
| `qa:global-capsules` | four pinned words survive encoding | **every non-ASCII place name** the capsules declare survives — derived, not pinned |

The pinned-word check is worth calling out: it named "Élysées", the place lists
grew, the generator chose different sentences, and the check failed while the
product was correct. Deriving the assertion from place names removed a whole
class of brittleness.

**One check found a real question rather than a fixture:** `qa:capsules` flagged
prices on Agra and Jaipur. Both were **historical construction costs** — the Taj
Mahal *"completed in 1653 at a cost estimated at the time to be around ₹32
million"* and a 2006 Hawa Mahal renovation. Neither is something a traveller
pays. The rule is now the one `qa:release` settled on in Phase 22: currency is
a practical claim only when it stands next to a practical word. A ticket price
would still fail.

## 6 · Results

| | |
|---|---|
| QA | **29 suites · 2,407 checks · 0 failures** |
| Accessibility | **30 routes, 0 violations** |
| Mobile | 390 / 768 / 1440, 0 overflow |
| Security | 0 failures, no cross-destination leakage |
| Sikkim | **15 / 70 / 26 / 38 / 78 unchanged** |
| Build | 319 pages, 0 warnings |
| Client JS | **3.2 MB / 47 chunks — unchanged** |

Payload, Phase A → Phase B: landing page **+0.0%** (it shows counts, not
content), `/destinations` +0.1%, `/discover` +7.8%, Paris's hub +2.9%, **Paris's
discovery page +56%** — 184 KB to 287 KB for thirteen places instead of six.
That last is proportional to content and sits below Sikkim's 315 KB. Capsule
content remains dynamically imported per destination.

## 7 · Limitations

1. **The source tier could not be raised.** UNESCO returns HTTP 403 (Cloudflare)
   and ASI is an 8.4 MB JavaScript application with no retrievable per-monument
   document. The citations are Wikipedia (166) and Wikidata (60), as in Phases
   18–19. **469 claims, 0 uncited.** Raising the tier needs an API key or a
   per-institution extractor and is the single biggest improvement available.
2. **The capsules are still not human-reviewed.** 166 places now, up from 66.
   Every file says so. The review burden grew with the archive.
3. **Agra has 1 story, Kyoto 2**, against a target of 8–15. The selector found
   no more sentences describing practice rather than chronology. The gap is
   left as a gap.
4. **No destination but Sikkim earns deep**, and none was promoted to appear to.
5. **97 of 167 places have no photograph**, by choice — the image budget was
   held flat so the phase added records rather than megabytes.
6. **Sikkim's own corpus was not touched**, so the gap between it and the rest
   is narrower but real: 53 records against 9–13.
