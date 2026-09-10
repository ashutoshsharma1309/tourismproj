# Phase 2.5 — Destination QA + Source Provenance Hardening

**Completed 2026-08-25.** The two blockers Phase 2 identified are closed: `qa:destination` exists (86 checks), and sources are destination-scoped with retrieval provenance.

**Headline correction:** Phase 2's explanation of the `qa:audit` image failures was wrong. Objective 7 required reproducing rather than assuming, and doing so overturned it. See §8 — the honest answer is better news than the original claim, and the original reasoning was bad.

---

## 1. Destination QA architecture

`scripts/qa/destination-integrity.mjs` → `npm run qa:destination`. No new framework: plain Node, following `heritage-integrity.mjs`, which reads TypeScript sources by pattern because these scripts run under bare `node` with no TS loader.

Six layers, escalating from structure to behaviour:

| Layer | Checks | What it can catch |
|---|---|---|
| **A. Registry structure** | 26 | Missing/invalid identity, geography, timezone, coordinates; duplicate ids; non-URL-safe ids; divisions not derived from the single source of truth |
| **B. Route resolution + accessor safety** | 8 | A destination with no prerendered page; stray routes; dynamic imports built from an id; lookup that touches the filesystem |
| **C. Rendered isolation** | 16 | One destination's content appearing on another's page |
| **D. Capability rendering** | 17 | A destination offering a section it cannot fill |
| **E. Generic layer independence** | 6 | Generic modules statically importing Sikkim content |
| **F. Source scoping + provenance** | 15 | Unscoped sources, dangling scopes, weakened claim/pending-review model |

**Layer C is the one that matters.** A structural test passes while a page still renders another destination's monasteries. So the isolation checks read the **built HTML** and assert on what a visitor actually sees.

**Why assertions are scoped to `<main>`.** The root layout builds the site-wide ⌘K search index and serialises it into *every* page, so every document contains ~1,140 Sikkim search records regardless of which destination it renders. That is global navigation, not destination content, and it predates the destination architecture. Asserting over the whole document would fail on a condition this suite is not testing — so the checks read inside `<main>`, the visible page. The search index's own destination-blindness is real debt, recorded in §13.

**A bug this suite caught in itself.** The first version parsed `id:` anywhere in the sources and reported a sixteenth destination — `buddhist-tradition`, Sikkim's taxonomy id — with no geography. The parser is now indent-scoped to top-level record fields. Worth recording: a looser regex would have made every future nested id a phantom destination.

**Result: 86 checks, 86 passed, 0 failed.**

## 2. Source model changes

`src/data/sources.ts`, extended additively. All 25 existing records preserved byte-for-byte apart from the two new fields; no source text, `covers` note or URL was altered.

```ts
export type SourceScope =
  | { kind: "destination"; destinationId: string }
  | { kind: "country"; countryCode: string }
  | { kind: "global" };
```

**Why a union rather than an optional `destinationId`:** *"applies everywhere"* is a real, distinct answer, and a nullable field cannot distinguish it from *"nobody said"*. The brief required global applicability to be modelled explicitly, and a null cannot do that.

**Why `country` exists:** not for symmetry. The Ministry of Tourism's Utsav portal covers every Indian destination, and ten of fifteen registered destinations are in India.

Both `scope` and `retrievalMethod` are **required**, so the compiler rejects a source that omits them. That is the "a source must never silently lose its destination relationship" guarantee — enforced by the type system rather than by a convention someone has to remember.

**Classification of the existing 25** (each read individually, not pattern-matched):

| Scope | Count | Examples |
|---|---|---|
| `destination: sikkim` | **17** | Sikkim Tourism portal, Trade Rules 2025, arrivals, IPR, permits, registered hotels/agents, GLOF 2023 |
| `country: IN` | **1** | Utsav — Ministry of Tourism, Government of India |
| `global` | **7** | Wikipedia, Wikimedia Commons, OpenStreetMap, Wikivoyage, UNESCO WHC, YouTube, Google Places |

Resolution is `sourceAppliesTo(source, destinationId, countryCode)` — a `switch` on `scope.kind`, with **no string matching on id, name or URL**. A `country`-scoped source **fails closed** when no country is supplied.

`getSources()` in the content layer now filters by scope instead of returning the whole registry for Sikkim and nothing for anyone else. A planned destination correctly receives the seven global reference works and none of Sikkim's government portals — which is right: Wikipedia *is* citable for Kyoto; that Kyoto has no content is a separate fact, and capabilities still resolve to zero.

## 3. RetrievalMethod design

```ts
export type RetrievalMethod = "human-curated" | "agent-api" | "web-search" | "model-proposed";
```

Deliberately **orthogonal to `SourceType`**, which describes the publisher. A government portal found by a person and the same portal surfaced by automated search share a `type` and have very different provenance.

All 25 sources are `human-curated` — because all 25 registry entries were written by a person, including the Wikipedia and Commons entries whose *contents* offline scripts consume. Marking them `agent-api` would have been flattering and false. Recording the baseline honestly is what makes the Phase 3 values mean something when they appear.

`publishableSources()` filters out `model-proposed`, putting the Phase 3 gate with the model rather than in whichever renderer remembers to apply it.

## 4–5. Provenance and claim compatibility

**Nothing in the existing provenance architecture was redesigned.** `Provenance` (`sourceId`, `sourceUrl`, `verifiedAt`, `confidence`, `caveat`), `ClaimType`, `Confidence` and the `internal` sentinel behaviour are untouched and asserted intact by `qa:destination` §F.

The `CLAIM → EVIDENCE → SOURCE → DESTINATION` chain is now expressible end to end:

```
claimType (stories/types.ts) → Provenance.sourceId → SOURCES[id] → Source.scope → destinationId
```

The one addition Phase 3 needs is an `Evidence` type extending `Provenance` with a **verbatim span**. Designed but deliberately **not implemented** — it belongs with the extraction step that produces it. Full specification in `phase-3-provenance-contract.md` §2.

## 6. Pending-review behaviour

**Unchanged and verified.** `SubmissionStatus` is a single-value union — `"pending-review"` — so no other state is even expressible. Every `status:` assignment in `archive-submissions.ts` is `pending-review`; `qa:destination` asserts both. Pre-screening remains advisory: it can flag, it cannot verify or reject. Uploads stay under `.data/`, outside `public/`.

Phase 3 should reuse this verbatim for machine output rather than build a parallel path. The reasoning that applies to a stranger's photograph applies exactly to a model's paragraph.

## 7. Cross-destination isolation

Automated, behavioural, over built HTML. All 14 planned destinations are tested — not just the six the brief named, because a leak into Agra matters as much as one into Rome.

Markers checked: **monasteries** (Rumtek, Pemayangtse, Tashiding, Enchey, Phodong, Dubdi) · **districts** (all six) · **traditions** (Nyingma, Kagyu, Zurmang) · **places** (Tsomgo, Yuksom, Nathula, Ravangla, Pelling, Lachung) · **stays** (Mayfair, Denzong, Chumbi) · **stories** (Norbugang, Kabi, Losar, Pang Lhabsol).

Deliberately **not** the word "Sikkim": a planned destination legitimately links to Sikkim as the reference implementation, and testing for the word would fail on a cross-reference that is correct.

**Result: 14/14 clean.** Delhi receives no monastery content, Jaipur no districts, Kyoto no traditions, Paris no hotels, Rome no stories. Two counter-checks confirm isolation is not achieved by rendering nothing: Sikkim still shows its own divisions and still links to its heritage content.

Client-bundle isolation was checked too: **no destination page loads any Sikkim corpus chunk** (§9).

## 8. Wikimedia image investigation — Phase 2's explanation was wrong

Phase 2 reported that `upload.wikimedia.org` returned 400 to the headless browser and 200 with a browser User-Agent, and that pages failed in proportion to their remote-image count. **That was incorrect**, and the reasoning behind it was poor: it compared **two different URLs** — one that happened to 404 and one that resolved — and read the difference as a User-Agent effect. The "exact correlation" (18 remote refs, 18 failures) was coincidence.

### What was actually measured

| Test | Result |
|---|---|
| Wikimedia, no User-Agent | **403** — *"Please set a user-agent and respect our robot policy"* (not 400) |
| Wikimedia, curl default UA | **200** |
| Wikimedia, browser UA | **200** |
| Wikimedia, **HeadlessChrome UA** | **200** — headless is not blocked |
| 18 app image URLs, burst | mixture of 200 and **429** (rate limiting), i.e. volume-based, not UA-based |

### The finding that settles it

**The app does not load remote images at all.** Every `<img>` points at a locally vendored file through `/_next/image?url=%2Fimages%2F…` (516 references on `/`, 0 `<img>` tags referencing Wikimedia). The Wikimedia URLs in the HTML are **`sourceUrl` attribution metadata** inside the RSC payload — provenance recording where a vendored image came from — never image loads.

### What actually fails, reproduced with Playwright

| Route | Failed | Host | Reason | **Broken images** | HTTP 4xx/5xx |
|---|---|---|---|---|---|
| `/` | 18 | `basemaps.cartocdn.com` | `net::ERR_ABORTED` | **0** | 0 |
| `/hotels` | 2 | hotel websites | `net::ERR_BLOCKED_BY_ORB` | **0** | 0 |
| `/explore` | 0 | — | — | **0** | 0 |
| `/monasteries/rumtek` | 0 | — | — | **0** | 0 |
| `/monasteries/pemayangtse` | 0 | — | — | **0** | 0 |

`/`'s failures are **Leaflet map tiles** cancelled in flight as the map settles — normal behaviour, not an error. `/hotels`' two are cross-origin requests to hotel websites refused by Opaque Response Blocking.

### Answers to the questions posed

1. **Application-generated?** No — zero broken images, zero 4xx/5xx.
2. **Test environment?** Partly — `qa:audit` counts any `requestfailed` as a page failure, including aborted tiles that never affected a visitor.
3. **Wikimedia anti-bot?** **No — Wikimedia is not involved.** It does rate-limit bursts (429) and require *a* User-Agent (403 without one), but the app never requests it from the browser.
4. **Production affected?** No.
5. **Do images render?** Yes — 36/36 above-fold on `/`; the rest are lazy and below the fold.
6. **Broken images visible to users?** **None, on any route tested.**

**Action taken: documentation only.** No image proxying, no asset migration, no code change — exactly as the brief required if the cause proved environmental. A reasonable future refinement to `qa:audit` would be to ignore `ERR_ABORTED` on tile hosts, but that is a test change, not an application one, and was out of scope here.

## 9. Performance results

Phase 2 introduced dynamic imports; Phase 2.5 verified they hold.

| Check | Result |
|---|---|
| Destination registry in client JS | **No** — never shipped to the browser |
| Travel-agent register (24,168 lines) in client JS | **10.1 KB chunk, loaded on 1 of 280 pages** (`/industry` only) |
| Sikkim corpus chunks on a destination page | **None** |
| Dynamic import specifiers | All 12 are string literals |
| Build | 286 pages, exit 0 |
| Total client JS | 3.0 MB across all routes; largest single chunk 385 KB |

**Lazy boundaries hold; no regression.**

**One pre-existing weight issue, measured and not fixed.** The root layout serialises the ⌘K search index into every page:

| Page | Total HTML | `<main>` | Search-index payload |
|---|---|---|---|
| `/destinations/delhi` | 301.6 KB | **1.3 KB** | ~265 KB |
| `/destinations/sikkim` | 307.9 KB | 3.8 KB | ~265 KB |
| `/monasteries` | 387.7 KB | 60.6 KB | ~265 KB |

A planned destination ships 265 KB of Sikkim search records to render 1.3 KB of content. This **predates Phase 2** and is not a regression, so per "only fix measurable regressions" it was left alone and recorded as debt (§13). The existing design note in `search-index.ts` explains the deliberate trade that produced it — corpora were moved off the client, and the four-strings-per-record prop stayed.

## 10. Security checks

| Check | Result |
|---|---|
| `/destinations/nonexistent` | **404** |
| `/destinations/..%2F..%2Fetc%2Fpasswd` | **404** |
| `/destinations/sikkim%00` | **404** |
| `/destinations/../../package.json` | **404** |
| Destination ids URL-safe (`^[a-z0-9][a-z0-9-]*$`) | 15/15 |
| Lookup mechanism | Fixed `Map`; no `readFile`/`join` in the registry |
| Unregistered params | `dynamicParams = false` |
| Dynamic import specifiers | 12/12 string literals, none interpolated |
| Source URL schemes | 25/25 `https:`; zero `javascript:` or `data:text/html` |
| `dangerouslySetInnerHTML` in provenance renderers | None |

No new security machinery was added; the existing allowlist design already closed these paths, and this phase verified it rather than layering on complexity.

## 11–12. Tests executed and results

| Suite | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** — 286 pages |
| `npm run qa:destination` | **PASS — 86/86** |
| `npm run qa:heritage` | **PASS** |
| `npm run qa:gallery` | **PASS** |
| `npm run qa:integrity` | **PASS** |
| `npm run qa:immersive` | **PASS** |
| `npm run qa:stories-map` | **PASS** |
| `npm run qa:flows` | **PASS** |
| `npm run qa:a11y` | **PASS** |
| `npm run qa:industry` | **PASS** |
| `npm run qa:industry-flows` | **PASS** |

**Content integrity vs. the Phase 2 baseline — all unchanged:** audio files 180 · languages 12 · audio sites 15 · public audio 180 · public images 347.

**Prerendered output unchanged:** 15 monasteries · 70 stories · 26 history events · 38 places · 22 stays · 15 destinations.

**One false alarm worth recording.** `qa:immersive` failed once with a timeout waiting for the panorama's Zoom control. Cause: a `next start` server left running from earlier was serving a `.next` directory that had since been rebuilt underneath it. Restarting the server against the current build → **PASS**. Not a regression — but a reminder that browser suites must run against a server started *after* the build.

## 13. Remaining risks

| Risk | Severity | Note |
|---|---|---|
| ⌘K search index is destination-blind and ships to every page | **Medium** | 265 KB per page today; when a second destination is populated the palette will mix destinations with no way to tell them apart. Needs scoping in Phase 4 |
| `Evidence` (verbatim span) not yet implemented | **Medium** | Specified only. Phase 3's first task; without it, per-claim attribution cannot survive synthesis |
| `qa:audit` counts aborted tile requests as failures | **Low** | Test-side noise; documented in §8 |
| `SOURCES` still a flat global registry | **Low** | Now scoped per record, but lookup is still whole-registry. Fine at 25 records; revisit if Phase 3 adds hundreds |
| `StoryCategory` still holds four Sikkim community values | **Medium** | Blocks second-destination stories. Phase 3 |
| Routes not destination-prefixed | **Medium** | Deliberate (Phase 2 §8); migration + 301s owed in Phase 4 |
| Isolation is asserted on prerendered HTML | **Low** | If a route became client-rendered, the check would need extending |
| `supabase/schema.sql` still Sikkim-`CHECK`-constrained | **Low** | Dead code; misleading to a reader |

## 14. Phase 3 prerequisites

Both Phase 2 blockers are now closed. What remains before the research engine:

1. **Implement `Evidence`** — `Provenance` + verbatim `quote` + `retrievedAt`. Extraction must produce it *before* synthesis; attribution cannot be recovered afterwards.
2. **Build `qa:research`** to enforce the seven gates in `phase-3-provenance-contract.md` §7 — failing the build on any uncited factual block.
3. **Split `StoryCategory`** into a universal axis plus destination-scoped `heritageTags`, preserving the exact community names (Lepcha, Bhutia, Nepali).
4. **Decide staged-research persistence** — the first genuine requirement for a database.
5. **Extend depth to rendering** — `researched` content visually distinguishable; depth propagates to the weakest node in a rendered relationship.
6. **Scope the search index by destination** before a second destination is populated.
7. **Pick the pilot.** Kyoto — conceptually closest to Sikkim while breaking every Sikkim-specific assumption, which makes it an honest test.
8. **Golden-set benchmark** — run the engine over Sikkim, compare to the human-curated corpus. The falsifiable test of the whole thesis.

**Gate G5 deserves special attention in planning.** Practical data — hours, admission, fees, permits — must have *no synthesis code path at all*. It is the only gate whose failure harms a real traveller, and it must be enforced by types, not by prompt instruction.
