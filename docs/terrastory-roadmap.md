# TerraStory 9-Phase Roadmap

Each phase specifies Objective · Input · Output · Files · Data · API · AI · UI · Testing · Risks · Rollback · Dependencies.

**Governing constraint for every phase:** the `protected-features.md` regression gate must stay green. Sikkim remains fully functional throughout.

---

## PHASE 1 — Audit + Architecture Discovery ✅ COMPLETE

**Objective** Understand the real system before changing it.
**Input** The repository; the Tapestry reference; the SIH 26202 problem statement.
**Output** 16 documents in `docs/`. Four findings that revise the brief's premises: no LLM exists (F1); no database is in use (F2); Sikkim coupling is 94.5% content (F3); Tapestry's output contract is incompatible with §22 (F4).
**Files** `docs/*` only — **no source file modified**.
**Data / API / AI / UI** None.
**Testing** Baseline captured: build exit 0, 268 pages, typecheck + lint clean, 0 vulnerabilities.
**Risks** Analysis paralysis; audit going stale.
**Rollback** N/A — additive.
**Dependencies** None.

---

## PHASE 2 — Global Destination Architecture

**Objective** Introduce the destination dimension. Make the model *capable* of 15 destinations while only Sikkim is populated.
**Input** Phase 1 docs, principally `future-destination-model.md` and `sikkim-dependency-map.md`.
**Output** `Destination` entity; `AdministrativeDivision` and `Taxonomy` replacing the Sikkim unions; `HeritageSite` replacing `Monastery`; `destinationId` on every entity; destination-scoped routing with 301s; a real persistence layer; Sikkim behaving exactly as before.
**Files** `src/types/index.ts` (rewrite) · `src/data/*.ts` (add `destinationId`) · `src/data/destinations/sikkim.ts` (new) · `src/app/**` (route restructure) · `src/lib/constants.ts` · `supabase/schema.sql` (replace) · `next.config.ts` (redirects) · `scripts/qa/*` (extend first).
**Data changes** Every record gains `destinationId: "sikkim"`. `district: SikkimDistrict` → `divisionId: string`. `tradition` → `taxonomyRefs`. New `depth` and `confidence` fields. `Monastery` → `HeritageSite` with `siteType`. Generated JSON regenerated.
**API changes** `/api/guide` and `/api/operators` become destination-scoped (still static). No new runtime endpoints.
**AI changes** **None.** Phase 2 introduces no LLM.
**UI changes** Navbar → destination switcher + 4 journey groups. Depth badges. Routes under `/[destination]`. **Visual design unchanged.**
**Testing** Full regression gate + a **new redirect test** asserting every pre-migration sitemap URL returns 200/301, never 404. New `qa:destination` for referential integrity of `(destinationId, slug)` keys.
**Risks** C4 (breaking Sikkim), H5 (SEO), M7 (zero-config), M8 (category erasure).
**Rollback** Feature-branch; the type change is atomic and revertible. Keep legacy routes as redirects, not deletions, for one release.
**Dependencies** Phase 1. **Extend the QA harness before touching types.**

---

## PHASE 3 — Research + Source-Grounded AI Engine

**Objective** Build the engine that produces §22-compliant knowledge at machine speed. The project's first LLM integration.
**Input** Phase 2 model; existing `scripts/` retrieval clients; `sources.ts`.
**Output** The 10-stage pipeline (`terrastory-research-engine.md`); an authoring CLI; staged output at `depth:"researched", status:"pending-review"`; a curator review flow; `qa:research`.
**Files** `src/lib/research/*` (new: scope, plan, discover, collect, validate, extract, synthesize, verify, stage) · `scripts/research/*` (new CLI) · `scripts/qa/research-integrity.mjs` (new) · `src/data/sources.ts` (add `retrievalMethod`) · reuse `scripts/heritage-*.mjs` clients.
**Data changes** New staged-research store. `Source` gains `retrievalMethod` and optional `destinationId`. No published content changes.
**API changes** Authoring-time only; **no visitor-facing research endpoint**.
**AI changes** First LLM integration. Default `claude-opus-5` for extract/synthesize/verify, `claude-haiku-4-5` for validation triage. Structured outputs; server-side web search with domain allow/block lists; prompt caching; Batch API for bulk runs. Provider-agnostic interfaces at stages 2, 6, 7, 8.
**UI changes** Internal curator review tool only. **Nothing visitor-facing.**
**Testing** `qa:research` fails the build on any uncited factual block or synthesised practical field. Golden-set test: run the engine against Sikkim and compare to the human-curated corpus — **the accuracy benchmark**, and the honest test of the whole thesis.
**Risks** C1, C2, C3, H1, H9, M4, M6.
**Rollback** Entirely additive — the engine writes only to a staging store. Deleting `src/lib/research/` returns the product to Phase 2.
**Dependencies** Phase 2.

---

## PHASE 4 — Global Explore Engine

**Objective** Navigate world → country → destination.
**Input** Phase 2 routing; `global-explore-architecture.md`.
**Output** `/explore` world view on Leaflet/OSM with 15 markers and depth badges; country pages; destination switching that preserves section.
**Files** `src/app/explore/**` · `src/components/explore/*` (generalize `ExploreMap`) · `src/components/maps/LeafletMap.tsx` · `src/components/layout/Navbar.tsx` · `src/lib/search-index.ts` (destination scope + finder mode).
**Data changes** Destination index with centre, bounds, depth.
**API changes** None.
**AI changes** None.
**UI changes** World map; destination cards with depth badges; three-scope ⌘K search.
**Testing** `qa:flows` extended to world→destination→site; a11y on new routes.
**Risks** H3 (map cost — mitigated by choosing Leaflet), M10 (performance).
**Rollback** New routes are additive; `/sikkim` works without them.
**Dependencies** Phase 2. Independent of Phase 3.

---

## PHASE 5 — Destination Story Experience

**Objective** Give every destination a coherent narrative, and wire the knowledge graph.
**Input** Phase 3 output; Tapestry's six-beat spine; `terrastory-knowledge-architecture.md`.
**Output** Destination narrative with the `opening → discovery → key_events → human_layer → today → closing` arc — extended so `closing` hands off to tourism; the knowledge-graph edges; a renderable content model supporting multiple presentations.
**Files** `src/components/story/*` (new renderable model) · `src/app/[destination]/page.tsx` · `src/data/*` (edge fields) · `src/components/discovery/ContinueExploring.tsx` (becomes central).
**Data changes** Edges: story↔site, timeline↔site, site↔site, site↔stay, festival↔site. Depth propagation.
**API changes** None.
**AI changes** Synthesis emits the narrative spine (Phase 3 engine).
**UI changes** Destination landing narrative; cross-links throughout; timeline↔map↔story linkage.
**Testing** Link integrity QA (no edge points at a missing record); depth-propagation tests.
**Risks** M9 (credibility laundering), M8.
**Rollback** Edges are additive data; rendering can ignore them.
**Dependencies** Phases 2, 3. **Sikkim-internal edges (step 1 of the knowledge architecture) can ship earlier — recommended quick win.**

---

## PHASE 6 — Tourism Execution Layer

**Objective** Turn understanding into practical, sourced travel information.
**Input** Phase 2 model; official sources per destination.
**Output** `Admission` (incl. ticketed/timed entry — new capability); generalized `EntryRequirement` and `MandatoryFee`; optional `OfficialRegister`; responsible-tourism guidance per destination.
**Files** `src/app/[destination]/{permits,stays,responsible}` · `src/data/*` · `src/components/bookings/TSDBreakdown.tsx` → generic fee component · `src/lib/capacity.ts`, `operator-index.ts`.
**Data changes** Per-destination fees, entry requirements, ticketing. **All require provenance; absent by default.**
**API changes** Outbound links to official booking sites only. **No booking is transacted.**
**AI changes** **None — practical data is never synthesised** (rule 3).
**UI changes** Admission/hours/fees on site pages; destination practical-info section.
**Testing** QA asserting no practical field lacks provenance; staleness warnings on `retrievedAt`.
**Risks** H7 (statutory errors — highest legal exposure), H8 (registers absent), C5.
**Rollback** Per-destination feature flags; a destination can ship with no practical layer.
**Dependencies** Phase 2.

---

## PHASE 7 — Intelligent Trip Planner

**Objective** Generalize the planner without breaking Sikkim's routes or fabricating travel times.
**Input** `generate-itinerary.ts` (825 lines); Phase 6 practical data.
**Output** Data-driven router reading a per-destination corridor graph; Sikkim's graph extracted unchanged; other destinations degrade to non-routed day themes.
**Files** `src/lib/generate-itinerary.ts` (rebuild) · `src/data/destinations/*/corridor.ts` (new) · `src/app/[destination]/plan/**` · `src/components/planner/*`.
**Data changes** `BASES`/`CORRIDOR`/`CLUSTERS` extracted from code into per-destination data.
**API changes** Planner result stays the one dynamic route.
**AI changes** Optional: AI may *suggest* a corridor graph for curator review. It may **never** emit travel times into production unreviewed.
**UI changes** Planner shows routed vs. non-routed mode honestly.
**Testing** Golden-set: Sikkim itineraries must match pre-refactor output exactly.
**Risks** H6 (**highest-cost item in the roadmap**), C4.
**Rollback** Keep the current engine behind a flag until golden-set parity is proven.
**Dependencies** Phases 2, 6. **Deliberately late — see D2.**

---

## PHASE 8 — Tourism Intelligence / Analytics

**Objective** Insight for tourism stakeholders — **from real data only**.
**Input** Verified statistics; official registers; the archive's own coverage data.
**Output** Destination capacity and coverage analytics; data-depth reporting; gap analysis generalizing `/preservation`.
**Files** `src/lib/stats.ts` · `src/app/[destination]/preservation` · new analytics components.
**Data changes** Aggregations over existing sourced data only.
**API changes** None.
**AI changes** None.
**UI changes** Charts over verified figures; **explicit nulls where a figure is unknown** (as `stats.ts` already does for the TSD total).
**Testing** QA asserting no chart renders an unsourced or interpolated figure.
**Risks** **C5 — the highest-risk phase for fabricated data.** Dashboards were deleted once for exactly this. Occupancy, revenue and remittance figures **must not return**.
**Rollback** Additive pages.
**Dependencies** Phases 2, 6.

---

## PHASE 9 — Integration, QA + Hackathon Hardening

**Objective** One coherent product; every guarantee mechanically enforced.
**Input** All prior phases.
**Output** Full QA suite green; performance budget met; accessibility across all destinations; deployment; demo path.
**Files** `scripts/qa/*` · CI config · `README.md`, `CLAUDE.md`, `AGENTS.md` refreshed.
**Data changes** Final regeneration and validation pass.
**API changes** Rate limits and spend caps if any live AI endpoint exists.
**AI changes** Cost monitoring; provider fallback.
**UI changes** Polish; empty and error states; depth disclosure consistency.
**Testing** Full suite, all destinations: build, typecheck, lint, a11y, flows, integrity, redirects, research integrity, link integrity, zero-config build.
**Risks** Time; scope creep; demo pressure reintroducing fake data (C5).
**Rollback** Release gating.
**Dependencies** All.

---

## Critical path and sequencing

```
P1 ✅ ──► P2 ──┬──► P3 ──► P5 ──┐
               ├──► P4 ─────────┤
               └──► P6 ──┬──────┼──► P9
                         └► P7  │
                         └► P8 ─┘
```

**P2 gates everything.** P3 and P4 are independent and can run in parallel. **P7 is deliberately last among the feature phases** — it is the highest-cost, lowest-generalizability work (D2/H6), and pulling it forward risks both Sikkim's working planner and the schedule.

**If time is short, cut in this order:** P8 → P7 → P5's cross-destination edges. Keep P2, P3, P4, P6, P9. A TerraStory with four well-sourced destinations and no global planner is a stronger SIH submission than fifteen shallow ones with a planner that invents travel times.
