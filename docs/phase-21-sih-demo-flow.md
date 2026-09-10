# Phase 21 — The SIH Demonstration

One flow, twelve steps, real production routes. There is no `/demo`, no
`/pitch` and no `/showcase`, and `qa:demo` fails the build if one ever appears
— a staged path would prove a slideshow rather than a product.

**`npm run qa:demo` walks this document.** Every step below is clicked in a
real browser, and the suite asserts that the affordance exists, that following
it lands where this page says, and that the arriving page carries the evidence
the presenter is about to point at. A demo script that has only been read is a
demo script that fails on stage.

---

## The flow

| # | Route | What the presenter does | What to point at |
|---|---|---|---|
| 1 | `/` | Land | "Understand a place before you travel it" · **15 destinations · 6 countries** · three actions |
| 2 | `/discover` | Click **Discover by interest** | "What do you want to experience?" — the door you can walk through without knowing a place name |
| 3 | `/discover?interests=history&interests=heritage&interests=culture` | Tick History, Heritage, Culture → **Show destinations** | Every match shows **how its coverage figure was calculated**. The choice is in the URL. |
| 4 | `/destinations/sikkim` | Open Sikkim | **Deep archive** badge · "Explore this destination through" with counted interests |
| 5 | `/destinations/sikkim/discover` | Click **Discover Sikkim** | Experiences grouped by interest, each card saying what it carries |
| 6 | `/destinations/sikkim/monasteries/dubdi` | Open **Dubdi Monastery** | Sikkim's oldest monastery, at Yuksom — sources on the record |
| 7 | `/destinations/sikkim/stories/the-throne-of-stone-at-norbugang` | Follow the linked story | Claim type **Historical record**, photographer and licence, verification date |
| 8 | `/destinations/sikkim/history/yuksom-coronation-1642` | Follow **Where this sits in the timeline** | The 1642 coronation — the dated event the story tells |
| 9 | `/destinations/sikkim/discover?interest=heritage` → `?pin=site%3Adubdi` | Click **Add to trip** on a card | The pin travels in the URL. No account, no hidden state. |
| 10 | `/destinations/sikkim/plan?pin=site%3Adubdi&interests=history&interests=heritage&days=3` | The itinerary | *"Matches History — named in 5 dated events."* · *"Stops lie within 4.5 km in a straight line"* · **"Nothing here is AI-generated."** |
| 11 | `/destinations` | Click **Destinations** | World map **and** a full list grouped by country; the coverage table uses em-dashes, never zeroes |
| 12 | `/destinations/paris` → `/destinations/paris/discover` | Open Paris | **Tourism capsule** — same page structure, less data, said out loud |

### The one line the whole demo exists to earn

> Step 4 and step 12 are the same page template. Sikkim says *Deep archive*
> and lists thirteen sections; Paris says *Tourism capsule* and lists one.
> **Same engine, different depth** — and the interface says which, rather than
> padding the thinner one to look equal.

### The depth ladder, if there is time

`/destinations/sikkim` (Deep archive) → `/destinations/jaipur` (Curated) →
`/destinations/kyoto` (Researched) → `/destinations/delhi` (Tourism capsule).
Four states, one vocabulary, no empty pages. Jaipur is the interesting one: it
holds 35 reviewer-approved facts and no visitable record, and its discovery
page says exactly that instead of pretending to a tourism offer.

---

## Timing

Measured by `qa:demo`, which times only navigation:

| | |
|---|---|
| Navigation across all 13 steps | **6.9–8.4 s** |
| Slowest single step | ~2.5 s (first visit to a route type) |
| Suite requirement | no step over 5 s, whole walk under 60 s |

Navigation is not the demo. At 15–20 seconds of narration per step the core
twelve steps run **3–4 minutes**, inside the brief's 2–4 minute target. The
extended version — the depth ladder in §"if there is time", the comparison
table at `/destinations/compare?ids=sikkim,paris,delhi,kyoto`, and the
provenance path from a claim to its source — adds **2–3 minutes**.

**Nothing in the flow needs a network service.** No AI provider, no API key, no
third-party call. The one external dependency is OpenStreetMap basemap tiles,
and it is not on the critical path: every map degrades to its surrounding page,
and steps 1–12 can all be completed with the map area blank. The screenshots in
step 11 are the only place a missing basemap would be visible.

### Fallback path

If the network is unavailable or a map fails to draw:

1. Skip the map on `/destinations` and use the **country-grouped list**
   underneath it — it is fully functional on its own and `qa:ux` asserts that.
2. If image optimisation is cold, warm it once before presenting:
   `npm run qa:images` (~5 minutes), or simply open steps 1, 5 and 11 once.
3. If anything else misbehaves, the flow is all GET routes — every step is a
   URL that can be typed directly from the table above.

---

## What changed in Phase 21

### The homepage now says what TerraStory is

The first viewport read **"Digitizing the Sacred Heritage of Sikkim"** with two
actions that both led into Sikkim. That was correct when Sikkim was the
product; it is now one of fifteen destinations, and a judge with four minutes
met a monastery archive with no way to tell that the platform existed.

It now leads with the proposition — *"Understand a place before you travel
it"* — the three actions the product actually has, and counts read from the
registry at build time. Sikkim's own content follows immediately below, under
an eyebrow that names it: **"The flagship archive · Sikkim, deep archive"**.

### A story now shows where it sits in the timeline

`getEventsForStory()` had existed in `data/history.ts` since the timeline was
built and **nothing had ever called it**. A reader could go from a dated event
to the story that tells it, but never back — so step 8 of this flow had no
link to follow.

The story page now renders the events that name it, derived by reading the
archive's own edge backwards. No new data: 21 of 25 timeline events already
reference stories, covering 26 of the 70. The Norbugang throne story shows
three, including the 1642 coronation.

### An uncaught error on the demo path, fixed

Clicking a navigation link a few hundred milliseconds after a map-bearing page
loaded threw:

```
TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
    at i._getMapPanePos → i._move → i._onZoomTransitionEnd
```

A zoom animation started by the map's **initial** `fitBounds` schedules
`_onZoomTransitionEnd`, and `map.stop()` does not cancel a zoom transition.
Navigate away mid-flight and that callback runs against panes `remove()` has
already deleted.

Phase 16 had addressed a related case and placed `map.off()` before
`map.stop()` — which strips the internal listeners Leaflet's own animation
needs in order to unwind. Both are fixed: the teardown order is now
stop → off → remove with a `disposed` guard, and **the initial fit no longer
animates**, because animating from a viewport the visitor has never seen buys
nothing and cost this. Later fits, the ones a visitor triggers, still animate.

Verified across 27 navigate-away timings on three map-bearing routes: **0
uncaught errors**, from 4 before.

---

## Verification

| | |
|---|---|
| Full battery | **27 suites · 2,148 checks · 0 failures · 480 s** |
| `qa:demo` (new) | **60 checks**, walks every step above |
| Accessibility | **30 routes, 0 violations** — including the timeline event added as step 8 |
| Mobile | 390 / 768 / 1440 across the demo surfaces, **0 horizontal overflow** |
| Image audit | **4,072 URLs, 0 failed, 0 stalled** |
| Client JS | **3.2 MB / 47 files** — unchanged from the Phase 20 baseline |
| Build | 319 pages |
| Sikkim | **15 / 70 / 26 / 38 / 78 unchanged** |

HTML payload against the Phase 20 baseline: `/` +0.4%, `/destinations` +0.4%,
`/discover` +0.2%, `/destinations/paris` +1.2%, `/destinations/sikkim` +5.7%
(the last is Phase 20's derived navigation bar, not this phase). No test was
weakened; two suites gained a route each — `qa:a11y` the timeline event, and
`qa:flows` the footer link the Phase 20 columns added.

`qa:flows` failed once during a battery that ran concurrently with the image
warm-up, and passes 116/116 on its own and in a clean battery. Recorded as
contention rather than a defect, because that is what it was.

---

## Known limitations

1. **Basemap labels are in local script.** CARTO began requiring an API key in
   Phase 20 and watermarked every tile; OpenStreetMap's standard tiles are the
   key-free replacement and render local script. Visible in step 11.
2. **The capsules are not human-reviewed.** Every generated file says so.
   Paris, Rome, Istanbul, New York and the eight Indian capsules are retrieved
   and quoted, not edited by a person. If a judge asks, the answer is in the
   file header.
3. **Step 9's pin is a single place.** The planner accepts repeated `pin=`
   parameters, but the demo pins one for clarity.
4. **Jaipur and Kyoto have no visitable records** — deliberately shown, because
   the honest empty state is part of the argument.
5. **No AI is running, and none is claimed.** The trip guide is retrieval over
   catalogued records; the planner is a documented arithmetic formula. Both say
   so on the page.
6. **The demo depends on a warm image cache for its first run.** Cold, the
   first visit to an image-heavy step can add a second or two — see the
   fallback path.
