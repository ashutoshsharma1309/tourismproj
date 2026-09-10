# Current Feature Inventory

Every major feature, as built. Classification vocabulary: **KEEP** (works, destination-agnostic) · **GENERALIZE** (sound design, Sikkim-bound) · **ADAPT** (reshape for TerraStory) · **REBUILD** (approach won't scale) · **DEPRECATE** (remove) · **BUILD-NEW** (doesn't exist).

Legend for *AI dependency*: **none** everywhere, because the project contains no LLM (see architecture doc F1).

---

## 1. Heritage Site Archive (Monasteries)

- **Purpose:** The flagship — 15 catalogued Sikkim gompas, each with history, significance, architecture, provenance, gallery, audio and visiting hours.
- **Frontend:** `src/app/monasteries/page.tsx`, `monasteries/[slug]/page.tsx`, `src/components/monasteries/*` (MonasteriesExplorer 431, HeritageAudioPlayer 231, VisitorVoices 110, ExperienceSection 100)
- **Backend:** None — prerendered
- **Data:** `src/data/monasteries.ts` (472), `generated/monasteries.discovered.json`, `monasteries.curated.json`
- **DB / API / AI:** none / none / none
- **Status:** Complete and working. 13 of 15 have Wikipedia articles; only 8 publish coordinates.
- **Sikkim-specific:** Yes — entity name, district/tradition types, content
- **Globalizable:** Yes, as `HeritageSite`
- **→ GENERALIZE** (see dependency D1, D3)

## 2. Stories Archive

- **Purpose:** 74 cultural stories across 19 categories, each carrying sources and a `claimType`.
- **Frontend:** `src/app/stories/page.tsx`, `stories/[slug]/page.tsx`, `src/components/stories/*` (StoriesExplorer 321, StoryCard 146, StoryHero 108, StorySources 97)
- **Data:** `src/data/stories/*.ts` — festivals, food, landscape, communities, folk-arts, journeys, monastery-heritage, history
- **DB / API / AI:** none / none / none
- **Status:** Complete. The strongest editorial work in the repo.
- **Sikkim-specific:** Content yes; **the `claimType` model is fully universal**
- **→ GENERALIZE** — split `StoryCategory` per D8; keep `claimType` untouched

## 3. Source & Provenance System (§22)

- **Purpose:** The governing rule — every rendered factual claim points at a registry entry, or renders "Data not available".
- **Frontend:** `src/components/ui/Provenance.tsx`, `VerificationChip.tsx`, `StorySources.tsx`
- **Data:** `src/data/sources.ts` — 25 sources typed government/press/encyclopedia/commons/internal, each with `retrievedAt` and `covers`
- **Status:** Working and mechanically enforced by `npm run qa:heritage`
- **Sikkim-specific:** **No** — zero Sikkim references in the model itself
- **→ KEEP verbatim, then EXTEND.** This is the project's primary technical differentiator and the thing Tapestry lacks. Phase 3 must add `confidence` and per-claim (not per-page) attribution.

## 4. Trip Planner

- **Purpose:** Preference-driven multi-day itineraries with a real route.
- **Frontend:** `src/app/planner/page.tsx`, `planner/result/page.tsx` (528, the only `ƒ` dynamic route), `src/components/planner/*` (PlannerForm 428, ItineraryExtras 107)
- **Backend:** `src/lib/generate-itinerary.ts` (825) + `src/app/planner/_lib/itinerary.ts` (337)
- **Data:** Hand-built `BASES`/`CORRIDOR`/`CLUSTERS` graph
- **DB / API / AI:** none / none / **none — deterministic, not AI-generated**
- **Status:** Working. Quotes exactly one cost line (the ₹50 TSD fee).
- **Sikkim-specific:** **Deeply** — encodes Sikkim's road network by hand
- **→ REBUILD (algorithm) + GENERALIZE (interface).** Highest-cost item in the migration (D2). Recommend Phase 7, not Phase 2.

## 5. Trip Guide (retrieval assistant)

- **Purpose:** Answers visitor questions strictly from catalogued records.
- **Frontend:** `src/components/guide/TripGuide.tsx` (529)
- **Backend:** `src/lib/guide-respond.ts` (561) + `guide-index.ts` (257); `/api/guide` serves the index as a **static** file (deliberately — inlining it added ~313 KB to every page)
- **AI:** **None.** Source comment: *"Pure, synchronous, and deterministic … There is no model here and no network call."*
- **Status:** Working. Says "I don't have that" rather than padding.
- **Sikkim-specific:** Index content only
- **→ ADAPT.** The *discipline* (never answer beyond the records) is exactly what TerraStory's AI layer must inherit. Phase 3 should put an LLM in front of this retrieval layer as a **rephrasing** layer over retrieved records — never as a free-generation layer.

## 6. Explore Map

- **Purpose:** Interactive heritage map.
- **Frontend:** `src/components/explore/ExploreMap.tsx` (673), `maps/LeafletMap.tsx` (266), `home/HeritageMapSection.tsx`
- **Data:** `src/data/map-sites.ts` — plots only sites with an authoritative coordinate
- **API:** OpenStreetMap tiles (free)
- **Status:** Working. Disputed coordinates deliberately unplotted.
- **→ GENERALIZE** (D9) + **BUILD-NEW** world layer above it

## 7. Digital Heritage Archive + Contributions

- **Purpose:** Catalogued cultural objects with licence and creator; public submission flow.
- **Frontend:** `src/app/archive/*`, `src/components/archive/*` (ContributeForm 375, ArchiveExplorer 315, ArchiveTimeline 205)
- **Backend:** `src/lib/archive-submissions.ts` (473) — server action → `.data/` JSON + uploads outside `public/`
- **Status:** Working. Every submission is `pending-review`; **no code path can publish one**.
- **→ KEEP + GENERALIZE.** The pending-review invariant is non-negotiable.

## 8. Multilingual Audio Guides

- **Purpose:** Narrated guides, 15 sites × 12 languages = 180 files.
- **Frontend:** `HeritageAudioPlayer.tsx` (231)
- **Backend:** `scripts/heritage-audio-agent.mjs`, `audio-scripts.mjs` (macOS `say` + Piper)
- **Status:** Live. Scripts composed natively per language, never runtime-translated.
- **→ GENERALIZE** (D11). Cost and voice availability are real constraints.

## 9. Immersive Media

- **Purpose:** Panoramas, galleries, video, ambient audio, parallax.
- **Frontend:** `HeritagePanoramaViewer` 385, `PhotoGallery` 425, `ImageViewer` 397, `YouTubeHeritagePlayer` 102, `AmbientAudio` 187, `ParallaxHero` 142
- **Status:** Working. **Panoramas are flagged `placeholder: true`** — a 35-site sweep found zero openly licensed 360° spheres of any Sikkim monastery, and that negative is published on `/preservation`.
- **→ KEEP.** Components are destination-agnostic already.

## 10. Stays Directory

- **Purpose:** Registered accommodation directory — **name, district, tier only**.
- **Frontend:** `src/app/hotels/page.tsx`, `stays/[slug]/page.tsx`, `CuratedStays` 451, `StayGallery` 146
- **Status:** Working. Tariffs, ratings, reviews, room inventories and bookings were **deliberately deleted** as fabricated. Do not reintroduce.
- **→ GENERALIZE** (D10) — only where an official register exists.

## 11. Trade / Industry Register

- **Purpose:** State-registered hotels (905 properties) and travel agents; capacity aggregation.
- **Frontend:** `src/app/industry/page.tsx`, `OperatorDirectory` 351, `CapacityTable` 181
- **Backend:** `capacity.ts`, `operator-index.ts`, `/api/operators` (static)
- **→ ADAPT** — optional per-destination capability. **Highest fabrication risk** (D10).

## 12. History Timeline

- **Purpose:** Sikkim's documented history by era.
- **Frontend:** `src/app/history/page.tsx`, `history/[slug]/page.tsx` (448), `TimelineEvent` 103, `EraNav` 77, `MonasteryTimeline` 58
- **Data:** `src/data/history.ts` (1,072)
- **→ GENERALIZE.** Maps directly onto Tapestry's `timeline[]` concept — a natural convergence point.

## 13. Culture & Festivals

- **Frontend:** `src/app/culture/page.tsx`, `CultureShelves` 244
- **Data:** `culture-videos.ts`, `stories/festivals.ts` (637)
- **→ GENERALIZE**

## 14. Permits & Responsible Tourism

- **Frontend:** `src/app/permits/page.tsx`, `responsible/page.tsx`
- **→ ADAPT** (D7) — must be sourced or absent. Never generated.

## 15. Preservation / Gaps Page

- **Purpose:** **Publishes what the archive does *not* have** — the 360° negative, missing coordinates, unpublished visiting hours.
- **Frontend:** `src/app/preservation/page.tsx` (405)
- **→ KEEP + GENERALIZE.** Unusual and genuinely differentiating: a product that advertises its own gaps. Under TerraStory it becomes the per-destination **data-depth disclosure**, which is exactly how the DEEP/CURATED/RESEARCHED tiers get communicated honestly.

## 16. Search (⌘K Command Palette)

- **Frontend:** `CommandPalette.tsx` (240) · **Backend:** `search-index.ts` (119), built at build time
- **→ GENERALIZE** — needs destination scoping and a cross-destination mode.

## 17. Visit History / Continue Exploring

- **Frontend:** `ContinueExploring` 125, `VisitRecorder` 27 · **Backend:** `visit-history.ts` (183), client-side only
- **→ KEEP**

## 18. SEO & Structured Data

- **Frontend:** `JsonLd.tsx` (200), `sitemap.ts`, `robots.ts`, per-page metadata
- **Status:** 268 pages in the sitemap
- **→ GENERALIZE** — needs destination-aware canonicals and redirects from `/monasteries/*`.

## 19. Offline Ingestion Pipeline ("agents")

- **Files:** 31 scripts in `scripts/`, ~9,800 lines
- **What they are:** Deterministic ETL against Wikipedia, Wikimedia Commons, YouTube, `sikkimtourism.gov.in`, OSM. **No model involved.**
- **→ ADAPT.** Becomes the *source-retrieval* stage of the TerraStory research engine — the half that already exists and works.

## 20. QA & Integrity Harness

- **Files:** `scripts/qa/*` — 10 scripts (heritage, gallery, integrity, immersive, a11y, flows, audit, stories-map, industry×2)
- **→ KEEP + EXTEND FIRST.** The precondition for every other migration.

## 21. Supabase Integration

- **Files:** `src/lib/supabase.ts` (22), `supabase/schema.sql` (70), `seed.sql` (88)
- **Status:** **DEAD CODE.** `getSupabase()` has zero call sites.
- **→ REBUILD.** Replace with a real destination-aware persistence layer in Phase 2.

## 22. Authentication

- **Status:** **Does not exist.**
- **→ BUILD-NEW, and only if a feature demands it.** See `features-to-avoid.md` — auth for its own sake is scope burn.

## 23. Research / Story Generation Engine

- **Status:** **Does not exist.** This is the core of the TerraStory concept and is 100% new construction (Phase 3).
- **→ BUILD-NEW**

---

## Summary

| Classification | Count | Features |
|---|---|---|
| KEEP | 4 | Provenance (3), Immersive media (9), Visit history (17), QA harness (20) |
| KEEP + GENERALIZE | 3 | Archive (7), Preservation (15), Explore map (6) |
| GENERALIZE | 8 | Sites (1), Stories (2), Audio (8), Stays (10), History (12), Culture (13), Search (16), SEO (18) |
| ADAPT | 4 | Guide (5), Trade (11), Permits (14), Ingestion (19) |
| REBUILD | 2 | Planner (4), Supabase (21) |
| BUILD-NEW | 3 | Research engine (23), Global explore layer, Auth (22, conditional) |
| DEPRECATE | 0 | — nothing should be deleted |

**Nothing is classified DEPRECATE.** The 2026-08-16 data-integrity pass already removed the fabricated surfaces (dashboards, tariffs, ratings, reviews, 220 synthetic bookings, the TSD ledger). What remains is what survived that cut, and it should all be carried forward.
