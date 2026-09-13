# First-time-user pass — UX simplification without a redesign

SIH 2026 final, Prompt 2. Delivered 2026-09-12/13 on branch `v2-saas`,
alongside the India-only expansion. The visual identity — typography, colour,
photography, spacing, components — is unchanged. What changed is hierarchy,
navigation, copy and flow.

## 1. What a first-time visitor met (audit, 1440 and 390 px)

| Screen | Problem |
|---|---|
| Home | Hero said "Discover the stories behind the places" under an eyebrow "TERRASTORY · TOURISM INTELLIGENCE"; never said what TerraStory is or that it is about India. 14,243 px tall on desktop, 26,507 on mobile, with no "start here". |
| Header | Destinations · Discover · Stories · History · Plan · Compare — two words for the same page, content categories competing with the primary action; on a destination, five more section links appended (ten total). |
| Destination hub | 16,906 px desktop / 30,722 mobile. After the hero: eleven identical chips (Places … Evidence), then "Discover Jaipur" on Jaipur's own page, then an "Explore" grid of the same words. Depth badge read "Curated" / "Deep archive" / "Tourism capsule". |
| /destinations | Opened with "Explore a place through what is known about it", a map, and a legend of data-model tiers; the list of destinations came after. |
| /discover | Explained itself as "a measurement of what has been catalogued", showed "coverage 99/100" and tier badges on results. |
| /destinations/compare | "Compare what is actually known", a paragraph on coverage vs quality, then a record-count table. |
| /journey | "No journey yet — choose destinations on the homepage"; never said what a journey is. |
| Guide | Unlabelled compass circle; panel titled "Trip guide" with the disclosure repeated twice. |

## 2. What changed

**Navigation.** Header: Explore · For you · Journey · Compare, plus "Ask the
guide" and Search. Destination sections no longer ride in the header; they
belong to the hub. Stories, History and Plan indexes stay in the footer and
inside destinations. The mobile drawer mirrors the header and its guide
control opens the panel (a capture-phase wrapper had unmounted the drawer
under the click; the button now closes the drawer itself, then dispatches
`openGuide()` from `src/lib/guide-events.ts`).

**Home.** Eyebrow "TerraStory — Cultural tourism and heritage discovery for
India"; headline "Discover the stories behind India's places"; primary
"Explore India", secondary "Find my destination"; stat row counts derived
from the registry (destinations, states, places). A four-step "How
TerraStory works" strip follows the hero, then "Explore 18 Indian
destinations" cards (photo, name, state, identity words, what you can do,
"Explore Jaipur →"), then the interest picker with one sentence saying why.
Intelligence and preservation folded into the closing section.
Height 14,243 → 11,599 px desktop; 26,507 → 22,123 mobile.

**Destination hub.** Depth badge in plain words ("Deeply documented", "Well
documented", "Documented", "Being catalogued") with a one-line summary in a
traveller's terms. One tiered block, "What you can explore here"
(`src/components/destinations/DestinationExploreTiers.tsx`): Level 1 the
places ("Explore 14 places", primary); Level 2 History · Stories · Culture
with a line each; Level 3 Food · Festivals · Crafts · Museums & archive ·
Local suggestions · Map · Audio · Sources; Level 4 "For your trip": stays,
planner, permits, responsible travel, preservation. Every entry is gated on
the records its target renders from. The duplicate "Discover Jaipur" button,
the "through" chips and the capability grid are gone; the sticky in-page bar
stays as a jump list ("Evidence" → "Sources"). Culture shelves and stays show
a preview with "Show N more" in place; the gallery shows 8; the reviewed
knowledge, verified-fact table, timeline and thread fold into one
"Researched knowledge and sources" disclosure. Place cards end with "Explore
place". Hub height 16,906 → 9,927 px desktop; 30,722 → 18,787 mobile. The
not-yet-catalogued state reads "We are still cataloguing X" with "Explore
other destinations".

**/destinations.** "Explore 18 Indian destinations", one sentence, "Find my
destination" / "Compare destinations", then photographed cards, then the map
under "Where they are". The country jump navigation (one chip, "India") is
gone.

**/discover.** "Pick what you want to experience and we'll show the
destinations that match — with what each one actually offers for it."
Button "Find destinations for me". Results titled "Destinations for you" /
"Destinations for history + food", no score, no tier badge; each result says
"Strong for: History, Food" and keeps "How we match this" as a disclosure.

**Compare.** "Which destination fits you better?" Picker "Choose destinations
— tick two or three". "Where each one is strongest" per interest, and a new
"Why each may suit you" card per destination generated from the same
leaders, so it is explainable by construction. The full table remains below.

**Journey.** Control reads "Add to my journey" / "Added to your journey".
Empty state: "Your journey is empty — Your journey is the list of
destinations you want to explore. Add one from any destination card or page…
Explore destinations". Cap derived from the registry (was pinned at 15).

**Guide.** Launcher is a circle on phones and a labelled "Ask the guide" pill
from `sm` up, fixed bottom-right with safe-area insets. Panel titled "Ask
about Jaipur" / "Ask about any destination"; one disclosure sentence; example
questions phrased as a traveller asks them ("What should I explore in
Jaipur?", "What should I explore if I like history?", "What local food should
I try?", "Where can I stay?", "Plan my trip"); close control 44 px.

**States.** The error page says "This page could not load" and offers
"Explore destinations". Loading boundaries were added for `/discover`,
`/destinations/compare` and the destination planner and then removed: a
`loading.tsx` makes Next stream the response, so the server answered 200
before `notFound()` ran (an unknown destination's planner stopped failing
safely) and every fetch-based suite read a streamed shell instead of the
page. Those three pages render in a few milliseconds from prerendered data,
so the honest state is no spinner at all.

## 3. Accessibility and mobile

`qa:a11y` (axe on every route class): 0 violations. Touch targets on new
controls are ≥ 44 px; every button has an accessible name; new headings keep
order; details/summary disclosures are keyboard-operable; no horizontal
overflow on any audited page at 390 px; the floating guide control sits in
the corner and pages keep their last action clear of it.

## 4. Tests updated

`ux`, `demo`, `product-flow`, `journey`, `content-framework`, `capsules`,
`global-intelligence`, `global-explore-integrity` — expectations moved to the
new labels and structure; no ownership or isolation check was weakened. The
suites read `textContent`, which concatenates adjacent elements, so word
boundaries in badge regexes were dropped rather than the badge changed.

## 5. Final blind read (from the homepage, no documentation)

1. What is TerraStory? — the eyebrow and hero say it: cultural tourism and
   heritage discovery for India, every claim sourced.
2. What first? — "Explore India" or "Find my destination"; the strip below
   names the four steps.
3. Find a destination — Explore → 18 photographed cards → "Explore Jaipur".
4. Find places — the hub's first tier: "Explore 14 places".
5. Learn history — Level 2 "History — what happened here, in order".
6. Local experiences — Level 3 "Local suggestions", Food, Festivals, Crafts.
7. Find a stay — "For your trip → Places to stay", verified records only.
8. Ask the guide — header pill, drawer entry, corner launcher; panel opens
   with example questions.
9. Journey — "Add to my journey" on any card; Journey in the header.
10. Where I have been — /journey holds the list; sign-in history is named as
    coming, not faked.
11. Compare — Compare in the header → "Which destination fits you better?".

## 6. Remaining limitations

- Travel history and returning-user dashboard depend on the login system,
  which is not built; /journey states this plainly rather than simulating it.
- The translated hub pages (`/l/<lang>/…`) show the new tier block in
  English; the archive's per-language dictionary was not extended in this
  pass.
- Section index pages (history, stories, culture, archive) kept their layouts;
  only the hub's routes into them changed.
