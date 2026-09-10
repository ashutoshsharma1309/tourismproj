# The Sikkim Darshan Quality Transformation

The brief set Sikkim Darshan as the UX benchmark and TerraStory as the
product, and named the problem exactly: *the current TerraStory website feels
like a technical prototype; the Sikkim Darshan website feels like a tourism
product.*

The reference was studied for its **information flow**, not its content:

> navigation → hero → identity → trust/metrics → featured places → visual
> discovery → map → audio → stories → history → archive → planning → purpose

That order works because a visitor moves continuously from *what is this
place?* to *what can I see?* to *why does it matter?* to *show me the
evidence* to *let me plan*. TerraStory now follows the same flow, at the
global level and again inside every destination.

---

## 1 · What was wrong, measured

| | Before |
|---|---|
| Homepage hero | one photograph of **Rumtek Monastery**, in Sikkim |
| Global navigation | **3 links** — Discover, Destinations, Compare |
| Global Stories page | did not exist |
| Global History page | did not exist |
| Global Plan page | did not exist |
| Homepage map | none |
| Homepage food | none |
| Coverage bar on a destination | none |
| Destination gallery | none |
| Destination map | none |
| Audio state on 14 destinations | nothing at all |
| Interface languages | 12, selector only on destination hubs |

The hero was the sharpest case. A single Sikkim monastery had opened a
fifteen-destination platform for three phases, and the only thing telling a
visitor otherwise was a line of text underneath it.

## 2 · The homepage

Rebuilt to the reference's flow, with every section drawn from all fifteen
destinations:

```
HERO                  six photographs, six countries, one proposition
WHERE WILL YOUR       all 15 destinations — image, country, region,
STORY BEGIN?          depth badge, interests covered
EXPLORE BY INTEREST   10 interests, each a real route
HOW IT WORKS          discover → explore → understand → plan
STORIES               one from each of six destinations
TIMELINE              15 dated moments, oldest first, six countries
FOOD                  one dish from each of eight destinations
MAP                   all fifteen at their published coordinates
PLAN                  the planner, in four steps
TRUST                 claim → source → evidence
SIKKIM                the deepest destination, with its real numbers
START EXPLORING       final CTA
```

**The hero mosaic is derived, not art-directed.** It takes the first
destination of each country in registry order and uses that destination's own
first catalogued photograph — so it cannot show a place the product does not
hold, and cannot show one destination's photograph under another's name. Two
scrim layers rather than one, because the directional gradient alone left the
right-hand tiles bright enough that the stat chips measured below AA.

**Destinations now come before interests.** A visitor who does not yet know
what they want is not helped by being asked what they want first.

## 3 · Navigation, and the three pages behind it

The menu named three things. It now names six, and the three new ones are
real pages rather than labels:

| Route | What it is |
|---|---|
| `/stories` | **72 stories** from every destination, grouped by owner, each labelled by claim type |
| `/history` | **161 dated events** in ONE chronology across six eras, oldest first |
| `/plan` | every destination that can actually be planned, with what it holds |

Grouping the timeline by destination would have produced fifteen short
chronologies and hidden the only thing this page can show that a destination
page cannot: that the Roman republic and the Brooklyn Bridge are entries in
the same archive. Sorting across destinations *is* the argument.

**"Explore" is deliberately not a separate menu entry.** It would have pointed
at `/destinations`, which is already there under its own name, and a menu with
two words for one page teaches a visitor that the words mean nothing.

### The redirect that was hiding two of them

`/stories` and `/history` were Sikkim's pages before Phase 11 and still
redirected there. Removing the index redirects changed nothing — because
`/stories/:path*` matches **zero** or more segments, so the sub-tree rule was
swallowing the bare index too. `:path+` is what those rules always meant. Deep
links still redirect into Sikkim, which is what the migration was for; only
the index changed owner.

## 4 · The destination hub

Every hub now runs the reference's flow. Four sections are new:

**Coverage bar.** Eight dimensions, every number counted from the same
accessors the sections below render from, so the bar and the page can never
disagree. **A dimension with nothing in it is omitted, not zeroed** — "0
festivals" and "festivals not yet researched" mean different things, and a
grid of zeroes reads as a broken product rather than an honest one. What is
missing is named in one line, in words.

**Gallery.** Twelve frames drawn *across* kinds by round-robin — places, food,
festivals, crafts, stays — because taking the first twelve images would have
produced twelve monuments.

**Map.** The destination's own places, at the coordinates their own sources
publish. A place without one is absent rather than pinned to a city centroid,
and the caption says how many of how many are plotted.

**Audio.** The point of this component is the state it shows most often.
Sikkim has 181 narrated files in 12 languages; the other fourteen have none.
They get a sentence saying so — no player, no disabled control, no "coming
soon" badge on something that looks operable.

## 5 · Twenty languages

The interface is now offered in **twenty**: the twelve that Sikkim's audio
guides have used since Phase 11, plus eight Indian languages — Tamil, Telugu,
Kannada, Malayalam, Marathi, Gujarati, Punjabi and Odia — because ten of the
fifteen destinations are Indian and the brief's market is Indian tourism.

**28 interface strings × 20 languages, every cell asserted by `qa:culture`.**

Three rules hold this together:

1. **The language is in the path** (`/l/ta/destinations/jaipur`), never a
   query parameter. Measured: a search parameter made the hub render per
   request, 2 ms → 78 ms, and removed the prerendered files that
   `qa:destination` checks all fifteen destinations by. English keeps the
   canonical URL; the other nineteen are **285 static pages**.
2. **The archive is never translated.** Every factual sentence is a quotation
   from a named source, and a machine translation of a quotation is a
   paraphrase with a citation still attached. The suite asserts a place
   summary is byte-identical across languages.
3. **Twenty interface languages are not twenty audio languages.** The
   recordings exist in twelve. A reader who switches to Tamil must not infer a
   Tamil narration, so the two sets are declared separately and the audio
   section says which is which.

The selector moved from the hub body into the global header, and the header
hides it on pages with no translated variant — so it never offers a language
that would 404.

## 6 · Hotels: what a source publishes, and nothing else

The brief asked for official website and public contact number. Both are facts
Wikidata publishes as structured claims (P856, P1329), so both were retrieved:

| | |
|---|---|
| Documented stays | **68** |
| With a published website | **27** |
| With a published telephone | **2** |

**Those two numbers are the deliverable.** 35 stays have no website and 66
have no telephone, and they display nothing — no placeholder, no "contact the
property" standing in for a number nobody has. A wrong telephone number for a
real hotel sends a real person to a stranger.

`CapsuleStay` still cannot express a price, rating, availability or booking
link, because no source behind this product publishes any of them, so any
value in one could only have been written by hand.

## 7 · Content, per destination

| | Places | Stories | History | Food | Fest | Craft | Stays |
|---|---|---|---|---|---|---|---|
| Delhi | 13 | 7 | 12 | 8 | 6 | 4 | 6 |
| Varanasi | 12 | 6 | 12 | 5 | 4 | 2 | 0 |
| Agra | 12 | 1 | 12 | 1 | 4 | 2 | 0 |
| Jaipur | **14** | 7 | 12 | 3 | 5 | 5 | 8 |
| Mumbai | 12 | 7 | 12 | 8 | 5 | 2 | 1 |
| Kolkata | **15** | 4 | 12 | 8 | 5 | 3 | 7 |
| Hyderabad | 12 | 5 | 12 | 6 | 4 | 3 | 4 |
| Kochi | 12 | 2 | 10 | 7 | 5 | 4 | 8 |
| Goa | 13 | 3 | 9 | 6 | 3 | 1 | 4 |
| Kyoto | **15** | 5 | 10 | 6 | 5 | 4 | 0 |
| Paris | 13 | 7 | 12 | 8 | 4 | 3 | 8 |
| Rome | 13 | 5 | 12 | 8 | 4 | 2 | 6 |
| Istanbul | 13 | 6 | 12 | 9 | 5 | 3 | 8 |
| New York City | 13 | 7 | 12 | 6 | 4 | 3 | 8 |
| **Total** | **182** | **72** | **161** | **89** | **63** | **41** | **68** |

Plus **Sikkim**: 15 monasteries, 38 places, 32 dated events, 70 stories, 78
archive objects and 181 audio files across 12 languages — unchanged.

Jaipur, Kolkata, Kochi and Kyoto were topped up toward the 12–15 target. Every
candidate title was resolved against Wikipedia first: **four proposed Jaipur
places and one Kochi place were dropped because no article exists**, which is
why the counts are not round.

**The zeroes are the point.** Agra has one documented dish, not eight.
Varanasi, Agra and Kyoto have no hotel with a published record, so they render
no stays section. Filling those cells is the one thing this product must never
do.

## 8 · Verification

**30 suites · 2,614 checks · 0 failures.** `qa:culture` covers the new surfaces: the records,
the forbidden fields, the season rule, the two hotel dates, contact-detail
shape, all twenty dictionaries, and the untranslated-archive guarantee.

| | |
|---|---|
| Build | **607 pages**, 0 warnings |
| Typecheck | clean |
| Lint | clean |
| English hubs prerendered | **15** — unchanged |
| Translated hubs prerendered | **285** |
| Images | **406 capsule files**, 141 MB; 754 total, 243 MB |
| Accessibility | 30 routes under axe, 0 violations |
| Horizontal overflow | none at 390 / 1440 |

### Six assertions were re-pointed, and why each is not a weakening

The hub's body moved into `DestinationHubPage` so both the English and the
nineteen translated routes could render it, and several checks were reading
the old file. Each now asserts **the same fact against the file that performs
it**:

- `qa:route-migration` — resolves through the canonical resolver
- `qa:global-explore` — unregistered destinations 404
- `qa:experience` — knowledge renders whether or not narrative exists
- `qa:publishing` — **fixed in the code, not the check**: the homepage map was
  reaching for published knowledge directly, so marker building moved into
  `lib/destinations/markers.ts`. Widening the allowlist would have been the
  appearance of a fix.
- `qa:ux` / `qa:demo` / `qa:product-flow` — the expected nav set and hero
  headline changed because the nav and headline changed.
- `qa:release` — `/stories` and `/history` serve 200 by design; the check now
  follows their **deep** links, using real slugs, which is the redirect it was
  always testing.
- `qa:planner` — re-pointed three times as destinations grew, so it now
  **finds its own subject**: it asks several destinations for the planner's
  maximum and tests the first that genuinely runs short, failing if none does.
  A hardcoded pair was measuring coverage, not the guarantee.
- `qa:capsules` — the "N of 10 interests" sentence renders only when N < 10,
  and Kochi became the first capsule to carry all ten. The check now accepts
  either state; what it forbids is unchanged.

One was a contradiction I had introduced myself: `qa:culture` forbade a
`phone` field, written when no source published one. A retrieved telephone
number is a fact like a founding date. The guarantee was never "no contact
data" — it was "nothing invented" — and that is now asserted directly, by
shape and by the fact that most stays still have none.

### Three defects found by looking at the result

1. **A dialect map in the food grid.** Wikipedia's lead image for "Bengali
   cuisine" is `Bengali_dialects.png` — correctly licensed, correctly
   attributed, and a colour-coded linguistic map sitting between a plate of
   chaat and a bowl of biryani. The generator now skips a file whose own name
   says it is a diagram, and the homepage prefers a named dish over a cuisine
   survey article. Every food card is now a photograph of food.

2. **Credits outlived their files.** `creditByKey` was seeded from the
   existing credits file and only ever added to, so the skipped image left a
   licence claim behind for a file no longer on disk. Two suites caught it. A
   credit is a claim about a file; when the file goes, the claim goes.

3. **The whole dictionary was shipping to the browser.** The navbar is a
   client component, and importing `@/lib/i18n` for two button labels pulled
   twenty languages of interface copy — Tamil and Malayalam paragraphs
   included — into every page. Splitting the two strings into `nav-labels.ts`
   and the path helpers into `paths.ts` took the client bundle from **3,280 KB
   to 3,252 KB** and removed the copy entirely. `qa:culture` asserts the
   mirrored strings stay in step with the dictionary.

## 9 · The final build sprint

Run as an autonomous sprint after the sections above. Six changes, each
verified in the browser rather than only in source.

**The hero was rebuilt a second time.** The collage of six landmarks solved
the Sikkim-centricity problem and created a new one: six photographs competing
equally, none legible as a place, with display type scrimmed on top of all of
them. It is now an **editorial split** — one dominant photograph uncovered,
the copy on solid ground beside it at full contrast, and a named rail of five
more destinations underneath. Which destination is featured is a rule, not a
choice: most catalogued places, **excluding the archive's origin**, ties by
registry order. Sikkim would win any coverage measure and putting it here
would re-centre the product on the destination three phases were spent
decentring.

Two defects the screenshots caught and source review would not have:
- On mobile the copy came first and pushed the photograph entirely below the
  fold — a tourism product whose first phone screen has no imagery. The image
  now leads on small screens.
- The image stopped at the container edge, reading as a card rather than a
  hero. The grid is full-bleed now, with the copy held to a measure inside it.

**"Add to trip" is gone.** Three UI sites — discovery cards, the record
intelligence panel, and a timeline event's related places — plus the prop and
helper behind them. Nothing replaced it: a second button saying Save or
Bookmark would be the same mistake with a different label. Discovery cards now
carry one action, the one that leads somewhere. Six QA assertions that tested
the feature now guard its **removal**, and the demo walk goes discovery →
planner directly.

**A tourism-intelligence section** was added, because everything else on the
page showed what the archive holds and nothing showed how it holds it — the
provenance chain being the one thing here a tourism department cannot get from
a travel blog. Five counted totals and the claim → source → evidence chain.

**Discovery's interest picker** was ten small checkboxes in a bordered box,
indistinguishable from a settings form on the page that is the product's main
way in. It is now a grid of selectable cards, each carrying the number of
destinations that can answer that interest — still a plain GET form with real
checkbox inputs, so the state is the URL, it works without JavaScript, and the
selection stays keyboard-operable and announced.

**The guide knew only Sikkim.** Its launcher appears on all fifteen
destinations, so asking about Paris produced "I don't hold anything on that"
from a product whose Paris page holds thirteen catalogued places. It now
carries the registry, recognises any destination by name, and hands the reader
to it — while saying plainly that it answers in depth from the Sikkim corpus.
It does not improvise a description it has no records for.

**Two duplicate/overlapping controls.** A `NavLanguage` component already
existed and was better than the switcher added beside it — it resolves a
guaranteed-existing target and covers every destination-scoped page, not just
the hub. The duplicate was removed and the survivor promoted from `xl` to `sm`.
The ambient-sound pill was covering the hero's second CTA on a phone and the
destination rail on a 1440×900 desktop; its label is now visible from `sm` up
and screen-reader-only below, with state still carried by `aria-pressed`.

### Two failures that were not code

A build failed on a Sikkim place page with "took more than 60 seconds" — and
compiled in **35.4 minutes**. Nothing was wrong with the code: three parallel
audit agents plus the machine's own load had saturated it. Re-run on a quiet
machine: **compiled in 4.0s, 607/607 pages, 0 failures.** Worth recording
because the failure message points at a page, and the page is innocent.

Two suites then crashed rather than failed, on a click Playwright could not
perform: the interest checkbox is now `sr-only` and the card that wraps it is
the visible control. The tests drive the real input with `force: true` instead
of pretending the hidden element is the click target.

## 9b · Final rebuild pass

A last sweep against the release checklist. Four things were actually wrong;
the rest of the checklist was already met and was verified rather than
re-implemented.

**Fourteen destinations shared as a bare grey link.** Only Sikkim declared a
`socialCard` in the registry, so `destinationOpenGraph` emitted `images: []`
for every other destination. That was the right trade-off when the only
alternative was borrowing Sikkim's photograph — and it stopped being the right
trade-off the moment every destination gained its own vendored, licensed
images. The helper now falls back to the destination's **own** first
catalogued photograph: Paris shares as the Eiffel Tower, Rome as the
Colosseum, Agra as the Taj Mahal. Verified across all fifteen: **none borrows
another's image.**

**The preservation section was missing.** The reference product ends its
homepage on preservation, and it is the right place to end — everything above
it is what a visitor can *do*, and this is why the doing is worth anything.
All four artefacts already existed (77 archive objects, 136 sources, the
coverage comparison, a reviewed submission route) on Sikkim sub-pages nobody
arriving at the homepage would ever meet. Every card links to something that
works, and both counts are read at build time.

**A production-readiness sweep** found no `TODO`, `FIXME`, `console.log`,
`coming soon`, `dummy` or `lorem` in shipping code. The apparent hits were an
image attribution reading *PatriaDeTodos*, commented-out `XXXX` in the capsule
template, and `Exp**loreM**ap` matching a case-insensitive search for "lorem".

**The footer disclaimer was already correct** and worth recording, because it
is the kind of claim that is expensive to get wrong: *"an independent,
government-ready prototype, not an official publication of any government or
tourism authority."*

### Four assertions re-aimed, and why each is stronger

All four guarded the OLD social-card behaviour — "a destination other than
Sikkim emits no card". That was never the invariant. The invariant is **never
another destination's photograph**, and "emits nothing" satisfied it
trivially. Each check now asserts ownership by path, per destination, against
the prerendered HTML — `qa:global-intelligence` walks all fifteen. Absence
passed for free; ownership cannot. One further check was narrowed rather than
removed: a destination with **no photographs at all** must still emit no card,
which is now the only empty case that exists.

## 9c · Phase 1 — the journey layer

Phase 1 asked for a global entry experience and a complete destination-selection
architecture. Most of it already existed; the one genuinely missing piece was
**multi-destination selection**, and it is the first stateful thing in this
product — everything else is a URL or a static page.

**The state model** (`src/lib/journey/state.ts`) holds two lists: destination
ids in the order chosen, and interests from the planner's closed vocabulary. It
holds no content at all, so a stale or hand-edited journey can never put wrong
text on screen — at worst it names a destination that no longer exists, which
`sanitise` drops.

**Why `useSyncExternalStore` and not `useState` + `useEffect`.** The obvious
shape — start empty, read localStorage in an effect, `setState` — is a
cascading render, and the lint rule that forbids it is right. React provides a
primitive for exactly this: a server snapshot (always empty, because the server
cannot read a browser) and a client snapshot, reconciled without a hydration
mismatch and without a second render driven from an effect. The snapshot is
cached against the raw string it was parsed from, because `getSnapshot` runs on
every render and returning a fresh object each time is an infinite loop.
Subscribing to the `storage` event made cross-tab agreement fall out for free.

**This is not "Add to trip" under a new name.** That was a *collecting* gesture
on individual records — a filled button on every discovery card, which made
hoarding the dominant interaction of a product about why places matter. This is
destination-level, on a screen whose entire purpose is choosing, and
`qa:journey` asserts the old label has not returned and no per-record pin link
exists.

**Two real layout bugs the browser found and source review would not have:**

1. **The card link was swallowing clicks meant for the selection button.** Grid
   items stretch by default, so the tile's `h-full` made the *link* fill the
   whole cell — including the strip the button sits in. Playwright reported
   "Fort Kochi's image intercepts pointer events" while trying to click
   Mumbai's button, which is exactly what a real user would have hit.
2. **Anything scrolled into view landed under the fixed header.** Keyboard
   users tabbing to a control below the fold got it parked beneath the 64px
   header. `scroll-mt-24` on the tiles and the controls.

**And a tap-target failure across every width.** Six standalone links measured
17–21px tall — under the 24px WCAG 2.5.8 minimum. The other seventeen small
links are inline links inside prose, which that criterion explicitly exempts,
so only the six were changed. Now **0 non-inline controls under 24px** at
320/375/390/430/768/1024/1280/1440/1920.

`qa:journey` (26 checks) covers the acceptance list, including four hostile
storage payloads: an unregistered destination, a non-array, outright garbage,
and a 500-item list. All four load the page rather than breaking it.

## 9d · Phase 2 — the universal Darshan engine

The engine largely existed: **zero per-destination page files**, one
`DestinationHubPage` rendering all fifteen through twelve reusable, self-gating
sections. The audit found two things that were genuinely missing or wrong.

### Eighty hardcoded destination ids in the shared route tree

The real finding. Every page under `app/destinations/[destinationId]/` renders
for whichever destination the URL names — and **80 lines across 18 of them
hardcoded `/destinations/sikkim/…`**: breadcrumbs, prev/next story links,
related places, canonical URLs, permit links, the planner's stop hrefs.

It was invisible because those routes are capability-gated and only generate
for Sikkim today. The moment a second destination gained culture or archive
content, the route would have generated correctly and every link inside it
would have pointed at Sikkim. That is the exact cross-destination
contamination the product tests for elsewhere.

All 80 now resolve from the destination in scope. Three needed real threading
rather than a substitution:

- `buildItinerary` and `resolveStop` had no destination parameter at all.
- `DayCard` is a separate component; the id is a prop now.
- `culture/page.tsx` used a module-scope `metadata` constant, which cannot see
  route params — it is `generateMetadata` now, like every other route.

One literal is deliberately kept: the archive contribution **server action**
receives only the form body and has no destination in scope, so it names the
archive it actually feeds and says why.

`qa:destination` now fails on any literal destination id in the shared tree —
27 files, one documented exception.

### A Darshan navigation, derived rather than declared

§26 asked for destination-specific navigation, and there was none. `DarshanNav`
is a sticky bar under the header whose every entry is gated on **the same
accessor its section is gated on**, so a link exists only where the section
does. Sikkim shows 17 entries, Jaipur 11, Agra and Varanasi 9 — no
per-destination code.

Three bugs found by looking at the rendered result:

1. **The map link gated on the wrong accessor.** I used `getMappableSites`,
   which is Sikkim-only, so Paris rendered a map and got no link to it. The
   section gates on places carrying a coordinate; the link does now too. Getting
   a gate wrong is precisely what this component's design exists to prevent.
2. **Sikkim's bar read "Stories · History · … · Stories · History"** — the
   in-page anchors and the sub-route links collided. The anchor wins; it is on
   the page and cheaper to reach.
3. **`sticky` and `relative` are conflicting position utilities.** A full-bleed
   attempt added `relative`, which silently stopped the bar sticking. Cancelling
   the column's padding with negative margins does the job and keeps `sticky`.

**31 suites · 2,641 checks · 0 failures.** Isolation re-verified: zero foreign
landmarks across seven destinations; all 15 hubs 200; no overflow at nine
widths.

## 9e · Phase 3 — the minimum quality floor

Phase 3's rule is that **the weakest destination decides**, so the work began
by measuring all fourteen capsules against a floor of 12 places, 4 stories, 3
food, 3 festivals and 8 dated events. Eleven already met it. Three did not:

| | Before | After |
|---|---|---|
| Agra | **1 story, 1 food** | 4 stories, 3 food, 15 places |
| Goa | 3 stories | 4 stories, 16 places |
| Kochi | 2 stories | 3 stories, 17 places, 12 events |

### Why stories were the scarce type, and what actually fixed it

Stories are selected from sentences describing **practice rather than
chronology**, and twelve Mughal monument articles are almost entirely
chronology. Loosening the selector would have manufactured stories out of
dates; the honest lever is more source text of the right kind.

So Agra gained three places — a bird sanctuary, a gurdwara and a settlement —
and went from one story to four. Kochi gained **Cochin Jews**, **Saint Thomas
Christians** and the **Kerala backwaters**: the communities and the landscape
its own records keep referring to, and the text that actually describes how the
place is lived in.

### Agra's food, and why Braj is not a stretch

Agra had one publishable food record, because Wikipedia has one Agra-specific
dish article (Petha). Rather than borrow another city's dishes, the candidates
were widened to **Braj cuisine** and **Uttar Pradesh cuisine** — the region
Agra sits in and the state it belongs to. That is geographic fact, not a quota
being filled. `Bedmi puri` and `Dalmoth` have no article and stay dropped.

### Kochi is reported at three stories, not four

One short of the floor, and left there. Three practice-rich articles yielded
one additional story; a fourth would have been added in the hope of a fifth
sentence, which is padding. Kochi holds 17 places, 12 dated events, 7 food, 5
festivals, 4 crafts and 8 stays — it is well covered, and *stories
specifically* are what its sources are thin on. The brief's own rule is that
evidence determines depth.

### Result

| | |
|---|---|
| Places | **193** across 14 capsules + Sikkim's 38 |
| Stories · dated events | **77** · **165** |
| Food · festivals · crafts | **91** · **63** · **41** |
| Capsule images | **414** |
| Destinations at or above floor | **13 of 14** (Kochi: 3 stories vs 4) |
| Build · QA | 607 pages, 0 failures · **31 suites, 2,641 checks, 0 failures** |
| Visual QA | all 15 at 1440 and 390 — no overflow, no broken images, no console errors |
| Contamination | **0** foreign landmarks across all 15 |

Every destination now renders 31–53 images across 12–17 sections, at page
heights of 8,261–16,198px. None is a stub.

## 9f · Phase 4 — the intelligence layer

### The guide had no answers for fourteen destinations

Its launcher appears everywhere and its corpus was Sikkim's: 15 monasteries, 38
places, 70 stories, 905 stays. Phase 1 taught it the registry so it could
*route* — asking about Kyoto got a link. Phase 4's §44 asks it to *answer*.

`lib/guide-records.ts` now flattens every destination's places, stories and
dated events into one shape — **495 records across all 15** — built from the
same accessors the pages render from, so it cannot drift from the archive.
Sikkim keeps its richer typed sets (tradition, district, founding year), which
is why its answers are still the best in the product.

Two matching bugs found by testing all fifteen rather than one:

- **"New York" missed**, because the registry name is "New York City" and
  nobody types the last word. Destinations now match on their name and on that
  name minus a trailing generic word, longest key winning.
- **"the ticket price for the Colosseum" returned Sikkim's visitor fee.**
  Nothing was fabricated — that fee is real, statutory and labelled as the only
  price this product quotes — but the reader asked about Rome. Record names of
  six characters or more are matched now, so a landmark reaches its own
  destination. Six is a floor, not a guess: "Fort", "Museum" and "Palace"
  appear in dozens of records and a short-name match would route half the
  product's questions to whichever destination sorted first.

### Prompt injection is impossible, not defended

There is **no language model in the answer path**, and `qa:intelligence`
asserts it: no provider import, no `fetch`, no API key, in either the engine or
its route. That is a stronger guarantee than a filter that catches known attack
strings — the guide cannot hallucinate a date, cannot be argued out of its
instructions, and cannot cite a source that does not exist, because it is
deterministic retrieval over an index built at build time.

The suite also checks the product survives the guide failing: with `/api/guide`
aborted, Kyoto still renders 16,512 characters and the panel says it could not
load rather than hanging.

### Three assertions I had written wrong

The panel shows the question above the answer, so reading the end of the page
reads the user's own words back — the injection check was failing on the word
"system prompt" **in the question**. Everything now measures the text after the
question. Two others were mine too: forbidding any currency symbol would have
banned the one real price in the product, and the offline check asserted a
failure state before asking anything, when the index loads on demand.

**32 suites · 2,665 checks · 0 failures.**

## 9g · Phase 5 — the multi-destination journey

Phase 1 built selection; Phase 5 makes it a sequence. `/journey` is new, and
the Darshan gained two components.

### Progress is a list of ids, not a cursor

`completed: string[]`, never `currentDestinationIndex`. A cursor breaks the
moment somebody removes a destination they had already finished — the number
still points somewhere, just at the wrong place. Ids survive reordering,
removal and re-adding, and "current" is *derived*: the first chosen
destination not yet completed. Removing a destination removes its progress
with it, so re-adding it later does not show it already done.

### Completion is a button, not a scroll depth

Inferring "explored" from scroll position would be a fabricated engagement
metric — the reader might have skimmed, or opened the page and walked away. A
button is a statement the visitor actually made.

The recap beside it counts what the destination **holds**, and says so in those
words: *"not a measure of how much of it you read, which nothing here tracks."*
Inventory dressed as engagement would be the easiest fabrication in this
product to ship and the hardest for a reader to catch.

### What the sequence does

- **The order is the visitor's.** Never re-sorted.
- **The indicator is one line** and renders only for a journey of two or more —
  a row reading "● Mumbai" and nothing else is noise dressed as navigation.
- **Completing offers the next destination by name** ("Continue to Kolkata");
  the last one offers the journey instead.
- **Resume, not restart**: `journeyEntryPath` returns where the visitor got to.
- **Reset asks first**, with the consequence stated.

### One test failure that was the test's fault

Five assertions failed on a working product because the new section inherited a
Kyoto selection from an earlier section of the same suite — every count read
"of 4". The section now clears storage before it starts. Worth recording
because the symptom (four wrong counts) looks exactly like a broken feature.

**32 suites · 2,683 checks · 0 failures · 608 pages.**

## 9h · Phase 6 — final hardening

The audits that had not yet been run, run. Most came back clean; one found
real defects.

### Three records were in the wrong city

Only their coordinates gave them away:

| Record | Filed under | Actually in | Off by |
|---|---|---|---|
| Devigarh | Jaipur | near Udaipur | **317 km** |
| Fort Madhogarh | Jaipur | carrying Delhi's coordinate | **234 km** |
| The Carlyle | New York City | **Minneapolis** | **1,635 km** |

All three were stays pulled from regional hotel categories that reach far
beyond the city searched for — "Hotels in Rajasthan" is not "Hotels in
Jaipur", and "The Carlyle" is a building in more than one American city.

**The fix is a generator guard, not three patched records.** Any record more
than 150 km from its destination's centre is dropped — and dropped whole, not
merely stripped of its coordinate, because the coordinate is the *evidence*
that the retrieval landed somewhere else. Keeping the record without it would
have left a Minneapolis building described on New York's page.

The centre is the **median** of the destination's own place coordinates. A mean
is dragged toward exactly the outlier being looked for.

`qa:culture` now re-runs that test on every build: **241 coordinates, all
within 150 km.**

### Everything else came back clean

| Audit | Result |
|---|---|
| §12 Alt text | **37 `<Image>` tags, 0 without alt** |
| §10 Image provenance | **453 credits, 0 missing source or licence, 0 pointing at a file not on disk** |
| §26 RTL | Arabic renders `dir="rtl"`; the other nineteen `ltr` |
| §40 Security | no `.env` tracked, no secret read outside `NEXT_PUBLIC`/deploy vars |
| §41 Dependencies | **0 vulnerabilities** (`npm audit --omit=dev`) |
| §39 Prompt injection | structurally impossible — no model in the answer path |

### Final state

**32 suites · 2,684 checks · 0 failures · 608 pages · 0 build warnings.**
Visual sweep clean across **5 widths × 13 routes**: no overflow, no broken
images, no console errors, every route 200.

## 9a · Known limitations

1. The fourteen capsules remain **not human-reviewed** — 182 places, 195
   cultural records and 68 stays of retrieved, quoted, cited text.
2. The source tier is still **encyclopedic**. The official government tourism
   portals are reachable but unextracted; the extractability findings are in
   [final-visual-tourism-transformation.md](final-visual-tourism-transformation.md) §4.
3. **Only the destination hubs are translated.** Discovery, the planner,
   search and Sikkim's deep pages remain English. Extending it is more static
   pages of the same shape, not a new mechanism.
4. **Audio exists only for Sikkim**, in 12 of the 20 interface languages.
   Generating narration for fourteen more destinations needs a reviewed
   transcript per record first, which does not exist.
5. The interface translations are **unreviewed by native speakers**.
6. **Agra has 1 story and 1 documented dish**; three destinations have no
   stays. Real gaps, shown as gaps.
7. Sikkim remains the only destination earning **Deep archive**, on all three
   axes. Nothing was promoted to disguise that.
