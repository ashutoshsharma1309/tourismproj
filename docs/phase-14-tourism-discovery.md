# Phase 14 — Tourism Discovery + Experience Intelligence

Scope: help a visitor who does not yet know what to search for. No new corpus,
no AI, no second content system, no changes to Sikkim's curated facts.

The product now runs **discover → understand → connect → personalise → plan**,
and every step of it is traceable to a record the archive already publishes.

---

## 1. Discovery architecture

```
planner/candidates.ts              discovery/experiences.ts
Experience[]  (one model)     →    groups · why-this-place · counts
      │                                        │
      │                            discovery/related.ts
      │                            related (4 rules) · nearby (coordinates only)
      │                                        │
      │                            discovery/summary.ts
      │                            per-destination counts for comparison
      ▼                                        ▼
  /plan  ← pin=<id> ──────────  /discover  ·  record pages  ·  /destinations
```

**There is one experience model, and discovery did not fork it.** The planner
already assembles every visitable record with its authored edges; discovery
presents that same set for browsing. `qa:discovery` asserts there is no
`src/lib/discovery/itinerary.ts` and that discovery reads
`buildCandidates` — one answer to "what is here", not two.

Discovery is a **lens, not a new page type**. A monastery already has a page
with its history, photographs, audio guides and sources; building a parallel
"experience detail" page would have split the archive's record from the
tourism view of it. So `ExperienceIntelligence` mounts *on the existing
record page*.

Routes: `/destinations/[id]/discover` (new), plus discovery blocks on
`/monasteries/[slug]` and `/places/[slug]`, the destination hub, and
`/destinations`.

## 2. Experience model

Unchanged from Phase 13 except for one addition: **`interestBasis`**, the
evidence behind every interest tag. `Experience.interests` is now *derived*
from that list (`uniq(interestBasis.map(b => b.interest))`), so a tag and its
explanation cannot drift apart — asserted by `qa:discovery`.

Sikkim, measured: **53 visitable records** across 6 districts, **46 publishing
a coordinate**, carrying **39 links to dated historical events** and **318
links to archive stories**.

## 3. Knowledge-graph connections

Every edge below is authored on the *other* record, so nothing here is
inferred:

| From | To | Where it comes from | Status before Phase 14 |
|---|---|---|---|
| History event | Place | `event.relatedPlaces` | rendered, but linked **off-site to Google Maps** |
| History event | Monastery | `event.relatedMonasteries` | rendered |
| Place | History event | inverted `relatedPlaces` | **missing entirely** |
| Story | Place | `story.relatedPlaces` | rendered, linked only to the map |
| Place | Story | `getStoriesForPlace` | rendered |
| Monastery | History event | `MonasteryTimeline` | rendered |
| Experience | Experience | shared event / story / proximity / district | **new** |

Three gaps closed: a place page now lists the historical events that name it;
a timeline event's places link to their own records (with the map link kept
beside them); a story's places link to their records **and** still deep-link
the map.

## 4. Interest provenance

The Phase 13 remaining risk, closed. Recorded where the interest is assigned,
in `candidates.ts`, as one entry per (interest, evidence) pair:

- `record` — "catalogued as a nyingma monastery"
- `history` — "named in 3 dated events in this destination's history"
- `stories` — "2 stories shelved under Sacred Landscapes name it"

Rendered on record pages under **"What it is catalogued under"**, on discovery
cards for the group being browsed, and in the planner's own reasons, which now
read *"Matches Nature — 2 stories shelved under Sacred Landscapes name it."*
rather than "Matches the nature interest you chose."

Dubdi, from the running server:

```
Religious heritage  catalogued as a nyingma monastery; 2 stories shelved under
                    Sacred Landscapes name it; 1 story shelved under Monastery
                    Heritage name it
History             named in 3 dated events in this destination's history;
                    1 story shelved under Sikkim History name it
Nature              2 stories shelved under Sacred Landscapes name it;
                    1 story shelved under Nature & Culture name it
```

## 5. Related-experience logic

Four rules, strongest first; a pair is reported under the first that applies:

1. **Shares a dated historical event** — "Both are named in 3 of the same historical events"
2. **Appears in the same story** — "Both appear in the story '…'"
3. **Within 15 km, both coordinates published** — "2.3 km away in a straight line, measured between published coordinates"
4. **Same district** — "Both are catalogued in Gyalshing"

Ordering: rule strength → shared edges → distance → id. No embeddings, no
cosine similarity, no "people also viewed" — `qa:discovery` greps for those
terms and requires the reason text to match one of the four closed patterns.
Determinism is verified by fetching the same page twice and comparing.

## 6. Geographic discovery

Nearby lists come only from published coordinates, are labelled *"Straight-line
distances between published coordinates. Not road distances, and not travel
times."*, and are **absent entirely** for a record without one. Dubdi — whose
coordinate the archive withholds as disputed — renders:

> No authoritative coordinate is published for Dubdi Monastery, so nothing is
> offered as nearby — a distance from an assumed position would be a made-up
> number.

Tsomgo Lake, by contrast: Kyongnosla Alpine Sanctuary 2.3 km, Nathu La 6.7 km,
Hanuman Tok 13.7 km.

## 7-9. History, story and timeline flows into tourism

- **History → tourism**: a timeline event's related places now link to the
  place record, which carries why-this-place, its interests with provenance,
  connected experiences and add-to-trip. The event card also offers
  "Add to trip" directly.
- **Story → tourism**: a story's places link to their records, and keep the
  map deep-link ("Show on the map") beside them.
- **Timeline → tourism**: `event → place → experience → planner` is walked
  end to end in `qa:discovery`.

## 10-11. Add to trip, and the loop

`Add to trip` is a link to `/destinations/[id]/plan?pin=<experience-id>`.

The planner was **integrated, not rebuilt**. A pin enters the same ranking, as
a hard first sort key ahead of interest match, and the chunk containing it is
selected first — so the planner still decides the day, the order and what sits
beside it. `removed` beats `pinned`: an explicit removal is the more specific
instruction.

Verified in a real browser, clicking through: discovery card → "Explore" →
`/destinations/sikkim/places/gangtok` → "Add to trip" →
`/destinations/sikkim/plan?pin=place%3Agangtok`, where the plan says
*"1 experience you added from discovery is kept in this plan"* and the stop
itself carries *"You added this from discovery, so the plan is built around
it."*

The loop closes in both directions: every planner stop links to its record,
and every record page links back into discovery.

## 12. Global discovery

`/destinations` now shows, per destination, what it actually offers
("53 visitable records · 13 sections" for Sikkim, "35 verified facts, no
visitable record yet" for Jaipur), and a **comparison table** — counts only,
no ranking:

| Destination | Coverage | Visitable records | With coordinates | History links | Story links | Approved facts | Timeline entries |
|---|---|---|---|---|---|---|---|
| Sikkim | Deep archive | 53 | 46 | 39 | 318 | 16 | 9 |
| Jaipur | Curated | — | — | — | — | 35 | 22 |
| Kyoto | Researched | — | — | — | — | 15 | 7 |

An em dash means the archive holds none of that record type. The twelve empty
destinations are **left out of the table** rather than shown as rows of zeroes,
and the depth badge travels with every row so a `researched` destination is
never read as though it had a deep archive behind it. The page states in its
own words that this is coverage, not quality: *"A destination with fewer
records is not a lesser place; it is a place this archive has covered less."*

Counts resolve on the server at build time — the page ships numbers, never a
corpus.

## 13. Search changes

One addition, no restructuring: `SearchGroupIndex` now carries
`destinationName` beside `destinationId` (fifteen strings for the whole index,
not one per record), and a result from another destination renders a chip
naming where it comes from. Scoping is untouched — `itemsInScope` still admits
only the current destination plus global navigation, and `qa:discovery` and
`qa:publishing` both re-assert it.

## 14. Image handling

Every discovery image comes from the record being rendered, so a photograph
can only ever depict that subject in that destination. Alt text is the
record's own. Where the archive has no verified photograph, the card renders a
neutral panel — *"No verified photograph of this monastery is published"* —
never a stand-in.

Measured: 28 images on the Sikkim discovery page, **all with alt text, all
served locally** through `/_next/image`; **zero images** on Jaipur's discovery
page, because Jaipur has no records.

## 15. Sikkim regression

Content counts asserted from clean build output in `qa:discovery` §26:
monasteries **15**, stories **70**, history **26**, places **38**, archive
**78** — unchanged. `qa:heritage` 21/21, `qa:integrity` 40/40,
`qa:gallery` 13/13. No curated record, claim, source or established year was
edited in this phase; the only data-module change was in the *presentation*
layer.

## 16. Jaipur result

`/destinations/jaipur/discover` → 200, states *"Tourism experiences are not yet
available for this destination"*, reports **35 reviewer-approved facts from 4
sources**, renders **0 cards, 0 images, no group navigation**, links only into
Jaipur, and carries no borrowed social card. A Sikkim experience id offered to
Jaipur's planner (`?pin=site:rumtek`) is discarded.

## 17. Kyoto result

Identical behaviour — 200, honest empty state, 0 cards, 15 approved claims,
`researched` depth badge.

## 18. Mobile result

0 px horizontal overflow at **390 / 768 / 1440 px** on `/discover`,
`/discover?interest=nature`, a record page with the discovery block, and
`/destinations` — 12 measurements in Chromium.

## 19. Accessibility result

- axe (`qa:a11y`): **0 violations** on `/destinations/sikkim/discover`, the
  same page filtered, and `/destinations/jaipur/discover` — 136 / 151 / 32
  focusables respectively.
- 0 links outside the tab order, 0 links without an accessible name, 0 images
  without alt text, **0 heading-level skips**.
- The group filter is a labelled `<nav>` with `aria-current` on the active
  entry; interest provenance is a `<dl>`; every card action carries words, not
  an icon alone.

## 20. Security result

| Probe | Result |
|---|---|
| `/destinations/unknown/discover` | 404 |
| `/destinations/paris/discover`, `/destinations/delhi/discover` (registered, empty) | 404 |
| `/destinations/SIKKIM/discover` | 404 |
| `/destinations/..%2f..%2fsikkim/discover` | 404 |
| `?interest=../../etc/passwd` | ignored, plan intact |
| `?interest=<script>alert(1)</script>` | ignored, nothing reflected |
| 4 000-character filter | ignored |
| repeated `?interest=food&interest=nature` | first valid value used |
| `?interest=stays` (real capability, not a discovery interest) | ignored |
| `/destinations/jaipur/plan?pin=site:rumtek` | id discarded — no Sikkim content |

Ids are validated by **membership in this destination's own candidate set**,
never by syntax alone, so a foreign id and a traversal string fail identically.

## 21. Performance result

A real regression was found and fixed during this phase — see §26. Final
measurements, Chromium, cold context:

| Page | networkidle | RSC prefetch | TTFB | HTML |
|---|---|---|---|---|
| `/destinations/sikkim/discover` | 1 083 ms | 32 requests / 471 KB | 117 ms | 597 KB |
| `/destinations/sikkim/monasteries/dubdi` | 1 090 ms | 31 / 357 KB | 24 ms | 599 KB |
| `/destinations/sikkim/plan` | 808 ms | 31 / 187 KB | 59 ms | 448 KB |
| `/destinations` | — | — | 16 ms | 372 KB |

31 RSC requests is the shared layout's baseline, present before this phase.
Planner TTFB is unchanged from Phase 13 (59 ms against 68 ms). Build:
**292/292 pages**, exit 0.

## 22. QA results

Clean build, fresh server, build-output suites run before the server started.

| Suite | Result |
|---|---|
| typecheck | exit 0 |
| lint | exit 0 |
| build | 292/292 |
| **qa:discovery** (new) | **106 passed, 0 failed** |
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
| qa:flows | 113 / 113 |
| qa:industry-flows | 18 / 18 |
| qa:immersive | 50 / 0 |
| qa:a11y | 0 violations, discovery routes added to the audited set |
| qa:stories-map | 45 / 46 — the documented environmental failure |

`qa:stories-map`'s single failure is the same `networkidle` timeout on
`/destinations/sikkim/explore` recorded in Phases 11–13. Its **other** check —
"STORY → MAP: a place link deep-links the explore map" — failed mid-phase
because of a change of mine and was fixed by restoring the capability, not by
touching the test (§26).

Two existing suites were **updated, not weakened**: `qa:publishing`'s
typed-reader allowlist now includes the discovery layer (which reads knowledge
through the same typed reader), and `qa:a11y` audits three more routes.

## 23. Files created

| File | Purpose |
|---|---|
| `src/lib/discovery/experiences.ts` | Groups, why-this-place, scoped lookup |
| `src/lib/discovery/related.ts` | Four related-experience rules; nearby |
| `src/lib/discovery/summary.ts` | Per-destination counts for comparison |
| `src/lib/discovery/index.ts` | Barrel |
| `src/components/discovery/ExperienceCard.tsx` | A discoverable experience |
| `src/components/discovery/InterestProvenance.tsx` | Interest + its evidence |
| `src/components/discovery/ExperienceIntelligence.tsx` | The lens on a record page |
| `src/app/destinations/[destinationId]/discover/page.tsx` | The route |
| `scripts/qa/discovery-integrity.mjs` | `qa:discovery`, 106 checks |
| `docs/phase-14-tourism-discovery.md` | This record |

## 24. Files modified

| File | Change |
|---|---|
| `src/lib/planner/types.ts` | `InterestBasis`; `pinned` on the input; `pinned` reason kind |
| `src/lib/planner/candidates.ts` | Records interest provenance; interests derived from it |
| `src/lib/planner/scoring.ts` | Reasons name the evidence; pinned ranks first |
| `src/lib/planner/itinerary.ts` | Chunks containing a pin are selected first |
| `src/lib/planner/state.ts` | `pin` parsed and validated like `remove` |
| `src/components/journey/{JourneyForm,JourneyDay}.tsx` | Pins survive a rebuild; `prefetch={false}` |
| `src/lib/destinations/sections.ts` | A capability may own several routes |
| `src/app/sitemap.ts` | Emits every route a capability owns |
| `src/app/destinations/page.tsx` | Capability summary + comparison table |
| `src/app/destinations/[destinationId]/page.tsx` | Discover/Plan CTAs; "Explore this destination through" |
| `.../monasteries/[slug]/page.tsx`, `.../places/[slug]/page.tsx` | Discovery block |
| `.../history/[slug]/page.tsx` | Places link to records + add-to-trip |
| `.../stories/[slug]/page.tsx` | Places link to records; map link kept; "Open access" removed |
| `src/lib/search-index.ts`, `src/components/search/CommandPalette.tsx` | Result attribution |
| `src/types/destination.ts` | `experiences` capability relabelled |
| `scripts/qa/{a11y,publishing-integrity}.mjs` | Routes added; allowlist widened |

## 25. Bugs found

1. **A megabyte of speculative prefetch.** The discovery page issued 46 RSC
   prefetches totalling **1 006 KB**, and a record page 31 / 490 KB, because
   every card and related link prefetched its target — and each target embeds
   the 265 KB search index. It also made `/monasteries/dubdi` never reach
   `networkidle`: an image request was starved behind the prefetch stream, so
   `qa:immersive` timed out.
2. **"Open access" was an inference.** A story's place card printed
   "Open access" whenever the record carried no permit note — a practical
   claim derived from an absence.
3. **A timeline event's places led off-site.** Related-place cards linked to
   Google Maps, ending the discovery journey on someone else's website.
4. **A place page could not reach its own history.** `relatedPlaces` was
   readable in one direction only.
5. **`story.relatedPlaces` reached the map but not the record.**
6. **I broke `qa:stories-map` mid-phase**, by replacing the story→map deep
   link with a story→record link.
7. Four bugs in my own new QA checks (HTML entities not unescaped, two
   fixtures that did not carry the edge under test, a price regex matching
   "monasteries 2", and two browser clicks that read the URL before the
   navigation started).

## 26. Bugs fixed

1. `prefetch={false}` on every secondary discovery link — cards, related,
   nearby, filters, remove-links and alternatives. Discovery dropped to
   **32 requests / 471 KB**, dubdi to 357 KB, and both pages reach
   `networkidle` in ~1.1 s. `qa:immersive` returned to 50/50.
2. The "Open access" label is gone: a permit note renders "Permit required";
   its absence renders nothing.
3. Timeline event places now link to the record, with the map link kept
   beside them and "Add to trip" added.
4. `ExperienceIntelligence` renders "Historical events connected to this
   place" from the inverted edge.
5. Story places link to records **and** keep "Show on the map".
6. The story→map deep link was restored as a second affordance — the test
   was never touched.
7. QA checks corrected.

## 27. Remaining risks

1. **The discovery page is large** — 597 KB of HTML for 30 cards, most of it
   the shared 265 KB search index that every page carries. Scoping that index
   per destination was deferred in Phase 6 and is still deferred.
2. **Interest breadth is uneven.** Sikkim carries all ten interests, so the
   "only what this destination supports" rule is invisible there; it is
   visible only in the empty destinations. A second populated destination
   would demonstrate it properly.
3. **Group ordering is alphabetical** (`availableInterests` sorts by id), so
   "Architecture" leads and "Religious heritage" trails, which is not the
   order a visitor to Sikkim would expect. Deliberately not "fixed" by hand-
   ranking, which would be an editorial claim.
4. **Related experiences cap at four** on record pages; a record connected to
   twenty others shows no "see all".
5. **78 hardcoded `/destinations/sikkim/…` literals** remain in older route
   modules, pinned by the Phase 12 ratchet. Two were replaced this phase.
6. **`ANTHROPIC_API_KEY` is still absent, and no AI ran.** No discovery
   module imports a provider or makes a remote call; `qa:discovery` asserts
   it, along with the absence of any clock or random source.

## 28. Exact scope for Phase 15

Phase 15 is **Global Tourism Intelligence + Cross-Destination Intelligence**.
What this phase deliberately left for it:

1. **Cross-destination connections.** The comparison table counts destinations
   side by side; it does not connect them. Shared themes, shared periods and
   shared claim subjects across Sikkim, Jaipur and Kyoto are the natural next
   edges — and must be authored or evidenced, not inferred by similarity.
2. **A global discovery entry** that lets a visitor start from an interest
   ("Buddhist heritage", "hill stations") rather than from a destination.
3. **Scoping the ⌘K index per destination**, closing risk 1 and paying for
   the payload the discovery layer now sits on.
4. **Depth-aware global ranking** — a way to surface researched destinations
   without implying they carry a deep archive's authority.

Not for Phase 15: rebuilding the planner or discovery, adding destinations, or
introducing an AI dependency. Phase 16 is final hardening, QA, demo and pitch.
