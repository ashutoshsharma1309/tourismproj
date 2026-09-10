# Component Classification

Every major component classified **KEEP · GENERALIZE · ADAPT · REBUILD · DEPRECATE · UNKNOWN**.

**Per the Phase 1 hard rules, nothing is deleted in this phase.** No component is classified DEPRECATE — the 2026-08-16 integrity pass already removed the fabricated surfaces, and everything remaining earned its place.

Codes: **K** keep as-is · **G** generalize (destination-scope it) · **A** adapt (reshape) · **R** rebuild · **U** unknown/needs investigation.

---

## Types and core model

| Component | File | Lines | Class | Note |
|---|---|---|---|---|
| `SikkimDistrict` | `types/index.ts:33` | 6 | **R** | → `AdministrativeDivision`. Highest blast radius (D1) |
| `MonasteryTradition` | `types/index.ts:41` | 1 | **R** | → destination-scoped `Taxonomy` |
| `Monastery`, `MonasteryDetails` | `types/index.ts` | ~60 | **G** | → `HeritageSite` (D3) |
| `TourAvailability` | `types/index.ts` | ~14 | **K** | Projection honesty already correct |
| `AudioAvailability` | `types/index.ts` | 2 | **K** | |
| `VisitingHours` | `types/index.ts` | 4 | **K** | `official`/`reported`/`unpublished` — reusable as-is |
| `Coordinates` | `types/index.ts` | 4 | **K** | |
| `PlannerPreferences`, `GeneratedItinerary` | `types/index.ts` | ~50 | **G** | Shapes fine; `ItineraryCostBreakdown` is TSD-specific (D6) |

## Data layer

| Component | File | Lines | Class | Note |
|---|---|---|---|---|
| Source registry | `data/sources.ts` | 321 | **K + extend** | **The crown jewel.** Zero Sikkim coupling in the model. Add `destinationId?`, `retrievalMethod?` |
| `ClaimType` | `data/stories/types.ts` | ~15 | **K** | Universal. Do not touch |
| `StoryCategory` | `data/stories/types.ts` | 39 | **A** | Split universal / destination-scoped (D8) |
| Story content | `data/stories/*.ts` | ~3,300 | **K** | Sikkim's reference corpus — stays |
| Monastery records | `data/monasteries.ts` | 472 | **G** | Content stays; shape generalizes |
| Places | `data/places.ts` | 709 | **G** | |
| History | `data/history.ts` | 1,072 | **G** | Numeric years already correct |
| Archive | `data/archive.ts` | 443 | **G** | |
| Galleries / images / licence data | `galleries.ts`, `images.ts`, `image-credits.json`, `gallery-rejections.ts` | ~820 | **K** | Licence model is universal |
| Panoramas | `data/panoramas.ts` | 143 | **K** | `placeholder:true` honesty preserved |
| Audio | `data/audio.ts` + `audio-guides.json` | ~5,160 | **G** | Rekey off `monasterySlug` (D11) |
| Permits | `data/permits.ts` | 116 | **A** | → `EntryRequirement` (D7) |
| Stays / hotels | `curated-stays.ts`, `hotels.ts` | ~400 | **G** | Directory-only shape must be preserved |
| Travel agents | `generated/registered-travel-agents.json` | 24,168 | **A** | Optional per-destination register (D10) |
| Generated JSON | `data/generated/*` | ~52,000 | **G** | Regenerate with `destinationId` |

## Libraries

| Component | File | Lines | Class | Note |
|---|---|---|---|---|
| Itinerary engine | `lib/generate-itinerary.ts` | 825 | **R** | Hand-built Sikkim corridor graph (D2). **Highest cost. Defer to Phase 7** |
| Guide response engine | `lib/guide-respond.ts` | 561 | **A** | Retrieval discipline is the model for the AI layer |
| Guide index | `lib/guide-index.ts` | 257 | **G** | |
| Archive submissions | `lib/archive-submissions.ts` | 473 | **K** | Pending-review invariant reused for AI output |
| Licence | `lib/licence.ts` | 159 | **K** | |
| Visit history | `lib/visit-history.ts` | 183 | **K** | Client-only |
| Search index | `lib/search-index.ts` | 119 | **G** | Add destination scope |
| Capacity | `lib/capacity.ts` | 161 | **A** | Register-dependent |
| Operator index | `lib/operator-index.ts` | 151 | **A** | |
| Stats | `lib/stats.ts` | 93 | **G** | Deliberate `null` for TSD total must survive |
| Rate limit | `lib/rate-limit.ts` | 90 | **K** | Becomes useful once there is a live API |
| Format / geo / cn / booking | `format.ts`, `geo.ts`, `cn.ts`, `booking.ts` | 278 | **K** | |
| **Supabase client** | `lib/supabase.ts` | 22 | **R** | **Dead code** — zero call sites |

## Components

| Component | Lines | Class | Note |
|---|---|---|---|
| `ExploreMap` | 673 | **G** | Destination-parameterised bounds |
| `LeafletMap` | 266 | **K** | Already generic |
| `TripGuide` | 529 | **A** | |
| `CuratedStays` | 451 | **G** | |
| `MonasteriesExplorer` | 431 | **G** | → `SitesExplorer` |
| `PlannerForm` | 428 | **G** | |
| `PhotoGallery` | 425 | **K** | |
| `ImageViewer` | 397 | **K** | |
| `HeritagePanoramaViewer` | 385 | **K** | |
| `ContributeForm` | 375 | **K** | |
| `OperatorDirectory` | 351 | **A** | |
| `StoriesExplorer` | 321 | **G** | |
| `ArchiveExplorer` | 315 | **G** | |
| `CultureShelves` | 244 | **G** | |
| `CommandPalette` | 240 | **G** | Destination scope + finder mode |
| `HeritageAudioPlayer` | 231 | **K** | |
| `ArchiveTimeline` | 205 | **G** | |
| `JsonLd` | 200 | **G** | Destination-aware structured data |
| `AmbientAudio` | 187 | **K** | |
| `CapacityTable` | 181 | **A** | |
| `Navbar` | 166 | **R** | Flat 12 items → destination switcher + 4 groups |
| `Footer` | 149 | **G** | |
| `StoryCard` / `StoryHero` / `StorySources` | 351 | **K** | `claimType` rendering — keep exactly |
| `StayGallery` | 146 | **K** | |
| `ParallaxHero` | 142 | **K** | |
| `ContinueExploring` | 125 | **G** | Becomes central to the knowledge graph |
| `VisitorVoices` | 110 | **K** | |
| `ArchiveMedia` / `ArchiveCard` | 183 | **K** | |
| `ItineraryExtras` | 107 | **G** | |
| `TimelineEvent` / `EraNav` / `MonasteryTimeline` | 238 | **G** | |
| `YouTubeHeritagePlayer` | 102 | **K** | |
| `HeroLayerArt` / `ScrollReveal` / `StatCounter` | 218 | **K** | |
| `ExperienceSection` | 100 | **G** | |
| `VerificationChip` / `Provenance` | 158 | **K** | **Provenance UI — do not touch** |
| `TSDBreakdown` | 60 | **A** | → generic `MandatoryFee` (D6) |
| `Modal`/`Button`/`Toast`/`Badge`/`Skeleton`/`Logo` | 318 | **K** | Primitives; `Logo` rebrands |
| `HeritageMapSection` | 67 | **G** | |
| `VisitRecorder` | 27 | **K** | |

## Routes

| Route | Class | Note |
|---|---|---|
| `/` | **G** | → TerraStory landing |
| `/monasteries[/slug]` | **G** | → `/[destination]/sites/[slug]` + **301** |
| `/stories[/slug]`, `/history[/slug]`, `/culture`, `/archive[/id]` | **G** | Destination-scoped + 301 |
| `/places/[slug]`, `/stays/[slug]` | **G** | Detail-only — the 404 on the index is **by design** |
| `/hotels`, `/industry`, `/permits`, `/responsible` | **G**/**A** | |
| `/explore` | **G + new** | Gains a world level |
| `/preservation` | **K + G** | Becomes per-destination depth disclosure |
| `/planner`, `/planner/result` | **G** | Only dynamic route |
| `/archive/contribute` | **K** | |
| `/api/guide`, `/api/operators` | **G** | Currently `force-static` |
| `/sitemap.xml`, `/robots.txt` | **G** | |

## Tooling

| Component | Class | Note |
|---|---|---|
| `scripts/heritage-*.mjs` (7 agents) | **A** | → research engine stages 3–5 |
| `scripts/qa/*` (10 scripts) | **K + EXTEND FIRST** | **The migration safety net** |
| `scripts/*-images.mjs`, `optimize-images.mjs` | **K** | |
| Voice pipeline (`voice-*`, `audio-scripts.mjs`) | **A** | macOS-bound; needs a cloud path |
| `supabase/schema.sql`, `seed.sql` | **R** | Dead |

## Unknown / needs investigation

| Item | Question for Phase 2 |
|---|---|
| `data/generated/*.json` regeneration | Can every generator re-emit with `destinationId`, or do some need rewriting? |
| `public/audio/` (180 files) + `public/images/` (347) | Directory restructure under a destination prefix — cost and redirect strategy |
| Voice availability | No voice exists for several target languages; which of the 12 survive per destination? |
| Panorama placeholders | Do any target destinations have genuinely licensed 360° captures? |

---

## Totals

| Class | Count | Share |
|---|---|---|
| **KEEP** | 38 | ~40% |
| **GENERALIZE** | 37 | ~39% |
| **ADAPT** | 12 | ~13% |
| **REBUILD** | 6 | ~6% |
| **UNKNOWN** | 4 | ~4% |
| **DEPRECATE** | 0 | 0% |

**~40% of the codebase needs no change at all**, and only 6 components need rebuilding — of which one (`supabase.ts`) is dead code and one (`generate-itinerary.ts`) should be deferred out of Phase 2 entirely. This supports the audit's central conclusion: **generalize, do not rewrite.**
