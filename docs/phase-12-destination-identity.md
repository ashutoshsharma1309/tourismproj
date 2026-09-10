# Phase 12 — Destination Identity: Cards, Sitemap, Breadcrumbs

Scope: the four-item work package Phase 11 recorded as its exact next step
([phase-11-route-migration.md](phase-11-route-migration.md) §22). No new
features, no AI work, no content rewritten. Sikkim's corpus is untouched.

| # | Phase 11 §22 item | Status |
|---|---|---|
| 1 | Optional social-card field on `Destination`; hub page emits its own `openGraph`; assert it | ✅ done |
| 2 | Generalise `sitemap.ts` to iterate destinations by capability | ✅ done |
| 3 | Extend `DestinationBreadcrumb` to detail pages | ✅ done |
| 4 | Re-run the QA battery on a case-sensitive filesystem | ✅ done — §5 |

---

## 1. Every destination was shared as a photograph of Sikkim

### The defect

The root layout declares one `openGraph` block, and Next merges metadata
shallowly: a page that declares no block of its own inherits the parent's
whole object. Every destination hub page fell into that case, so
`/destinations/paris`, `/destinations/kyoto` and twelve others were shared
with `og:image` = `/images/mon/rumtek.jpg` and
`og:image:alt` = *"The main temple at Rumtek Monastery, Gangtok district,
Sikkim"*.

This is not a styling problem. A social card is the one context where the
page's own corrections are invisible — the reader sees a photograph and a
caption, and nothing else. A card claiming Paris looks like a Sikkim
monastery is a false claim about a real place, made in the worst possible
place to make one.

### The model change

`Destination` gains an optional `socialCard`:

```ts
export interface DestinationSocialCard {
  url: string;      // site-root-relative, a vendored file under public/
  width: number;    // real pixels — a wrong declaration crops badly everywhere
  height: number;
  alt: string;      // what the photograph shows, naming where it was taken
}
```

Optional, and deliberately so. **A destination with no photograph of its own
emits no card image at all** rather than borrowing one — the same rule the
rest of the archive follows, where a missing fact renders "Data not available"
instead of an estimate.

Sikkim declares the Rumtek photograph on its own record, so it now *owns* the
card it used to lend to everyone. The path is a literal rather than
`img("mon/rumtek")` so the destination registry keeps no dependency on the
image-credits payload; `qa:route-migration` asserts the file exists in
`public/`; the declared dimensions were checked by hand against the file
(`sips` reports 1920×1280, which is what the record says).

`contentBasePath` was removed from the record in the same pass. It existed so
that moving Sikkim's content under `/destinations/sikkim` would be a one-field
change; Phase 11 made that move, nothing ever read the field, and Sikkim's
record still declared `"/"` — a value that was simply wrong.

### Result, from clean build output

| Page | `og:image` | `og:image:alt` |
|---|---|---|
| `/` (site root) | `/images/mon/rumtek.jpg` | Rumtek Monastery, Gangtok district, Sikkim |
| `/destinations/sikkim` | `/images/mon/rumtek.jpg` | Rumtek Monastery, Gangtok district, Sikkim |
| `/destinations/jaipur` | *(none)* | *(none)* |
| `/destinations/kyoto` | *(none)* | *(none)* |
| the other 12 | *(none)* | *(none)* |

Verified twice — in prerendered HTML from a clean build, and against the
running server. The site root keeps its own card: this phase moved the
destination cards off the layout, it did not delete the site's.

The hub page also now declares `alternates.canonical` for its own
destination. It previously inherited the root layout's `canonical: "/"`, so
all fifteen destination pages declared the homepage as their canonical URL.

## 2. The sitemap listed one destination and could not have noticed

`sitemap.ts` held twelve literal `/destinations/sikkim/...` paths and imported
six Sikkim content modules directly. Its output was correct — Sikkim is the
only destination with sections — and it would have stayed "correct" in exactly
the same silent way on the day a second destination gained content, emitting
nothing for it.

Everything is now derived:

- destinations come from `listDestinations()`
- sections come from the capabilities the destination actually resolves,
  through one shared `CAPABILITY_SECTION` table
- detail pages come from the same content accessors the pages themselves read
  (`@/lib/destinations/content`), so a detail URL exists for precisely the
  destinations whose accessor returns something

`src/lib/destinations/sections.ts` is new and holds that table. It replaced
**two** copies: the sitemap's literal list, and a `SIKKIM_ROUTES` map inside
the destination hub page whose values were fully-qualified
`/destinations/sikkim/...` paths — so the one component whose entire purpose
is to render *any* destination linked every destination's sections to
Sikkim's. The table stores segments only; the destination id is applied by
`capabilitySectionPath()`.

### Output

| | Before | After |
|---|---|---|
| Total URLs | 254 | 271 |
| Site root | 1 | 1 |
| `/destinations` index | 0 | 1 |
| Destination hub pages | 0 | 15 |
| Sikkim URLs | 253 | 254 |

The one new Sikkim URL is `/destinations/sikkim/industry`, which the hand-
written list had omitted — a public, indexable section that had never been in
the sitemap. Nothing was dropped: 0 duplicate URLs, and no destination is
advertised with a section it does not have (asserted against the generated
`sitemap.xml`, not the source).

## 3. Breadcrumbs reach detail pages

Section index pages carried `DestinationBreadcrumb`; the twenty-plus-thousand
words of detail pages below them did not. Eight page modules now do —
`monasteries/[slug]`, `stories/[slug]`, `history/[slug]`, `places/[slug]`,
`stays/[slug]`, `archive/[id]`, `archive/contribute` and `planner/result` —
which covers every prerendered detail page.

Five of them carried a standalone "← All stories"-style back link whose href
was a typed `/destinations/sikkim/...` string. The breadcrumb replaces it:
nothing is lost, because the section crumb *is* a link to the section index,
and the href is now built with `destinationPath(destinationId, …)` from the
destination the route resolved. Three pages (`monasteries/[slug]`,
`places/[slug]`, `planner/result`) had no upward navigation at all and gained
it.

`places/[slug]` renders its section crumb as plain text rather than a link,
because `/places` deliberately has no index page (documented in Phase 11 §3);
the component already models that.

Rendered output, from the running server:

```
Explore · Sikkim · Monasteries · Rumtek Monastery
Explore · Sikkim · Stories · The Dharma Kings
Explore · Sikkim · History · The crowning at Yuksom
Explore · Sikkim · Archive · The Tibetan Buddhist canon
Explore · Sikkim · Stays · Bamboo Grove Retreat
Explore · Sikkim · Places · Tsomgo Lake
Explore · Sikkim · Plan · Itinerary
Explore · Sikkim · Archive · Contribute
```

The destination name in every one of them comes from the resolver, not from a
literal — `qa:route-migration` asserts that no page hardcodes it and that the
component itself never names a destination.

## 4. What else changed

Three things fell out of the four items and are recorded so they are not
mistaken for scope creep:

1. **`SIKKIM_ROUTES` deleted from the destination hub page.** It was the
   second copy of the capability→route table and it hardcoded Sikkim. Section
   links on the hub are now `capabilitySectionPath(destinationId, capability)`.
2. **`alternates.canonical` added to the hub page.** Fifteen destination pages
   had been declaring the site homepage as their canonical URL by inheritance.
3. **`contentBasePath` removed** from `Destination` and from Sikkim's record
   (§1).

## 5. The case-sensitive filesystem re-run

Phase 11 §16 reported one environment-specific caveat honestly and could not
resolve it: on this machine `/destinations/SIKKIM` and `/destinations/Sikkim`
returned **200**, because macOS's case-insensitive filesystem matched the
prerendered `sikkim.html`. The diagnosis was that this is static-file serving
on a dev machine and that a case-sensitive filesystem — Linux production —
would 404. That was a prediction, not a measurement.

It has now been measured. A **case-sensitive APFS volume** was created with
`hdiutil` (`-fs "Case-sensitive APFS"`, confirmed case-sensitive by creating
`a.txt` and failing to stat `A.txt`), the working tree was copied onto it,
and the project was **built from scratch there** — 286/286 pages, exit 0.

### Uppercase URLs, against a server running from the case-sensitive volume

| Request | macOS APFS (Phase 11) | Case-sensitive APFS |
|---|---|---|
| `/destinations/sikkim` | 200 | **200** |
| `/destinations/SIKKIM` | 200 | **404** |
| `/destinations/Sikkim` | 200 | **404** |
| `/destinations/SIKKIM/monasteries` | — | **404** |
| `/destinations/sikkim/Monasteries` | — | **404** |
| `/destinations/sikkim/monasteries/rumtek` | 200 | **200** |
| `/destinations/sikkim/monasteries/RUMTEK` | — | **404** |

**The §16 caveat is closed.** It was the filesystem, exactly as diagnosed, and
it does not exist in production conditions. The full §16 security matrix was
re-run there and is unchanged — every invalid request 404s:

```
/destinations/unknown                                404
/destinations/../../sikkim                           404
/destinations/%2e%2e%2fsikkim                        404
/destinations/sikkim%00/monasteries                  404
/destinations/sikkim/monasteries/../../../etc/passwd 404
/destinations/sikkim/monasteries/does-not-exist      404
/destinations/sikkim/nonexistent-capability          404
/destinations/jaipur/monasteries                     404
```

### The QA battery on the case-sensitive volume

Every suite was re-run there against that build and that server. Results are
identical to the case-insensitive run in §6 — including `qa:stories-map`,
which fails the same way for the same environmental reason. **No suite behaved
differently because of the filesystem.**

| Suite | macOS APFS | Case-sensitive APFS |
|---|---|---|
| qa:route-migration | 85 / 0 | 85 / 0 |
| qa:destination | 89 / 0 | 89 / 0 |
| qa:global-explore | 74 / 0 | 74 / 0 |
| qa:experience | 66 / 0 | 66 / 0 |
| qa:decision | 43 / 0 | 43 / 0 |
| qa:research | 88 / 0 | 88 / 0 |
| qa:narrative | 71 / 0 | 71 / 0 |
| qa:publishing | 52 / 0 | 52 / 0 |
| qa:composition | 70 / 0 | 70 / 0 |
| qa:resilience | 69 / 0 | 69 / 0 |
| qa:heritage | 21 / 21 | 21 / 21 |
| qa:integrity | 40 / 40 | 40 / 40 |
| qa:industry | 25 / 25 | 25 / 25 |
| qa:gallery | 13 / 13 | 13 / 13 |
| qa:flows | 113 / 113 | 113 / 113 |
| qa:industry-flows | 18 / 18 | 18 / 18 |
| qa:immersive | 50 / 0 | 50 / 0 |
| qa:a11y | 0 violations | 0 violations |
| qa:stories-map | 45 / 46 (environmental) | same failure (environmental) |

The volume was detached and deleted afterwards; nothing in the repository
depends on it. To repeat the experiment:

```
hdiutil create -size 3g -type SPARSE -fs "Case-sensitive APFS" \
  -volname CaseTest casetest.sparseimage
hdiutil attach casetest.sparseimage
rsync -a --exclude .git --exclude reports ./ /Volumes/CaseTest/tourismproj/
cd /Volumes/CaseTest/tourismproj && npm run build && npm run start
```

## 6. QA results

Run against a clean build (`rm -rf .next && npm run build` → **286/286**,
exit 0) and, for the browser suites, a `next start` launched after it with no
stale process on port 3000.

| Suite | Result |
|---|---|
| typecheck | exit 0 |
| lint | exit 0 |
| build | 286/286 |
| **qa:route-migration** | **85 passed, 0 failed** (was 54) |
| qa:destination | 89 / 0 |
| qa:global-explore | 74 / 0 |
| qa:experience | 66 / 0 |
| qa:decision | 43 / 0 |
| qa:research | 88 / 0 |
| qa:narrative | 71 / 0 |
| qa:publishing | 52 / 0 |
| qa:composition | 70 / 0 |
| qa:resilience | 69 / 0 |
| qa:heritage | 21 / 21 |
| qa:integrity | 40 / 40 |
| qa:industry | 25 / 25 |
| qa:gallery | 13 / 13 |
| qa:flows | 113 / 113 |
| qa:industry-flows | 18 / 18 |
| qa:immersive | 50 / 0 |
| qa:a11y | 0 violations across every audited route |
| qa:stories-map | 45 / 46 — the documented environmental failure |

No test was weakened and no suite was updated to accommodate a change. The 31
new checks are additions.

### `qa:stories-map`

Unchanged from Phase 11 §17: `page.goto(..., { waitUntil: "networkidle" })`
on `/destinations/sikkim/explore` never settles late in the long-running
desktop context, after the layer-toggle and proximity-search steps have left
the map continuously requesting tiles. The 17 checks before it pass, including
the map's own load (46 markers, 16 tiles, 0 broken images, 0 console errors, 0
failed requests). It reproduced identically on the case-sensitive volume,
which rules out the filesystem as a factor. Not weakened, not marked green.

### The 31 new checks

- **§19 Social cards (12)** — the record can carry a card; the card declares
  alt text and real dimensions; every declared card file exists in `public/`;
  the hub declares its own `openGraph`; the card comes from the record, never
  a literal path; a destination without one emits `[]`; the hub declares its
  own canonical; 15 destination pages prerender; **no destination other than
  Sikkim emits a card image**; Sikkim emits its own with its own alt; the site
  root keeps its card.
- **§20 Sitemap (11)** — no destination path is hardcoded; the registry is
  iterated; sections come from the shared table; details come from the content
  accessors and not from Sikkim data modules; a section is emitted only where
  the capability resolves; the table holds segments not paths; **no second
  capability-to-route table exists anywhere in `src`**; all 15 hub pages are
  listed; no destination is advertised with a section it lacks; Sikkim's
  corpus is intact; no duplicate URL.
- **§21 Breadcrumbs (7)** — every page below the hub renders one; the
  component names no destination; no page hardcodes the destination name or a
  section href; and three rendered detail pages actually contain the nav.
- **§22 Ratchet (1)** — see below.

## 7. Honest accounting: what was NOT fixed

**78 literal `/destinations/sikkim/...` strings remain across 17 destination
route modules** — in JSON-LD structured data, in-page links and
related-content lists. Every one renders correctly today: these routes are
generated only for destinations that have the capability, and Sikkim is the
only one that does, so none is a live defect. Rewriting all of them was
outside this phase's scope.

They are now pinned. `qa:route-migration` §22 counts them and fails if the
total rises above 78 — a ratchet, not a suppression: lower the baseline when
some are fixed, and it fails the day a new page is written with a typed Sikkim
path. The count deliberately includes the one intentional literal, the hub
page's "See Sikkim" pointer to the reference destination, rather than carving
out an exception that would have to be maintained.

Also unchanged, and inherited from Phase 11:

1. `content.ts` still branches on `isSikkim(destinationId)` — the deliberate
   Phase 2 adapter layer for content modules that pre-date destinations.
2. Section index pages under `[destinationId]` still inherit the root layout's
   social card. That is correct today (they exist only for Sikkim) and becomes
   wrong the moment a second destination gains a section — at which point the
   fix is the mechanism this phase built, applied one level down.
3. `ANTHROPIC_API_KEY` remains unavailable. **No live AI generation was
   attempted, simulated or fabricated in this phase, and no AI evaluation
   architecture was modified.** Survival rate and composition ratio remain
   UNMEASURED.

## 8. Files

**Created**

| File | Purpose |
|---|---|
| `src/lib/destinations/sections.ts` | The single capability→section table and `capabilitySectionPath()` |
| `docs/phase-12-destination-identity.md` | This record |

**Changed**

| File | Change |
|---|---|
| `src/types/destination.ts` | `DestinationSocialCard`; `socialCard` field; `contentBasePath` removed |
| `src/data/destinations/sikkim.ts` | Declares its own social card; drops `contentBasePath` |
| `src/app/destinations/[destinationId]/page.tsx` | Own `openGraph` + canonical; `SIKKIM_ROUTES` replaced by the shared table |
| `src/app/sitemap.ts` | Rewritten: derived from registry, capabilities and content accessors |
| 8 detail page modules | `DestinationBreadcrumb`; destination captured from the capability gate; typed back-link hrefs removed |
| `scripts/qa/route-migration.mjs` | §19–§22, 54 → 85 checks |

## 9. Exact next work package

1. Work the §22 ratchet down: replace the 78 literals with
   `destinationPath(destinationId, …)`, starting with the JSON-LD blocks,
   where a wrong URL is machine-readable and published.
2. Give section index pages the same card treatment as the hub, so a second
   destination's sections cannot inherit Sikkim's photograph.
3. Retire the `isSikkim` branch in `content.ts` by registering content per
   destination.
4. Run `npm run research:evaluate -- --preflight` the moment a credential
   exists; the live model test is now five phases overdue and remains the
   project's central open question.
