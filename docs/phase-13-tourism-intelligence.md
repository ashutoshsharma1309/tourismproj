# Phase 13 — Tourism Intelligence + Journey Planner

Scope: turn verified destination knowledge into a personalised, explainable,
geographically coherent journey. No new corpus, no AI, no changes to Sikkim's
curated content, no dashboard.

**Route:** `/destinations/[destinationId]/plan` — destination-native, the
destination inherited from the URL and never asked for again.

---

## 1. Planner architecture

```
content accessors            candidates.ts          scoring.ts
(monasteries, places,   →    Experience[]      →    ScoredExperience[]
 history, stories)           (a VIEW, not a          (5 stated weights,
                              database)               2 sort keys)
                                                          ↓
    state.ts          ←    the URL is the state    itinerary.ts
 (parse + validate)                                (group by area →
                                                    chunk by pace →
                                                    pick best chunks →
                                                    order by proximity)
                                                          ↓
                                             geography.ts (straight lines only)
                                                          ↓
                                    /destinations/[id]/plan  +  components/journey/*
```

Seven modules under `src/lib/planner/`, two presentational components under
`src/components/journey/`, one route. **No client component on this path** —
the page ships 19 script tags against 22 on `/monasteries`, i.e. the planner
adds none of its own.

Two planners now coexist deliberately, and the page says so:

| | `/destinations/[id]/planner` (Sikkim only) | `/destinations/[id]/plan` (this phase) |
|---|---|---|
| What it answers | which valleys, in which order, sleeping where | what to see, why, grouped coherently |
| Basis | hand-authored road-corridor graph | the destination's own knowledge graph |
| Travel legs | states real ones — a person encoded the roads | states none, ever |
| Generalises | no | yes — it is derived from content |

The capability model keeps them apart: `tripPlanner` (relabelled "Road
itinerary") stays `depth === "deep"`; the new `experiences` capability is
**derived from content presence** — `sites.length > 0 || places.length > 0`.

## 2. User input model

The **URL is the state**. `?days=5&pace=intensive&interests=history,nature&remove=site:rumtek`
is the entire input, which buys three things at once: determinism you can
see and share, a planner that works with JavaScript disabled, and an
interaction surface testable with one HTTP request.

| Input | Values | Required |
|---|---|---|
| destination | from the route | inherited, never asked |
| days | 1–7 (form), up to 14 accepted from a URL | defaults to 3 |
| pace | relaxed 2/day · balanced 3/day · intensive 5/day | defaults to balanced |
| interests | only those the destination can satisfy | optional |
| removals | ids validated against this destination's set | optional |

Interests are **derived, not listed**: `availableInterests()` returns only
themes at least one catalogued record carries. Sikkim offers ten
(architecture, art, culture, food, heritage, history, local life, museums,
nature, religious heritage). "Food" appears because eight food stories name
towns in `relatedPlaces`; it would not appear for a destination with no such
records, and no interest is shown that would return nothing.

## 3. Experience model

An experience is **somewhere a traveller can stand that already exists in the
archive with a source**. It is a view over `monasteries` and `places`,
assembled through the same `content.ts` accessors the rest of the destination
uses. Sikkim: **53 candidates** (15 monasteries + 38 places) across 6
districts, **46 of 53 publishing a coordinate**.

Carried per experience: title, the record's own sourced sentence *verbatim*,
its own type label, district, coordinates *where published*, its link, its
image, the history events and stories that name it, its evidence links, and
practical notes.

Deliberately absent — every one of these is a field tourism software invents:
price, opening hours, visit duration, travel time, rating, popularity,
availability, "best time to visit".

**An approved research claim is not an experience.** A claim is a sentence; an
experience is a place. Name-matching claims onto records was built and then
**removed**: across Sikkim's 16 approved claims it produced two matches, one
of which ("Gangtok" inside a claim about migrant communities) was an
incidental mention, not a statement about the place. Objective 7 says not to
invent relationships to make the graph look impressive, so the knowledge is
surfaced as its own panel instead, linked but never converted into stops.

## 4. Scoring formula

```
score = interestMatch        0-50   25 per matched interest, capped
      + historicalRelevance  0-20   5 per history event naming the record
      + culturalRelevance    0-20   4 per story naming the record
      + heritageRelevance    0-5    a catalogued heritage/sacred site
      + evidenceStrength     0-5    3 for a citable source + 2 for a coordinate
```

Sort keys, in order:

1. **Does it match a chosen interest at all?** Everything that does outranks
   everything that does not.
2. Then the score. 3. Then the id — stable, so the same input gives the same
   order.

Key 1 was added after measurement, not on principle. Points alone did not
deliver "prioritize experiences matching the traveller's interests": asking
for **Nature** returned Pemayangtse, Tashiding and Dubdi as the first three
stops, because 20 points of historical relevance + 20 cultural + 5 heritage
put the most-written-about monasteries level with a lake that actually
matched. An additive model lets archive density outvote the traveller. The
partition fixes it without discarding anything — unmatched records still
appear, still ranked among themselves, and are labelled "Included to fill the
day — it did not match your interests directly."

Day selection inherits the same priority: chunks are ordered by how many
matching stops they contain, then by fullness, then by summed score.

There is no model, no learned weight, no popularity signal and no random
tie-break anywhere in this path — `qa:planner` asserts the scoring module
contains no `await`, and that no planner file reads `Date.now()`,
`new Date()` or `Math.random()`.

## 5. Geographic logic

- Days are cut **per district**, before selection, so a day can never straddle
  two areas.
- Within a day, stops are ordered **nearest-neighbour** from the day's
  highest-ranked stop, using published coordinates.
- Every distance is a **straight line between two published coordinates**,
  labelled in the UI as "not a road distance or a travel time".
- A record with no published coordinate is **never given one**. It sorts last
  in its day, contributes no distance (`undefined`, not `0`), and the card
  says "No published coordinate, so it is not placed geographically". Dubdi is
  the live case — the archive withholds its coordinate as disputed.

Sikkim, 7 days at intensive pace: 7 days, 35 stops, **one district per day**
(Gangtok, Gyalshing, Mangan, Namchi, Gangtok, Gyalshing, Mangan), with each
day's spread reported ("stops lie within 4.5 km of each other in a straight
line").

Nearest-neighbour is not the optimal tour and is not claimed to be. Solving
it exactly for three to five stops would be precision the straight-line model
does not have.

## 6. Itinerary generation

1. Build candidates. 2. Drop removals. 3. Rank. 4. Group by area. 5. Cut each
area into day-sized chunks. 6. Take the best `days` chunks. 7. Order each day
by proximity.

A day may be **shorter** than the pace capacity when an area's remainder is
small: a short coherent day is honest, a full incoherent one is not. A day is
never emitted empty, nothing is ever duplicated to pad, and no schedule is
produced.

## 7. Explainability

Every stop carries reasons generated from the same arithmetic that ranked it:

> · Matches the nature interest you chose.
> · Named in 5 events in this destination's history.
> · Connected to 18 stories in the archive.
> · 4.5 km from the previous stop in a straight line — not a road distance or a travel time

Nothing says "AI selected this", and the page states plainly: *"Nothing here
is AI-generated. The ranking is a documented arithmetic formula and the
explanations describe that arithmetic."* `qa:planner` asserts both the
presence of that sentence and the absence of any AI-authorship claim.

## 8. Provenance

Each stop links to the history events and stories that name it — the same
records, with their own sources and claim types, that the ranking counted.
The destination's approved research is surfaced in its own panel with its
source count. The planner adds no facts of its own: the only sentences it
authors describe **its own logic**, never the destination.

## 9. Practical-data safety

Nothing practical is synthesised. Where a record publishes something — a
permit requirement, an elevation — it is shown with its label. Everything
else is stated as absent, once and prominently.

`qa:planner` greps the fully-expanded 7-day intensive plan for seven
fabrication patterns and requires zero matches: opening-hours ranges, prices,
entry fees, travel times, opening claims, booking claims, ratings.

## 10. Sparse-data handling

| Case | Behaviour |
|---|---|
| Registered, no content at all (12 destinations) | **no planner route** — 404 |
| Approved knowledge, nothing visitable (Jaipur, Kyoto) | route exists, says "No verified experiences yet", reports the knowledge it does have, builds nothing |
| Corpus cannot fill the requested trip | builds what it can, states the shortfall |

Measured shortfall, on a real destination: Sikkim with 50 of 53 records
removed and 7 days requested → **3 days built, 3 stops**, and the message
*"Only 3 days of verified experiences are currently available for this
destination. Nothing has been invented to fill the remaining 4 days."*

Sikkim's own corpus never triggers the gap, which is exactly why that path is
exercised deliberately in QA — an untested honesty path is not an honesty
path.

## 11. Sikkim result

- 53 candidates, 6 districts, 46 coordinates, 10 interests offered.
- Balanced 3 days → 9 stops; relaxed → 6; intensive → 15; 7 days intensive →
  35 stops over 7 single-district days.
- Content counts unchanged: monasteries 15, stories 70, history 26, places 38,
  archive 78 (asserted in `qa:planner` §22).
- The routed corridor planner is untouched and linked from the new one.

## 12. Jaipur result

Route loads (HTTP 200), renders "No verified experiences yet", reports **35
reviewer-approved facts from 4 sources**, builds **0 stops**, links only into
Jaipur, and contains no Sikkim content.

## 13. Kyoto result

Identical behaviour — 200, honest empty state, 0 stops, 15 approved claims
behind it.

## 14. Mobile result

0 px horizontal overflow at **390 / 768 / 1440 px**, on both the default plan
and a fully-expanded 7-day intensive plan with interests selected (6 checks,
measured in Chromium).

## 15. Accessibility result

- `qa:a11y` (axe): **0 violations** on `/destinations/sikkim/plan`, on the
  same page with options applied, and on `/destinations/jaipur/plan`.
- 115 focusable elements on the default plan, 188 with options; **0 outside
  the tab order**, **0 unlabelled inputs**.
- Real `<fieldset>`/`<legend>`, native radios and checkboxes — visible, not
  `sr-only`-hidden — a real `<button type="submit">`, and
  `aria-label="Remove … from the plan"` on every removal link.
- Keyboard-driven end to end: focus a pace radio, Space, Enter → the server
  rebuilds the plan at `?days=3&pace=relaxed` with 6 stops.
- Focus indicator measured, not assumed: the focused control matches
  `:focus-visible` with a 2 px outline.

## 16. Security result

Every value in the query string is untrusted and parsed against a closed
vocabulary. Removal ids are checked **by membership in this destination's own
candidate set** — so an unknown id, another destination's id and a traversal
attempt all fail the same way. No user-supplied string reaches a filesystem
path, module specifier or data key.

| Probe | Result |
|---|---|
| `/destinations/unknown/plan` | 404 |
| `/destinations/..%2f..%2fsikkim/plan` | 404 |
| `/destinations/sikkim%00/plan` | 404 |
| `/destinations/SIKKIM/plan` | 404 |
| `/destinations/paris/plan` (registered, no content) | 404 |
| `?remove=site:../../../etc/passwd` | ignored, plan intact |
| `?remove=place:tsomgo-lake'--` | ignored |
| 5 000-character parameter | ignored |
| 200-id removal list | capped at 60 |
| `?days=999999` / `?days=-4` | clamped |
| `?pace=<script>alert(1)</script>` | ignored, nothing reflected |
| 500 repeated interests | capped |

## 17. Performance result

| Measure | Value |
|---|---|
| TTFB, 3-day plan (53 candidates ranked, chunked, ordered) | **68 ms** |
| TTFB, 7-day intensive plan | **50 ms** |
| Script tags on `/plan` vs `/monasteries` | **19 vs 22** — no client component added |
| HTML, `/plan` vs `/monasteries` | 447 KB vs 424 KB (both dominated by the shared ⌘K index) |
| Build | 289/289 pages, exit 0 |

Only the selected destination's content is loaded: the accessors dynamically
import per destination, and Jaipur's planner pulls no Sikkim module.

## 18. QA results

Clean build, fresh server (no stale process on 3000), suites run before the
server for anything reading build output.

| Suite | Result |
|---|---|
| typecheck | exit 0 |
| lint | exit 0 |
| build | 289/289 |
| **qa:planner** (new) | **85 passed, 0 failed** |
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
| qa:flows | 113 / 113 |
| qa:industry-flows | 18 / 18 |
| qa:immersive | 50 / 0 |
| qa:a11y | 0 violations (planner routes added to the audited set) |
| qa:stories-map | the documented environmental failure, unchanged |

`qa:stories-map` fails exactly as recorded in Phase 11 §17 and Phase 12 §6:
`page.goto(..., { waitUntil: "networkidle" })` on
`/destinations/sikkim/explore` never settles late in the long-running desktop
context. Not weakened, not marked green, unrelated to this phase.

Two `qa:route-migration` checks were **updated, not weakened**: the
capability-gate check now also accepts `destinationsWithAnyCapability` (still
capability-derived params), and the social-card checks follow the block into
the shared helper — plus a new check that no destination page types an image
path into its card.

## 19. Files created

| File | Purpose |
|---|---|
| `src/lib/planner/state.ts` | URL-as-state: parsing, validation, link building |
| `src/lib/planner/geography.ts` | Straight-line distance, area grouping, proximity ordering |
| `src/components/journey/JourneyForm.tsx` | The GET form — no client JS |
| `src/components/journey/JourneyDay.tsx` | A day and its stops |
| `src/app/destinations/[destinationId]/plan/page.tsx` | The route |
| `src/lib/destinations/social-card.ts` | One place that builds a destination's `openGraph` |
| `scripts/qa/planner-integrity.mjs` | `qa:planner`, 85 checks |
| `docs/phase-13-tourism-intelligence.md` | This record |

`src/lib/planner/{types,candidates,scoring,itinerary,index}.ts` already
existed in the working tree from an earlier session and were adopted rather
than rewritten — see §21.

## 20. Files modified

| File | Change |
|---|---|
| `src/lib/planner/candidates.ts` | Reads `story.relatedPlaces`; places gain story links and story-derived interests |
| `src/lib/planner/scoring.ts` | Interest match promoted to a hard first sort key |
| `src/lib/planner/itinerary.ts` | Day selection prefers chunks with more interest matches |
| `src/types/destination.ts` | New derived capability `experiences`; `tripPlanner` relabelled "Road itinerary" |
| `src/lib/destinations/content.ts` | Derives `experiences` from content presence |
| `src/lib/destinations/resolve.ts` | `destinationsWithAnyCapability()` |
| `src/lib/destinations/sections.ts` | `experiences → "plan"` |
| `src/app/destinations/[destinationId]/page.tsx` | Planner CTA; card via the shared helper |
| `scripts/qa/a11y.mjs` | Three planner routes added to the audit |
| `scripts/qa/route-migration.mjs` | Gate + social-card checks follow the refactor |
| `package.json` | `qa:planner` |

## 21. Bugs found and fixed

1. **`/destinations/jaipur/plan` shipped Sikkim's social card.** The exact
   regression Objective 23 asks about, one week old: page metadata replaces
   the parent's `openGraph`, so the new page — declaring none — inherited the
   root layout's Rumtek photograph. Found by `qa:planner`, fixed by extracting
   `destinationOpenGraph()` and using it on both the hub and the planner, so
   the correct thing is now the easy thing.
2. **"Jaipur has undefined reviewer-approved facts."** `PublishedDestination.stats`
   is typed `Record<string, number>`, so `stats.approvedClaims` compiles and
   is `undefined` at runtime. Switched to the properly-typed
   `depth.metrics.approvedClaims`, and `qa:planner` now fails on any rendered
   `undefined` / `NaN` / `[object Object]`.
3. **Interest selection did not actually prioritise.** Measured, then fixed
   with the ranking partition described in §4.
4. **`story.relatedPlaces` was never read.** An authored edge sat unused, so a
   town named by eight food stories looked identical to one named by none.
5. **Checkbox parsing.** The form posts repeated `interests=` keys; the
   parser read only the first value, silently dropping every interest but one.
   Caught before shipping; the parser now accepts both shapes.
6. Three bugs in my own QA checks (a regex matching the wrong operator, one
   matching React's attribute order, one flagging detail pages that
   legitimately carry their own card).

## 22. Remaining risks

1. **A pre-existing `src/lib/planner/geography.ts` was overwritten.** Another
   session in this repository had left a planner scaffold from the previous
   night; before recognising it I wrote a same-named file over that one. It was
   untracked, so the original content is unrecoverable. The rewrite implements
   the API the scaffold's `index.ts` declares and all suites pass, but this is
   an honest loss and the reason `docs/` now records it. Concurrent sessions in
   this repo need `git status` checked before writing new files.
2. **Interest provenance is not shown.** A monastery matches "nature" because
   sacred-landscape stories name it — true and traceable, but the card says
   only "Matches the nature interest you chose", not which story shelved it
   there.
3. **Section index pages still inherit the root layout's card.** Correct today
   (Sikkim-only), wrong the day a second destination gains a section — the
   same defect class as bug 1, one level down.
4. **Reordering stops by hand is not offered.** Order is derived from
   geography; a manual override would either break determinism or need its own
   state. Removal and re-planning are the supported edits.
5. **78 hardcoded `/destinations/sikkim/…` literals** remain in older route
   modules, pinned by the Phase 12 ratchet.
6. **`ANTHROPIC_API_KEY` is still absent, and no AI ran.** The planner does not
   need one and does not have one. Nothing in this phase was AI-generated,
   simulated or labelled as such.

## 23. Exact next product work

1. Carry interest provenance onto the card ("shelved under Sacred Landscapes
   by 3 stories"), so the tagging is inspectable rather than merely correct.
2. Give section index pages the shared card helper, closing risk 3 before a
   second destination earns a section.
3. Let a stop be moved between days, keeping determinism by encoding the
   override in the URL like every other input.
4. Feed the planner's day grouping into `/explore`, so a plan can be seen on
   the map it was ordered by.
5. When a credential exists, run `npm run research:evaluate -- --preflight`
   and only then consider AI as an *enrichment* layer over this planner:
   natural-language explanation of a plan the deterministic engine already
   built, never a source of facts and never in the selection path.
