# Phase 15 — Global Tourism Intelligence + Cross-Destination Intelligence

Scope: make the archive answer "what do you want to experience?" instead of
requiring "where do you want to go?", connect destinations to each other on
evidence, and pay off the search-payload debt Phase 14 measured. No new
destinations, no AI, no rebuild of the planner or discovery.

---

## 1. Global intelligence architecture

```
lib/global/coverage.ts     per-destination coverage, per interest,
                           experiences and claims counted SEPARATELY
        │
        ├── match.ts       interest → destination ranking (4 stated weights)
        ├── themes.ts      6 explicit term vocabularies + evidence
        └── connections.ts destination ↔ destination edges, with reasons
                    │
   /discover        /destinations/compare      RelatedDestinations
   (interest-first) (counts, never rankings)   (on every destination hub)
```

Four modules, three surfaces, one new endpoint (`/api/search-index`). Nothing
in the layer authors a fact: every number is a `length`, and every edge names
the material that produced it.

## 2. Interest model

The ten interests are the same vocabulary the planner and discovery already
derive from content. Globally, an interest is offered only where at least one
registered destination can satisfy it.

Coverage of an interest comes from **two separate counts that are never
merged**:

- **experience coverage** — catalogued records carrying it (Sikkim has these)
- **knowledge coverage** — reviewer-approved claims in the categories that
  evidence it (`history → history`, `heritage → heritage`,
  `culture → culture + festivals`, `sacred → heritage`)

`nature`, `architecture`, `museums`, `food`, `art` and `local` have no
knowledge category, so a destination cannot match them on claims alone. That
is a limit of the data, left visible rather than papered over with a loose
keyword rule — which is why **"Nature" returns exactly one destination of 15**.

## 3-4. Destination matching and the scoring formula

```
MATCH BREADTH      45   selected interests covered / selected interests
EXPERIENCE DEPTH   25   min(matched records / 20, 1)
KNOWLEDGE DEPTH    20   min(matched claims / 20, 1)
RESEARCH DEPTH     10   deep 1.0 · curated 0.75 · researched 0.5 · planned 0
```

Ordering: score descending, then destination name — never registry order,
which would quietly privilege whichever destination was added first. A
destination covering **none** of the selected interests is excluded, not
ranked last: showing it would be a false match.

Breadth dominates deliberately — covering both of a visitor's interests is a
better answer than covering one of them very deeply.

Measured, `?interests=history&interests=heritage`:

| | Coverage | Why |
|---|---|---|
| **Sikkim** 94/100 | Deep archive | History — 27 catalogued records carry it; 11 approved claims in the history category · Heritage — 35 records; 3 claims |
| **Jaipur** 73/100 | Curated | History — 21 approved claims · Heritage — 6 approved claims |
| **Kyoto** 66/100 | Researched | History — 9 approved claims · Heritage — 3 approved claims |

Every card carries a `<details>` block showing each component's points out of
its maximum, so the figure can be reconstructed by hand.

**Coverage is not quality**, and the page says so where the ranking is, not in
a footnote: *"A destination lower down is not a lesser place; it is one this
archive has covered less."* `qa:global-intelligence` fails the build on
"best destination", "most beautiful", "top N", "better than", "must-see" and
"most culturally rich" appearing anywhere in the authored prose.

## 5-7. Cross-destination graph, types and explanations

Two relationship types, strongest first:

1. **shared-theme** — both destinations carry a theme from the explicit
   vocabulary in `themes.ts`. A theme is a hand-written list of terms; a
   destination carries it when a term appears in a **reviewer-approved claim**
   or in a **catalogued record's own title and type label**. Record summaries
   are deliberately excluded — matching prose is where term matching stops
   being checkable.
2. **shared-interest** — both have coverage for the same interest, on either
   side of the experience/knowledge split.

Six themes: Buddhist heritage · Royal and palace heritage · Festivals and
observances · Museums and collections · Mountains, water and landscape ·
Temples and shrines.

Every edge renders its own sentence, with counts on both sides:

> Both hold material on buddhist heritage — 1 approved claim here, 17
> catalogued records and 6 approved claims in Sikkim (on Jaipur's page)

> Both hold material on royal and palace heritage — 1 catalogued record and 5
> approved claims here, 16 approved claims in Jaipur (on Sikkim's page)

Four edges render on each of the three populated destinations.
`qa:global-intelligence` matches every rendered reason against the closed
vocabulary and greps the source for `embedding`, `cosine` and
`vector similarity` — the Phase 14 discipline, continued.

**The evidence is linked, not copied.** Quoting Kyoto's approved claims onto
Sikkim's page would put another destination's content inside this one's
document, which is the isolation `qa:destination` has enforced since Phase
2.5 — and it caught exactly that when the first version of this block did it.
The destination page now links to `/discover?theme=<id>`, where the evidence
for every destination is shown side by side with the term that matched.

## 8-11. Search architecture and payload

**The problem, measured before touching anything:** the root layout serialised
the whole ⌘K index into every document — **301,293 bytes of inline script on a
`/destinations` page whose entire HTML was 371,896 bytes**. Every navigation
paid for a corpus most visits never opened.

**The fix:** the layout now inlines only the navigation entries
(`navigationIndex()`), and the corpus is served from `/api/search-index` — a
route handler with `dynamic = "force-static"`, generated at build time and
cached by the browser. The palette fetches it once, on first open, and falls
back to the seed with an explicit message if the fetch fails.

A checked-in JSON file in `public/` was rejected: it would be a second copy of
a dataset that is derived from the content modules, free to drift the moment a
record changed.

**Isolation is untouched.** `itemsInScope` still admits only the current
destination plus the `null`-owned navigation group, the fetched groups carry
the same `destinationId`/`destinationName` they always did, and a result from
another destination still renders its owner's name.

| Route | HTML before | HTML after | Change |
|---|---|---|---|
| `/destinations` | 371,896 B | **90,776 B** | **−75.6%** |
| `/destinations/sikkim/plan` | 448,269 B | **160,677 B** | **−64.2%** |
| `/` | 585,261 B | **297,572 B** | −49.2% |
| `/destinations/sikkim/discover` | 596,759 B | **309,167 B** | −48.2% |
| `/destinations/sikkim/monasteries/rumtek` | 720,484 B | **432,849 B** | −39.9% |
| New: `/destinations/compare` | — | 69,434 B | — |
| New: `/discover` | — | 100,085 B | — |

Every page dropped ~288 KB. In exchange, one **259,894 B** fetch on first
search open, served in 19 ms and cacheable for the rest of the session.

Search interaction, measured in Chromium:

| | Time from ⌘K to first result |
|---|---|
| First open (fetches the corpus) | **184 ms** |
| Second open (already in memory) | **35 ms** |

No search quality was traded away: the same 1,140-record corpus is searched,
with the same scoping and the same ranking.

## 12-13. Global UX flow and the demo

```
/discover  →  choose interests  →  ranked destinations + why each matched
     │                                        │
     ├── or start from a theme                ├── Explore destination
     │   (Buddhist heritage → 2 destinations) ├── Plan a journey
     │                                        └── Compare
     └── /destinations → country sections, map, coverage table
```

The demo flow is walked end to end by `qa:global-intelligence` in a real
browser: tick **History** → *Show destinations* → `?interests=history` →
**Explore Sikkim** → `/destinations/sikkim` → **Plan a journey** →
`/destinations/sikkim/plan`.

From any destination page, **Destinations with related material** breaks the
cul-de-sac, and each row offers `Compare` and `See the evidence on both sides`.

## 14. Destination comparison

`/destinations/compare?ids=…` — up to four columns, chosen with a GET form so
a comparison is a shareable URL. Seven structural rows plus six per-interest
rows plus the experience-layer row.

**A missing dataset is never rendered as `0`.** Every cell is either a count
or the words *"Not yet available"*, and the per-interest rows keep records and
claims on separate lines so "6 approved claims" can never read as "6 things to
do". The experience-layer row says, for Jaipur and Kyoto, *"Not yet available
— historical knowledge only"*.

Comparing two empty destinations (`?ids=paris,rome`) renders a full table of
"Not yet available" rather than a wall of zeroes — asserted in QA.

## 15-17. Destination results

- **Sikkim** — 53 records, 46 with coordinates, 39 history links, 318 story
  links, 16 approved claims, 9 timeline entries, deep archive. Coverage 94/100
  for History + Heritage. 4 cross-destination edges.
- **Jaipur** — no visitable records; 35 approved claims from 4 sources, 22
  timeline entries, curated. Coverage 73/100. Rendered with *"Historical
  knowledge available. Tourism experience layer not yet available"* and no
  plan link. 4 edges.
- **Kyoto** — 15 approved claims, 7 timeline entries, researched. Coverage
  66/100. Same honest empty-experience treatment. 4 edges.

## 18. Empty destination handling

The twelve registered destinations with nothing are **excluded from matches
and from the comparison picker**, and `/discover` states the split explicitly:
*"3 of 15 registered destinations carry verified content today: 1 with a
tourism experience layer, 2 with approved historical knowledge and no
experience layer yet, and 12 with neither."* Their own pages continue to say
so, and their planner and discovery routes continue to 404.

## 19. Image integrity

The global surfaces render **no photography at all** — they carry counts,
badges and reasons. That is the strongest possible answer to "never show a
Sikkim image for Paris": there is no image to get wrong. Destination cards use
the depth badge and the coverage line; `og:image` still comes from
`destinationOpenGraph()`, so Jaipur's hub emits none rather than borrowing.

## 20. Planner integration

Untouched. `/discover` links to `/destinations/<id>/plan` only where a
destination has an experience layer, and QA asserts the planner still builds
an itinerary (9 stops on Sikkim's default plan) and that the interest → plan
path is one click.

## 21. Mobile result

0 px horizontal overflow at **390 / 768 / 1440 px** on `/discover`, the
filtered variants, the theme view, `/destinations` and a three-column
comparison — 15 measurements.

## 22. Accessibility result

- axe (`qa:a11y`, now 25 routes): **0 violations**, including `/discover`,
  both filtered variants and the three-way comparison (59 / 59 / 61 / 39
  focusables).
- The comparison is a real `<table>` with a `<caption>`, `<th scope="col">`
  and `<th scope="row">`.
- Filters are native checkboxes in a labelled `<fieldset>`; country navigation
  is a labelled `<nav>` whose every `#country-XX` target exists.
- 29 controls on `/discover`, 0 outside the tab order, 0 unlabelled inputs,
  0 heading-level skips.

## 23. Security result

| Probe | Result |
|---|---|
| `?interests=../../etc/passwd` | ignored, page renders |
| `?interests=<script>alert(1)</script>` | ignored, nothing reflected |
| 5,000-character interest | ignored |
| `?theme=../../secrets`, `?theme=unknown-theme` | ignored |
| `/destinations/compare?ids=sikkim,../../etc` | traversal id dropped |
| `?ids=not-a-destination` | unknown id dropped |
| 200-id comparison list | capped at 4 columns |
| unexpected `?country=<script>` on the static entry | ignored |

Every id and interest is validated by **membership in a closed set** built
from the registry, never by syntax alone.

## 24. Performance result

Beyond the payload table in §8-11: `/destinations` remains **prerendered**
(`○` in the build output) — an early version of the country filter read
`searchParams` and silently turned the global entry into a per-request render,
which three suites caught. Country navigation is now in-page jumps, which
keeps the page static at a 16 ms TTFB.

Build: **295/295 pages**, exit 0.

## 25. QA results

Clean build, fresh server, build-output suites run before the server started.

| Suite | Result |
|---|---|
| typecheck | exit 0 |
| lint | exit 0 |
| build | 295/295 |
| **qa:global-intelligence** (new) | **101 passed, 0 failed** |
| qa:discovery | 106 / 0 |
| qa:planner | 85 / 0 |
| qa:route-migration | 86 / 0 |
| qa:destination | 89 / 0 |
| qa:global-explore | 74 / 0 |
| qa:experience | 66 / 0 |
| qa:decision | 43 / 0 |
| qa:research | 88 / 0 |
| qa:narrative | 71 / 0 |
| qa:publishing | 52 / 0 |
| qa:composition | 70 / 0 |
| qa:resilience | 69 / 0 |
| qa:heritage | 21 / 21 |
| qa:integrity | 40 / 40 |
| qa:industry | 25 / 25 |
| qa:gallery | 13 / 13 |
| qa:flows | 114 / 114 |
| qa:industry-flows | 18 / 18 |
| qa:immersive | 50 / 0 |
| qa:a11y | 0 violations across 25 routes |
| qa:stories-map | 45 / 46 — the documented environmental failure |

`qa:stories-map` fails on the same `networkidle` timeout at
`/destinations/sikkim/explore` recorded since Phase 11. Not weakened, not
hidden.

Three existing suites were **updated, not weakened**: `qa:publishing`'s
typed-reader allowlist now includes the global layer (which reads knowledge
through the same typed reader), `qa:route-migration` excludes
`/destinations/compare` from its "no other destination prerenders Sikkim
sections" scan (it is a global route that owns no destination's content), and
`qa:a11y` audits four more routes.

## 26. Files created

| File | Purpose |
|---|---|
| `src/lib/global/coverage.ts` | Per-destination, per-interest coverage; experiences and claims kept apart |
| `src/lib/global/match.ts` | The documented match formula and reasons |
| `src/lib/global/themes.ts` | Six term vocabularies + evidence extraction |
| `src/lib/global/connections.ts` | The cross-destination graph |
| `src/lib/global/index.ts` | Barrel |
| `src/components/global/RelatedDestinations.tsx` | The edge list on a destination hub |
| `src/app/discover/page.tsx` | The interest-first global entry |
| `src/app/destinations/compare/page.tsx` | Coverage comparison |
| `src/app/api/search-index/route.ts` | The deferred, statically generated corpus |
| `scripts/qa/global-intelligence.mjs` | `qa:global-intelligence`, 101 checks |
| `docs/phase-15-global-intelligence.md` | This record |

## 27. Files modified

| File | Change |
|---|---|
| `src/lib/search-index.ts` | `navigationIndex()` / `deferredSearchIndex()` split |
| `src/app/layout.tsx` | Inlines the seed, not the corpus |
| `src/components/search/CommandPalette.tsx` | Fetches the corpus on first open; states loading and failure |
| `src/app/destinations/page.tsx` | Country sections, global CTAs |
| `src/app/destinations/[destinationId]/page.tsx` | Related destinations |
| `src/lib/constants.ts` | `Discover` leads the navigation |
| `scripts/qa/{publishing-integrity,route-migration,a11y}.mjs` | Allowlist, global-route exclusion, four routes added |
| `package.json` | `qa:global-intelligence` |

## 28. Bugs found

1. **The country filter silently de-optimised the global entry.** Reading
   `searchParams` on `/destinations` turned a prerendered page into a
   per-request render. Caught by three existing suites at once
   (`qa:destination`, `qa:global-explore`, `qa:experience`).
2. **Cross-destination evidence broke destination isolation.** The first
   version of `RelatedDestinations` quoted the other destination's claims and
   rendered its depth badge, so Jaipur's page contained "Nyingma", "Yuksom"
   and "Deep archive". `qa:destination` failed on both counts.
3. **A poisoned image-optimizer cache entry hangs a page forever.**
   `/monasteries/dubdi` never reached `networkidle`; one gallery image request
   was issued and never answered. Reproduced outside the browser: the same URL
   returned in 450 ms as JPEG but **timed out at 60 s with 0 bytes** for
   `Accept: image/webp` — while a sibling file in the same directory converted
   in 40 ms. Clearing `.next/cache/images` fixed it instantly (324 ms, and the
   page then loaded with **0 broken images**). The most likely poisoner was my
   own aborted `curl --max-time` probes during diagnosis, which cut an encode
   mid-write.
4. **Setting state synchronously in an effect** in the palette's fetch —
   caught by lint, fixed with a ref.
5. Four bugs in my own new QA checks (a regex expecting attribute order React
   does not use, a term-match pattern that ignored tag-stripping whitespace, an
   unused binding, and a fabrication scan that flagged an *approved, attributed*
   Wikimedia claim reading "famous for its old wall murals").

## 29. Bugs fixed

1. Country navigation became in-page jumps; `/destinations` is prerendered
   again (`○`, 16 ms TTFB), and all three suites pass.
2. `RelatedDestinations` now renders counts and a link to the global theme
   view; no foreign content string and no foreign depth badge appears on a
   destination page. `qa:destination` 89/0.
3. Image cache cleared and the failure documented; `qa:immersive` back to
   50/50 with dubdi reaching `networkidle` in 5.7 s and 0 broken images. The
   operational rule for Phase 16: a fresh build must clear
   `.next/cache/images`, and never abort an in-flight optimizer request.
4. Fetch bookkeeping moved to a ref.
5. QA checks corrected; the fabrication scan now runs over authored prose with
   quoted evidence excluded, and the destination hub — which renders approved
   claims verbatim beside their sources — is out of its corpus, with the
   reasoning written into the file.

## 30. Remaining risks

1. **`/destinations/sikkim/discover` is still 309 KB.** The corpus is gone;
   what remains is 30 experience cards and their RSC payload. Reducing it means
   paginating discovery, which is a product decision, not a payload trick.
2. **Theme matching is term occurrence.** "Both hold material on royal and
   palace heritage" is true of the text; it is not an editorial judgement that
   the two royal histories are comparable. The UI says what was matched and
   shows the term, but a reader who skims may still over-read it.
3. **Only three destinations have anything.** The cross-destination graph is
   demonstrated on 3 of 15, and every edge today involves Sikkim, Jaipur or
   Kyoto. The architecture is proven; the corpus is not broad.
4. **The country navigation does not filter.** It jumps to a section. With 15
   destinations that is enough; at 100 it would not be, and the fix would be a
   static route per country rather than a query parameter.
5. **First search open costs 260 KB.** Cached afterwards, but a visitor who
   opens search on a cold cache waits ~184 ms. A compact array encoding would
   roughly halve it and was left as Phase 16 work rather than risking the
   shape the palette depends on late in the phase.
6. **`ANTHROPIC_API_KEY` remains absent and no AI ran.** No global module
   imports a provider or makes a remote call, and nothing reads a clock or a
   random source — both asserted.

## 31. Exact Phase 16 requirements

Phase 16 is **final SIH hardening, QA, demo and pitch readiness**. It is the
last phase; there is no Phase 17.

1. **Fresh-build discipline, written down and enforced**: stop servers, clear
   `.next` *and* `.next/cache/images`, rebuild, verify the port, then run
   browser QA. Bug 3 above is the reason.
2. **One command that runs the whole battery** and prints a single table —
   there are now 22 suites and the run order matters (build-output suites
   before the server starts).
3. **Resolve or formally accept `qa:stories-map`**, the only standing failure,
   with its five-phase evidence trail.
4. **The demo script**: interest → destination → discovery → record → add to
   trip → plan, plus the provenance drill-down and one honest empty state.
   Every step already exists and is QA-walked; Phase 16 should time it and
   rehearse it.
5. **Compact the search payload** (risk 5) if time allows — measure first.
6. **The pitch**: the differentiator is not "another tourism site" but
   source-grounded knowledge, explainable recommendations, honest gaps, and a
   planner that never invents a fact. `docs/` now holds the measurements for
   every one of those claims.
7. **Do not add destinations, features or phases.**
