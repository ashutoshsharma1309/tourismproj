# TerraStory — Phase 1 Deliverables

Audit and architecture discovery for the transformation of **Sikkim Darshan** into **TerraStory**.
Completed 2026-08-24. **No source file was modified in Phase 1** — this phase is discovery, per the brief's hard rules.

## Read in this order

| # | Document | What it answers |
|---|---|---|
| 1 | [current-system-architecture.md](current-system-architecture.md) | What exists, how it is built — **start here**, it contains the four findings that revise the brief |
| 2 | [current-feature-inventory.md](current-feature-inventory.md) | Every feature, classified |
| 3 | [sikkim-dependency-map.md](sikkim-dependency-map.md) | Every Sikkim assumption, D1–D13 |
| 4 | [current-data-model-audit.md](current-data-model-audit.md) | Can today's model hold 15 destinations? |
| 5 | [future-destination-model.md](future-destination-model.md) | The target model |
| 6 | [tapestry-reference-analysis.md](tapestry-reference-analysis.md) | What Tapestry contributes, and what it must not |
| 7 | [terrastory-research-engine.md](terrastory-research-engine.md) | The source-grounded AI pipeline |
| 8 | [terrastory-knowledge-architecture.md](terrastory-knowledge-architecture.md) | How knowledge connects |
| 9 | [global-explore-architecture.md](global-explore-architecture.md) | World → country → destination → place |
| 10 | [component-classification.md](component-classification.md) | KEEP / GENERALIZE / ADAPT / REBUILD |
| 11 | [protected-features.md](protected-features.md) | **The contract** — what must not break |
| 12 | [terrastory-risk-register.md](terrastory-risk-register.md) | Risks, CRITICAL → LOW |
| 13 | [features-to-avoid.md](features-to-avoid.md) | What not to build, and why |
| 14 | [terrastory-product-positioning.md](terrastory-product-positioning.md) | Positioning, grounded in real capability |
| 15 | [terrastory-roadmap.md](terrastory-roadmap.md) | The 9 phases |
| 16 | [phase-2-implementation-plan.md](phase-2-implementation-plan.md) | Exact files for Phase 2 |

## Phase 2 — Global Destination Architecture (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-2-implementation.md](phase-2-implementation.md) | **The Phase 2 record** — what changed, why, files, testing, debt, Phase 3 prerequisites |
| [trip-planner-generalization-notes.md](trip-planner-generalization-notes.md) | Why the planner stayed Sikkim-specific, and what Phase 7 needs |

Outcome: destination model, registry of 15, derived capability model, and one route rendering all 15. Sikkim unchanged — 286 pages build, all QA green.

## Phase 2.5 — Destination QA + Provenance Hardening (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-2.5-hardening.md](phase-2.5-hardening.md) | **The Phase 2.5 record** — qa:destination, source scoping, the corrected Wikimedia investigation, performance, security |
| [phase-3-provenance-contract.md](phase-3-provenance-contract.md) | **The rules Phase 3 must satisfy** — claim, evidence, source, scope, retrieval method, pending-review, and the seven publication gates |

Outcome: `qa:destination` (86 checks, all passing), sources destination-scoped with retrieval provenance, cross-destination isolation verified on rendered output. Note: this phase **corrected** Phase 2's explanation of the `qa:audit` image failures — Wikimedia was not involved.

## Phase 3 — Source-Grounded Research Engine (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-3-research-engine.md](phase-3-research-engine.md) | **The Phase 3 record** — architecture, agents, lifecycles, provider choice, cost, security, results |
| [evidence-model.md](evidence-model.md) | The verbatim-span mechanism that makes fabricated evidence unrepresentable |
| [research-source-policy.md](research-source-policy.md) | Tiers, scoping, retrieval conduct, failure handling, untrusted content |
| [practical-data-policy.md](practical-data-policy.md) | **G5** — why practical travel data has no AI synthesis path |

Outcome: 10-stage pipeline, `qa:research` (86 checks), real research runs for Sikkim, Jaipur and Kyoto. 38 evidence spans, all verified byte-exact. Everything lands in `pending-review`.

## Phase 4 — Review, Source Quality, Verified Narrative (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-4-review-and-narrative.md](phase-4-review-and-narrative.md) | **The Phase 4 record** — tiered discovery, review workflow, approval gate, audit trail, sentence verification, pilot results |

Outcome: tier-ordered discovery from a hand-verified official-source registry (Jaipur now 21 of 35 claims from government sources, vs. 0 in Phase 3); a review queue, approval gate and audit trail; a gated read-only reviewer UI; and sentence-level narrative verification where every factual atom must appear in an approved claim. `qa:narrative` = 71 checks, TEST A–J.

## Phase 5 — Approved Knowledge to Destination Experience (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-5-publishing.md](phase-5-publishing.md) | **The Phase 5 record** — publisher, depth model, authority rules, attribution, QA |
| [phase-5-model-evaluation.md](phase-5-model-evaluation.md) | **REAL MODEL TEST NOT EXECUTED** — no API key; what was measured instead (verifier 10/10) |

Outcome: deterministic publisher (approved-only, re-verified, no model); destination depth where `deep` is unreachable by the pipeline — Sikkim `deep` (declared), Jaipur `curated` (earned), Kyoto `researched` (earned); source attribution on every published fact. `qa:publishing` = 51 checks, TEST A–J.

## Phase 6 — Live AI Evaluation, Verified Composition, Scoped Search (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-6-live-ai-evaluation.md](phase-6-live-ai-evaluation.md) | **REAL MODEL TEST NOT EXECUTED** (2nd phase running) — provider audit, quality metrics, the composition-ratio result |
| [phase-6-verified-composition.md](phase-6-verified-composition.md) | Claim graph, narrative planning, modes, and the connective-assertion problem |
| [phase-6-search-architecture.md](phase-6-search-architecture.md) | Destination-scoped and global search, isolation results TEST A–D |

Outcome: verifier **tightened** (evaluative verbs now rejected) and given a narrow entailment-based allowance for ordering/additive transitions — all prior suites unchanged. Composition ratio measured at ~0%, proving the deterministic provider is a restatement engine. `qa:composition` = 70 checks.

## Phase 7 — Live AI Validation + Experience Layer (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-7-ai-validation.md](phase-7-ai-validation.md) | **REAL MODEL TEST NOT EXECUTED** (3rd phase) — and why this is now the project's central open question |
| [phase-7-experience-layer.md](phase-7-experience-layer.md) | User journey, timeline, story connections, source transparency, demo flow |

Outcome: destination pages restructured from a fact list into an experience — narrative leads, then a sourced timeline, then connection threads, then the evidence. Cross-block redundancy eliminated (4 repeats per destination → 0). `qa:experience` = 66 checks.

## Phase 8 — Live AI Validation + Provider Resilience (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-8-live-validation.md](phase-8-live-validation.md) | **LIVE MODEL NOT EXECUTED** (4th phase) with full credential diagnosis — plus fault-injection proof of the failure path |

Outcome: 10 provider failure modes injected and verified (40 checks); site rendered with **all AI output removed** — 200s with facts, timeline, threads and sources intact, proving AI is enrichment not dependency. Adversarial cases A–F pass. `qa:resilience` = 69 checks.

## Phase 9 — Live Model Validation + Publication Decision (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-9-ai-publication-decision.md](phase-9-ai-publication-decision.md) | **AI NOT PUBLISHED** — CASE D, with the measurements that do not exist |
| [phase-9-live-model-results.md](phase-9-live-model-results.md) | API status, adversarial results, destination results, what Phase 9 changed |

Outcome: three real gaps closed — the **curated-content contradiction guard** (required by several briefs, never built), `claimSetVersion`, and `ANTHROPIC_API_KEY` finally documented in `.env.example`. Live evaluation is now one `--preflight` away. `qa:decision` = 43 checks.

## Phase 10 — Global Exploration & Discovery (complete, 2026-08-25)

| Document | What it covers |
|---|---|
| [phase-10-global-exploration.md](phase-10-global-exploration.md) | World map, destination discovery, preview, isolation, mobile, accessibility, performance |

Outcome: `/destinations` is now the global entry — a world map of all 15 (built on the existing Leaflet component, no new stack) beside an equal, keyboard-reachable list. Markers come from the canonical registry; the map defines no coordinates. Sikkim unchanged (13/13 routes identical), `/destinations` +9.7 KB, build still 286 pages. `qa:global-explore` = 68 checks.

## Phase 12 — Destination Identity: Cards, Sitemap, Breadcrumbs (complete, 2026-08-26)

| Document | What it covers |
|---|---|
| [phase-12-destination-identity.md](phase-12-destination-identity.md) | **The Phase 12 record** — social cards on the destination record, a derived sitemap, breadcrumbs on detail pages, and the case-sensitive filesystem re-run |

Outcome: the four items Phase 11 listed as its exact next work package, all four done. Every destination used to be shared as a photograph of Rumtek Monastery captioned "Sikkim" — cards now belong to the destination record and a destination without one emits none. The sitemap is derived from the registry and capabilities rather than twelve typed Sikkim paths (254 → 271 URLs, including the `/industry` section it had silently omitted). Breadcrumbs reach all eight detail routes. The Phase 11 §16 case-sensitivity caveat was measured on a real case-sensitive volume and **closed** — uppercase URLs 404, as predicted. `qa:route-migration` 54 → **85 checks**; the 78 remaining hardcoded Sikkim literals are pinned by a ratchet rather than quietly left.

## Phase 13 — Tourism Intelligence + Journey Planner (complete, 2026-08-26)

| Document | What it covers |
|---|---|
| [phase-13-tourism-intelligence.md](phase-13-tourism-intelligence.md) | **The Phase 13 record** — the experience model, the scoring formula, geographic logic, explainability, sparse-destination honesty, and the full QA evidence |

Outcome: `/destinations/[id]/plan` turns the archive's own records and authored edges into a day-by-day journey — 53 candidates for Sikkim across 6 districts, ranked by a five-factor formula with interest match as a hard first key, cut into single-district days and ordered by straight-line proximity. Every stop states why it is there; nothing states an opening hour, a price or a travel time. Jaipur and Kyoto load and say honestly that they have no visitable records yet. No client JavaScript, no AI provider, no new corpus. `qa:planner` = **85 checks**; two real bugs found by it (a Sikkim social card on Jaipur's planner, and a rendered `undefined`).

## Phase 14 — Tourism Discovery + Experience Intelligence (complete, 2026-08-26)

| Document | What it covers |
|---|---|
| [phase-14-tourism-discovery.md](phase-14-tourism-discovery.md) | **The Phase 14 record** — the discovery layer, interest provenance, related-experience rules, the add-to-trip loop, cross-destination counts, and the prefetch regression found and fixed |

Outcome: a visitor who has never heard of Rumtek can now find it. `/destinations/[id]/discover` groups 53 catalogued Sikkim records by interests derived from content, every card states countable reasons, and every interest names the evidence that earned it ("2 stories shelved under Sacred Landscapes name it"). Related experiences come from four authored rules — never similarity — and nearby lists exist only where coordinates are published. Add-to-trip pins an experience into the Phase 13 planner, which still decides the days. Jaipur and Kyoto load and say honestly they have nothing visitable. `qa:discovery` = **106 checks**; a 1 MB speculative-prefetch regression was found by QA and fixed.

## Phase 15 — Global Tourism Intelligence + Cross-Destination Intelligence (complete, 2026-08-26)

| Document | What it covers |
|---|---|
| [phase-15-global-intelligence.md](phase-15-global-intelligence.md) | **The Phase 15 record** — interest-first matching and its formula, the cross-destination theme graph, the comparison view, and the search-payload rebuild with before/after measurements |

Outcome: `/discover` asks what you want to experience and answers with ranked destinations, each explaining itself in counts ("History — 27 catalogued records carry it; 11 approved claims"), with coverage explicitly distinguished from quality. Destinations now connect to each other through six evidence-backed themes, and `/destinations/compare` puts coverage side by side without ever printing `0` where the truth is "not yet catalogued". The ⌘K corpus moved out of every page into one cacheable endpoint: **`/destinations` 372 KB → 91 KB (−76%)**, every page ~288 KB lighter, first search 184 ms and 35 ms thereafter. `qa:global-intelligence` = **101 checks**; three real bugs found, including a poisoned image cache that had been hanging a page.

## Phase 16 — Final Release: Hardening, QA, Demo, Pitch Readiness (complete, 2026-08-27)

| Document | What it covers |
|---|---|
| [phase-16-final-release.md](phase-16-final-release.md) | **The release record** — the full battery, every audit, the five defects found and fixed, the timed demo, the judge-level review and the release decision |

Outcome: **RELEASE READY.** `npm run qa:final` runs all 22 suites in one command — **1,352 checks, 0 failures, 303 s**. 283 routes crawled clean, 3,680 image variants served with 0 broken, axe 0 violations across 25 routes, 12-step demo in 3.5 s with 0 console errors. Five real defects fixed, including two aborted requests on every page in the site and `qa:stories-map`, red since Phase 11 and now diagnosed as a test-design fault and **fixed without weakening its assertion**. The product is feature-frozen.

## Phase 17 — Global Destination Content Framework (complete, 2026-08-27)

| Document | What it covers |
|---|---|
| [phase-17-content-framework.md](phase-17-content-framework.md) | **The Phase 17 record** — the capsule format, the five-level depth model, the validator, storage impact, and the process for adding a city |

Outcome: a destination no longer has to be Sikkim-shaped to exist. The new **capsule** format is one file per destination — places, experiences, history, stories and sources, every item citing one — validated at the load boundary and projected onto the record shapes discovery, the planner, search and the global layer already consume, so none of them changed. The schema **cannot express** a price, an opening hour, availability, a booking link or a rating. Depth gained a fifth level (`capsule`) and every level now renders a sentence saying what it promises. Framework cost: **25.8 KB**, versus 4 MB for the deep format. `qa:content-framework` = **68 checks** — the first suite here that runs application logic rather than reading it. No cities and no tourism content were added.

## Phase 18 — Indian Tourism Capsule Expansion (complete, 2026-08-27)

| Document | What it covers |
|---|---|
| [phase-18-indian-capsules.md](phase-18-indian-capsules.md) | **The Phase 18 record** — the eight capsules, how they were retrieved rather than written, the two content leaks this found, and the QA |

Outcome: Delhi, Agra, Varanasi, Mumbai, Kolkata, Hyderabad, Kochi and Goa now carry capsules — **42 places, 39 dated facts, 19 cultural notes, 30 experiences and 36 licensed photographs**, every sentence a span quoted verbatim from a source that was actually fetched, every claim citing its URL. Two content leaks were found and fixed: three detail routes were generating **1,072 pages of Sikkim's records under other destinations' URLs**, and the section indexes were serving "Stories of Sikkim" at `/destinations/delhi/stories`. `qa:capsules` = **173 checks**; full battery **24 suites, 1,589 checks, 0 failures**. Sikkim is unchanged.

## Phase 19 — Global Tourism Capsule Expansion (complete, 2026-08-27)

| Document | What it covers |
|---|---|
| [phase-19-global-capsules.md](phase-19-global-capsules.md) | **The Phase 19 record** — four global capsules, the second source, seven defects (four of them shipped in Phase 18), and the empty-destination fixture this phase spent |

Outcome: Paris, Rome, Istanbul and New York City carry capsules — **24 places, 20 dated facts, 16 experiences, 11 cultural notes, 35 sources and 24 licensed photographs**, added as data with **no component rewritten and no destination named in any component**. A second source was introduced: Wikidata's structured inception and opening dates now corroborate **10 of the 20 history entries** and, more importantly, decide which fact leads. UNESCO was attempted and is unreachable from this environment (Cloudflare 403), so it is cited nowhere.

Leaving India exposed four defects Phase 18 had shipped: a sentence splitter that broke on `(r. 1628–1658)` and published fragments, a date reader blind to anything before AD 1000 (**Rome returned 2 dated sentences across 6 places**), section routes building 24 throwaway 404 shells and serving *"Stories of Sikkim"* as Paris's page title, and ranking language quoted verbatim from sources. All twelve capsules were regenerated and now audit clean: **0 fragments, 0 ranking claims**. A real accessibility defect was found and fixed — every day of a capsule itinerary carried the same accessible name, so axe reported two identical `region` landmarks.

`qa:global-capsules` = **276 checks**; full battery **25 suites, 1,962 checks, 0 failures**; a11y **30 routes, 0 violations**; mobile **42 checks, 0 overflow**; build **327 → 319 pages** (four destinations added, sixteen 404 shells removed). Sikkim unchanged at 15/70/26/38/78. The cost: **no registered destination is empty any more**, so the honest-absence path has lost its live fixture — recorded, not papered over.

## Phase 20 — Multi-level Experience and UI/UX Polish (complete, 2026-08-27)

| Document | What it covers |
|---|---|
| [phase-20-ux-polish.md](phase-20-ux-polish.md) | **The Phase 20 record** — the four things that were wrong while every test passed, the brand split, destination-aware navigation, and the two bugs this phase introduced and fixed |

Outcome: the product became one product. Every suite was green when this phase started, and all four of these were true: the navigation offered **Monasteries, Stays, Trade and Permits on Paris's page** (twelve Sikkim routes on all 319 pages), the chrome read **"Sikkim Darshan — Digitizing the Sacred Heritage of Sikkim"** on Rome and Istanbul, **every map rendered `API KEY REQUIRED`** after CARTO began requiring a key, and **Jaipur's hub was 9,923 px and 191 KB** — larger than Sikkim's, for a destination with no places. Correctness suites cannot see any of that, which is why `qa:ux` exists.

The product is now **TerraStory**, with Sikkim Darshan kept as the name of the deep archive on its own pages. Navigation is **derived per destination** from the capabilities its content already implies, so no link is offered to a page that does not exist — Sikkim keeps all thirteen sections, Paris gets its one. Research claims fold into keyboard-operable `<details>` with nothing removed from the DOM (**Jaipur −27% page height**). Maps moved to OpenStreetMap tiles, losing Latin-script labels — a real regression, recorded rather than hidden. And "sections" now means one thing in all three places it is counted.

Two bugs were **introduced by this phase and caught by measurement**: a sixteen-link navigation bar pushed the search button out of the viewport, and importing the section map into the client navbar dragged the destination registry into the bundle, **adding 700 KB of client JS**. Both fixed; the bundle is byte-identical to the baseline.

`qa:ux` = **123 checks**; full battery **26 suites, 2,086 checks, 0 failures**; a11y **30 routes, 0 violations**; mobile **36 combinations, 0 overflow**; HTML payload +0.1% to +5.7%, client JS unchanged. Sikkim unchanged at 15/70/26/38/78. **No AI provider was added or required.**

## Phase 21 — Global Discovery and the SIH Demo Experience (complete, 2026-08-28)

| Document | What it covers |
|---|---|
| [phase-21-sih-demo-flow.md](phase-21-sih-demo-flow.md) | **The demonstration** — twelve steps, real routes, measured timing, fallback path, and the three defects the walk exposed |

Outcome: the product became demonstrable. The first viewport read **"Digitizing the Sacred Heritage of Sikkim"** with two actions that both led into Sikkim — correct when Sikkim was the product, misleading now that it is one of fifteen destinations. It now leads with the proposition, the three actions the product actually has, and counts read from the registry; Sikkim's content follows under an eyebrow naming it as the flagship archive.

**`qa:demo` walks the documented flow rather than describing it** — clicking the same controls a presenter clicks, asserting each step lands where the document says and carries the evidence being pointed at, and timing the walk (**6.9–8.4 s of navigation across 13 steps**, ≈3–4 minutes with narration). It also asserts that `/demo`, `/pitch`, `/presentation`, `/showcase` and `/sih` all 404: the demo has to be the product.

Three real defects the walk exposed: a **story could not reach its own timeline** — `getEventsForStory()` had existed since the timeline was built and nothing ever called it, so step 8 had no link to follow; an **uncaught `_leaflet_pos` TypeError** when navigating away a few hundred milliseconds after a map page loaded, which is exactly a presenter's click rhythm (**0 errors across 27 timings**, from 4); and the homepage gap above. The flow needs **no AI provider, no API key and no third-party service** — the basemap is the only external dependency and is off the critical path.

`qa:demo` = **60 checks**; full battery **27 suites**; a11y **30 routes, 0 violations**; Sikkim unchanged at 15/70/26/38/78.

## Phase 22 — Final Freeze (complete, 2026-08-28)

| Document | What it covers |
|---|---|
| [phase-22-final-freeze.md](phase-22-final-freeze.md) | **The freeze record** — final architecture, all fifteen destinations, every measurement, the QA matrix, security, and what was deliberately not built |

Outcome: **TerraStory is frozen and ready.** Audited from a completely clean tree — `.next` removed with its image cache, one production build (`PDXJujQnJGEPglOHCA9U3`, 319 pages, 71 s, **0 warnings**), one fresh server.

**28 suites · 2,341 checks · 0 failures · 0 environmental.** Accessibility **30 routes, 0 violations**. Images **4,072 URLs, 0 failed, 0 stalled** with the cache cleared first. Mobile **0 overflow** at 390/768/1440. Sikkim **15/70/26/38/78 unchanged**. `qa:stories-map`, documented as failing since Phase 11 and fixed in Phase 16, re-verified at **46/46** — **resolved**, with no assertion altered.

A new suite, `qa:release` (**193 checks**), audits what only matters on shipping day and what no behavioural suite covers: every destination's country, region, IANA timezone and centre coordinate; that each owns its title, canonical and social card rather than inheriting Sikkim's; **all 280 built pages scanned for fabricated practical data** (zero — the statutory ₹50 Sikkim Tourist Trade fee is the only price in the product, labelled and sourced); nine credential patterns across every shipping file (**none**); and that the AI SDK, which remains installed for the offline research pipeline, **cannot be reached from `src/` or any client chunk**.

Five findings in its first run were all check defects, corrected rather than suppressed — a placeholder `your-api-key` inside the check that strips placeholders, a statutory fee mistaken for an invented price, tea prices in a story about the organic-farming economy, `.env.local` judged by disk presence instead of git tracking, and the research pipeline's SDK judged by installation instead of reachability.

## Transformation Phase A — Global Product Identity (complete, 2026-08-28)

| Document | What it covers |
|---|---|
| [transformation-phase-a-global-product.md](transformation-phase-a-global-product.md) | **The landing-page transformation** — the three ways into the product, why Stories and Plan are deliberately not global nav items, and the counting bug this phase found in its own work |

Outcome: the landing page stopped being a Sikkim archive with a TerraStory hero on top. Phase 21 fixed the first screenful; **everything below it was still nine consecutive Sikkim sections**, so a visitor read a platform promise and scrolled into a regional archive, with the fifteen destinations reachable only by noticing a navigation item.

One new component sits between the hero and Sikkim's archive and answers the three questions in the order they arrive: **what can I explore** (10 interest chips, each to a real `/discover?interests=…` route, and only interests a registered destination can actually satisfy), **where can I go** (all 15 destinations grouped by country, each with its depth badge and a counted coverage line), and **what does this do** (the four stages, each naming a real route). Sikkim's sections follow unchanged, introduced as the flagship archive.

Destination links on the landing page went **1 → 15**; ways in went **1 → 3**. `qa:product-flow` (**38 checks**) walks all three — interest-first, destination-first (deliberately on Rome, a capsule, because the shallow end is where a broken experience shows first) and search-first — and asserts context survives to the planner in each.

**Stories and Plan were deliberately left out of the global navigation.** Neither has a global route; pointing them at Sikkim is the exact regression Phase 20 removed. Both stay prominent — Plan as a hero CTA and stage 4, Stories in each destination that has them.

Cost, measured: landing page **299,965 → 348,446 B (+16.2%)**, client JS and build unchanged, TTFB 5–9 ms, no dataset leaked into the page, search corpus still deferred. Full battery **29 suites, 2,404 checks, 0 failures**; a11y 30 routes 0 violations; Sikkim **15/70/26/38/78 unchanged**.

## Phase B — Deep Archive Expansion (complete, 2026-08-28)

| Document | What it covers |
|---|---|
| [phase-b-deep-archive-expansion.md](phase-b-deep-archive-expansion.md) | **The expansion record** — method, the three defects the validator caught, and the eleven checks re-pointed |
| [destination-coverage.md](destination-coverage.md) | **The matrix** — every destination's places, events, stories, sources and earned depth, plus the source audit |

Outcome: fourteen destinations went from "this page exists" to "I can actually explore this place here". Places outside Sikkim **66 → 166**, dated events **60 → 154**, stories **27 → 66**, relationships **694**. **Jaipur and Kyoto, which held reviewed research and nothing to visit, now hold 9 and 10 catalogued places** alongside their 35 and 15 approved claims — two ways of knowing a place, side by side. Sikkim untouched at 15/70/26/38/78.

**Depth is now earned, not typed.** `earned-depth.ts` grades coverage against thresholds stated once, by either of two routes — a catalogued archive or reviewed research — taking the better. Only Sikkim meets the deep threshold on all three axes, and **no capsule was promoted to disguise that**; each one's shortfall is computed (Paris: 13 records of 25, 7 stories of 25).

The validator extended this phase **failed closed and dropped two whole destinations** rather than publish them broken: `Ram Bagh` turned out to be a *disambiguation page* that resolves with HTTP 200, and `marble-palace` had been planned twice. Fixed at source, plus a disambiguation guard in retrieval.

**61 checks across 8 suites failed because the product changed as intended** — and were re-pointed, not weakened. Three became stronger: the planner now proves it refuses to pad a 7-day request from 2 days of records; encoding is asserted from *every non-ASCII place name* rather than four pinned words; and a flagged "price" turned out to be the Taj Mahal's 1653 construction cost, so currency is now judged by proximity to a practical word.

Images held flat by design — `image: false` on every new place, so the phase added records not megabytes: **166 places, 70 photographs, 97 places that say they have none**. Client JS **unchanged at 3.2 MB**. QA **29 suites, 2,407 checks, 0 failures**.

**The source tier could not be raised**: UNESCO returns HTTP 403 behind Cloudflare and ASI is an 8.4 MB JavaScript application with no retrievable per-monument document. 226 sources, all Wikipedia or Wikidata; **469 claims, 0 uncited**.

## Phase C — Final Product Freeze (complete, 2026-08-28)

| Document | What it covers |
|---|---|
| [phase-c-final-product-freeze.md](phase-c-final-product-freeze.md) | **The freeze** — what Phase C found, the final product, results, environmental issues and limitations |

Outcome: **TerraStory is frozen — fifteen destinations, one product.** The largest defect Phase C found was invisible from the data: Phase B tripled what every destination holds and **none of it reached the destination's own landing page**. Paris held 13 catalogued places, 12 dated events and 7 stories, and its hub rendered a heading, interest chips, a *one-item* Explore grid and a list of other destinations. `DestinationHighlights` now renders **Places → Historical snapshot → Stories** on every hub, sampled at six, only where records exist — one component serving Sikkim's 53 places and Paris's 13 through identical code.

Also fixed: a prop that was **wrong but unreachable** (`hasPlacePages` derived from the `places` capability, which is true for a capsule — a capsule has place *records*, not place *pages*; harmless only because `detailHref` always won first), and **four legacy identity leaks** where "Sikkim Darshan" was still used as the product name.

Depth is **earned from coverage**, not typed: only Sikkim meets the deep threshold on all three axes, and nothing was promoted to disguise that. Client JS **3.2 MB / 47 chunks, unchanged since Phase 19**; search index 286 KB with **0 records inlined in any page**; landing page payload **unchanged**. Accessibility **30 routes, 0 violations**. Sikkim **15/70/26/38/78**. **AI OFF** — no provider, no key, 0 imports from `src/`.

`qa:stories-map` passes **46/46** from a clean build and fresh server, with no assertion altered. Environmental issues are recorded separately: the image optimiser stalls on a cold cache (warm it with `npm run qa:images` before browser QA), `i.ytimg.com` throttles intermittently, UNESCO returns 403, and basemap labels render in local script.

## Master Transformation — Global Product (complete, 2026-08-29)

| Document | What it covers |
|---|---|
| [master-transformation-global-product.md](master-transformation-global-product.md) | **The homepage transformation** — the audit that measured the problem, the nine sections replaced, and the three attempts the timeline took |

Outcome: the brief said the global experience was 6/10 and the homepage still Sikkim-centric. **It was, and it measured:** 71% of the homepage's text was Sikkim, 11 of 14 headings named it, and it held **25 destination links against 1 each** for the five other destinations that appeared at all.

Nine consecutive Sikkim sections became four global ones plus one Sikkim feature — **stories from six destinations**, a timeline of **528 BC to 1853 across 6 countries** (one dated moment from every destination), the planner explained, and claim → source → evidence. **Nothing was deleted:** every replaced section still lives on Sikkim's own pages.

Result: Sikkim's share of homepage destination links **83% → 23%**, destinations linked **6 → 15**, headings naming Sikkim **11 of 14 → 0 of 9**, and the payload **348,598 → 166,144 B (−52%)** — the page got lighter while gaining the four sections it was missing.

The timeline took three attempts and the first two were worse: the eight oldest events read *"528 BC to 1147"*, and eight sampled evenly read *"across 2 countries"* because old records cluster. One moment from every destination gives the fullest span and spread, and is a rule a reader can see.

**29 suites · 2,409 checks · 0 failures**; a11y 30 routes 0 violations; images 4,180 URLs 0 failed 0 stalled; client JS 3.1 MB / 44 chunks; Sikkim 15/70/26/38/78.

## Related documents (separate work, same repo)

These predate this audit and cover SIH positioning rather than the TerraStory transformation. Not part of the Phase 1 deliverable, but relevant background:

- [current-problem-statement.md](current-problem-statement.md) — PS 26202 transcribed from the SIH portal
- [gap-matrix.md](gap-matrix.md) — problem → gap → solution matrix
- [pitch-26202.md](pitch-26202.md) — pitch framing
- [audit/tourism-domain.md](audit/tourism-domain.md) — Sikkim tourism domain evidence base

## The four findings that change the plan

1. **There is no LLM in this project.** No AI dependency, import or call exists. The research engine is new construction, not an evolution of "existing AI engines".
2. **There is no database in use.** `getSupabase()` has zero call sites. Nothing to migrate — a layer to introduce.
3. **The Sikkim coupling is 94.5% content, not logic.** Only 12 files reference `SikkimDistrict`. Generalization is far cheaper than the brief assumes.
4. **Tapestry's output contract is incompatible with this project's governing rule.** Its schema carries no per-claim citation and its imagery is generated. Adopt the pipeline; reject the contract.

## Phase 1 definition of done

All 16 questions answered across the documents above. Baseline captured: build exit 0, **268 pages**, typecheck and lint clean, 0 vulnerabilities, 12 routes verified.
