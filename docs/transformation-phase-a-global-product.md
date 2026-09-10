# Transformation Phase A — Global Product Identity

The backend was never the problem. The landing page was.

---

## 1 · What was wrong

Phase 21 rewrote the homepage *hero* to lead with TerraStory. Everything below
it was still Sikkim — nine consecutive sections of monasteries, the Sikkim
heritage map, Sikkim stories, Sikkim's culture films, Sikkim's planner.

A visitor read a platform promise and then scrolled into a regional archive.
The fifteen destinations existed, were correct, were isolated, were tested —
and were reachable only by **noticing a navigation item**. Discovery was one
word in a bar. The product made you already know where to click.

| | Old | New |
|---|---|---|
| First screenful | TerraStory hero (Phase 21) | unchanged — it already worked |
| Immediately below | *"Discover Sikkim's heritage"* | **Interests → 15 destinations → the four stages** |
| Ways in from the landing page | 1 (scroll into Sikkim) | **3** — interest, destination, search |
| Destinations linked from `/` | 1 | **15** |
| Interests offered on `/` | 0 | **10**, each to a real route |

## 2 · What was added

One new component — `src/components/home/GlobalEntry.tsx` — placed between the
hero and Sikkim's archive, because that is the order the questions arrive in.

### What can I explore? — the interests

Ten chips, each linking to `/discover?interests=<id>`. They come from
`globallyCoveredInterests()`, which offers an interest **only where a
registered destination can actually satisfy it**, so no chip leads to an empty
page. The page says so: *"Only interests a registered destination can actually
satisfy are listed — 10 of 10 today."*

### Where can I go? — all fifteen

Grouped by country, six groups, compact tiles. Each states its **depth badge**
and one counted line: how many interests it can answer, or *"Verified
knowledge, no catalogued place yet"*, or *"Nothing catalogued yet"*. Not
fifteen giant cards; a scannable grid with hierarchy, and every destination is
a link.

### What does this do? — the four stages

Discover → Explore → Understand → Plan. Each names a **real route** and what it
answers. It doubles as a table of contents for the product, which is why it is
not a "how it works" marketing block.

Then Sikkim's sections, unchanged, under the eyebrow **"The flagship archive ·
Sikkim, deep archive"**.

## 3 · The three flows, all working

| Flow | Path | Verified by |
|---|---|---|
| **A · Interest first** | `/` → interest chip → `/discover?interests=…` → destination → discovery → add to trip → planner | `qa:product-flow` §A |
| **B · Destination first** | `/` → destination tile → hub → discovery → add to trip → planner | §B, deliberately on **Rome**, a capsule — the shallow end is where a broken experience shows first |
| **C · Search first** | `/` → ⌘K → "Colosseum" → Rome's record → planner | §C, including that the result **names its owning destination** |

Context survives every one: the interest, the pin and the destination all
travel in the URL, and the planner opens inside the destination it was reached
from.

## 4 · Navigation — and what was deliberately *not* added

The brief asks for Destinations, Discover, Stories, Plan, Search in the primary
bar. The bar carries **Discover · Destinations · Compare**, plus Search as a
control and the current destination's own sections appended (Phase 20).

**Stories and Plan are not top-level, on purpose.** There is no global stories
route and no global planner route — both are destination-scoped, because a
story belongs to a destination and a plan is a plan *of* somewhere. Pointing
either at Sikkim from the global bar is exactly the regression Phase 20
removed, when twelve `/destinations/sikkim/…` links were being rendered on
Paris's page.

Both are prominent without being dishonest:

- **Plan** — a primary hero CTA, stage 4 of the four stages, and in every
  destination's own navigation.
- **Stories** — in each destination's navigation where that destination has
  them, and reachable from every place record.

Making them global would need a global route, which is content architecture —
Phase B, not a navigation tweak.

## 5 · Sikkim

Untouched. **15 / 70 / 26 / 38 / 78**, verified. Every section that was on the
landing page is still on it, in the same order, with the same content — they
now sit below the global entry and are introduced as the deep archive rather
than as the product.

Sikkim is still the only destination that says **Deep archive**, and the
landing page asserts it does not oversell: `qa:product-flow` fails if "Deep
archive" appears more than three times, so a future change cannot quietly claim
depth the data does not have.

## 6 · Measurements

| | Before | After | |
|---|---|---|---|
| Landing page payload | 299,965 B | **348,446 B** | **+16.2%** |
| Landing page TTFB | — | **5–9 ms** | statically generated |
| Client JS | 3.2 MB / 47 chunks | **3.2 MB / 47 chunks** | unchanged |
| Build | 319 pages | **319 pages** | unchanged |

**The +16% is real and is the honest cost of the section.** 48 KB buys fifteen
destination tiles, ten interest chips and four stage cards — and RSC serialises
every element twice, once as HTML and once in the flight payload. Condensing the
repeated card class chain into a `tile` utility recovered 4 KB of it; the rest
is content.

What did **not** happen, and was checked: `allCoverage()` runs at build time, so
TTFB is unaffected; **no destination dataset reached the page** (no capsule
place name appears in the HTML); and the search corpus is still deferred to
`/api/search-index` with zero records inlined.

## 7 · Results

| | |
|---|---|
| Full battery | **29 suites · 2,404 checks · 0 failures** |
| `qa:product-flow` (new) | **38 checks**, three flows + mobile |
| Accessibility | **30 routes, 0 violations** |
| Mobile | 390 / 768 / 1440, **0 horizontal overflow**; interest chips measured as tap targets |
| Destination isolation | Rome's discovery renders no Sikkim record; the landing page leaks no dataset |
| Sikkim regression | **PASS** |

`qa:flows` grew from 116 to 141 checks on its own — it crawls the landing
page's links, and there are twenty-five more of them now. All resolve.

## 8 · One bug found in this phase's own work

The destinations section first read *"15 destinations across 6 countries, **15
of them carrying catalogued records today**"*. That was false. It counted
`!empty`, and `empty` means "neither places **nor** knowledge" — so Jaipur and
Kyoto, which hold reviewed knowledge and **zero** visitable records, were
counted as carrying catalogued records.

Now: *"13 carry catalogued places you can visit; 2 hold reviewed knowledge
without a visitable record yet, and say so."* Counted from
`totals.experiences > 0` and `knowledgeOnly`, which are the facts the sentence
names.

It is worth recording because it is the exact failure this whole project exists
to avoid — a plausible number, rendered confidently, that nobody had counted.

## 9 · What Phase B still has to do

1. **Deepen the twelve capsules.** They are 5–7 places of retrieved, quoted,
   cited text and **are not human-reviewed**. The landing page does not claim
   otherwise; the depth badge is the whole mechanism for that honesty.
2. **A global stories route**, if Stories is to be a top-level entry (§4).
3. **A destination chooser for the planner**, if Plan is to be global.
4. **Hero imagery per destination** — capsule destinations own photographs but
   their hubs are text-led; the landing tiles are text-only for the same reason.
5. **Human review of the ~100 capsule spans** against their sources. Unchanged
   and still the largest caveat in the product.

Nothing in Phase A added a dataset, a route, a dependency or an AI call.
