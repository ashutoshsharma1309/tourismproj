# Phase 2 — Exact Implementation Plan

**Objective:** introduce the destination dimension so the architecture *can* hold 15 destinations, while only Sikkim is populated and Sikkim behaves identically to today.

**Phase 2 introduces no AI, populates no new destination, and changes no visual design.** Those are Phases 3, and later, deliberately.

File lists below are **measured**, not estimated (`grep -rl` over the working tree at audit time).

---

## Step 0 — Extend the QA harness FIRST

Nothing else starts until this lands. The harness is the only thing that can prove Sikkim survived.

| Action | File |
|---|---|
| Capture baseline: 268 pages, 180 audio files, 347 images, sitemap URL list | `scripts/qa/baseline.mjs` **(new)** |
| Redirect test: every pre-migration sitemap URL returns 200/301, never 404 | `scripts/qa/redirects.mjs` **(new)** |
| Referential integrity for `(destinationId, slug)` composite keys | `scripts/qa/destination-integrity.mjs` **(new)** |
| Copy-leakage check: no hard-coded destination name in shared components | `scripts/qa/copy-leakage.mjs` **(new)** |
| Zero-config build: `npm run build` with an empty env must pass | CI job |
| Register the new scripts | `package.json` |

**Exit criterion:** all existing QA plus the four new scripts green on unmodified `main`.

---

## Step 1 — Destination model (additive, non-breaking)

Add alongside existing types; change nothing yet.

| Action | File |
|---|---|
| `Destination`, `AdministrativeDivision`, `Taxonomy`, `DataDepth`, `Confidence` | `src/types/destination.ts` **(new)** |
| Sikkim as the first `Destination` record — six divisions, Buddhist-tradition taxonomy, `depth:"deep"` | `src/data/destinations/sikkim.ts` **(new)** |
| Registry + lookup helpers | `src/data/destinations/index.ts` **(new)** |

**Reversible:** pure addition. Nothing imports it yet.

---

## Step 2 — Replace the dead persistence layer

Free to do first: `getSupabase()` has **zero call sites**.

| Action | File |
|---|---|
| Replace 2 Sikkim-`CHECK` tables with `destinations` / `divisions` / `sites` / `stories` / `sources`, FK-enforced | `supabase/schema.sql` **(rewrite)** |
| Reseed from the destination record | `supabase/seed.sql` **(rewrite)** |
| Destination-aware client; **must still return `null` cleanly** so the zero-config guarantee holds | `src/lib/supabase.ts` **(rewrite)** |

---

## Step 3 — Retype the core model

The measured blast radius. **12 files** reference `SikkimDistrict`; **3** reference `MonasteryTradition`.

**`SikkimDistrict` → `divisionId`:**
```
src/types/index.ts                              src/data/archive.ts
src/app/planner/_lib/itinerary.ts               src/data/hotels.ts
src/components/archive/ArchiveExplorer.tsx      src/data/map-sites.ts
src/components/explore/ExploreMap.tsx           src/data/monasteries.ts
src/components/monasteries/MonasteriesExplorer.tsx  src/data/places.ts
src/lib/capacity.ts                             src/data/travel-agents.ts
```

**`MonasteryTradition` → `taxonomyRefs`:** `src/types/index.ts`, `src/data/monasteries.ts`, `src/components/monasteries/MonasteriesExplorer.tsx`

**Also touched — the 19 `@/types` importers** (adds the 7 not listed above): `src/app/planner/result/page.tsx`, `src/components/maps/LeafletMap.tsx`, `src/components/monasteries/ExperienceSection.tsx`, `src/components/planner/ItineraryExtras.tsx`, `src/components/planner/PlannerForm.tsx`, `src/lib/constants.ts`, `src/lib/generate-itinerary.ts`, `src/lib/geo.ts`.

**Method:** one atomic commit. TypeScript makes this safe — every unmigrated site is a compile error, so there is no silent partial migration. Run the full gate before merge.

---

## Step 4 — `Monastery` → `HeritageSite`

Larger rename; 17 files import `@/data/monasteries`.

| Action | Files |
|---|---|
| `HeritageSite` with `siteType`; keep `Monastery` as a deprecated alias for one release | `src/types/index.ts` |
| Rename data module, add `destinationId` + `siteType:"monastery"` | `src/data/monasteries.ts` → `src/data/sites.ts` |
| Rename components | `src/components/monasteries/*` → `src/components/sites/*` |
| Rekey `monasterySlug` → `siteSlug` | `src/data/generated/audio-guides.json`, `site-galleries.json`, `monastery-videos.json`, `monastery-reviews.json` |
| Update generators to emit the new key + `destinationId` | `scripts/heritage-*.mjs` (7 files) |

**Leave `public/audio/{slug}/{lang}.m4a` paths unchanged in Phase 2.** They are externally linked; moving media and renaming types in the same phase multiplies risk for no gain.

---

## Step 5 — Destination-scoped routing

| From | To |
|---|---|
| `src/app/monasteries/**` | `src/app/[destination]/sites/**` |
| `src/app/stories/**` | `src/app/[destination]/stories/**` |
| `src/app/history/**`, `culture/`, `archive/**` | `src/app/[destination]/...` |
| `src/app/places/[slug]`, `stays/[slug]`, `hotels/` | `src/app/[destination]/...` |
| `src/app/explore/`, `planner/**`, `permits/`, `responsible/`, `preservation/`, `industry/` | `src/app/[destination]/...` |
| `src/app/api/guide/`, `api/operators/` | destination-scoped, still `force-static` |

Plus: `next.config.ts` — **301 redirects for every legacy route**; `src/app/sitemap.ts` and `robots.ts` destination-aware; `generateStaticParams` for `[destination]`.

`/` stays the landing page. `/stays` and `/places` remain index-less **by design** — do not add index pages.

---

## Step 6 — Content and copy

| Action | Files |
|---|---|
| `SITE` → TerraStory; `NAV_LINKS` → destination switcher + 4 journey groups | `src/lib/constants.ts` |
| Destination-templated metadata | `src/app/layout.tsx`, ~20 page `metadata` exports |
| Navbar rebuild; Logo rebrand | `src/components/layout/Navbar.tsx`, `src/components/brand/Logo.tsx` |
| Destination-aware structured data | `src/components/seo/JsonLd.tsx` |
| Destination-scoped search + finder mode | `src/lib/search-index.ts`, `src/components/search/CommandPalette.tsx` |
| Depth badge component | `src/components/ui/DepthBadge.tsx` **(new)** |
| Destination-aware copy | `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx` |

---

## Exact file list

### Modified (~55)
`src/types/index.ts` · `src/lib/{constants,capacity,search-index,generate-itinerary,geo,supabase,guide-index,operator-index,stats,archive-submissions}.ts` · `src/data/{monasteries→sites,places,hotels,archive,map-sites,travel-agents,curated-stays,galleries,audio,panoramas,permits,images,stay-images,culture-videos,videos,reviews,responsible-tourism,story-images,archive-timeline,gallery-rejections,stay-maps,stay-websites,history}.ts` · `src/data/stories/*.ts` (9) · `src/data/generated/*.json` (regenerated) · `src/components/{layout/Navbar,layout/Footer,brand/Logo,seo/JsonLd,search/CommandPalette,explore/ExploreMap,maps/LeafletMap,archive/ArchiveExplorer,monasteries/*,planner/PlannerForm,planner/ItineraryExtras,stories/StoriesExplorer,stays/CuratedStays,culture/CultureShelves,industry/*,discovery/ContinueExploring}.tsx` · all of `src/app/**` (route move) · `supabase/{schema,seed}.sql` · `next.config.ts` · `package.json` · `scripts/heritage-*.mjs` (7)

### New (~10)
`src/types/destination.ts` · `src/data/destinations/{index,sikkim}.ts` · `src/components/ui/DepthBadge.tsx` · `src/components/layout/DestinationSwitcher.tsx` · `scripts/qa/{baseline,redirects,destination-integrity,copy-leakage}.mjs` · `docs/phase-2-changelog.md`

### MUST NOT be touched in Phase 2

| File / asset | Why |
|---|---|
| `src/data/sources.ts` **content** | The 25 source records are the credibility base. Add fields; change no record |
| `src/data/stories/types.ts` → `ClaimType` | Universal and correct. `StoryCategory` splits in a **later** phase |
| Story prose in `src/data/stories/*.ts` | Sikkim's reference corpus |
| `src/lib/guide-respond.ts` | Retrieval discipline; adapt in Phase 3, not now |
| `src/lib/licence.ts`, `image-credits.json`, `gallery-rejections.ts` | Licence integrity |
| `src/components/ui/{Provenance,VerificationChip}.tsx` | Provenance UI |
| `src/components/stories/{StoryCard,StoryHero,StorySources}.tsx` | `claimType` rendering |
| `public/audio/**` (180 files), `public/images/**` (347) | Externally linked; media moves are a separate phase |
| `src/lib/generate-itinerary.ts` **algorithm** | Retype only. Corridor graph rebuild is **Phase 7** |
| `src/lib/archive-submissions.ts` **invariant** | Pending-review must not change |
| `src/app/preservation/page.tsx` **content** | The published gaps, incl. the 360° negative |
| `src/data/panoramas.ts` `placeholder:true` flags | Honesty markers |
| `stats.ts` deliberate `null` for TSD total | Not a bug |
| `voice-benchmark/`, `reports/`, `research/` | Evidence artifacts |

---

## Definition of done

```bash
npm run build      # exit 0, page count ≥ 268
npm run typecheck  # clean
npm run lint       # clean
npm run qa:heritage && npm run qa:gallery && npm run qa:integrity
npm run qa:immersive && npm run qa:a11y && npm run qa:flows && npm run qa:stories-map
npm run qa:baseline && npm run qa:redirects && npm run qa:destination-integrity
# empty-env build passes
```

Plus manual verification: all 15 site pages · all 74 stories with claim badges · 180 audio files reachable · map plots only sourced coordinates (Dubdi still unplotted) · planner produces identical Sikkim itineraries · guide still answers · `/preservation` unchanged · every legacy URL 301s.

**Any Tier 0 or Tier 1 regression in `protected-features.md` blocks the merge.**

---

## Sequencing and risk

```
Step 0 (QA)  ──►  Step 1 (model, additive)  ──►  Step 2 (dead schema)
                                                       │
                          Step 3 (retype — atomic) ◄────┘
                                     │
                          Step 4 (rename) ──► Step 5 (routes) ──► Step 6 (copy)
```

Steps 0–2 are **entirely non-breaking** and can land immediately. Step 3 is the single risky commit and is protected by the compiler plus the gate. Steps 4–6 are mechanical once 3 lands.

**Explicitly out of Phase 2 scope:** the corridor-graph rebuild (Phase 7), the research engine (Phase 3), the world map (Phase 4), `StoryCategory` splitting, media relocation, populating any second destination, and any AI integration.

**Recommended parallel quick win:** the Sikkim-internal knowledge-graph edges (story↔site, timeline↔site) from `terrastory-knowledge-architecture.md` §7 step 1. They need no new data, no generalization and no dependency on Step 3 — and they deliver the clearest demonstration of the discovery→planning journey the SIH statement asks for.
