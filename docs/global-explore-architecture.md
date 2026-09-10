# Global Explore Architecture

How TerraStory navigates from the world to a single experience. **Architecture only — the map/globe is not built in Phase 1.**

---

## 1. The hierarchy

```
WORLD          globe / world map — 15 curated destinations as markers
  ↓
COUNTRY        India (10) · Japan · France · Italy · Türkiye · USA
  ↓
REGION         state / prefecture / province     (Destination.region)
  ↓
DESTINATION    Sikkim, Kyoto, Paris …            ← the unit of depth and identity
  ↓
DIVISION       district / ward / arrondissement  (Destination.divisions)
  ↓
PLACE          HeritageSite, Stay, Experience
  ↓
EXPERIENCE     audio guide · gallery · panorama · story · itinerary day
```

**DESTINATION is the pivot.** It owns depth, languages, divisions, taxonomies, fees and entry rules. Everything above it is navigation; everything below is content. COUNTRY and REGION are *grouping* levels only — they never own content, which keeps the model from needing a "France" knowledge base separate from "Paris".

## 2. Routing

| Level | Route | Rendering |
|---|---|---|
| World | `/explore` | Static shell + destination index |
| Country | `/explore/[country]` | Static |
| Destination | `/[destination]` | Static, prerendered |
| Section | `/[destination]/{sites,stories,history,culture,archive,stays,plan}` | Static |
| Place | `/[destination]/sites/[slug]` | Static (SSG) |
| Legacy | `/monasteries/*`, `/stories/*`, `/hotels`, … | **301 → `/sikkim/...`** |

**Legacy redirects are mandatory, not optional.** 268 pages are indexed and shared; `/monasteries/[slug]` URLs exist in the wild. Every current route must permanently redirect to its Sikkim-scoped equivalent, and a QA check should assert that no current URL 404s after the migration.

**A destination-less root stays available.** `/` remains the product landing page; TerraStory should not force a destination choice before showing anyone anything.

## 3. Rendering strategy

The current model — 268 pages prerendered, one dynamic route, CDN-servable — is a genuine asset: fast, cheap, and structurally incapable of generating an unsourced claim at request time. **Keep it.**

Projected scale: Sikkim's ~268 pages, plus 14 destinations at ~40–120 pages each ⇒ roughly **900–1,900 pages**. Comfortable for build-time generation.

- **`deep` / `curated` destinations** — fully prerendered, as today.
- **`researched` destinations** — prerendered from *staged, human-approved* research output. Research runs as an authoring job (research-engine rule 6), never during a page request.
- **No visitor-facing research.** No page waits on an LLM.

If the page count later outgrows full prerendering, the escape hatch is ISR on `/[destination]/sites/[slug]`, not request-time generation.

## 4. The world view

Two candidate surfaces, and a recommendation:

| Option | Cost | Fit |
|---|---|---|
| **Leaflet + OSM world map** with 15 markers | Free — already a dependency | Sufficient. Consistent with the existing `ExploreMap` |
| **Google Photorealistic 3D globe** (Tapestry's approach) | Billable per load; needs Maps Tiles + JS APIs | Higher impact; adds a paid dependency and a key to every page load |

**Recommendation: build the Leaflet world map first.** It is free, reuses `ExploreMap.tsx` and `LeafletMap.tsx` (939 lines of working code), and delivers the whole navigation model. Treat the 3D globe as an optional, separately-gated entry surface evaluated on measured cost — not as the default.

This differs deliberately from Tapestry, where the globe *is* the product because any point on Earth is clickable. TerraStory has **15 curated destinations**; a photorealistic globe is presentation, not navigation, and a marker map communicates "curated set" more honestly than a clickable Earth that implies unlimited coverage.

## 5. What the world view must show

Each destination marker carries its **depth badge** — `deep` / `curated` / `researched` — visible before entry.

This is the honesty mechanism at navigation level. A visitor who clicks Sikkim and then Kochi will see different amounts of content; the interface should have told them why *before* they clicked, not left them to infer that Kochi is broken. It generalizes what `/preservation` already does for Sikkim: publish the gaps rather than hide them.

## 6. Destination switching

A persistent destination switcher replaces today's flat 12-item navbar, which does not survive multi-destination (12 items × 15 destinations is not a menu).

```
[ TerraStory ]  [ ▼ Sikkim  (deep) ]   Explore  Understand  Experience  Plan
```

The four section groups map onto the journey model from the knowledge architecture, collapsing 12 flat links into 4 stages:

- **Explore** — map, sites, places
- **Understand** — history, timeline, stories, culture, archive
- **Experience** — audio, galleries, panoramas, festivals
- **Plan** — itinerary, stays, permits, fees, responsible travel

Switching destination preserves the current section where it exists in the target, and falls back to that destination's landing page where it does not — so moving from Sikkim's Stories to Kyoto lands on Kyoto's Stories, not a 404.

## 7. Search

Three scopes, all built on the existing build-time `search-index.ts` (119 lines) and ⌘K palette (240 lines):

1. **Within destination** (default) — today's behaviour, scoped
2. **Across destinations** — destination-grouped results
3. **Destination finder** — "where can I see Buddhist monasteries?" → Sikkim, Kyoto

Scope 3 is the only genuinely new capability, and it is the one that makes a multi-destination product feel like one product rather than fifteen microsites.

## 8. Non-goals

- **No arbitrary-location exploration.** TerraStory covers 15 curated destinations. Clicking empty ocean does nothing — the opposite of Tapestry's premise, and deliberate: unlimited coverage is incompatible with per-destination depth and with bounded cost.
- **No auto-detected location** as the entry point. Discovery is the product; geolocation defaults undercut it.
- **No destination pages for unpopulated destinations.** A destination without approved content is not listed. There are no "coming soon" shells.
