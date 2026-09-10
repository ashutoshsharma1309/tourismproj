# TerraStory Phase 1 — Current System Architecture

**Audited:** 2026-08-24 · **Repo state:** `main`, working tree clean · **Method:** direct inspection of every source directory, a full `npm run build`, `lint` and `typecheck`. No claim below is inferred from documentation; where the repo's own docs disagree with the code, the code is reported and the discrepancy noted.

---

## 1. Headline findings (read these first)

Four findings materially change the Phase 2 plan. Three of them contradict assumptions stated in the Phase 1 brief.

| # | Finding | Evidence | Consequence for TerraStory |
|---|---|---|---|
| **F1** | **There is no LLM anywhere in this project.** No OpenAI, Anthropic, Gemini or any inference SDK is a dependency, imported, or called. | `package.json` has 10 runtime deps, none AI. Repo-wide grep for provider markers returns only false positives (a Piper voice file named `es_MX-claude-high`, and the historical figure "Sir James Claude White"). | The brief lists "existing AI engines", "LLM integrations" and "AI-assisted features" as things to build on. **They do not exist.** The TerraStory research engine is net-new construction, not an evolution. This is the single largest scope correction in Phase 1. |
| **F2** | **There is no database in use.** `getSupabase()` is defined in `src/lib/supabase.ts` and **called from nowhere** — zero call sites in the entire codebase. | `grep -rn 'getSupabase' src` returns exactly one hit: the definition itself. | Good news for risk (no migration to break), but it means Phase 2 must *introduce* a persistence layer, not adapt one. The "Supabase fallback" described in `.env.example` is aspirational, not wired. |
| **F3** | **The Sikkim coupling is overwhelmingly content, not logic.** Of 4,426 `Sikkim` occurrences in `src/`, **4,184 (94.5%) are inside `src/data/`** — prose, source records and generated JSON. | Per-directory counts: `data` 4,184 · `app` 113 · `components` 67 · `lib` 54 · `types` 8. | Generalization is far cheaper than the brief assumes. The blockers are a handful of *type-level* unions and one routing engine — not a codebase-wide rewrite. |
| **F4** | **The product's governing rule is incompatible with Tapestry's output contract as written.** Sikkim Darshan requires every rendered claim to cite a source. Tapestry's `ResearchOutput` schema has **no per-claim citation field at all**, and its imagery is AI-*generated*, not sourced. | `src/data/sources.ts` §22 rule; `tapestry/src/lib/research-schema.ts` `ContentBlock` union carries no source field; `tapestry/src/lib/gcp/imagen.ts` generates "photorealistic, historically accurate" illustrations. | Adopting Tapestry's pipeline *shape* is right. Adopting its *schema* would silently destroy the credibility rule that is this project's main technical differentiator. See `tapestry-reference-analysis.md` §18. |

---

## 2. Stack, as built

| Layer | Actual technology | Notes |
|---|---|---|
| Framework | **Next.js 16.3.0**, App Router, **Turbopack** | React 19.2.8. `next.config.ts` pins `turbopack.root` and allow-lists two remote image hosts. |
| Language | **TypeScript 5.7** strict | `npm run typecheck` passes clean. |
| Styling | **Tailwind CSS 4** + `class-variance-authority`, `clsx`, `tailwind-merge` | Design tokens in `src/app/globals.css` (623 lines). |
| Animation | `framer-motion` 13 | |
| Maps | **Leaflet 1.9** + OpenStreetMap tiles | No paid map API. No globe. |
| Icons | `lucide-react` | |
| Data store | **None at runtime** — typed TS modules + generated JSON, compiled into the bundle | See F2. |
| Optional DB | `@supabase/supabase-js` present but **unreferenced** | Schema exists (70 lines, 2 tables); nothing reads it. |
| Auth | **None** | No login, no sessions, no user accounts anywhere. |
| Rendering | **268 pages prerendered at build**; one dynamic route (`/planner/result`) | Verified in build output. The README's "203 pages" is stale. |

**Volume:** 29,436 lines of TS/TSX across 158 files — `components` 9,602 · `data` 9,480 (TS only; generated JSON adds ~52,000 more lines) · `app` 6,613 · `lib` 3,539 · `types` 182. Plus ~9,800 lines of Node tooling in `scripts/`.

---

## 3. Architecture in one diagram

```
                        BUILD TIME                          │        REQUEST TIME
                                                            │
  scripts/*.mjs  ──────────►  src/data/generated/*.json     │
  (offline "agents":                    │                   │
   Wikipedia, Wikimedia                 ▼                   │
   Commons, YouTube,          src/data/*.ts  ◄──── src/data/sources.ts
   sikkimtourism.gov.in)      (hand-curated,        (§22 provenance
        │                      typed, cited)         registry — 25 sources)
        │                                │                  │
        │                                ▼                  │
        │                       src/lib/*  (pure functions) │
        │                       itinerary · guide · search  │
        │                       capacity · licence · stats  │
        │                                │                  │
        └──── QA harness ────►           ▼                  │
              scripts/qa/*      src/app/**  (RSC pages)     │
              (10 integrity              │                  │
               + a11y + flow             ▼                  │
               checks)          268 prerendered pages ──────┼──►  Static HTML/JSON
                                                            │      (CDN-servable)
                                         ┌──────────────────┼──►  /planner/result  (ƒ dynamic)
                                         └──────────────────┼──►  /archive/contribute
                                                            │      → server action → .data/ JSON
```

**The defining property: this is a compile-time knowledge system.** Almost nothing happens per request. Facts enter through offline scripts and human curation, are frozen into typed modules, validated by a mechanical QA harness, and shipped as static HTML. That is *why* the source-attribution rule is enforceable — there is no runtime generation step that could invent a claim.

TerraStory's research engine inverts this: it generates knowledge at runtime. **Reconciling those two models is the central architectural problem of Phase 2**, and it is addressed in `terrastory-research-engine.md`.

---

## 4. Layer-by-layer

### 4.1 `src/types/index.ts` (182 lines) — the generalization chokepoint

Small, but it governs everything. Three declarations block multi-destination support:

```ts
export type SikkimDistrict = "Gangtok" | "Mangan" | "Namchi"
                           | "Gyalshing" | "Pakyong" | "Soreng";
export type MonasteryTradition = "Nyingma" | "Kagyu" | "Karma Kagyu" | "Zurmang Kagyu";
export interface Monastery { district: SikkimDistrict; tradition: MonasteryTradition; ... }
```

A closed union of six Sikkim districts is a **compile-time assertion that no other place can exist**. Adding Kyoto is not a data task — it is a type error. The consuming set is small and enumerable: **12 files** reference `SikkimDistrict`, **3** reference `MonasteryTradition`, and 19 import from `@/types` at all. Conversely, this is *good* design being used for the current scope: it is exactly what has kept the dataset honest.

The same file also contains genuinely destination-agnostic work worth preserving verbatim: `TourAvailability` and `AudioAvailability` are discriminated unions that make "we don't have this" a representable state, and `VisitingHours` distinguishes `official` / `reported` / `unpublished`. That three-way distinction is a reusable epistemics primitive, not Sikkim trivia.

### 4.2 `src/data/` — the knowledge base

Two tiers: **hand-curated TS** (`monasteries.ts`, `places.ts`, `history.ts`, `stories/*`, `archive.ts`) and **generated JSON** (`src/data/generated/`, ~52,000 lines produced by `scripts/`).

`sources.ts` is the spine — a 25-entry registry where each `Source` carries `type` (government/press/encyclopedia/commons/internal), `url`, `retrievedAt` and `covers` (what may legitimately be cited from it). Records elsewhere reference source IDs through a `Provenance` value. The registry also records **negative findings** — e.g. the Sikkim Tourism portal entry documents that it publishes *no* monastery opening hours, which is why the archive shows none.

`stories/types.ts` adds `claimType`: `documented history` | `oral tradition` | `legend` | `travel story`, rendered on every card and beside the text. **This is the most valuable asset in the repo for TerraStory** and is fully destination-agnostic — see §5.

Counts: 15 monasteries · 42 places · 74 stories across 19 categories · 180 audio files (15 sites × 12 languages: ar, bn, de, en, es, fr, hi, ja, ko, ne, ru, zh) · registers of hotels and travel agents · a heritage archive.

### 4.3 `src/lib/` (3,539 lines) — pure functions, no I/O

| File | Lines | What it is | Generalizable? |
|---|---|---|---|
| `generate-itinerary.ts` | 825 | `BASES` (5 named towns) + `CORRIDOR` (hand-built road graph) + `CLUSTERS` + a router | **No — rebuild.** Encodes real Sikkim geography by hand. |
| `guide-respond.ts` | 561 | Deterministic retrieval engine. Header: *"There is no model here and no network call."* | Pattern yes, content no. |
| `archive-submissions.ts` | 473 | Community submissions → `.data/` JSON + uploads, always `pending-review` | **Yes, as-is.** |
| `guide-index.ts` | 257 | Builds the guide's knowledge base from build-time data | Yes |
| `visit-history.ts` | 183 | Client-side visit tracking | Yes |
| `licence.ts` | 159 | Image licence/attribution logic | **Yes — high value.** |
| `capacity.ts` | 161 | Registered-capacity aggregation | Adapt |
| `search-index.ts` | 119 | ⌘K palette index | Yes |
| `stats.ts` | 93 | Verified statistics; TSD total deliberately `null` | Adapt |
| `supabase.ts` | 22 | **Dead code** (F2) | Replace |

### 4.4 `src/app/` — 25 route groups, 268 pages

`/` · `/monasteries[/slug]` · `/stories[/slug]` · `/places/[slug]` · `/stays/[slug]` · `/hotels` · `/culture` · `/history[/slug]` · `/archive[/id]`, `/archive/contribute` · `/explore` · `/planner`, `/planner/result` · `/permits` · `/responsible` · `/preservation` · `/industry` · `/api/guide`, `/api/operators`.

Two routes 404 **by design**: `/stays` and `/places` have only `[slug]` children — the stays index lives at `/hotels`. Not defects; do not "fix" them.

Both API routes are `force-static` — they are build-time artifacts served as files, not live endpoints. There is no request-time server logic in this app except the planner result and the contribute action.

### 4.5 `scripts/` — the "agents", accurately described

31 Node scripts + 10 QA scripts, ~9,800 lines. **These are deterministic ETL jobs, not AI agents.** They call Wikipedia, Wikimedia Commons, YouTube, `sikkimtourism.gov.in`, OpenStreetMap and (optionally) Google Maps; they rate-limit, verify licences, and write JSON into `src/data/generated/`. No model is consulted at any point. Audio is produced by macOS `say` and Piper TTS.

Calling them "agents" is a naming convention in this repo. Under TerraStory they become the *ingestion* half of the research engine — the half that already works.

### 4.6 QA harness — the underrated asset

`npm run qa:heritage | qa:gallery | qa:integrity | qa:immersive | qa:a11y | qa:flows | qa:audit | qa:stories-map` — ten scripts that mechanically enforce the sourcing rules, licence compliance, no-photo-reuse-across-places, and accessibility (axe-core over 10 routes, Playwright flows).

**This is the safety net that makes Phase 2 survivable.** A generalization refactor that keeps `qa:heritage` green cannot have silently broken the provenance guarantees. Phase 2 must extend this harness *before* refactoring, not after.

---

## 5. What is already destination-agnostic

Worth stating plainly, because it is more than expected and it determines the Phase 2 strategy:

- **The provenance model** (`sources.ts`, `Provenance`, `VerificationChip`, `Provenance.tsx`) — nothing in it mentions Sikkim.
- **The `claimType` epistemics** — `documented history` / `oral tradition` / `legend` / `travel story` applies to Kyoto and Rome unchanged.
- **Availability unions** — `TourAvailability`, `AudioAvailability`, `VisitingHours{official|reported|unpublished}`.
- **Licence and attribution machinery** (`licence.ts`, `image-credits.json`, `gallery-rejections.ts`).
- **Media components** — `PhotoGallery`, `ImageViewer`, `HeritagePanoramaViewer`, `HeritageAudioPlayer`, `YouTubeHeritagePlayer`, `AmbientAudio`.
- **The archive submission flow** — categories are configurable; the pending-review invariant is universal.
- **The QA harness pattern**.
- **The retrieval-guide pattern** — grounded, refuses to answer what it doesn't hold.

## 6. What is hard-coupled to Sikkim

Ranked by refactor cost:

1. **`generate-itinerary.ts` (825 lines)** — a hand-authored road-corridor graph. Not generalizable; needs a data-driven replacement. **Highest cost.**
2. **`src/types/index.ts` unions** — `SikkimDistrict`, `MonasteryTradition`, `Monastery.district`. Small file, but every consumer type-errors on change. **Highest blast radius, low line count.**
3. **"Monastery" as a first-class entity** — 3,002 occurrences across 89 files, including route paths (`/monasteries/[slug]`), components (`MonasteriesExplorer`), and the DB schema. Kyoto has temples, Rome has basilicas. Needs a generic `Site` with a typed category.
4. **`supabase/schema.sql`** — district and tradition as SQL `CHECK` constraints. Dead, so cheap to replace.
5. **Copy and metadata** — `SITE.name`, `NAV_LINKS`, page metadata, ~180 prose strings. Mechanical.
6. **The data corpus itself** — 4,184 references. Correctly Sikkim-specific; it stays as the reference implementation.

---

## 7. Health at audit time

| Check | Result |
|---|---|
| `npm run typecheck` | **clean** |
| `npm run lint` | **clean** |
| `npm run build` | **exit 0**, 268 pages, 11.8s static generation |
| Dev server | Ready in ~450ms, no warnings |
| Routes sampled (12) | All 200 except the two by-design 404s |
| `npm audit` | 0 vulnerabilities, 457 packages |

The codebase is in good health and is a sound foundation. Nothing in this audit recommends a rewrite.
