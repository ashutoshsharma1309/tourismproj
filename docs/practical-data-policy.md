# Practical Data Policy (G5)

**Practical travel data has no AI synthesis path in TerraStory. This is enforced by architecture, types and tests — not by a prompt.**

---

## 1. Why this gate exists at all

Of the seven publication gates in `phase-3-provenance-contract.md`, this is the only one whose failure **harms a person**.

A wrong founding date is an error a reader may never notice and a curator can correct. A wrong opening time sends someone up a mountain road to a closed monastery. A wrong permit rule sends a foreign national to a Protected Area border without the document that lets them through. A wrong fee is quoted back to a hotel that never charged it.

The archive already understood this before any AI existed: the Sikkim Tourism portal entry in `src/data/sources.ts` records a **negative finding** — the portal publishes no monastery opening times — and that is precisely why the site shows none, rather than showing times gathered from aggregators that contradict each other.

An LLM asked for opening hours will produce plausible ones. That is the failure mode this policy exists to make structurally impossible.

## 2. What counts as practical data

Anything a traveller would act on, that changes without notice:

opening / closing / visiting hours · entry, admission, ticket and gate fees · prices in any currency · permits, visas, RAP/PAP/ILP · availability, bookings, reservations, vacancies · transport timetables and frequencies · road, pass and route status · current operating status · emergency numbers and contact details · check-in / check-out times

## 3. The three independent defences

No single mechanism is trusted. Each would have to fail for practical data to reach a page.

### Defence 1 — Structural: there is nowhere to put it

`ResearchCategory` is a closed set:

```
history · culture · heritage · stories · traditions · festivals · attractions · people · places
```

There is **no practical category**, no field on a `KnowledgeRecord` that renders as an opening time, and no shape in the research model that a fee could occupy. Even if every other defence failed, the structurer could not emit one — it would have nowhere to write it.

### Defence 2 — Behavioural: the guard

`detectPracticalData()` in `scripts/research/core.mjs` runs over **every proposed claim**, before validation.

**It runs before evidence verification, deliberately.** A perfectly evidenced opening time is still rejected. Being correctly sourced does not make practical data publishable *through this pipeline* — it may enter only through the curated path, from an official source, with a human deciding.

The guard is instruction-independent. A model told not to produce opening hours will mostly comply, and "mostly" is not a safety property.

### Defence 3 — The provider is only ever asked to extract

The provider never generates content. It proposes claims with verbatim spans from a document already fetched and hashed. There is no code path shaped like `LLM → "generate opening hours"` because there is no code path shaped like `LLM → generate` at all.

## 4. Tuning — and what it cost

The guard is **deliberately over-inclusive**: a false positive discards one cultural claim; a false negative publishes an invented fee. The asymmetry is not close.

But over-inclusive has a limit, found by testing during this phase:

| Version | Behaviour | Verdict |
|---|---|---|
| `\bbook\b` | Missed *"Rooms are available for booking."* | Gap — a word boundary is not a stem |
| `\bbook(ing\|ings\|ed\|able)?\b` | Caught it, **but also flagged** *"A book of prayers was compiled by the fifth Chogyal."* | Worse — a guard that eats cultural claims is broken, not safe |
| `\bbooking(s)?\b` + context-qualified `booked`/`bookable` | Catches the practical case, leaves the heritage claim alone | Current |

Both directions are now regression-tested in `qa:research`, including the prayer-book sentence, so a future widening that re-breaks it fails the build.

**A known, accepted false positive:** a Wikivoyage sentence about a monastery founding an academy for orphans was rejected because it ended with a price. The historical content was real; the guard fired on the currency amount. That is the tradeoff working as designed, and a reviewer sees the rejection with its reason rather than a silent drop.

## 5. What is allowed

Practical data **may** appear in TerraStory — through the curated path that already exists:

- An official source publishes it, it is entered by a person, and it carries a `Provenance` naming that source.
- The type system already models the honest states: `VisitingHours` distinguishes `official` from `reported` from `unpublished`, and `Admission` (Phase 2 model) distinguishes `free` from `ticketed` from `unpublished`.
- When nothing authoritative exists, the correct output is **nothing** — `unpublished`, rendered as absence.

The research engine is not that path and must never become it.

## 6. Enforcement

| Check | Where |
|---|---|
| 8 practical phrasings detected | `qa:research` §12 |
| 6 heritage phrasings NOT misclassified | `qa:research` §12 |
| Practical claim rejected **even with valid evidence** | `qa:research` §12 |
| Rejection records which rule fired | `qa:research` §12 |
| No research category can hold practical data | `qa:research` §12 |
| Narrative blocks re-screened before storage | `synthesiseNarrative()` |
