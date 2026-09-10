# TerraStory Product Positioning

Derived from the audited codebase, SIH 26202, and the Tapestry comparison. **No marketing language — every claim below maps to a capability that exists or is scheduled, with the file that implements it.**

---

## 1. The positioning

> **TerraStory is a source-grounded destination intelligence platform. It turns verifiable cultural knowledge about a place into practical travel decisions — and it shows its working for every claim it makes.**

Two halves, and the join is the product:

- **Knowledge engine** — history, heritage, culture, stories, timeline, media, each claim traceable to a named source with a retrieval date and a stated claim type.
- **Tourism engine** — sites, stays, entry requirements, fees, maps, itineraries, the practical layer that converts interest into a trip.

Most tourism products have the second without the first (directories, aggregators). Most heritage products have the first without the second (archives, encyclopaedias). **TerraStory's thesis is that the first is what makes the second trustworthy** — and that the connection between them is the product, not a feature of it.

## 2. What it is not

| Not | Why the distinction is real |
|---|---|
| A tourism website | Content is a typed, validated knowledge base with mechanical integrity checks (`scripts/qa/*`), not pages |
| A hotel directory | Stays are name/division/tier only. No tariffs, ratings or reviews — **deliberately deleted** as fabricated |
| A chatbot | The guide is a deterministic retrieval engine: *"There is no model here and no network call"* (`guide-respond.ts`). It answers from records or says it cannot |
| A history website | Knowledge is wired to visiting: hours, fees, permits, routes |
| An itinerary generator | Itineraries are routed over a real corridor graph and quote only the one cost that can be stated exactly |
| An AI content farm | Machine output enters `pending-review`; only a human publishes it |

## 3. The technical claims, and what backs each

Every row is verifiable in the repo today unless marked Phase.

| Claim | Implementation |
|---|---|
| **Every rendered factual claim traces to a named source** | `src/data/sources.ts` — 25 sources typed government/press/encyclopedia/commons/internal, each with `retrievedAt` and `covers`; enforced by `npm run qa:heritage` |
| **Claims are typed, not flattened** | `ClaimType`: documented history / oral tradition / legend / travel story, rendered on card, header and beside the text |
| **The product publishes what it does not know** | `/preservation` (405 lines) — including the verified negative that **zero** licensed 360° panoramas exist for any Sikkim monastery, from a 35-site sweep |
| **Absence is a first-class state** | `VisitingHours{official\|reported\|unpublished}`, optional coordinates (Dubdi is unplotted because its coordinate is disputed), `TourAvailability` |
| **Media is licensed and credited** | `licence.ts`, `image-credits.json`; `qa:gallery` prevents photo reuse across places; out-of-region photographs are labelled |
| **Multilingual heritage narration** | 180 audio guides = 15 sites × 12 languages, **natively composed per language**, never runtime-translated |
| **Cost claims are exact or absent** | The planner quotes one line — Sikkim's statutory ₹50 TSD levy, with under-5 exemptions, cited. TSD collection total is deliberately `null` in `stats.ts` |
| **Nothing self-publishes** | `archive-submissions.ts` — no code path sets any status but `pending-review` |
| **Fast and resilient** | 268 pages prerendered; renders fully with an empty `.env`; no runtime database required |
| **Machine research is held to the same standard** | Phase 3 — per-claim citation, human review gate, `qa:research` fails the build on uncited claims |
| **Scales without diluting** | Phase 2 — `DataDepth` deep/curated/researched, disclosed on every destination marker |

## 4. Against SIH 26202

> *"A solution/idea that can boost the current situation of the tourism industries including hotels, travel and others."*

| Objective | Contribution | Where |
|---|---|---|
| Tourism & destination discovery | World explore → destination → site, with honest depth signalling | Phase 4 |
| Cultural & heritage discovery | 74 sourced stories, 19 categories, timeline, archive | `/stories`, `/history`, `/archive` |
| Tourist engagement | Audio in 12 languages, galleries, panoramas, ambient layers | `/monasteries/[slug]` |
| Destination visibility | 268 prerendered pages, structured data, sitemap — small destinations become discoverable | `JsonLd.tsx`, `sitemap.ts` |
| Hotel/stay discovery | Register-backed directory linking to official sites | `/hotels`, `/industry` |
| Travel planning | Routed itineraries, permits, statutory fees | `/planner`, `/permits` |
| Tourism-business interaction | Official register + capacity view; contribution flow for communities | `/industry`, `/archive/contribute` |
| **Interest → planning conversion** | The knowledge graph: story → site → nearby stays → itinerary | Phase 5 |

**The strongest honest claim for judging:** most tourism platforms boost visibility by *adding content*. TerraStory boosts it by **making content trustworthy enough to act on** — and it is auditable, because every claim carries its source and every gap is published.

## 5. Why the architecture is the argument

Three properties are unusual enough to be the technical story:

**1. The type system enforces the editorial standard.** `SikkimDistrict` as a closed union means an invented district is a *compile error*. The Phase 2 generalization preserves this — closedness moves per-destination rather than being abandoned. Most systems enforce data quality with validation; this one uses the compiler.

**2. Integrity is mechanical, not procedural.** Ten QA scripts enforce sourcing, licensing, photo uniqueness and accessibility in CI. The rule *"every claim points at a source or it does not ship"* is executable, not aspirational.

**3. The product advertises its own gaps.** `/preservation` exists to publish what is missing. That is what makes the depth tiering credible at 15 destinations: a visitor is told, before clicking, how well a destination is known.

## 6. The differentiator, stated plainly

Tapestry proves **coverage** is achievable — any location on Earth, researched and narrated in minutes, with no per-claim attribution.

Sikkim Darshan proves **credibility** is achievable — every claim traceable, at human authoring speed.

**TerraStory exists to prove these are combinable.** The engineering thesis is that a research pipeline can be constrained — by extracting attributed claims *before* synthesis, by refusing to synthesise practical data at all, and by gating publication on human review — to produce output that satisfies the same standard human curation does.

That is a falsifiable claim, and Phase 3 includes the test: run the engine over Sikkim and compare its output to the human-curated corpus.

**If the thesis fails, the correct response is fewer destinations — not looser sourcing.** That is the positioning, and it is also the constraint.
