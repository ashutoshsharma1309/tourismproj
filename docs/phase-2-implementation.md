# Phase 2 — Global Destination Architecture: Implementation Record

**Completed 2026-08-25.** Sikkim unchanged and fully functional; the architecture now holds fifteen destinations.

---

## 1. What changed

The codebase gained a **destination dimension** it never had. Before Phase 2, Sikkim was not a value in this system — it was an unstated global assumption, with the only thing naming the place being a closed union of six district names.

Five changes, in order of importance:

1. **A destination model** (`src/types/destination.ts`) — `Destination`, `AdministrativeDivision`, `Taxonomy`, `DataDepth`, and a capability model.
2. **A registry** (`src/lib/destinations/registry.ts`) holding all fifteen destinations.
3. **A content access layer** (`src/lib/destinations/content.ts`) — destination-scoped accessors and **derived** capabilities.
4. **One destination-aware route set** (`/destinations`, `/destinations/[destinationId]`) that renders all fifteen from a single component.
5. **Five duplicated district lists collapsed into one source of truth.**

## 2. Why it changed

The Phase 1 audit found the obstruction was narrow: 94.5% of Sikkim references are content, and only twelve files reference `SikkimDistrict`. The correct response was to **generalize the data architecture, not rewrite the application** — so Phase 2 is deliberately small in diff and large in capability.

The fifth item was not in the original plan and emerged from the audit: the six district names were hand-retyped in **five separate modules** (`MonasteriesExplorer.tsx`, `capacity.ts`, `archive.ts`, `hotels.ts`, `travel-agents.ts`). Five copies of one fact is five chances to drift. Giving the destination registry ownership of the vocabulary fixed a real maintenance defect, not just a theoretical one.

## 3. Files changed

**Created (9):**

| File | Lines | Purpose |
|---|---|---|
| `src/types/destination.ts` | 277 | The destination model |
| `src/data/destinations/sikkim.ts` | 65 | Sikkim as a destination record |
| `src/data/destinations/planned.ts` | 184 | The 14 registered-but-unpopulated destinations |
| `src/lib/destinations/registry.ts` | 90 | Lookup, listing, divisions, country grouping |
| `src/lib/destinations/content.ts` | 247 | Content accessors + capability derivation |
| `src/lib/destinations/index.ts` | 38 | Public surface |
| `src/components/ui/DepthBadge.tsx` | 22 | Depth disclosure |
| `src/app/destinations/page.tsx` | 66 | Destination index |
| `src/app/destinations/[destinationId]/page.tsx` | 184 | **One shell for all 15** |

**Modified (6), all minimally:**

| File | Change |
|---|---|
| `src/types/index.ts` | `SikkimDistrict` / `MonasteryTradition` converted from hand-written unions to unions **derived** from exported `as const` tuples. The types are byte-identical in effect; the vocabulary became quotable |
| `src/components/monasteries/MonasteriesExplorer.tsx` | 7-line district literal → `["All", ...SIKKIM_DISTRICTS]` |
| `src/data/archive.ts` | 8-line district literal → `[...SIKKIM_DISTRICTS]` |
| `src/data/hotels.ts` | same |
| `src/data/travel-agents.ts` | same |
| `src/lib/capacity.ts` | same |

## 4. Components generalized

Deliberately **none of the Sikkim UI was rewritten**. `MonasteriesExplorer` was touched only to stop retyping the district list.

The new generic components are additive: `DepthBadge`, the destinations index, and the destination shell. The shell is the important one — it is a single component rendering fifteen destinations, which is the structural proof that no per-city page duplication exists.

## 5. Sikkim-specific logic generalized

| Was | Now |
|---|---|
| `SikkimDistrict` — hand-written union in `@/types` | Derived from `SIKKIM_DISTRICTS`; Sikkim's `Destination.divisions` is built from the same tuple |
| `MonasteryTradition` — hand-written union | Derived from `MONASTERY_TRADITIONS`; becomes Sikkim's `buddhist-tradition` **taxonomy** |
| District list retyped in 5 modules | One tuple, five importers |
| "Which sections exist?" implicit in the navbar | `resolveCapabilities()`, derived from content presence |
| Sikkim implicit everywhere | `DEFAULT_DESTINATION_ID`, one constant |

**`MonasteryTradition` was kept as a domain concept, not dissolved.** The brief permitted this, and it is right: a gompa's lineage is genuinely meaningful and is rendered as a filter. What changed is that it now belongs to Sikkim rather than constraining every destination — Rome has no use for "Zurmang Kagyu" and should not carry the type.

**The closedness discipline is preserved.** A closed union made an invented district a compile error; that was the type system enforcing the editorial standard, and it was worth keeping. It now closes *per destination* — a destination declares its divisions, and a record's division is validated against the destination that owns it.

## 6. Destination abstraction

```
Destination
├── id, name, formalName?
├── country { code, name }
├── region? { name, kind }          ← "prefecture" for Kyoto, not "district"
├── geography { centre, bounds?, timezone }
├── depth: deep | curated | researched | planned
├── divisions: AdministrativeDivision[]   ← replaces SikkimDistrict
├── taxonomies: Taxonomy[]                ← replaces MonasteryTradition
├── languages: string[]
└── contentBasePath?
```

**What a destination record deliberately does not hold:** no description, no highlights, no counts, no "best time to visit". Those are factual claims requiring provenance under §22, and they live in content modules that carry it. A destination record holds identity, geography and vocabulary — the things true regardless of how much has been researched.

`DivisionKind` carries `district | prefecture | ward | arrondissement | borough | rione | province | region | municipality | other`, because rendering "District: Higashiyama" would be quietly wrong.

## 7. Destination registry

All fifteen registered. **Sikkim is `deep`; the other fourteen are `planned`** and hold only verifiable identity and map geometry — name, country, region name, IANA timezone, centre coordinate.

**No tourism information was invented.** No descriptions, attractions, hotels, imagery or counts. A centre coordinate is not a claim about a place; it is where a viewport points. Each planned destination declares no divisions, no taxonomies and no languages, so it resolves to **zero capabilities** and renders an explicit "not yet available".

## 8. Routing changes

**No existing URL changed.** All 270 previously-built pages still resolve at their original paths.

Added: `/destinations` and `/destinations/[destinationId]` (`dynamicParams = false`, `generateStaticParams` over the registry).

**Why Sikkim's routes were not moved to `/sikkim/...`:** the Phase 1 plan proposed it, and the Phase 2 brief asked to preserve existing URLs where practical. Moving 270 indexed pages is a migration with real SEO risk that shares nothing with the architectural goal — the abstraction is proven by the new routes regardless. It is also the change most likely to collide with concurrently-running work.

**Migration strategy, when it happens (Phase 4):** move content routes under `/[destination]/`, add 301s for every legacy path, verify with a redirect test asserting every URL in the pre-migration sitemap returns 200 or 301. `DEFAULT_DESTINATION_ID` and `Destination.contentBasePath` exist so that becomes a change to one constant rather than a search across the codebase.

`/destinations` is **not linked from the navbar**. Adding a 13th nav item is a visible UI change that Phase 2 has no reason to make, and global navigation is Phase 4's job.

## 9. Data-flow changes

```
BEFORE:  Page ──► import { monasteries } from "@/data/monasteries"

AFTER:   Page ──► import { monasteries }            (unchanged, still works)
              └─► getSites(destinationId)           (new, destination-scoped)
```

The new layer is **additive and adaptive**. Existing pages were not rewired, because rewiring 270 working pages to prove an abstraction is risk without benefit. The accessors adapt the existing modules to the destination interface; when a second destination is populated it registers in the same layer and pages above it do not change.

**Every accessor is async and uses dynamic `import()`.** Two reasons: bundle cost (a static import would make every consumer pull in every content module — the travel-agent register alone is 24,000 lines of JSON), and because absent content is normal — returning `[]` is the natural shape, so a destination with no data cannot crash a page.

## 10. What was deliberately NOT changed

| Not changed | Why |
|---|---|
| Sikkim content — 15 sites, 70 stories, 26 history events, 180 audio files, 347 images | The archive is the product |
| `src/data/sources.ts` | The §22 credibility base. Not touched (the 33-line diff there is the concurrent session's) |
| `ClaimType`, `StoryCategory` | Universal and correct; the category split is a later phase |
| `src/lib/generate-itinerary.ts` | See §11 |
| `guide-respond.ts`, `licence.ts`, `archive-submissions.ts` | Working, and their invariants matter |
| Existing routes, navbar, visual design | Phase 2 is architecture |
| `public/audio/**`, `public/images/**` | Externally linked |
| Supabase | See §13 |
| The concurrent session's `/industry` feature | Preserved; its QA still passes |

## 11. Trip planner limitations

**Unchanged and intentionally Sikkim-specific.** It encodes a hand-authored road-corridor graph — 7 bases, 11 corridor edges, 15 clusters — which is local geographic knowledge, not configuration.

Phase 2's only coupling is one derived capability: `tripPlanner: destination.depth === "deep"`. Only Sikkim resolves `true`, so no other destination links to a planner. The absence is structural.

Full analysis: **`docs/trip-planner-generalization-notes.md`**.

## 12. AI limitations

**No AI was added. No LLM dependency, import or call exists in this repository.**

The research engine is Phase 3. Phase 2 deliberately provides no scaffolding for it beyond the destination identity it will need, because speculative abstraction ahead of a known requirement is how architectures get wrong.

## 13. Database decision

**No database was introduced. Decision: defer.**

Phase 1 established `getSupabase()` has zero call sites and the schema is unused. Phase 2 asked whether generalization *requires* persistence. It does not: the registry is fifteen static records, and content remains typed modules compiled at build time.

Introducing a database would have cost the **zero-config guarantee** (the app builds and renders with an empty `.env`), added a runtime dependency to a system that is currently CDN-servable static output, and produced no capability Phase 2 needed.

`supabase/schema.sql` was left in place rather than rewritten — rewriting a dead schema to match a model that will change again in Phase 3 is churn. When persistence is genuinely needed (Phase 3, for staged research output), it should be introduced then, against a real requirement.

## 14. Testing results

| Check | Result |
|---|---|
| `npm run typecheck` | **clean** |
| `npm run lint` | **clean** |
| `npm run build` | **exit 0 — 286 pages** (was 270; +15 destinations +1 index) |
| `npm run qa:heritage` | **PASS** |
| `npm run qa:gallery` | **PASS** |
| `npm run qa:integrity` | **PASS** |
| `npm run qa:immersive` | **PASS** |
| `npm run qa:stories-map` | **PASS** |
| `npm run qa:flows` | **PASS** |
| `npm run qa:a11y` | **PASS** |
| `npm run qa:industry` | **PASS** (concurrent session's) |
| `npm run qa:industry-flows` | **PASS** (concurrent session's) |

**`npm run qa:audit` — pre-existing, not a Phase 2 regression.** The audit reports FAIL on `/`, `/hotels`, `/explore`, `/monasteries/rumtek` and `/monasteries/pemayangtse`. Every one is a failed third-party request; none is a console error, page error or 404.

> **Correction (Phase 2.5).** This section originally attributed the failures to Wikimedia rejecting the headless browser by User-Agent. **That explanation was wrong.** It rested on comparing two *different* URLs — one that happened to 404 and one that resolved — and reading the difference as a User-Agent effect. Phase 2.5 reproduced the failures properly and found the real causes: 18 aborted CartoDB **map-tile** requests on `/` (`net::ERR_ABORTED`, in-flight tiles cancelled as the Leaflet component settles) and 2 hotel-website requests on `/hotels` blocked by Opaque Response Blocking. **Wikimedia is not involved at all** — every `<img>` in this app points at a locally vendored file through `/_next/image`, and the Wikimedia URLs in the HTML are `sourceUrl` attribution metadata, never image loads. Zero broken images, zero HTTP 4xx/5xx. Full investigation: `docs/phase-2.5-hardening.md` §8.

**Content integrity vs. pre-Phase-2 baseline — all unchanged:** audio files 180, languages 12, audio sites 15, public audio 180, public images 347.

**Prerendered output verified:** 15 destination pages, 15 monasteries, 70 stories, 26 history events, 38 places, 22 stays.

**Routes spot-checked on the production build (all 200):** `/destinations`, `/destinations/sikkim`, `/destinations/kyoto`, `/destinations/new-york-city`, `/monasteries`, `/monasteries/rumtek`, `/stories`, `/explore`, `/planner`, `/hotels`, `/industry`, `/preservation`.

**Architecture validation:** `find .next/server/app/destinations -name '*.html'` returns exactly 15 files — agra, delhi, goa, hyderabad, istanbul, jaipur, kochi, kolkata, kyoto, mumbai, new-york-city, paris, rome, sikkim, varanasi — all from one `page.tsx`.

## 15. Remaining technical debt

| Debt | Impact | Phase |
|---|---|---|
| Sikkim's routes are not destination-prefixed | Migration + 301s still owed | 4 |
| Existing pages import data modules directly, not via accessors | Two paths to the same data until a second destination exists | 3–4 |
| `SOURCES` is global, not destination-scoped | Needs a `destinationId` field when a second destination is populated | 3 |
| `/destinations` unlinked from navigation | Discoverable only by URL | 4 |
| `supabase/schema.sql` still Sikkim-`CHECK`-constrained | Harmless (dead), but misleading to a reader | 3 |
| `StoryCategory` still contains four Sikkim community values | Blocks second-destination stories | 3 |
| `curated-stays.ts` `DISTRICT_META` remains Sikkim-shaped | Carries former names/regions; genuinely domain data, but destination-bound | 4 |
| `SIKKIM_ROUTES` map in the destination shell | Hard-codes where Sikkim's content lives; dissolves when routes move | 4 |
| No `qa:destination` integrity script | Capability derivation and registry integrity are untested mechanically | 3 |

## 16. Phase 3 prerequisites

Before the research engine starts:

1. **Add `qa:destination`** — assert every registry entry has required fields, capabilities match content presence, and no planned destination renders a claim.
2. **Scope `Source` by destination** — add `destinationId?` and `retrievalMethod?: "human" | "agent" | "web-search"` so machine-found sources are distinguishable.
3. **Split `StoryCategory`** into a universal axis plus destination-scoped `heritageTags`, preserving the exact community names (Lepcha, Bhutia, Nepali).
4. **Decide persistence for staged research output** — the first genuine requirement for a database (§13).
5. **Extend `DataDepth` handling to rendering** — `researched` content must be visually distinguishable, and depth must propagate to the weakest node in a rendered relationship.
6. **Pick the pilot destination.** Kyoto is recommended: conceptually closest to Sikkim (temples, well-documented, strong open data) while breaking every Sikkim-specific assumption, which makes it an honest test.
7. **Golden-set benchmark** — run the engine over Sikkim and compare with the human-curated corpus. This is the falsifiable test of the whole thesis.

**The engine must not be built until 1 and 2 exist.** They are what make its output checkable, and an unverifiable research engine is the failure mode the entire risk register is organised around.
