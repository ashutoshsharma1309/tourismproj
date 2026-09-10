# Phase 20 — Multi-level Experience and UI/UX Polish

No new destinations. No new architecture. This phase asked one question of the
product that nineteen phases of correctness checks had never asked:

> Does it feel like one thing?

It did not, and the reasons were specific rather than aesthetic.

---

## 1. What was actually wrong

Every suite in this repo was green when Phase 20 started. 1,962 checks, 25
suites, zero failures. All four of these were true at the same time:

| | |
|---|---|
| The primary navigation offered **Monasteries, Stays, Trade, Permits** on Paris's page | thirteen links, twelve of them Sikkim routes, on all 319 pages |
| The header and footer said **"Sikkim Darshan — Digitizing the Sacred Heritage of Sikkim"** | on Rome, on Istanbul, on New York City |
| **Every map in the product** rendered `API KEY REQUIRED` across its tiles | CARTO began requiring a key; nothing in the repo changed |
| Jaipur's hub was **9,923 px and 191 KB** | larger than Sikkim's, for a destination with no places |

Nothing was broken. Every link resolved, every claim cited a source, every
destination rendered its own records. The product was correct and incoherent,
and correctness suites cannot tell the difference. That is what `qa:ux` is for.

---

## 2. The brand

`SITE.name` was `"Sikkim Darshan"`, and that string is the header wordmark, the
footer, `og:site_name` and every JSON-LD block — so a visitor reading about
Rome was inside chrome named after a different destination.

**The product is now TerraStory.** Sikkim Darshan is the name of the deep
archive TerraStory was built around, and it keeps that name where it belongs:
`SITE.archive` holds it, the landing page still uses it for its own headline
and eyebrow, and the footer names a "Sikkim archive" column so a visitor on
Rome's page can see at a glance that those links lead somewhere else.

The mark itself is unchanged — it is drawn from a Sikkim gompa's torana arch,
and a mark earns its keep by being recognisable, not by being renamed.

## 3. Navigation now knows where the visitor is

The fix is not a shorter list. It is a list that belongs to the page.

```
NAV_LINKS   →  Discover · Destinations · Compare        (the product)
            +  the current destination's own sections    (derived)
```

`destinationNavMap()` joins two things that already existed — the capabilities
`resolveCapabilities()` derives from a destination's content, and the route
each capability owns in `CAPABILITY_SECTION` — so **no component decides what a
destination offers, and no link is ever offered to a page that does not
exist.**

| Page | Primary navigation |
|---|---|
| `/destinations`, `/discover` | Discover · Destinations · Compare |
| `/destinations/paris` | … · **Experiences** |
| `/destinations/sikkim` | … · **Monasteries · Stories · History · Culture · Archive · Map · Stays · Planner · Trade · Permits · Responsible · Preserve** |
| `/destinations/jaipur` | … (no sections — Jaipur has knowledge, not places) |

Sikkim loses nothing: every link that used to be hard-coded is still there, on
Sikkim's pages. Thirteen other destinations stop being offered someone else's.

`Compare` was promoted into the bar. The one page that answers *"how much do
you actually know about these places?"* was reachable only from a link partway
down `/destinations`.

## 4. Progressive disclosure instead of a bibliography wall

Jaipur's hub rendered thirty-five research claims, open, above everything a
visitor came for. Each is a genuine sourced claim and none was removed.

They are now `<details>` groups, one per category, each summary stating how
many claims are inside. No client JavaScript, no state, keyboard-operable,
announced as a disclosure by screen readers, indexed by search engines, and
found by Cmd-F. **Nothing is hidden from anyone; it is folded.**

| Hub | Height before | After | |
|---|---|---|---|
| Jaipur | 9,923 px | 7,250 px | **−27%** |
| Kyoto | 6,013 px | 4,837 px | **−20%** |
| Sikkim | 6,431 px | 5,384 px | **−16%** |
| All 20 audited routes | 97,265 px | 92,369 px | −5.0% |

## 5. One number, one meaning

`/destinations` said Paris had **"4 sections"**. Paris's hub listed **one**.
Both were defensible: the card counted capabilities, the hub counted routes.
Together they were a product that contradicts itself in two clicks.

`sectionCount` now counts capabilities that own a route, so the card, the
navigation bar and the hub's Explore grid all count the same thing — Paris 1,
Sikkim 13. `qa:ux` §3 asserts the card figure equals the number of navigation
links, which is a check that can only pass if the definitions agree.

## 6. Maps

CARTO now requires an API key and stamps `API KEY REQUIRED / carto.com/basemaps`
diagonally across every tile served without one. Measured on all four free
styles — `voyager`, `voyager_labels_under`, `light_all`, `dark_all` — all
watermarked. This affected **every map in the product**: the world map on
`/destinations`, the heritage map, and every story and place map.

Switched to OpenStreetMap's standard tiles: no key, canonical, clean.

**This costs something and the loss is real.** Voyager was chosen deliberately
because it labels in Latin script; OSM standard renders local script, so the
Tibetan side of Sikkim's border returns as 岗巴县 again. Wikimedia's `osm-intl`
was measured as the obvious replacement and rejected — it still renders नेपाल
and বাংলা, and its tiles are served for Wikimedia projects rather than for
this. A legible map in the wrong script beats an illegible one in the right
one.

`qa:ux` §9 now reads the tile template out of the shipped JS chunk, fetches a
tile, and fails if the source is CARTO or the tile does not load. The previous
suites could not have caught this: the map loaded, the markers were right, the
attribution was right, and the basemap was a watermark.

---

## 7. Bugs found and fixed

| # | Bug | Cause | Fix |
|---|---|---|---|
| 1 | Every map rendered `API KEY REQUIRED` | CARTO policy change, external | OSM standard tiles (§6) |
| 2 | Chrome named Sikkim on all 15 destinations | `SITE.name` was the archive's name | `SITE.name` / `SITE.archive` split (§2) |
| 3 | Nav offered Sikkim's 12 sections everywhere | hard-coded `NAV_LINKS` | derived per destination (§3) |
| 4 | Footer's four link columns were all Sikkim | unlabelled Sikkim links | product column + labelled "Sikkim archive" |
| 5 | `/destinations` and hubs disagreed on "sections" | two definitions of one word | one definition (§5) |
| 6 | Jaipur's hub was a 9,923 px claim dump | no disclosure | `<details>` (§4) |
| 7 | Page titles read `… · Sikkim Darshan` | hard-coded template | reads from `SITE` |
| 8 | The footer disclaimed only "the Government of Sikkim" | written when Sikkim was the only destination | any government or tourism authority |
| 9 | **Search button pushed out of the viewport** | *introduced in this phase* — Sikkim's bar grew to 16 links | `min-w-0 overflow-x-auto` nav, `shrink-0` controls |
| 10 | **700 KB of client JS added** | *introduced in this phase* — the client navbar imported `nav.ts`, which imports the registry | pure helper split into `nav-path.ts` |

Bugs 9 and 10 were mine, caught by `qa:global-intelligence` and by measuring
the bundle rather than assuming. Both are recorded because a phase report that
lists only the bugs it inherited is not an honest one.

**Two things were investigated and found NOT to be bugs**, and left alone:

- The homepage statistics render `0` in a screenshot. They are a count-up
  animation that starts at zero and fires on scroll; under
  `prefers-reduced-motion` they render the final value immediately, and the
  real number is in the DOM throughout. Correct as built.
- `/destinations` reported twelve images without `alt` in a browser probe.
  They are Leaflet tiles caught mid-load; at 2.5 s the count is zero. The
  server-rendered HTML has `alt` on every image, three of them `alt=""` with
  `aria-hidden` — which is the correct marking for decoration, not a defect.

---

## 8. What was deliberately left alone

The brief says not to replace working systems for stylistic reasons, and these
were each considered and rejected:

- **The story page.** Correct image scaling, licence and photographer
  attribution, claim-type badge, verification date, related places, sources.
  It already does what §7 asks.
- **The trip guide.** It is retrieval over catalogued records, not a model, and
  its own header says so. §21 is satisfied by construction — **no AI provider
  was added, none is required, and no deterministic text is labelled as
  AI-generated.**
- **The homepage.** It is the Sikkim archive's front door and works as one. It
  now sits inside TerraStory chrome and keeps its own identity.
- **Cross-destination matching.** Paris's related-material list shows four rows
  all matched on "royal and palace heritage", which reads repetitively. The
  matching is evidence-based and changing it to look more varied would be
  manufacturing variety. Recorded as a limitation instead.

---

## 9. Results

### QA — 26 suites, 2,086 checks, 0 failures, 283 s

| Suite | Result |
|---|---|
| **qa:ux** (new) | **123 / 0** |
| qa:global-capsules | 276 / 0 |
| qa:capsules | 245 / 0 |
| qa:flows | 115 / 0 |
| qa:discovery | 105 / 0 |
| qa:global-intelligence | 103 / 0 |
| qa:global-explore | 98 / 0 |
| qa:route-migration | 86 / 0 |
| qa:planner | 85 / 0 |
| qa:destination | 77 / 0 |
| qa:content-framework | 72 / 0 |
| qa:a11y | 29 / 0 |
| the other 14 suites | all 0 failures |
| typecheck · lint · build | 0 · 0 · 319/319 |

**No existing test was weakened.** One assertion was *strengthened*:
`qa:planner` pinned the exact string `aria-labelledby="day-1"`, which a fix
could only break; it now asserts the property — every day section references
its own heading and no two share a label.

### Accessibility

**0 violations across 30 audited routes**, including the four capsule routes
added in Phase 19. `qa:ux` §10 additionally verifies in a real browser that a
claim group opens with the keyboard alone, that opening it reveals the claims,
and that no `<details>` is hidden from assistive technology — the disclosure
must not become a way of hiding content from screen readers.

### Mobile — 390 / 768 / 1440

**36 route-width combinations, 0 horizontal overflow.** Twelve routes covering
home, destinations, discovery, comparison, four destination states, a story, a
place and a planner.

### Performance

| | Before | After |
|---|---|---|
| Client JS (`.next/static/chunks`) | 3.2 MB / 47 files | **3.2 MB / 47 files** |
| Build | 319 pages | 319 pages |
| Image audit | 3,920 URLs in Phase 18 | **4,072 URLs, 0 failed, 0 stalled** |
| Page height, 20 routes | 97,265 px | **92,369 px (−5%)** |

HTML payload, per route:

| Route | Before | After | |
|---|---|---|---|
| `/` | 298,663 | 299,078 | +0.1% |
| `/destinations` | 114,806 | 115,282 | +0.4% |
| `/discover` | 228,661 | 229,194 | +0.2% |
| `/destinations/paris` | 64,859 | 65,600 | +1.1% |
| `/destinations/sikkim` | 136,924 | 144,694 | +5.7% |
| `/destinations/jaipur` | 190,948 | 196,454 | +2.9% |

**HTML grew slightly and that is the honest trade.** The navigation map costs
about 0.5 KB per page; Sikkim's +5.7% is thirteen extra navigation links plus
the `<details>` wrappers. `<details>` does not shrink a payload — it keeps
every word in the document, which is the point — so its win is height, not
bytes. Phase 15's architecture is intact: the search corpus is still deferred
to `/api/search-index`, no page inlines it, and the client bundle is byte-for-
byte what it was before this phase.

### Security

`qa:ux` and `qa:global-capsules` between them cover unknown destination,
foreign place and story ids, malformed ids, traversal, encoded traversal, case
variation, invalid interests and invalid planner parameters. **0 failures, no
cross-destination leakage.**

### Sikkim regression

**15 / 70 / 26 / 38 / 78 — unchanged.** Routes, stories, places, monasteries,
timeline, images, discovery, planner and search all pass. Sikkim keeps its full
navigation bar, and nothing was removed from it to make other destinations look
equivalent.

---

## 10. Known limitations

1. **Basemap labels are in local script** (§6). A regression forced by CARTO's
   policy change, accepted deliberately. A keyed provider or a self-hosted
   Latin-label style would restore it.
2. **HTML payload is up 0.1–5.7%** (§9). Measured, stated, and worth it for
   navigation that is correct on fifteen destinations instead of one.
3. **Cross-destination matches can repeat a theme** — Paris shows four rows all
   matched on royal and palace heritage. Evidence-driven and honest; it reads
   repetitively.
4. **A capsule hub has no photograph**, though the destination owns six. Adding
   a hero image is a design change with attribution obligations and was out of
   scope for a polish phase; all destinations are consistently text-led today.
5. **The image-optimizer cache can wedge.** One audit run reported two stalled
   URLs; `rm -rf .next/cache/images` and a restart returned 4,072 / 0 / 0. A
   framework behaviour this project has hit since Phase 15, mitigated
   operationally rather than fixed.
6. **The empty-destination state still has no live fixture** (Phase 19 §6).
   Unchanged here: `qa:ux` §4 exercises the knowledge-only state on Jaipur and
   Kyoto and the unregistered-destination 404, which is what remains testable.

## 11. Files changed

Ten source files, one new library module, one new QA suite:

```
src/lib/constants.ts                    brand split, NAV_LINKS 14 → 3
src/lib/destinations/nav.ts             NEW — derived section map
src/lib/destinations/nav-path.ts        NEW — pure helper, no imports
src/lib/discovery/summary.ts            sectionCount
src/components/layout/Navbar.tsx        destination-aware, layout fix
src/components/layout/Footer.tsx        product + archive columns
src/components/brand/Logo.tsx           wordmark from the constant
src/components/maps/LeafletMap.tsx      OSM tiles
src/components/destinations/PublishedKnowledge.tsx   <details>
src/app/layout.tsx                      title template, nav map
src/app/page.tsx                        keeps the archive identity
src/app/destinations/page.tsx           sectionCount
src/app/global-error.tsx                product name
scripts/qa/ux.mjs                       NEW — 123 checks
scripts/qa/planner-integrity.mjs        assertion strengthened
scripts/qa/final.mjs, package.json      qa:ux registered
```
