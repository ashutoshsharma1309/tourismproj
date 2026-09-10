# Phase 19 — Global Tourism Capsules

Four destinations outside India — Paris, Rome, Istanbul, New York City — at
capsule depth, on the Phase 17 framework and through the Phase 18 pipeline.

The point was never four more cities. It was to find out what in this
architecture only worked because every destination so far had been Indian.
Three things were, and this phase is mostly the story of finding them.

---

## 1. Destinations added

| Destination | Scope | Places | History | Experiences | Stories | Sources | Photographs |
|---|---|---|---|---|---|---|---|
| Paris | Landmarks of the capital, and the royal court at Versailles that shaped it | 6 | 5 | 4 | 3 | 9 | 6 |
| Rome | The ancient city, its temples and its Baroque squares | 6 | 5 | 4 | 2 | 7 | 6 |
| Istanbul | Byzantine and Ottoman monuments of the historic peninsula | 6 | 5 | 4 | 3 | 9 | 6 |
| New York City | The harbour monuments, bridges and museums of the city | 6 | 5 | 4 | 3 | 10 | 6 |
| **Total** | | **24** | **20** | **16** | **11** | **35** | **24** |

Every limit the brief set is met: 5–7 places, 3–5 historical facts, 3–5
experiences, ≤5 timeline entries, ≤5 stories. **The timeline is the history
list** — a capsule has one chronology, not two, and `qa:global-capsules` §2
asserts it stays that way.

Paris's `scope` says out loud that Versailles is not in Paris. The
alternative was a capsule quietly annexing a town 20 km away.

Sikkim is untouched and remains the only `deep` destination. Jaipur and Kyoto
are the only two Phase 19 did not touch.

## 2. Interest themes, taken from the data

| | Themes the capsule's experiences declare |
|---|---|
| Paris | architecture, art, heritage, history |
| Rome | architecture, culture, heritage, history |
| Istanbul | architecture, heritage, history, sacred |
| New York City | architecture, culture, heritage, history |

An experience is created only where **two or more places share a theme**, so
these are counted, not asserted. Paris has one museum in its six places, so it
gets no `museums` experience despite the brief listing "Art & Museums" — the
Louvre and Montmartre carry `art` between them and that is what is offered.
The same rule leaves New York without `museums` and Rome without `sacred`.
`qa:global-capsules` §9 checks that no destination offers an interest its own
records do not support.

## 3. Sources — and a second one

Phase 18 cited Wikipedia and nothing else, and named official sources as the
obvious next retrieval pass. Phase 19 got half way there.

**UNESCO could not be used.** The World Heritage Centre is the right source
for eleven of these twenty-four places, and it answers this environment with
a Cloudflare challenge — HTTP 403 on both `whc.unesco.org/en/list/<id>/` and
the XML list. Working around a bot protection is not something this pipeline
will do, so **no UNESCO URL is cited anywhere in Phase 19**. A citation nobody
fetched is the thing this project has refused for nineteen phases.
`qa:global-capsules` §3 enforces it: every source host must be one the
pipeline actually fetched.

**Wikidata was.** Each place is now also looked up in Wikidata, which
publishes inception and opening dates as *structured values with a stated
precision*, often with references of their own. Eleven of the 35 sources are
Wikidata entities, and they do two jobs:

- **They corroborate.** Where a retrieved Wikipedia sentence names a year that
  Wikidata independently records for the same place, the entry cites both, and
  the page shows two citations. **10 of the 20 history entries** are
  corroborated this way. No new field, no badge, no score — `CapsuleContent`
  already renders every source an entry cites, so a second source appears
  simply by being cited.
- **They choose.** This turned out to matter more (see §5.3).

Where the two sources disagree, the Wikidata date is **not published** and
nothing is reconciled. Rome's Colosseum is the clearest case: Wikidata records
inception 82 and opening 81; the retrieved sentence says construction began in
72 and finished in AD 80. The capsule publishes the sentence with AD 80 and
cites Wikipedia alone.

Confidence remains `medium` throughout, and `reviewedBy` still reads
`"scripts/capsules (retrieved; pending human review)"`. **These capsules are
not human-reviewed.** That is unchanged from Phase 18 and remains the single
largest caveat.

## 4. Storage and build

| | Before | After | Change |
|---|---|---|---|
| Capsule source (all) | 112 KB | 172 KB | +60 KB |
| — the four new files | — | 47 KB | |
| — the eight Phase 18 files | 77.6 KB | 79.1 KB | +1.4 KB (regenerated, §5) |
| Capsule photographs | 10 MB / 36 files | 19 MB / 60 files | +9 MB / +24 |
| `public/images` total | 113 MB | 122 MB | +9 MB |
| Build | 327 pages | **319 pages** | **−8** |

**The build got smaller while gaining four destinations.** Four capsules add
eight pages (a `/discover` and a `/plan` each — their hubs already existed as
planned destinations). Removing the 404 shells described in §5.4 removes
sixteen. 327 + 8 − 16 = 319.

Per-page cost, measured on the running server:

| Page | Rendered `<main>` | Full response |
|---|---|---|
| Paris / Rome / Istanbul / NYC discovery | ~60 KB | 172–190 KB |
| Delhi discovery (Phase 18, for comparison) | 59.5 KB | 173 KB |
| Sikkim discovery | — | 305 KB |

Two numbers, because Phase 18's doc quoted "60–80 KB" for a capsule discovery
page without saying which. It was the **rendered content**, and it still holds.
The full response is ~175 KB, of which ~102 KB is the RSC flight payload and
most of that is a 169-entry JS module graph — identical for Sikkim's pages and
unrelated to capsule content. Recording both here so the ambiguity does not
recur.

A capsule's bytes still reach only its own destination's pages: the importers
in `capsules/index.ts` are lazy, and `qa:content-framework` asserts no page
ships a capsule payload it does not render.

`/discover` (the global page) went from 11 cards to 15 and from 182 KB to
**223 KB** — **15 KB per card, down from ~16.5 KB**. The growth is entirely
more destinations and none of it is cost creep, so the total ceiling was
raised to 260 KB with that arithmetic written into the check. The per-card
ceiling of 22 KB, which is the one that actually guards against creep, is
untouched and still passes with margin.

---

## 5. Defects found and fixed

Seven, of which four were shipped in Phase 18 and invisible until the archive
left India.

### 5.1 The sentence splitter broke on abbreviations — shipped content

Phase 18 split sentences on "full stop followed by a space". Heritage prose is
full of `(r. 1628–1658)` and `c. 1500`, so it produced fragments, and the
length filter passed them through. The Taj Mahal's published history entry read:

```
"It was commissioned in 1631 by the fifth Mughal emperor, Shah Jahan (r."
```

An audit of all eight Phase 18 capsules found **9 defective strings**: 3
fragments (one starting mid-word in lower case) and 6 ranking claims. Rome did
not cause this — `"Construction began under the Emperor Vespasian (r. 69–79 AD)
in 72…"` just made it impossible to keep missing.

Fixed with an abbreviation-aware splitter and a `wellFormed` guard: a
publishable sentence opens like one, closes like one, and balances its
brackets. Anything else is **dropped, not repaired** — repairing it would mean
writing words, which the generator may not do.

### 5.2 The date reader could not see the ancient world

`\b(1[0-9]{3}|20[0-2][0-9])\b` — four-digit years from 1000 to 2029. Fine for a
Mughal fort, useless for an amphitheatre finished in AD 80.

Rome returned **two dated sentences across six places**. The Colosseum, the
Pantheon, the Roman Forum, Piazza Navona and the Basilica Cistern returned
none. Shipping that would have given Rome a two-entry timeline of modern
trivia.

`dateOf` now reads BC/BCE, AD/CE, four-digit years and centuries, in that
order, after stripping regnal ranges — `(r. 69–79 AD)` describes a person, not
an event, and would otherwise have dated the Colosseum to 79. **A century is
published as a century**: `period: "6th century"` with **no year**, because a
source that says "the 6th century" has not told anyone the year and picking
one would be invention. Ordering still needs a number, so a century sorts at
its midpoint; that number is never displayed and never stored.

Rome's timeline now runs 179 BC → AD 80 → AD 126 → 16th century → 1762.

### 5.3 Which fact leads — and why the second source earns its place

Taking each place's *first* dated sentence gave the Blue Mosque its 1985
UNESCO listing rather than its construction, and Central Park "managed by the
Conservancy since 1998".

Taking the *earliest* was no better: it dated Ellis Island to the Welshman who
bought the island in 1774, and the Statue of Liberty to the date inscribed on
its tablet.

The signal that actually separates "this place's founding" from "a date that
happens to appear nearby" is the second source. **Corroborated candidates lead,
earliest breaks the tie**, and where Wikidata is silent — the Roman Forum, the
Pantheon — earliest is still used. This is why the Wikidata lookup is not
decoration: it does not merely add a citation, it chooses the entry.

Three smaller selection bugs fell out of the same review:

- **Regnal numerals.** The initials guard protected `J. Smith` and also
  `Ahmed I.`, gluing the Blue Mosque's construction sentence to its neighbour
  until the pair exceeded every length filter and vanished. I, V, X, L, C, D
  and M are now excluded from that guard.
- **Corroboration read only the first year.** `"Construction started on March
  17, 1930, and the building opened … on May 1, 1931"` was read as 1930,
  missed Wikidata's 1931, and the Empire State Building ended up dated to the
  hotel that stood on the site in 1893.
- **A 320-character cap** excluded the Arc de Triomphe's only sentence about
  its own founding (408 characters), leaving it dated to a sentence about a
  taller arch in Mexico City. Raised to 420.

### 5.4 Section routes built 404 shells, and served Sikkim's metadata

`generateStaticParams` for `/stories` and `/history` gated on the **content**
capability while the page requires the **page-bearing** one — the distinction
Phase 18 introduced and then only half-applied. Every capsule was therefore
built, rendered, 404'd and written to disk: **24 pages that exist in order not
to exist**.

Worse, both routes carried a static `export const metadata` object reading
`"Stories of Sikkim"`, so `/destinations/paris/stories` shipped an RSC payload
titled *"Stories of Sikkim · Sikkim Darshan"* with Rumtek as its social card.
This is precisely the failure `destinationOpenGraph()` was extracted to prevent
in Phase 12 — in the two routes that had never been converted.

Both now derive params from `CAPABILITY` and metadata from the destination in
the URL.

### 5.5 Ranking language, quoted from a source

The retrieved leads are full of `"the largest Baroque fountain in the world and
one of the most famous fountains in the world"` and `"listed No.1 among the
world's most-visited tourist attractions"`. Sourced, verbatim — and exactly the
marketing voice every brief since Phase 13 has forbidden.

Candidate sentences are now filtered at **selection**, so the sentence is never
chosen and the generator moves to the next one. The line drawn: *"one of the
largest mosques in India"* is a measurable fact and stays; *"one of the most
frequented heritage spots"* is a popularity claim and *"the third and greatest
Mughal emperor"* an aesthetic judgement, and both go. All twelve capsules now
audit clean: **0 fragments, 0 unbalanced brackets, 0 ranking claims.**

Two smaller content filters came from the same pass: sentences opening on a
dangling connective (`"Nevertheless, it became a standard exemplar…"`) and
pronunciation scaffolding the REST extract leaves behind
(`"The Pantheon (UK: , US: ; Latin: Pantheum…"`).

### 5.6 Two `region` landmarks with the same name

A capsule has one scope line, and the planner groups a day by administrative
area, so **every day of a capsule itinerary carried the same accessible name**.
New York City's default plan is two days, so axe reported `landmark-unique`
(moderate): a screen-reader user listing the landmarks saw *"Heritage and
landscape — The harbour monuments, bridges and museums of the city"* twice with
nothing to tell them apart.

The day number was already on the page and already the distinguishing thing —
it just was not part of the name. `JourneyDay` now labels its section by the
day eyebrow **and** the title. Nothing moves visually. This would have affected
any capsule destination with a multi-day plan, including all eight from
Phase 18.

### 5.7 A QA check that could not see a quoted key

`"new-york-city"` must be quoted as an object key because of the hyphens.
`qa:content-framework` matched only the bare form and reported a correctly
registered destination as unregistered — the wrong way round for a check whose
job is to catch a *missing* importer. Both forms now count.

---

## 6. What Phase 19 took away: the empty-destination fixture

**After this phase no registered destination is empty.** Sikkim is deep,
Jaipur curated, Kyoto researched, and the other twelve are capsules.

Six checks across four suites used Paris, Rome or Delhi as "the destination
with nothing in it". They were not weakened — each was rewritten to assert the
guarantee that survives, and one was retired with its reasoning recorded:

| Suite | Was | Now |
|---|---|---|
| `qa:content-framework` | Paris says "Nothing has been researched for it yet" | the planned-depth copy still says it, **and** a knowledge-only destination still presents no tourism offer |
| `qa:content-framework` | Paris has no discovery or planner route | an **unregistered** destination has neither — the guarantee `dynamicParams = false` actually makes |
| `qa:discovery` | no discovery route for Paris or Rome | no discovery route for an unregistered id |
| `qa:planner` | Paris has no planner route | an unregistered destination has no planner route |
| `qa:global-explore` | three named destinations state they have no research | **every** destination states its own depth, derived from the registry, and claims no capsule it does not have |
| `qa:global-intelligence` | Paris/Rome/New York are not false matches for "history" | a destination matching on **knowledge alone** says it has no experiences — the thing that check was really protecting |

The honest-absence path is still in the code and still load-bearing: it is what
a sixteenth destination gets on the day it is registered. But **nothing live
exercises it any more**, and that is a genuine loss of coverage, not a
bookkeeping detail. Restoring it needs a registered destination with no content
— a product decision, recorded here rather than taken unilaterally.

Two suites also had hard-coded destination lists that would have gone on
passing while covering none of the new destinations. `qa:capsules` now reads
its subject list from `capsules/ids.ts`, so all twelve capsules get the full
isolation matrix; `qa:global-explore` derives its list the same way.

---

## 7. QA results

`npm run qa:final`, on a clean build with the image cache warmed:

**25 suites · 25 passed · 0 failed · ENVIRONMENTAL 0 · TIMED OUT 0 ·
CHECKS 1,962 passed / 0 failed · 331 s**

| Suite | Result |
|---|---|
| **qa:global-capsules** (new) | **276 / 0** |
| qa:capsules | 245 / 0 |
| qa:content-framework | 72 / 0 |
| qa:global-intelligence | 103 / 0 |
| qa:discovery | 105 / 0 |
| qa:global-explore | 98 / 0 |
| qa:route-migration | 86 / 0 |
| qa:planner | 85 / 0 |
| qa:destination | 77 / 0 |
| qa:experience · qa:research · qa:narrative · the other static suites | 66 · 88 · 71 · all 0 failures |
| qa:flows | 114 / 0 |
| qa:immersive | 50 / 0 |
| qa:stories-map | 46 / 0 |
| qa:industry-flows | 18 / 0 |
| qa:a11y | 29 / 0 — 30 routes, 0 violations |
| typecheck · lint · build | 0 · 0 · 319/319 |

Image audit: **4,072 optimizer URLs, 0 failed, 0 stalled**, 388.8 MB served.

### The new suite

`scripts/qa/global-capsules.mjs` — **276 checks, 0 failures**, thirteen
sections, and idempotent: two consecutive runs give the same result. It does
not repeat what `qa:capsules` covers for every capsule; it checks what only
became testable when the archive left India:

1–2. the four exist, at capsule depth, within the brief's size limits
3. every source is a host the pipeline actually fetched; corroborated entries
   name two **different** publishers; `reviewedBy` claims no review that did
   not happen
4. `Topkapı`, `Türkiye`, `Élysées` survive to the page, and no discovery page
   contains mojibake
5. the ancient world: BC renders as BC not as a minus sign, century entries
   store no year, every period reaches the page
6. isolation in both directions — no Sikkim record, no Phase 18 record, and no
   *other global capsule's* landmark
7. images belong to their destination, exist on disk, are credited, and none
   is oversized
8. the planner invents no practical **value** and says out loud what it does
   not know
9. interests come from the capsule's own experiences
10. search ownership, comparison, interest matching, theme-based connections
11. invalid input
12. Sikkim and Phase 18 regression
13. mobile at 390 / 768 / 1440

## 8. Accessibility

Four capsule routes were added to `qa:a11y` — `/destinations/paris`,
`/destinations/rome/discover`, `/destinations/istanbul/discover`,
`/destinations/new-york-city/plan`. A capsule page is a different shape from
Sikkim's (quoted history, citation lists, a photograph grid, diacritics), and
"it looks like the Sikkim pages" is not an accessibility result.

**One violation found, one fixed: `landmark-unique`, moderate impact,
New York City's planner (§5.6). Zero critical, zero serious.** All 30 audited
routes now report **0 violations**.

`qa:global-capsules` §13 additionally checks, in a real browser: every image on
a capsule page has alt text, exactly one `h1`, no skipped heading level, and
every link has an accessible name.

## 9. Mobile

390 px, 768 px and 1440 px across the surfaces the brief names — destination
page, discovery, experience (a filtered discovery view), planner and
comparison — for all four destinations: **11 routes × 3 widths = 33 checks,
0 horizontal overflow**, plus four in-browser structure checks on Istanbul's
discovery page (11 images all with alt text, exactly one `h1`, no skipped
heading level, no link without an accessible name).

## 10. Security

Ten hostile inputs per §11 of the new suite — unknown destination, foreign
place id, foreign story id, malformed id, path traversal, encoded traversal,
case variation on a section, an invalid interest, a foreign planner pin, an
invalid comparison destination, and an uppercase unregistered id. **18 checks,
0 failures: all fail safely and none leaks content.**

**Case variation of a destination hub is deliberately not automated**, and
this is the finding that cost the most time in the phase.

`dynamicParams = false` means `PARIS` is not a generated param, so on a
case-**sensitive** filesystem the route does not exist and the answer is 404.
Phase 12 measured exactly that on a real case-sensitive volume, and it is what
production gets.

On the case-**insensitive** volume this repo is developed on, the request
resolves to the `paris.html` the filesystem matches — and Next then caches
that result under a key that is the same key as the real page. The
consequences, measured:

- `/destinations/paris` answers **404 for the remaining lifetime of the server
  process**. Re-requesting the correct URL does not repair it; only a restart
  does.
- The on-disk entry `destinations/paris.meta` is overwritten with a 404
  status, so the three suites that read build output fail too.
- Because `qa:final` runs the build-reading suites **first**, damage done by a
  probe at the end of one battery surfaces at the start of the *next* one.
  Four suites failed that way, and the first diagnosis — a second, stale
  `next start` sharing `.next` — was wrong.

A check that breaks the thing it is checking, on one developer platform, makes
every other result in the battery unreliable. So the hub probe was removed and
the behaviour recorded here. Case-variation coverage is retained on
`/destinations/Rome/Discover`, a segment with no prerendered file to collide
with, and on an uppercase unregistered id. `qa:global-capsules` is idempotent
as a result: two consecutive runs give identical results and leave Paris
serving.

## 11. Sikkim and Phase 18 regression

**15 / 70 / 26 / 38 / 78 — unchanged**, asserted in both `qa:capsules` and
`qa:global-capsules` §12 against the built output. Sikkim still serves, still
declares `Deep archive`, and its monasteries, stories, timeline, places,
sources, images, planner and discovery are all covered by the suites above at
0 failures.

The eight Phase 18 destinations were **regenerated**, not edited: the fixes in
§5.1, §5.3 and §5.5 belong to the generator, so re-running it repaired their
content too — 15 to 48 changed lines each, every change removing a fragment or
a ranking claim. Their counts are unchanged except Goa, which gained one story
now that a sentence it should have had is no longer discarded. `qa:global-
capsules` §12 asserts none of them renders a Phase 19 record, and `qa:capsules`
§3 runs the full isolation matrix over all twelve.

Jaipur and Kyoto still declare `Curated` and `Researched`, are not registered
as capsules, and still refuse to present experiences they do not have.

## 12. Scale: what it took to add four countries

No component was rewritten. No `if (destination === "paris")` exists anywhere.
The complete list of changes outside the four data files and the QA suites:

| File | Change |
|---|---|
| `capsules/ids.ts`, `capsules/index.ts` | four ids, four lazy importers |
| `destinations/planned.ts` | `depth: "planned"` → `"capsule"` ×4 |
| `lib/search-capsules.ts` | four imports, four array entries |
| `scripts/capsules/plan.mjs` | which pages to read (no facts) |
| `scripts/capsules/retrieve.mjs` | the Wikidata pass |
| `scripts/capsules/generate.mjs` | the §5.1–5.3, §5.5 fixes |
| `[destinationId]/stories`, `/history` | §5.4 — a Phase 18 bug, not a Phase 19 need |
| `components/journey/JourneyDay.tsx` | §5.6 — a Phase 18 bug, not a Phase 19 need |

Discovery, the planner, comparison, cross-destination intelligence, the
sitemap, the knowledge graph and global search picked up four countries with
**no changes of their own**. "Colosseum" resolves to Rome and "Hagia Sophia" to
Istanbul without a line of code that knows either name.

## 13. Known limitations

1. **Not human-reviewed.** Unchanged and still the largest caveat. Someone
   should read all ~71 retrieved spans against their sources before judging
   day. Every generated file says so.
2. **No official sources.** UNESCO is unreachable from here (§3), so the
   citations are Wikipedia and Wikidata. Official institutional sources — the
   Louvre, the Met, the Parco Archeologico del Colosseo, the Türkiye Ministry
   of Culture — remain the next retrieval pass, and would raise confidence
   above `medium`.
3. **Half the timeline rests on one source.** 10 of 20 entries are
   corroborated; the other 10 cite Wikipedia alone and are marked no
   differently, because a single citation shown honestly is not a defect.
4. **Rome's timeline has one century-only entry and Istanbul's one**, with no
   year, because the sources state none. This is correct and looks sparser
   than a fabricated date would.
5. **A capsule place still has no page of its own** (Phase 18, by design), and
   **a capsule's planner day is still one group**, because a capsule has one
   scope line — which is what produced §5.6.
6. **No empty destination remains** (§6). A real gap in coverage.
7. **The case-insensitive filesystem hazard** (§10) is documented rather than
   fixed, because it is a platform behaviour rather than a product one. On
   macOS, manually requesting an uppercase destination hub takes that page
   down until the server restarts. A rebuild and restart clears it.
8. **Every QA suite now honours `QA_BASE_URL`.** Several had a hard-coded
   `http://localhost:3000` — `industry-flows.mjs` had no flag and no
   environment fallback at all — so with a second `next start` on the machine
   they silently measured the wrong build and reported its failures as this
   one's. Worth knowing before trusting a red result.
9. **`i.ytimg.com` poster frames** remain intermittently throttled — Sikkim's
   culture videos, pre-existing, unrelated to capsules.

## 14. Adding the next city

Unchanged from Phase 18, and the four global capsules went through it verbatim:

```
1. add it to scripts/capsules/plan.mjs        (titles, categories, themes)
2. node scripts/capsules/retrieve.mjs --only <id>
3. node scripts/capsules/generate.mjs
4. add the id to capsules/ids.ts AND capsules/index.ts
5. set depth: "capsule" in src/data/destinations/planned.ts
6. add it to src/lib/search-capsules.ts
7. npm run qa:capsules && npm run qa:global-capsules && npm run build
```
