# Sikkim Dependency Map

Every place the system assumes Sikkim is the only destination. **Nothing here has been changed** — Phase 1 documents, it does not refactor.

**Distribution of the 4,426 `Sikkim` occurrences in `src/`:**

| Directory | Occurrences | Share | Nature |
|---|---|---|---|
| `src/data/` | 4,184 | **94.5%** | Content — prose, sources, generated JSON |
| `src/app/` | 113 | 2.6% | Page copy + SEO metadata |
| `src/components/` | 67 | 1.5% | UI copy |
| `src/lib/` | 54 | 1.2% | Mostly comments; some logic |
| `src/types/` | 8 | 0.2% | **Type-level — the real blocker** |

The inverse relationship between occurrence count and refactor difficulty is the headline: the 8 occurrences in `src/types/` are harder to change than the 4,184 in `src/data/`.

`monaster*` appears 3,002 times across 89 files — a **larger** structural problem than the word "Sikkim", because it is an entity name baked into routes, components, types and SQL.

Complexity: **S** ≤ ½ day · **M** 1–3 days · **L** 1–2 weeks · **XL** > 2 weeks.

---

## D1 — District and tradition unions

- **File:** `src/types/index.ts:33–48`
- **Component:** `SikkimDistrict`, `MonasteryTradition`
- **Current behaviour:** Closed string unions. `SikkimDistrict` enumerates Sikkim's six post-2021 districts; `MonasteryTradition` enumerates four Tibetan Buddhist lineages. Both are required fields on `Monastery` and `MonasteryDetails`.
- **Sikkim-specific reason:** Deliberate. A closed union makes an unsourced or invented district a compile error. It is the type system enforcing the editorial standard.
- **TerraStory requirement:** A destination-scoped administrative division — `{ destinationId, name, kind: "district"|"prefecture"|"arrondissement"|"borough" }` — resolved at runtime, plus a destination-scoped taxonomy replacing `tradition`. The closed-union *discipline* must be preserved per destination (validate against that destination's declared divisions) or the honesty guarantee is lost.
- **Refactor complexity:** **M** — measured, not estimated: **12 files** reference `SikkimDistrict` and only **3** reference `MonasteryTradition` (19 files import from `@/types` in total). This is materially smaller than the 89-file `monaster*` footprint suggests.
- **Risk:** **HIGH.** Still the highest blast radius in the repo — the SQL `CHECK` constraints, all filter UI and the guide index depend on these — but the file list is short and enumerable, which makes the change tractable in one reviewable pass. Attempt only with the QA harness extended first.

## D2 — Hand-built Sikkim road-corridor graph

- **File:** `src/lib/generate-itinerary.ts:67–318` (whole file 825 lines)
- **Component:** `BASES`, `CORRIDOR`, `CLUSTERS`, `corridorPath()`, `routeSpecs()`, `planRoute()`
- **Current behaviour:** `BASES` names five towns (Gangtok, Lachen, Lachung, Ravangla, Pelling). `CORRIDOR` is a hand-authored edge list of real Sikkim roads with travel times. `CLUSTERS` groups attractions by base. The router walks this graph to build day-by-day itineraries.
- **Sikkim-specific reason:** It is not configuration — it is *encoded local geographic knowledge*. Sikkim's road network is a constrained mountain corridor system; the graph captures which valleys connect and how long each leg takes. That knowledge came from a human, not a dataset.
- **TerraStory requirement:** A data-driven router reading a per-destination graph (`bases[]`, `edges[]` with durations, `clusters[]`), with the algorithm generalised and the graph moved into destination data. Each new destination then needs its own graph — authored, or derived from a routing API.
- **Refactor complexity:** **XL**
- **Risk:** **HIGH.** The planner is a flagship feature and directly serves the SIH problem statement. Two distinct risks: (a) breaking Sikkim's working itineraries during extraction; (b) discovering that 14 more corridor graphs is an unfunded data-authoring project. **Recommend: generalise the algorithm in Phase 7, keep Sikkim's graph as the only populated one, and let other destinations degrade to a non-routed "day themes" planner rather than fabricate travel times.**

## D3 — "Monastery" as a first-class entity

- **Files:** `src/types/index.ts`, `src/data/monasteries.ts`, `src/app/monasteries/**`, `src/components/monasteries/**`, `supabase/schema.sql`, plus 84 more (3,002 occurrences / 89 files)
- **Current behaviour:** The primary heritage entity is literally `Monastery`. Route is `/monasteries/[slug]`. Components are `MonasteriesExplorer`, `MonasteryTimeline`, `VisitorVoices`. Audio guides key off `monasterySlug`.
- **Sikkim-specific reason:** In Sikkim the heritage-site class genuinely *is* monasteries. Naming it precisely was correct for a single-destination product.
- **TerraStory requirement:** A generic `HeritageSite` with `siteType` drawn from a destination-scoped vocabulary (monastery, temple, shrine, basilica, mosque, palace, museum, archaeological site). Route becomes `/[destination]/sites/[slug]`, with `/monasteries/*` **permanently redirected** — those URLs are indexed and shared.
- **Refactor complexity:** **L**
- **Risk:** **HIGH** — mostly SEO and link-rot risk, plus JSON key renames rippling into `src/data/generated/*.json` and the audio file tree (`/audio/{slug}/{lang}.m4a`).

## D4 — Supabase schema hard-codes Sikkim

- **File:** `supabase/schema.sql:15–52`
- **Current behaviour:** `monasteries` and `stays` tables with `district text not null check (district in ('Gangtok', … 'Soreng'))` and a tradition `CHECK`.
- **Sikkim-specific reason:** Mirrors the TS unions (D1).
- **TerraStory requirement:** `destinations` / `regions` / `sites` with FK relationships; validity enforced by referential integrity, not literal `CHECK` lists.
- **Refactor complexity:** **S**
- **Risk:** **LOW.** The schema is **dead** — `getSupabase()` has zero call sites, so nothing depends on it. Rewrite freely.

## D5 — Site identity, navigation and metadata

- **Files:** `src/lib/constants.ts:5–20` (`SITE`), `:76–89` (`NAV_LINKS`), `src/app/layout.tsx:40–66`, ~20 page `metadata` exports
- **Current behaviour:** `SITE.name = "Sikkim Darshan"`, tagline "Digitizing the Sacred Heritage of Sikkim"; a flat 12-item nav; OG image alt text naming Rumtek.
- **Sikkim-specific reason:** Single-destination branding.
- **TerraStory requirement:** Global brand + per-destination sub-identity; nav becomes two-level (global explore → destination sections); metadata templated per destination.
- **Refactor complexity:** **M**
- **Risk:** **MEDIUM** — SEO regression if canonicals/OG change without redirects.

## D6 — Statutory TSD fee in the planner

- **Files:** `src/lib/stats.ts`, `src/types/index.ts` (`ItineraryCostBreakdown`), `src/components/bookings/TSDBreakdown.tsx`, `src/data/sources.ts`
- **Current behaviour:** The planner quotes exactly one cost line — Sikkim's ₹50-per-person Tourism Sustainability Development levy, with under-5 exemptions, cited to the 2025 Rules.
- **Sikkim-specific reason:** A real statute of one Indian state.
- **TerraStory requirement:** A generic `MandatoryFee[]` per destination (Venice access fee, Japan departure tax, city tourist taxes) — each **requiring** a `Provenance`, absent when unsourced. Must render nothing rather than estimate.
- **Refactor complexity:** **M**
- **Risk:** **HIGH — legal/reputational.** Quoting a wrong statutory fee for 14 destinations is worse than quoting none. Fees must be opt-in per destination and sourced.

## D7 — Permits (Protected/Restricted Area)

- **Files:** `src/app/permits/page.tsx`, `src/data/permits.ts`, `src/data/generated/permits.json`
- **Current behaviour:** Explains India's PAP/RAP regime for Sikkim destinations.
- **TerraStory requirement:** Generic `EntryRequirement[]` (visa, permit, timed-entry booking) per destination, sourced or absent.
- **Refactor complexity:** **M** · **Risk: HIGH** — same class as D6; immigration guidance must never be generated.

## D8 — Story categories

- **File:** `src/data/stories/types.ts:22–60`
- **Current behaviour:** `StoryCategory` is a closed 19-value union including `"Sikkim History"`, `"Lepcha Heritage"`, `"Bhutia Heritage"`, `"Nepali Heritage"`.
- **Sikkim-specific reason:** Four values name Sikkim's specific communities.
- **TerraStory requirement:** Split into a **universal axis** (History, Festivals, Food, Architecture, Sacred Landscapes, Crafts, Languages, Responsible Tourism — ~15 values, reusable everywhere) and a **destination-scoped community/heritage axis** supplied per destination. `claimType` stays global and unchanged.
- **Refactor complexity:** **M** · **Risk: MEDIUM** — mis-splitting produces either a bloated global enum or per-destination duplication.

## D9 — Explore map fixed to Sikkim

- **Files:** `src/components/explore/ExploreMap.tsx` (673), `src/components/maps/LeafletMap.tsx` (266), `src/data/map-sites.ts`
- **Current behaviour:** Leaflet map with Sikkim bounds/zoom; plots only `mappableMonasteries` (sites with an authoritative coordinate — Dubdi is excluded because its Wikipedia coordinate conflicts with its known location).
- **TerraStory requirement:** Destination-parameterised bounds/zoom, plus a new world-level layer above it (see `global-explore-architecture.md`).
- **Refactor complexity:** **M** · **Risk: MEDIUM.** The "unplotted when disputed" rule is a *feature* and must survive.

## D10 — Trade register and capacity

- **Files:** `src/lib/capacity.ts`, `src/lib/operator-index.ts`, `src/app/industry/page.tsx`, `src/data/generated/registered-hotels.json`, `registered-travel-agents.json`
- **Current behaviour:** Directories of state-registered Sikkim hotels and travel agents, from government registers.
- **Sikkim-specific reason:** Sikkim publishes these registers. Most destinations do not.
- **TerraStory requirement:** Optional per-destination `OfficialRegister` capability. **Where no register exists, the feature must be absent — not backfilled with scraped or invented listings.**
- **Refactor complexity:** **M** · **Risk: HIGH** — the most likely place fake data gets introduced under hackathon pressure.

## D11 — Audio guide pipeline

- **Files:** `scripts/heritage-audio-agent.mjs`, `scripts/audio-scripts.mjs`, `src/data/audio.ts`, `src/data/generated/audio-guides.json`, `public/audio/{slug}/{lang}.m4a`
- **Current behaviour:** 180 files = 15 sites × 12 languages (ar, bn, de, en, es, fr, hi, ja, ko, ne, ru, zh). Scripts composed natively per language, never machine-translated at runtime. macOS `say` + Piper.
- **Sikkim-specific reason:** Script templates reference Sikkim context; the pipeline is macOS-bound.
- **TerraStory requirement:** Destination-agnostic templating; a cloud TTS path for CI. **The "composed natively, never runtime-translated" rule must be preserved** — it exists because an earlier bug spliced English prose into the Hindi frame.
- **Refactor complexity:** **L** · **Risk: MEDIUM** — cost and quality; no voice exists for several target languages.

## D12 — Copy, metadata and alt text

- **Files:** ~180 strings across `src/app/**` and `src/components/**`
- **Current behaviour:** Hard-coded Sikkim prose in headings, meta descriptions, empty states, `not-found`, `global-error`.
- **TerraStory requirement:** Destination-templated copy.
- **Refactor complexity:** **M** (volume, not difficulty) · **Risk: LOW** — but tedious, and easy to leave stragglers. Add a QA check that greps rendered output for destination-name leakage.

## D13 — Archive location screening

- **File:** `src/lib/archive-submissions.ts:24–27` and screening rules
- **Current behaviour:** Pre-screening flags a submission whose location "does not look like Sikkim"; `/archive` warns when an object was photographed outside the state.
- **TerraStory requirement:** Screen against the *active destination's* geography.
- **Refactor complexity:** **S** · **Risk: LOW.** The advisory-only, human-decides invariant must not change.

---

## Aggregate assessment

| Complexity | Items | Notes |
|---|---|---|
| XL | D2 | The itinerary corridor graph — recommend deferring to Phase 7 |
| L | D3, D11 | Entity rename; audio pipeline |
| M | D1, D5, D6, D7, D8, D9, D10, D12 | The bulk of the work |
| S | D4, D13 | Trivial |

**Critical path for Phase 2: D4 → D1 → D3.** Replace the dead schema first (free), then the type unions, then the entity rename. D2 (planner) and D11 (audio) should be explicitly *out* of Phase 2 scope — they are the two places where a rushed generalization would either break Sikkim or invite fabricated data.
