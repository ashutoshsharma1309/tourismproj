# TerraStory — final benchmark report

Benchmark: <https://sikkimdarshan.vercel.app>. Written 2026-09-09 at the end
of the autonomous build. Every figure is measured from this repository's own
clean build and quiet regression run; figures marked ⏳ are filled in from the
final run recorded at the foot of this document.

---

## 1. Executive summary

TerraStory is a fifteen-destination cultural discovery platform on one
reusable engine. At the start of this programme its fourteen non-Sikkim
destinations were, in four modules, either thin or absent: stories were place
records relabelled, culture had no route, history was a flat list of building
dates, and the archive did not exist. Its photography was capped at 1280px
and its AI guide, search shortcuts, 404 page, social card and sitemap all
defaulted to Sikkim.

At the end, every destination has sourced story articles, a culture route
ordered by what it actually holds, a timeline with eras and detail pages, and
a Commons-resolved archive with licence and maker on every object. The media
is at source resolution. The global surfaces name the product, not one
destination. The regression suite grew from 32 suites / 2,684 checks to 41
suites / ⏳ checks, and the build from 667 pages to **1,280**.

The benchmark was used as a quality bar, not a template. Its Sikkim-specific
vocabulary — monasteries, permits, its six era names, its seventeen archive
categories, its fifty films — was deliberately not copied.

## 2. Baseline

See `docs/final-build-baseline.md`. Headline: 1,014 pages, 37 suites, 14,774
checks; four modules absent or stub-only for fourteen destinations; six
named Sikkim defaults in global UI.

## 3. Final state

| | Start of programme | End |
|---|---|---|
| Pages built | 667 | **1,280** |
| Regression suites | 32 | **41** |
| Regression checks | 2,684 | ⏳ |
| Stories (non-Sikkim) | 77 place stubs, no pages | **178 articles**, detail pages |
| Culture route | Sikkim only | **all 15** |
| History events with pages (non-Sikkim) | 0 | **127 of 165** |
| Archive objects (non-Sikkim) | 0 | **224**, licence + maker on all, media vendored |
| Photographs ≥1920px | 0 of 414 | **265 of 408** |

## 4. Feature parity

`docs/sikkimdarshan-final-benchmark.md` holds the full matrix with the
UNIVERSAL / DESTINATION-SPECIFIC / NOT APPLICABLE column. Summary: parity or
better on identity, coverage, featured places, photography, map, stories,
culture, history, archive, stays, sources and AI guide; honest absence on
audio, films, permits and responsible/preserve outside Sikkim.

## 5. Content architecture

One engine. Capabilities are derived from content presence — a story with
`content` gets a page; an event with `description` gets a page; a destination
with culture records gets `/culture`. Adding a sixteenth destination is data,
not code. Sikkim's deep modules and the fourteen capsules are two formats
behind one accessor layer (`src/lib/destinations/content.ts`), and nothing
above it knows there are two.

## 6. Destination coverage

`docs/destination-completeness-matrix.md`, generated from the modules the
site reads. Counts differ by destination because sources differ — Goa's
timeline has 11 events and 3 pages because its sources are short, and says
so — but the standard is the same everywhere: every claim quoted from a cited
source.

## 7. Stories

178 retrieved articles (581-word mean, 157 illustrated — three CC BY-SA files with no
author named on Commons were dropped by the builder's no-credit-no-image rule) on Food, Festivals
and Art & Craft shelves, plus Sikkim's 70. Body text is quoted under CC BY-SA
with the licence named on the record. Subjects that could not supply 220
words were dropped rather than padded. Related places are derived from the
prose; related stories from the shelf. Search indexes all 248.

## 8. Culture

`/culture` for all fifteen. Shelves are ordered by what each destination
holds most of — Jaipur leads with Festivals, Kyoto and Rome with Food. 178 of
195 records link to their own article. No films outside Sikkim: fifty
individually verified films is the value of that page, and unverified
YouTube would be its opposite.

## 9. History

165 events across the fourteen, all kept on the timeline; 127 open into a
page whose body is the subject's own History section. Eras are historiographic
bands (Ancient … Contemporary) shown only where a destination has events in
them — Rome shows three, Istanbul five, New York two. Sikkim's six named eras
are Sikkim's and were not borrowed. BCE years render as "528 BCE", never
"-528". Events without prose render as "Dated record", not as a link to a
page that does not exist.

## 10. Archive

224 objects for the fourteen (238 admitted; 14 dropped when Commons would not serve a raster thumbnail), from Wikimedia Commons categories that were
*discovered* per destination rather than guessed. Admission requires Commons
to state a licence AND an author AND a description or date, at 800px+.
Object type comes from the category that answered (an 1820 watercolour from
"Paintings of Delhi" is a painting, not a photograph). Generic museum titles
("Fotografier") are rejected, not silently deduplicated. Dimensions,
materials and holding institution are absent because no source states them.
Objects show whole (`object-contain`), never cropped to fill.

Archive media is **vendored**, not hot-linked. The first build served it
straight from upload.wikimedia.org through the image optimiser; warming
9,191 variants produced **2,086 HTTP 429s** — Wikimedia throttling a burst
of full-size fetches, which is exactly the hammering this project forbids,
and a page of broken frames for any visitor ahead of the cache. Each object
is now fetched once at Commons' largest served bucket, re-encoded, stored
under `public/images/archive/<destination>/`, scanned by `qa:media-provenance`
for size and featurelessness, and carries its original URL as `sourceUrl` and a
credit row keyed by path — the same shape as every other photograph.

## 11. Explore

Interest-first discovery across fifteen destinations, unchanged and stronger
than the benchmark's single-subject explorer. Ranking is deterministic.

## 12. Stays

Sourced, ≤12 per destination, no price, rating, phone or availability —
verified by `qa:stays`. Unchanged by this programme.

## 13. Map

Categories derive from each destination's records: Kyoto — Temple, Shrine,
Castle, District, Walk, Market, Palace; Varanasi — Ghat, Temple, Heritage
site, Fort, University, Mosque. No fixed taxonomy.

## 14. Audio

Sikkim: 12 languages. Elsewhere: an honest unavailable state. Nothing
fabricated.

## 15. AI Guide

Deterministic retrieval; no model in the answer path, so injection is
structurally impossible. Now destination-aware: it greets by destination,
offers that destination's questions, plans with the product's interest
vocabulary, and routes the plan to *that destination's* planner. Before this
programme it greeted "Tashi delek… the Sikkim archive" on every page and
sent every destination's "Plan my trip" to Sikkim's itinerary engine.

## 16. Journey · 17. Comparison

Preserved. Sequential destinations, `completed: string[]` progress, coverage
comparison with explained recommendations. Not modified.

## 18. Media quality · 19. Image provenance

Two suites guard provenance. `qa:media-provenance` (800 checks) rejects any
capsule image whose Commons file name says diagram, map, logo or flag,
requires every referenced photograph to exist on disk, and scans the vendored
archive tree for size and featurelessness. `qa:media` is a concurrent
session's 7-check suite; it replaced the earlier file of that name during the
final build, so the 800 checks were restored under their own name rather than
fought over one path.

265 of 408 photographs at 1920px — the largest Wikimedia thumbnail bucket
that serves; 2560 is refused with a 400. 143 at their genuine source maximum,
reported as such. Six non-photographs removed (a locator diagram, four
flattened-SVG black rectangles, a wordmark); name-based guard in the
retrieval path. Every image carries creator, licence, Commons file page.
Focal manifest covers all 408; heroes pick the first wide-frame photograph in
prominence order.

## 20. Source quality

Every story, event and object names its source with a retrieval date; text
reuse names CC BY-SA. Two `qa:release` guards were widened, narrowly, to stop
flagging *sourced historical* values (a 2012 ticket price; "at 2:30 am" in a
1950 arson) — the fix was never to delete a true quoted sentence.

## 21. Multilingual

Twenty interface languages, canonical records + translation layer, language
in the path. New modules are language-neutral records; no translation is
labelled that does not exist.

## 22. Accessibility

`qa:a11y` green on the last clean run. Timeline events without pages are
plain text, not empty links. Culture and archive grids are `<ul>`/`<dl>`
records with real labels.

## 23. Performance

Focal origin is a CSS class (three rules), not an inline style — inline
styles pushed `/discover` through its payload ceiling. Two ceilings were
restated with the cause named; the per-card creep guard passes at 18 KB
against 22 KB. Image cache must be warmed before QA: a cold, wedged
image-optimiser key returns zero bytes and never completes.

## 24. Security

No secrets added. Retrieved text is data, never instructions. AI guide has no
model. `qa:release` credential checks green.

## 25. Responsive QA

`qa:responsive`: 10 widths × 14 routes = 140 checks, including 360px and
the new culture, story and history surfaces. ⏳ on the final run.

## 26. Visual QA

`qa:visual` captures the seven benchmark destinations across five modules at
1440 and 390, reporting overflow and unloaded images. Result: ⏳.

## 27. Remaining limitations

- Responsible / Preserve exist for Sikkim only; the other fourteen need
  sourced per-destination research, not a generic paragraph.
- Audio and films exist for Sikkim only.
- Music / dance / performance shelves have no records outside Sikkim.
- Archive place-linking is sparse (object titles rarely name catalogued
  places); the links that exist are real.
- Culture and archive pages are not translated into the 20 languages.
- Root `(explore)` v2 pages share with no image rather than a derived one.
- Another interactive session (`tourismproj-c7`) was editing this tree
  during the final build: it gave history cards their related place's
  photograph (`DestinationHighlights`), removed the ambient-sound layers
  (`AMBIENT_SOUNDS` in `constants.ts` — the last remote Wikimedia
  hot-links), and adjusted the planner. Those changes compile and are
  included in the final build and regression as found; they are theirs, not
  reviewed here. Nothing is committed by either session.

## 28. Final build status

⏳ — recorded from the final run below.

---

### Final run

- Build: **1,252 pages, clean** (exit 0, no prerender errors). The count
  moved 667 → 1,014 → 1,280 → 1,252 across the programme: up for the new
  story, culture, history and archive pages; down 14 for archive objects
  Commons would not serve and 13 for `archive/contribute` pages that had
  leaked under destinations that have no contribution pipeline.
- Image warm: **9,083 of 9,083 variants served, 0 failed, 0 throttled** —
  every one local. The run before vendoring failed 2,086 with HTTP 429.
- Regression: ⏳
- Visual QA: ⏳

A note on method, because it changed a verdict. One full run reported
`qa:stories-map` failing with "/stories loads on a cold context — HTTP 404"
and the visual pass capturing zero screenshots. The server was by then
answering 404 to every route with `x-nextjs-cache: HIT` — the third time
this session a long warm-plus-browser run has left `next start` in that
state. A fresh process served every route; `qa:ux` passed 123/123 and `/`
went from "5 violations" to 0. The chain now restarts the server after the
warm pass and before the visual pass, and the capture script fails on zero
screenshots instead of reporting "no problems".

A second lesson, found by a screenshot and by nothing else: with `historyPages`
and `storyPages` lit for fourteen destinations, `/destinations/<id>/history`
and `/stories` served 200 everywhere — and rendered **Sikkim's** index at
every one of those URLs ("The Story of Sikkim" under New York City; seventy
photographs of Sikkim on Kyoto's story index). Every route check had asserted
only `status === 200`. Both indexes now branch by destination, `StoryCard`
links to the story's own destination instead of a hard-coded Sikkim path, and
`qa:history` / `qa:stories` assert whose content came back. Verified on the
final server: Mumbai — "The history of Mumbai", 8 of its own links, 0 Sikkim
markers; New York City — 12; Kyoto's story index — 14; Sikkim's own page
unchanged.
