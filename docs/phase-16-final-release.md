# Phase 16 — Final Release: Hardening, QA, Demo, Pitch Readiness

The last phase. No features were added; the work was audit → reproduce → fix →
verify → freeze. Every number below was measured on the final build, on a
freshly started server, with the image cache cleared beforehand.

---

## 1. Executive summary

TerraStory is **release ready**.

The full QA battery — 22 suites, **1,352 checks — passes with zero failures**
in one command (`npm run qa:final`, 303 s). All 283 public routes serve with a
title, an h1, a canonical URL and no foreign-destination content. All 3,680
image variants serve; zero are broken. axe reports zero violations across 25
audited routes. The twelve-step demo walks end to end in 3.5 s of machine time
with zero console errors.

Five real defects were found and fixed in this phase, four of them by the
audits themselves. One long-standing suite failure — `qa:stories-map`, red
since Phase 11 and repeatedly classified as environmental — was diagnosed
properly and **fixed**, without weakening its assertion. The QA battery went
from 107 minutes with three failures to **5 minutes with none**.

The honest limits are stated in §29 and §31: one destination of fifteen has a
tourism experience layer, no live practical data exists anywhere, no AI has
ever run, and the product still calls itself "Sikkim Darshan" on pages about
Paris.

## 2. Final build status

| | |
|---|---|
| typecheck | exit 0 |
| lint | exit 0 |
| production build | exit 0, no warnings |
| build id | `4bQHA-_ApcEOByEnawyxV` (verified served by the running server) |
| `.next` | removed and rebuilt from scratch |
| `.next/cache/images` | cleared before the build, warmed deliberately after (§22) |

## 3. Final page count

**295/295 prerendered pages.** 35 route entries, 21 of them destination-scoped.
Two routes are dynamic by design (`/discover`, `/destinations/[id]/plan`), and
`/destinations` is prerendered — a Phase 15 regression that briefly made it
per-request was caught by three suites and reverted.

## 4-5. QA suites and totals

`npm run qa:final`, single command, fresh server:

| Suite | Result | Time |
|---|---|---|
| qa:route-migration | 86/86 | 0 s |
| qa:destination | 89/89 | 0 s |
| qa:global-explore | 74/74 | 0 s |
| qa:experience | 66/66 | 0 s |
| qa:decision | 43/43 | 0 s |
| qa:research | 88/88 | 0 s |
| qa:narrative | 71/71 | 0 s |
| qa:publishing | 52/52 | 0 s |
| qa:composition | 70/70 | 0 s |
| qa:resilience | 69/69 | 0 s |
| qa:heritage | 21/21 | 0 s |
| qa:integrity | 40/40 | 0 s |
| qa:industry | 25/25 | 0 s |
| qa:gallery | 13/13 | 0 s |
| qa:planner | 85/85 | 5 s |
| qa:discovery | 106/106 | 5 s |
| qa:global-intelligence | 101/101 | 10 s |
| qa:flows | 114/114 | 90 s |
| qa:industry-flows | 18/18 | 13 s |
| qa:immersive | 50/50 | 23 s |
| qa:a11y | 25/25 routes, 0 violations | 88 s |
| qa:stories-map | 46/46 | 66 s |

```
SUITES 22 · PASSED 22 · FAILED 0 · ENVIRONMENTAL 0 · TIMED OUT 0
CHECKS 1352 passed, 0 failed · DURATION 303s · exit 0
```

`qa:final` (`scripts/qa/final.mjs`) is new. It parses each suite's own reported
counts in all three formats used across the repo, enforces a 15-minute
per-suite ceiling, kills a stalled suite's **process group** so orphaned
browsers cannot poison the next suite, and prints TOTAL / PASSED / FAILED /
ENVIRONMENTAL / TIMED OUT. `--only a,b` re-runs a subset.

## 6. Known environmental failures

**None.** The ENVIRONMENTAL row reads 0, and the `environmental` exemption
that had been reserved for `qa:stories-map` was deleted rather than kept: the
failure it excused turned out to be a test-design defect and was fixed (§28).

Two things remain *environment-dependent* but are not failures:

- **Uppercase URLs return a bare layout shell on macOS.** `/destinations/SIKKIM`
  returns 200 here because the case-insensitive filesystem matches
  `sikkim.html`; the response carries the layout's default title, no page h1
  and no destination content. Phase 12 measured the same URLs on a
  case-sensitive APFS volume: **404**. No content leaks either way.
- **The Next image optimizer can wedge a cache key under sustained automated
  load** (§22). Mitigated operationally and no longer able to fail a suite.

## 7. Route audit

Inventory built from the generated sitemap plus the routes it deliberately
omits (global tools, API, robots).

| | |
|---|---|
| Routes crawled | **283** |
| Clean | **283** |
| Failed | 0 |
| Excluded | `/review` (reviewer UI, `noindex`, 404s in production), `_next` assets |

Every route checked for: HTTP 200, a `<title>`, an `<h1>`, a canonical URL,
absence of error text, and — for destination-scoped routes — that no link
points into another destination's content. Internal link audit: **278 distinct
targets, 0 broken**.

## 8. Destination audit

| Destination | Hub | Discover | Plan | Depth | Own card | Cross-destination edges | State |
|---|---|---|---|---|---|---|---|
| Sikkim | 200 | 200 | 200 | Deep archive | yes | 4 | full experience layer |
| Jaipur | 200 | 200 | 200 | Curated | no | 4 | honest empty |
| Kyoto | 200 | 200 | 200 | Researched | no | 4 | honest empty |
| Agra, Delhi, Goa, Hyderabad, Istanbul, Kochi, Kolkata, Mumbai, New York City, Paris, Rome, Varanasi | 200 | **404** | **404** | Not yet available | no | 0 | registered, empty |

All **15/15** hubs serve. The twelve empty destinations have **no** discovery
or planner route at all — an empty page would read as coverage. Jaipur and
Kyoto load both routes and say *"Tourism experiences are not yet available for
this destination"*, reporting the approved knowledge they do have (35 and 15
claims). Only Sikkim emits an `og:image`; nobody inherits another
destination's photograph.

## 9. Sikkim regression

Baseline counted from the final build output:

| Content | Baseline | Now |
|---|---|---|
| Monastery pages | 15 | **15** |
| Story pages | 70 | **70** |
| History pages | 26 | **26** |
| Place pages | 38 | **38** |
| Archive pages | 78 | **78** |

`qa:heritage` 21/21, `qa:integrity` 40/40, `qa:gallery` 13/13. No curated
record, claim, source, established year or cultural fact was edited in this
phase. The only file touched under `src/` was `components/maps/LeafletMap.tsx`
(§28, bug 5) and `lib/constants.ts` + `components/layout/Navbar.tsx` (§28,
bug 1) — none of them content.

## 10. Global discovery audit

`qa:global-intelligence` 101/101. Verified live: interest-first matching is
deterministic and explainable (Sikkim 94/100, Jaipur 73/100, Kyoto 66/100 for
History + Heritage, each with countable reasons); the comparison renders
*"Not yet available"* and never `0` for a missing dataset; cross-destination
edges state their evidence; and no page anywhere claims "best", "most
beautiful", "top N", "better than", "must-see" or "most culturally rich" —
checked against both source and rendered HTML.

## 11. Planner audit

`qa:planner` 85/85. Re-verified across the matrix the brief asks for: 1/3/5/7
days, three paces, no interests, single and multiple interests, removals,
discovery pins, foreign pins, invalid pins, sparse destinations and records
with no coordinate. The planner states no travel time, opening hour, fee,
price, booking status, rating or availability — seven fabrication patterns are
grepped out of a fully-expanded 7-day plan, and every stop carries a stated
reason.

## 12. Search audit

| Measure | Value |
|---|---|
| Corpus endpoint | `/api/search-index`, 259,894 B, TTFB 5 ms |
| First result, cold (fetches corpus) | **402 ms** |
| First result, warm (in memory) | **69 ms** |
| Ownership | scoped index admits only the current destination + global nav |
| Result attribution | results from elsewhere carry the owning destination's name |

Search survives the corpus being unavailable: the palette keeps working over
the inlined navigation seed and says so.

## 13. Cross-destination audit

Every probe resolves inside its own destination or fails safely:

| Probe | Result |
|---|---|
| `/destinations/jaipur/monasteries` | 404 |
| `/destinations/jaipur/plan?pin=site:rumtek` | 200, Sikkim id discarded, no Sikkim content |
| `/destinations/sikkim/plan?remove=site:../../etc` | 200, id discarded |
| `/destinations/sikkim/monasteries/does-not-exist` | 404 |
| `/destinations/unknown`, `/destinations/../../etc/passwd`, `%2e%2e%2f`, `%00` | 404 |

`qa:destination` 89/89 asserts no destination page renders another's content,
which is why Phase 15's cross-destination evidence is **linked rather than
quoted** onto a destination page.

## 14. Image audit

`npm run qa:images` walks every page, extracts every `_next/image` URL
including srcset variants, and requests each one with a browser `Accept`
header:

```
URLS 3680 · OK 3680 · FAILED 0 · STALLED 0 · 345.7 MB served
```

**Zero broken images.** Every photograph comes from the record being rendered,
so no destination can show another's; where the archive has no verified
photograph the card says so rather than substituting one.

## 15. SEO audit

| Destination | Title | Canonical | og:image |
|---|---|---|---|
| Sikkim | `Sikkim · Sikkim Darshan` | `/destinations/sikkim` | `/images/mon/rumtek.jpg` |
| Jaipur | `Jaipur · Sikkim Darshan` | `/destinations/jaipur` | none |
| Kyoto | `Kyoto · Sikkim Darshan` | `/destinations/kyoto` | none |
| Paris / Delhi / Rome | own names | own paths | none |

Every destination has its own title and canonical, and only Sikkim emits a
card. **The site name is the standing weakness** — see §29.

## 16. Sitemap audit

273 entries, **273 unique**, zero legacy URLs, all 15 destinations represented,
canonical URLs matching sitemap URLs. Discovery and planner routes appear only
for destinations that have them.

## 17. Redirect audit

All 20 probed legacy URLs — 14 section indexes plus deep paths under
`/monasteries`, `/stories`, `/history`, `/places`, `/stays`, `/archive` —
return **301 in a single hop** to their exact destination-native counterpart.
No chains, no loops, nothing collapsed onto a homepage.

## 18. Mobile audit

390 / 768 / 1440 px, zero horizontal overflow on every audited surface:
homepage, global destinations, interest discovery (plain and filtered), theme
view, comparison, destination hub, destination discovery, record pages,
stories, timeline, planner, itinerary, explore map. Verified inside
`qa:discovery`, `qa:planner`, `qa:global-intelligence`, `qa:immersive` and
`qa:stories-map` — 40+ measurements per battery run.

## 19. Accessibility audit

`qa:a11y` (axe) — **25 routes, 0 violations, 0 serious+**, including
`/discover`, both filtered variants, the three-way comparison, destination
discovery and the planner. Keyboard operation is exercised, not assumed:
interest selection and form submission, planner controls (focus a pace radio,
Space, Enter, plan rebuilds), comparison, add-to-trip, and search opened from
the navbar button. Every table is a real `<table>` with caption and scoped
headers; every filter is a labelled native control; heading levels never skip.

## 20. Security audit

Twelve hostile probes on the final build: unknown ids, foreign ids, path
traversal, encoded traversal, null bytes, oversized queries, script tags as
parameters, invalid interests, invalid comparison lists, invalid planner
removals and pins, case variation. Every one fails safely; **zero responses
leaked a stack trace, a filesystem path or a reflected script**. Ids are
validated by membership in a closed set built from the registry, never by
syntax alone.

## 21. Performance audit

| Route | TTFB | HTML |
|---|---|---|
| `/destinations` | 4 ms | 90,776 B |
| `/destinations/sikkim` | 4 ms | 135,736 B |
| `/destinations/sikkim/monasteries/rumtek` | 4 ms | 432,849 B |
| `/` | 13 ms | 297,572 B |
| `/destinations/sikkim/plan` | 14 ms | 160,677 B |
| `/discover` | 20 ms | 100,085 B |
| `/destinations/compare?ids=sikkim,kyoto` | 20 ms | 69,434 B |
| `/destinations/sikkim/discover` | 24 ms | 309,167 B |
| `/api/search-index` | 5 ms | 259,894 B |

Unchanged from the Phase 15 baseline — no regression. No further optimisation
was attempted: Phase 15's measurement already removed ~288 KB from every page,
and the remaining weight on `/destinations/sikkim/discover` is 30 experience
cards, which is content rather than overhead. Objective 33's condition ("only
optimise if profiling shows a meaningful gain") was not met, and that decision
is recorded rather than acted on.

## 22. Image cache audit

The Phase 15 finding was re-investigated and characterised precisely.

**What happens:** a single Next image-optimizer cache key can enter a
permanently blocking state. The affected URL then returns **zero bytes and
never completes** — measured at 12 s, 20 s, 45 s and 60 s timeouts — while
every other variant of the same photograph serves in milliseconds.

**What it is not:** not the source file (a valid progressive JPEG; a sibling
with identical dimensions converts in 14 ms), not a missing `sharp` (installed
and used), not a single aborted request (tested explicitly: abort, then the
same URL served in 54 ms), and not application code — the JPEG passthrough
path always works.

**Recovery:** clearing `.next/cache/images` restores it immediately — the same
URL then served in 280 ms.

**Mitigation, now part of the release procedure:** `npm run qa:images` requests
every optimizer URL once, sequentially, before browsing or testing. Result on
the final build: **3,680 URLs, 0 failed, 0 stalled**, and every subsequent
request is a cache hit (slowest 6 ms). This also removed the cause of the two
suite failures that had been consuming an hour per battery run.

## 23. Console / network audit

Representative routes, fresh contexts, final build:

| Route | Failed requests | Console errors |
|---|---|---|
| `/destinations/sikkim/permits` | 0 | 0 |
| `/destinations` | 0 | 0 |
| `/discover` | 0 | 0 |
| `/destinations/sikkim/monasteries/rumtek` | 0 | 0 |
| `/destinations/sikkim/plan` | 0 | 0 |
| Twelve-step demo walk | 0 | **0** |

Before this phase every page in the site logged **two aborted requests** and
the demo path threw one uncaught exception. Both are fixed (§28).

## 24. Fabrication audit

A rendered-content scan of **280 routes** against eleven patterns (hours,
prices, travel times, ratings, superlatives, booking language), excluding
quoted source text, produced 32 hits. Every one was reviewed by hand:

| Hits | What they are | Verdict |
|---|---|---|
| 27 | `₹50 × 2 = ₹100` on `/hotels`, and `₹10,000 a kilo` in a tea story | The statutory TSD levy (Sikkim Registration of Tourist Trade Rules, 2025) and a sourced claim. **Real, sourced facts.** |
| 4 | "most beautiful" in a Kyoto approved claim ("carries a reputation as…") and a Wikivoyage visitor note on Phodong, both rendered beside their source | **Attributed third-party statements**, not the product's claim |
| 1 | "the best place in Sikkim to learn to read a religious structure" in a curated story, with its reason | **Curated editorial prose** carrying a claim type and sources |

**Zero fabrications by the application.** No opening hours, no prices, no
travel times, no ratings and no rankings are generated anywhere.

## 25. Link audit

278 distinct internal link targets, **0 broken**. External links (Wikipedia,
Commons, Google Maps, hotel websites) are classified separately and were not
required to resolve; two hotel sites are blocked by the browser's opener
policy, which is their configuration, not this application's.

## 26-27. Demo walkthrough and timing

`node scripts/qa/demo-walkthrough.mjs` drives the full path in Chromium,
asserting at every step that the thing the presenter is about to describe is
on screen:

| # | Step | Time | Evidence |
|---|---|---|---|
| 1 | Open TerraStory | 411 ms | homepage |
| 2 | Interest-first entry | 257 ms | "What do you want to experience?" |
| 3 | Choose History + Heritage | 200 ms | 3 destinations matched |
| 4 | Why the top match matched | 4 ms | "History — 27 catalogued records carry it; 11 approved claims" |
| 5 | Compare destinations | 65 ms | counts side by side, "Not yet available" for absent data |
| 6 | Open Sikkim | 77 ms | 53 catalogued records |
| 7 | Discover experiences | 191 ms | 28 cards |
| 8 | Open a record, read why it matters | 126 ms | why-this-place + interest provenance |
| 9 | Timeline → place | 122 ms | event → `/places/do-drul-chorten` |
| 10 | Add to trip | **2,074 ms** | `/plan?pin=place:do-drul-chorten` |
| 11 | Read the itinerary | 9 ms | 9 stops, each with a reason |
| 12 | Cross-destination connection | 65 ms | "Both hold material on royal and palace heritage…" |

```
STEPS 12 · FAILED 0 · TOTAL 3.5s · SLOWEST step 10 (2.1s) · CONSOLE 0 errors
```

3.5 s of machine time; narrated, the walk is a comfortable three to four
minutes. The slowest step is the planner building an itinerary from 53 records
— worth narrating rather than hiding.

**Failure recovery** (Objective 29): the demo depends on no external service.
No AI provider, no booking API, no live data. If CartoDB tiles fail the map
degrades and every other surface still works; if `/api/search-index` fails the
palette keeps working over its seed and says so; the research provider is
absent by definition. `qa:resilience` (69/69) proves the AI-absent path by
injecting ten provider failure modes.

## 28. Judge-level review

**The problem.** Tourism information cannot be checked. A visitor is told a
place is worth seeing and has no way to know who said so.

**Is it solved?** For discovery, understanding and planning: yes, and
verifiably. For booking and live logistics: no, and the product says so
rather than pretending.

**What is genuinely innovative.** Provenance is structural, not decorative:
there is no model in the render path at all, every claim points at a named
source, every recommendation states the arithmetic that produced it, and
missing data renders as missing. A tourism product that publishes its own gaps
is rare.

**What is technically difficult.** Byte-exact evidence verification of every
research claim; sentence-level narrative verification; capability derivation
from content presence so no UI can promise an empty section; destination
isolation enforced against rendered HTML; a deterministic planner that is
explainable line by line.

**What is measurable.** 1,352 QA checks; 283 routes; 3,680 image variants;
coverage counts per destination; payload before and after.

**Why it beats a normal portal.** It answers "why does this matter?" and lets
you check the answer.

**Why it scales.** Destination-native routing, capability-derived UI, and a
research pipeline that has already produced two destinations beyond Sikkim.

**What would make a judge reject it** — the five weaknesses below.

## 29. Top five weaknesses

1. **The product still calls itself "Sikkim Darshan."** Every page title,
   including `Paris · Sikkim Darshan`, contradicts the global positioning the
   whole of Phases 10–15 built. **Not fixed here**: it is a branding decision,
   it touches 24 strings across 19 files and six QA suites assert the name, and
   changing it in a freeze phase risks breaking a green battery for a
   non-defect. It is a 30-minute post-freeze hotfix and should be the first
   one.
2. **One destination of fifteen has an experience layer.** Jaipur and Kyoto
   demonstrate the architecture with approved knowledge only; twelve
   destinations are registered and empty. The architecture is proven; the
   corpus is not broad.
3. **No live practical data anywhere** — no hours, fees, transport or
   availability. Deliberate and enforced, but it means the product cannot
   replace a booking site, only precede one.
4. **No AI has ever run.** The provider architecture, the verification
   harness, the fault injection and the publication decision all exist; the
   survival rate is unmeasured because no key has ever been available. The
   pitch must say "verification system with a deterministic generator", never
   "AI-powered".
5. **The image optimizer can wedge a cache key under sustained load** (§22).
   Mitigated by a warm-up step and a documented recovery, but it is a
   framework behaviour this project does not control.

## 30. Fixes made in this phase

Each answers the four questions Objective 37 requires.

1. **Two aborted requests on every page in the site.**
   *Problem:* the `Discover` nav link pointed at a dynamic route, so Next
   issued and then aborted a prefetch — twice per page, desktop and mobile nav.
   *Found by:* `qa:audit`, which reported "2 req fail" on all 56 routes; the
   URLs were captured in Chromium.
   *Fix:* `prefetch: false` on that one nav entry, typed through `NavLink`.
   *Proved by:* five representative routes now report 0 failed requests and 0
   console errors, and the demo walk reports 0.
2. **`qa:stories-map` had been failing since Phase 11.**
   *Problem:* `waitUntil: "networkidle"` on `/explore` after a layer toggle and
   a proximity search — a live Leaflet map keeps requesting tiles, so the
   network never falls quiet and the navigation times out before the assertion
   runs. `/explore` in isolation reaches networkidle in 1.5 s with 46 markers
   and all 16 tiles at 200.
   *Fix:* wait for the story link the check is about. **The assertion is
   unchanged.**
   *Proved by:* 46/46, repeatedly, including inside the full battery.
3. **A stalled image could hang a whole suite.**
   *Problem:* `networkidle` and an "all images complete" wait both hang when
   one optimizer key wedges; one battery ran 107 minutes with three failures.
   *Fix:* `qa:images` warm-up; `load`-based navigation in `qa:immersive` and
   `qa:flows`; explicit waits for hydrated grids so coverage is not reduced
   (verified: 70/70 stories and 31 homepage links still exercised); a per-suite
   timeout and process-group kill in the runner.
   *Proved by:* battery 303 s, 22/22, 1,352 checks, exit 0.
4. **A search check failed at the end of a long session.**
   *Problem:* `⌘K` was pressed and typed into before the palette existed, so
   the keystrokes went to whatever had focus after five navigations.
   *Fix:* open search from the navbar button — a real control with an
   accessible name — and fill the input directly.
   *Proved by:* `qa:global-intelligence` 101/101 in the battery.
5. **An uncaught exception on the demo path.**
   *Problem:* navigating away from the homepage while the map was easing threw
   `Cannot read properties of undefined (reading '_leaflet_pos')`.
   *Fix:* `map.off()` then `map.stop()` before `map.remove()` in the map's
   cleanup.
   *Proved by:* the demo walk reports **0 console errors** (was 1), and a
   five-page map-heavy navigation sequence reports 0 page errors.

## 31. Remaining limitations

Everything in §29, plus:

- `/destinations/sikkim/discover` is 309 KB — thirty experience cards. Reducing
  it means paginating discovery, a product decision, not a payload trick.
- Cross-destination themes are term occurrences with visible evidence, not
  editorial judgements; a reader who skims may over-read them.
- Country navigation on `/destinations` jumps to a section rather than
  filtering, to keep the global entry prerendered.
- 78 hardcoded `/destinations/sikkim/...` literals remain in older route
  modules, pinned by the Phase 12 ratchet.
- Uppercase URLs return a layout shell on macOS (404 in production, measured).

## 32. AI status

**No AI ran. No provider is installed. No key exists.** `ANTHROPIC_API_KEY` has
been unavailable for eight consecutive phases. Nothing in the discovery,
planner or global-intelligence paths imports an AI SDK or makes a remote call —
asserted by three suites — and nothing reads a clock or a random source, so
every output is reproducible. A Groq key was offered mid-project and
deliberately **not** used: this phase's brief forbids installing another
provider, and the key was never written to any file. It should be rotated.

The published narrative blocks are all `generatedBy: "rule-based"`, and the
project must be described as a **verification system with a deterministic
generator** — never as AI-generated.

## 33. Final product differentiators

1. Source-grounded knowledge — every claim points at a named source
2. Historical and cultural understanding connected to visitable places
3. Interest-first discovery across destinations
4. Explainable recommendations — arithmetic, not opinion
5. Provenance preserved into the itinerary
6. Honest gaps — coverage is published, absence is stated
7. Deterministic planning: same input, same plan
8. Cross-destination intelligence with inspectable evidence
9. No hallucination surface: no model in the render path
10. 1,352 automated checks standing behind all of it

## 34. Final release decision

**RELEASE READY.**

No blockers. The build is clean, the battery is green in one command, every
public route serves, every image loads, accessibility and security probes pass,
the demo runs end to end with no errors, and the known limits are documented
rather than hidden.

Recommended before the presentation, in order: rotate the exposed Groq key;
run `npm run qa:images` on the demo machine after starting the server; and
decide the "Sikkim Darshan" naming question (§29.1) as the first post-freeze
hotfix.

**The product is feature-frozen.** Any further change is a post-freeze hotfix.
