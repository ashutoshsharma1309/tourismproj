# Phase 11 — Route Audit

**Completed before any modification, as Objective 1 requires.**

---

## The architectural finding that shapes the migration

Sikkim's routes are backed by **hand-curated TypeScript modules** — `monasteries.ts` (472 lines), `history.ts` (1,072), `places.ts` (709), `stories/` (9 files), `archive.ts` (437), and others. Jaipur and Kyoto have **no such corpora**; their content is published-knowledge claims across four categories.

This means route existence cannot be uniform. `/destinations/sikkim/monasteries` is meaningful because fifteen curated records stand behind it. `/destinations/kyoto/monasteries` has nothing behind it, and creating it would be exactly the "empty page to make the route tree look complete" the brief forbids.

**Therefore: routes are capability-gated.** A route exists when the destination exists, the capability resolves true, and content is actually available — the rule already encoded in `resolveCapabilities()` since Phase 2.

## Current route tree

| Route | Purpose | Destination assumption | Target | Redirect |
|---|---|---|---|---|
| `/` | Landing | **Implicit Sikkim** — Sikkim archive branding | unchanged | no |
| `/monasteries` | 15 curated gompas | **Implicit Sikkim** | `/destinations/[id]/monasteries` | **301** |
| `/monasteries/[slug]` | 15 pages | **Implicit Sikkim** | `/destinations/[id]/monasteries/[slug]` | **301** |
| `/stories` | 70 sourced stories | **Implicit Sikkim** | `/destinations/[id]/stories` | **301** |
| `/stories/[slug]` | 70 pages | **Implicit Sikkim** | `/destinations/[id]/stories/[slug]` | **301** |
| `/history` | Timeline, 26 events | **Implicit Sikkim** | `/destinations/[id]/history` | **301** |
| `/history/[slug]` | 26 pages | **Implicit Sikkim** | `/destinations/[id]/history/[slug]` | **301** |
| `/places/[slug]` | 38 pages | **Implicit Sikkim** | `/destinations/[id]/places/[slug]` | **301** |
| `/stays/[slug]` | 22 pages | **Implicit Sikkim** | `/destinations/[id]/stays/[slug]` | **301** |
| `/hotels` | Stay directory | **Implicit Sikkim** | `/destinations/[id]/stays` | **301** |
| `/culture` | Culture shelves | **Implicit Sikkim** | `/destinations/[id]/culture` | **301** |
| `/archive` | 78 archive pages | **Implicit Sikkim** | `/destinations/[id]/archive` | **301** |
| `/archive/[id]` | Object pages | **Implicit Sikkim** | `/destinations/[id]/archive/[itemId]` | **301** |
| `/archive/contribute` | Submission form | **Implicit Sikkim** | `/destinations/[id]/archive/contribute` | **301** |
| `/explore` | Sikkim heritage map | **Implicit Sikkim** | `/destinations/[id]/explore` | **301** |
| `/planner`, `/planner/result` | Corridor-graph itinerary | **Genuinely Sikkim** (D2) | `/destinations/[id]/planner` | **301** |
| `/permits` | India PAP/RAP | **Genuinely Sikkim** | `/destinations/[id]/permits` | **301** |
| `/responsible` | Guidance | **Implicit Sikkim** | `/destinations/[id]/responsible` | **301** |
| `/preservation` | Published gaps | **Implicit Sikkim** | `/destinations/[id]/preservation` | **301** |
| `/industry` | Sikkim trade register | **Genuinely Sikkim** | `/destinations/[id]/industry` | **301** |
| `/destinations`, `/destinations/[id]` | Global discovery | none | unchanged | no |
| `/review`, `/review/[id]` | Internal reviewer tool | none | unchanged | no |
| `/api/guide`, `/api/operators` | Static build artifacts | Sikkim index | unchanged | no |
| `/sitemap.xml`, `/robots.txt`, `/icon.svg` | Infrastructure | — | unchanged | no |

**249 prerendered content pages** across the migrating groups: monasteries 15 · stories 70 · history 26 · places 38 · stays 22 · archive 78.

## SEO impact

Every migrating URL is in the current sitemap and may be indexed or bookmarked. Each needs a **301 to its exact counterpart** — never a blanket redirect to a destination homepage, which would destroy the specific-page equity the redirect exists to preserve.

The sitemap must emit only canonical destination-native URLs after migration; leaving old URLs in it would advertise two canonical addresses for one page.

## `DEFAULT_DESTINATION_ID` — where it is actually load-bearing

Eight occurrences; only three are architectural:

| Location | Role | Verdict |
|---|---|---|
| `registry.ts:53` | The constant | Keep — a default is legitimate; being the *resolver* is not |
| `registry.ts:56-59` | `getDefaultDestination()` | Keep, unused by routing |
| `search-index.ts:182,203` | Groups Sikkim's index under it | **Load-bearing** — only because Sikkim's content sits at un-prefixed routes |
| `CommandPalette.tsx:117` | Comment describing the assumption | Documentation |
| `index.ts:11` | Re-export | Mechanical |

Plus the palette's real dependency: it infers the current destination from the pathname and **falls back to `"sikkim"` for any non-`/destinations` path**. That fallback is the assumption in its purest form, and it disappears when Sikkim's content moves under `/destinations/sikkim`.

## Dependencies to update

- **33 files** contain a Sikkim route string; **~111 internal link references** across navbar, footer, cards, stories, timeline, map, search index, CTAs
- `sitemap.ts` — 6 URL builders
- `constants.ts` — `NAV_LINKS` (12 entries)
- `search-index.ts` — hrefs for ~1,140 records
- Page `metadata` exports — canonical/OG URLs
- `next.config.ts` — redirect table (new)

## Risk assessment

**High.** This touches every route on a working 286-page site with a curated archive that took months to build. The specific dangers:

1. A missed internal link produces a redirect hop on every navigation — technically working, visibly slower, and a sign of an incomplete migration.
2. A wrong `generateStaticParams` silently drops pages; the build still succeeds.
3. Redirect chains (old → new → newer) if a route is moved twice.
4. Sikkim content loaded on a Kyoto route through a component that was written when Sikkim was the only destination.

Mitigations: capability-gated static params, a redirect matrix verified against the pre-migration sitemap, an isolation test per destination, and a content-count comparison against the Phase 2 baseline.
