# Phase 22 — Final Freeze

TerraStory is frozen. This document is the state of the product at freeze, the
evidence for every claim in it, and the list of what was deliberately left
undone.

Measured on **2026-08-28** against build `PDXJujQnJGEPglOHCA9U3`, from a
completely clean tree: `.next` removed (image cache with it), one production
build, one fresh server, no other server on the port.

---

## 1 · What TerraStory is

A tourism platform that publishes what it can prove and says so when it cannot.

The differentiator is not coverage. It is that **every published sentence is
traceable to a named source, and every gap is stated rather than filled**. A
destination page that knows less says so, in the same vocabulary as one that
knows more.

**TerraStory is the platform. Sikkim Darshan is the deep archive it was built
around**, and keeps that name on its own pages.

## 2 · The destination model

One registry of identity (name, country, region, IANA timezone, centre
coordinate). No content. Everything a destination *shows* is derived from what
it *has*:

```
content presence  →  resolveCapabilities()  →  capabilities
capabilities      →  CAPABILITY_SECTION     →  routes, navigation, sitemap
```

**No component decides what a destination offers.** A section exists because a
record exists; a navigation link exists because the section does. That single
rule is why twelve destinations were added in two phases without touching a
component, and why no link can point at a page that does not exist.

## 3 · The fifteen destinations

| Depth | Destinations | What it means |
|---|---|---|
| **Deep archive** | Sikkim | Human-curated, source-registry-backed, QA-enforced |
| **Curated** | Jaipur | Human-reviewed, narrower coverage, same sourcing standard |
| **Researched** | Kyoto | Machine-assembled from retrieved sources, human-reviewed before publication, always labelled |
| **Tourism capsule** | Delhi, Agra, Varanasi, Mumbai, Kolkata, Hyderabad, Kochi, Goa, Paris, Rome, Istanbul, New York City | 5–7 places, every sentence a span quoted verbatim from a fetched source. **Not human-reviewed**, and every file says so |
| **Not yet available** | *none today* | Registered, renders nothing. Still live — it is what a sixteenth destination gets |

6 countries: India (11), Japan, France, Italy, Türkiye, United States.

**The line that matters under questioning:** the three depths above the capsule
line are human-reviewed. The capsules are *retrieved and quoted, not reviewed* —
66 places whose every sentence is verbatim from a page that was actually
fetched, with the URL beside it. Say that before a judge asks.

### Sikkim, the protected baseline

**15 monasteries · 70 stories · 26 timeline events · 38 places · 78 archive
records** — asserted by four separate suites against built output, unchanged
through eleven phases of expansion.

## 4 · Features that are live

Destination hubs · interest-first discovery (`/discover`) · per-destination
discovery · explainable trip planner · destination comparison ·
cross-destination intelligence · deferred ⌘K search · maps · stories with claim
types · timelines · the archive · licensed-operator register · permits ·
audio guides in twelve languages · provenance from claim to source.

## 5 · Architecture, in one line each

- **Routes** — `/destinations/[destinationId]/…`, `dynamicParams = false`. 319
  pages. The pre-Phase-11 top-level Sikkim routes 301 to their destination-native
  equivalents in a single hop.
- **Search** — built at build time into `/api/search-index` (271 KB) and fetched
  once on first open. No page inlines the corpus; each destination owns its
  group, so "Colosseum" resolves to Rome and never to Sikkim.
- **Discovery** — interests derived from records, never declared. Every card
  states what it carries.
- **Planner** — a documented arithmetic formula: `interestMatch 0-50 +
  historicalRelevance 0-20 + culturalRelevance 0-20 + heritageRelevance 0-5 +
  evidenceStrength 0-5`, interest match as a hard first sort key. URL-as-state,
  no client JS on the path.
- **Provenance** — claim → source → evidence span, re-verified against the
  source document at publication. Conflicts stay unresolved. A rejected claim
  cannot appear as approved knowledge.
- **Capsules** — a validator that fails closed: an unsourced claim, a dangling
  source id, an image without alt text or a forbidden practical field drops the
  whole capsule rather than rendering part of it.

## 6 · AI status — **NOT ACTIVATED**

| | |
|---|---|
| Provider configured | none |
| Key set | none |
| Imports of an AI SDK from `src/` | **0** |
| AI SDK bytes in any client chunk | **0** |
| Pages claiming AI authorship | **0** of 280 |

`@anthropic-ai/sdk` is a dependency of the offline **research** pipeline
(`scripts/research/`), reached through `await import()` behind an unset key.
The shipped application cannot reach it, and `qa:release` §7 asserts all of the
above rather than trusting it.

The planner says, in bold, on the page: *"Nothing here is AI-generated."* The
trip guide is retrieval over catalogued records and says so in its own header.

## 7 · Measurements

### Build

| | |
|---|---|
| Pages | **319** (280 HTML + route handlers) |
| Duration | **71 s** wall, clean tree |
| Warnings / errors | **0 / 0** |
| Client JS | **3.2 MB across 47 chunks** |
| Typecheck · lint | clean · clean |

### Payload and TTFB, production server

| Route | Payload | TTFB |
|---|---|---|
| `/` | 299,965 B | 18 ms |
| `/destinations` | 115,304 B | 5 ms |
| `/discover` | 229,216 B | 133 ms |
| `/destinations/compare?ids=…` | 85,052 B | 73 ms |
| `/destinations/sikkim` | 144,716 B | 3 ms |
| `/destinations/paris` | 65,622 B | 3 ms |
| `/destinations/sikkim/discover` | 315,318 B | 32 ms |
| `/destinations/sikkim/plan` | 164,574 B | 29 ms |
| `/destinations/sikkim/monasteries/rumtek` | 436,795 B | 9 ms |
| story page | 132,990 B | 8 ms |
| `/api/search-index` | 270,881 B | 21 ms |

`/discover` is the slowest to first byte at 133 ms because it is the one
deliberately dynamic route — it reads `searchParams` so the interest selection
can live in the URL.

### Storage

| | |
|---|---|
| Content source (`src/data`) | 3.1 MB |
| — capsules (12 destinations) | 172 KB |
| Images shipped | 122 MB |
| Audio guides (181 files, 12 languages) | 156 MB |
| Build output | 387 MB |
| QA screenshots (`reports/`, tracked, **not served**) | 209 MB |

Largest shipped asset: 1.1 MB. Nothing was deleted to reduce size — see §12.

## 8 · QA — 28 suites, 2,341 checks, 0 failures, 0 environmental

| Category | Status | Evidence |
|---|---|---|
| Build | **PASS** | 319 pages, 0 warnings, build `PDXJujQnJGEPglOHCA9U3` |
| Typecheck | **PASS** | `tsc --noEmit` clean |
| Lint | **PASS** | `eslint .` clean |
| Routes | **PASS** | `qa:route-migration` 86/86; 5 legacy routes 301 in one hop |
| Destination isolation | **PASS** | `qa:capsules` 245/245, `qa:global-capsules` 276/276 |
| Search | **PASS** | ownership asserted per landmark; corpus deferred |
| Discovery | **PASS** | `qa:discovery` 105/105 |
| Planner | **PASS** | `qa:planner` 85/85 |
| Stories | **PASS** | `qa:flows` 116/116, story→timeline live |
| Timeline | **PASS** | `qa:narrative` 71/71 |
| Images | **PASS** | 4,072 URLs, 0 failed, 0 stalled, cache cleared first |
| SEO / social | **PASS** | `qa:release` §2 — every destination owns its title, canonical and card |
| Sitemap | **PASS** | derived; every destination listed; every URL resolves |
| Accessibility | **PASS** | `qa:a11y` **30 routes, 0 violations** |
| Mobile | **PASS** | `qa:ux` + `qa:global-capsules`, 390/768/1440, 0 overflow |
| Security | **PASS** | `qa:ux` §11, `qa:global-capsules` §11, `qa:release` §5 |
| Performance | **PASS** | §7 above; client JS unchanged since Phase 19 |
| Provenance | **PASS** | `qa:research` 88/88, `qa:publishing` 52/52 |
| AI resilience | **PASS** | `qa:resilience` 69/69; §6 above |
| Global destinations | **PASS** | `qa:global-intelligence` 103/103, `qa:global-explore` 98/98 |
| Sikkim regression | **PASS** | 15/70/26/38/78 |
| Demo flow | **PASS** | `qa:demo` 60/60, walked in a browser |
| Release readiness | **PASS** | `qa:release` 193/193 |

`npm run qa:final` runs all 28 in one command and distinguishes genuine
failures from environmental ones.

### `qa:stories-map` — **RESOLVED**

Documented as failing since Phase 11 and fixed in Phase 16 (a `networkidle`
wait on a page with a live Leaflet map). Re-verified this phase from a clean
build and a fresh server: **46/46**. No assertion was altered to achieve it.

## 9 · Security

Fifteen classes of invalid input, all failing safely with no content leakage:
unknown destination · foreign place / story / experience id · foreign planner
pin · invalid interest · malformed query · encoded traversal · path traversal ·
uppercase ids · invalid comparison destination · invalid route parameters ·
debug/test/presentation routes (9 probed, all 404).

**Secrets:** 9 credential patterns scanned across every shipping file type.
**No credential in any file that ships.** `.env.local` exists locally, is
gitignored, and is untracked — it cannot reach the build. `.env.example`
declares keys with empty values. Reported by location only, never by value.

**One standing item, not a repository finding:** a Groq API key was pasted into
this project's chat during Phase 13. It was never written to a file and does not
appear anywhere in the tree. **It should still be rotated** — a key that has been
in a transcript should be treated as disclosed.

## 10 · Practical-data safety

All 280 built pages scanned for six classes of fabricated practical value —
clock times, opening hours, booking actions, live availability, departure times,
star ratings. **Zero.**

Exactly one price is stated anywhere in the product: the **statutory Sikkim
Tourist Trade Development entry fee (₹50 per person)**, labelled *(statutory)*,
with its instrument named on `/preservation` and the scope of what was verified
recorded beside it. The planner prints, in the same block: *"Nothing else here
is priced: this project holds no licensed rates feed, so accommodation and
transport are not estimated."*

## 11 · Demo

`docs/phase-21-sih-demo-flow.md` — twelve steps, real production routes,
**6.9–8.4 s of navigation**, ≈3–4 minutes narrated. `/demo`, `/pitch`,
`/presentation`, `/showcase` and `/sih` all 404, asserted.

The flow needs **no AI provider, no API key and no third-party service**. The
only external dependency is OpenStreetMap basemap tiles, and it is off the
critical path: every map degrades to its surrounding page, and the
country-grouped destination list is fully usable without the map.

## 12 · Known limitations

1. **The twelve capsules are not human-reviewed.** Retrieved, quoted, cited —
   not read against their sources by an editor. Every generated file says so.
   This is the largest caveat in the product and the first thing to volunteer.
2. **Basemap labels render in local script.** CARTO began requiring an API key
   and watermarked every free tile; OpenStreetMap standard is the key-free
   replacement and does not transliterate.
3. **No live availability, rates or booking anywhere**, by design — there is no
   licensed feed and none is simulated.
4. **`reports/` holds 209 MB of tracked QA screenshots.** Not served and not in
   the build, but it dominates repository size. Left in place because deleting
   tracked evidence at freeze is the user's call, not a QA decision.
5. **The image optimiser can wedge** on a stale cache; `rm -rf .next/cache/images`
   clears it. A clean build does not reproduce it — verified this phase.
6. **No registered destination is currently empty**, so the honest-absence path
   has no live fixture; it is exercised through an unregistered id and the
   knowledge-only state instead.
7. **`@anthropic-ai/sdk` remains installed** for the offline research pipeline.
   Unreachable from the application, asserted.

## 13 · Deliberately not built

Booking · payments · live pricing · user accounts · reviews · an LLM in the
publication path · embeddings · vector search · a recommendation model.

Each was considered and rejected for the same reason: it would require either a
licensed feed this project does not have, or generated text this project does
not publish. **The differentiator is retrieval with provenance; adding a
generator would remove it, not extend it.**

## 14 · Deployment

- `npm run build` → `npm start`. No runtime service, database or key required.
- `NEXT_PUBLIC_SITE_URL` should be set in production; unset falls back to
  Vercel's own origin, then localhost. `.env.example` documents it.
- No debug routes, no development-only behaviour, no hard-coded localhost in
  application source.
- 23 pre-Phase-11 top-level Sikkim routes are deleted from source and served as
  permanent redirects.

## 15 · Freeze state

Nothing has been committed. The working tree holds 188 modified files, 190
untracked, 23 deletions (the migrated legacy routes). No junk, no temporary
files, no debug code, no secrets, no accidental Sikkim modification.

**The next action is the user's:** review and commit.
