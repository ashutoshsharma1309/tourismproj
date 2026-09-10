# TerraStory Risk Register

Severity: **CRITICAL** (threatens the product's validity or causes real harm) · **HIGH** · **MEDIUM** · **LOW**.

---

## CRITICAL

### C1 — Citation dilution destroys the differentiator
**Risk:** Adopting Tapestry's `ResearchOutput` schema, which has **no per-claim citation field**, silently voids the §22 rule. The product would then be another AI tourism site with prettier prose.
**Likelihood:** High — it is the path of least resistance, and the failure is invisible in a demo.
**Mitigation:** Per-claim `sourceIds[]` mandatory in the schema; claims extracted *before* synthesis (research-engine stage 6); a `qa:research` check that **fails the build** on any uncited factual block.
**Owner stage:** Phase 3.

### C2 — Hallucinated practical data causes real traveller harm
**Risk:** A generated opening time, admission fee or permit rule sends someone to a closed site, or across a border without the right document. Sikkim's Protected Area Permit regime and Rome/Paris timed entry are exactly this class.
**Likelihood:** High if practical fields are ever routed through synthesis.
**Mitigation:** Rule 3 — practical data has **no synthesis code path at all**. Official source or `unpublished`. Enforce structurally (the field's type has no generated variant), not by prompt instruction.

### C3 — AI imagery presented as documentary evidence
**Risk:** Tapestry generates *"photorealistic … documentary photography"* of unphotographed historical scenes. In a heritage archive — especially of living religious sites — this is misrepresentation, and for sacred spaces it is a cultural harm, not just an accuracy one.
**Likelihood:** High if Tapestry's media pipeline is adopted directly.
**Mitigation:** `ImageAsset.origin: photograph|illustration|ai-generated`; visible labels; **barred from hero, archive and gallery slots**; QA-enforced.

### C4 — Breaking Sikkim during generalization
**Risk:** The `SikkimDistrict` / `MonasteryTradition` refactor (D1) touches 12 files directly, but the `Monastery`→`HeritageSite` rename (D3) ripples through generated JSON, the audio file tree and 17 data importers. A partial migration leaves the reference implementation degraded — losing the thing that makes the platform credible.
**Likelihood:** Medium-high; it is the largest single refactor.
**Mitigation:** `protected-features.md` regression gate; extend QA **before** refactoring; migrate behind a compatibility layer; never merge with a Tier 0/1 regression.

### C5 — Fabricated data returns under deadline pressure
**Risk:** 14 destinations with no real data invite "temporary" placeholder hotels, ratings and reviews for the demo. The 2026-08-16 pass deleted exactly this once.
**Likelihood:** **High.** This is the most probable failure mode of the entire project.
**Mitigation:** Invariant I2; a destination with no approved content is simply **not listed**; no "coming soon" shells; QA check for placeholder patterns. Depth badges make thin destinations honest instead of embarrassing.

---

## HIGH

### H1 — Unbounded AI API cost from visitor-triggered research
At ~$3 per destination research pass, an open "research any location" button costs ~$3,000 per 1,000 uses and is adversarially abusable.
**Mitigation:** Research is an **authoring-time job** (rule 6). If on-demand is ever added: auth, per-user rate limits (Tapestry's `userRateLimits` pattern), and a hard global spend cap.
*Note: authoring-time cost is low — ~$29–49 for all 14 new destinations, ~$146–244 with five iterations. Cost risk is a function of the trigger model, not the model tier.*

### H2 — Research latency in a discovery flow
Multi-minute research is fatal to tourism discovery, where the competition is an instant search result.
**Mitigation:** Precompute and prerender. No page waits on an LLM. SSE progress only in the authoring tool.

### H3 — Map API cost regression
Adopting Google Photorealistic 3D Tiles replaces free OSM/Leaflet with a billable per-load dependency.
**Mitigation:** Build the world view on Leaflet/OSM first (reuses 939 lines of working map code). Treat the globe as an optional, separately-gated surface justified by measured cost.

### H4 — Image licensing across 15 destinations
Wikimedia Commons coverage varies enormously; Tavily-style search surfaces copyrighted images with no licence metadata.
**Mitigation:** Existing licence pipeline is the only admission path. Commons-first. **Fewer images is an acceptable outcome**; unlicensed images are not.

### H5 — SEO and link rot
268 indexed pages; `/monasteries/[slug]` URLs shared externally; 180 audio files linked by URL.
**Mitigation:** 301s for every legacy route; a QA redirect test against the pre-migration sitemap; preserve or redirect media paths.

### H6 — The itinerary corridor graph does not generalize
`generate-itinerary.ts` encodes Sikkim's road network by hand (825 lines). 14 more graphs is an unfunded data-authoring project; deriving them from a routing API adds cost and error.
**Mitigation:** Generalize the algorithm in **Phase 7**, not Phase 2. Keep Sikkim as the only routed destination; others degrade to non-routed "day themes". **Never fabricate travel times.**

### H7 — Statutory fee and permit errors across destinations
Venice access fee, Japan departure tax, city tourist taxes, ASI ticketing, Schengen rules — all change, and a wrong figure is a legal/reputational hazard.
**Mitigation:** `MandatoryFee` and `EntryRequirement` are **opt-in per destination** and require provenance. Absent by default. Stamp `retrievedAt` and surface staleness.

### H8 — Official registers do not exist outside Sikkim
Sikkim publishes hotel and travel-agent registers; most destinations do not. The `/industry` feature has no input elsewhere.
**Mitigation:** Optional `OfficialRegister` capability. Feature absent where no register exists. **The highest-temptation place for scraped or invented listings.**

### H9 — Source reliability varies by destination
Non-English official sources (Kyoto, Istanbul, Rome) are harder to retrieve and validate; quality tiering may silently favour English-language press over better local government sources.
**Mitigation:** `SourceType` tiering with explicit local-language source discovery; native-language queries in planning; flag destinations where government-tier sources are thin.

---

## MEDIUM

### M1 — Multilingual quality regression
Sikkim's audio scripts are **composed natively per language** because an earlier bug spliced English prose into a Hindi frame. Machine translation at scale reintroduces exactly that failure, and it fails worst on religious and cultural terminology.
**Mitigation:** Native composition for `deep`; labelled machine translation for `researched`; never silently MT `deep` content.

### M2 — Audio generation cost and voice gaps
180 files today. 15 destinations × 12 languages is ~2,000+ files. No voice exists for several target languages (Dzongkha, Assamese confirmed unavailable); macOS `say` is not CI-runnable.
**Mitigation:** Cloud TTS path; generate on approval, not speculatively; reduce the language set per destination to what is genuinely available and say so.

### M3 — Storage and deployment growth
The repo is already **576 MB of git history** and ~970 MB checked out (347 images, 180 audio files). 15× that is unmanageable in-repo.
**Mitigation:** Move generated media to object storage before scaling; keep the repo to source and typed data. **Decide this in Phase 2, before media multiplies** — retrofitting is far worse.

### M4 — Provider lock-in
Tapestry is Gemini-specific end to end.
**Mitigation:** Provider-agnostic interfaces at pipeline stages 2, 6, 7, 8; retrieval interchangeable between built-in web search, Tavily and the existing Wikipedia/Commons clients.

### M5 — Complexity import from Tapestry
A 1,167-line orchestrator, 5 display modes, MongoDB + GCS + 6 external services, for 2 pages.
**Mitigation:** Adopt the pipeline, not the frontend architecture.

### M6 — Silent failure paths
`repairTruncatedJson` returns a plausible stub on failure. In a knowledge product this is worse than an error.
**Mitigation:** Fail loudly; never render a stub; structured outputs + validation instead of repair.

### M7 — Losing zero-config operability
The app currently builds and renders with an **empty** `.env`. Introducing a database can quietly make that false.
**Mitigation:** Keep the local data layer as fallback; add a CI job that builds with no env vars.

### M8 — Category generalization erases cultural specificity
Splitting `StoryCategory` risks losing "Lepcha Heritage", "Bhutia Heritage", "Nepali Heritage" into a generic "Communities" bucket.
**Mitigation:** Destination-scoped `heritageTags` preserve exact community names; universal axis carries only genuinely universal categories.

### M9 — Knowledge-graph edges launder credibility
A `deep` site linking a `researched` story could lend it unearned authority.
**Mitigation:** Depth propagates to the weakest node in a rendered relationship.

### M10 — Performance at 900–1,900 pages
Build time and bundle size grow; the guide index was already moved out of page HTML for costing ~313 KB per page.
**Mitigation:** Per-destination index splitting; monitor build time; ISR as the escape hatch if full prerendering stops scaling.

---

## LOW

| # | Risk | Mitigation |
|---|---|---|
| L1 | Database migration | **No migration exists** — `getSupabase()` has zero call sites. Greenfield |
| L2 | Backwards compatibility of internal APIs | Both API routes are `force-static` build artifacts with no external consumers |
| L3 | Auth security | No auth exists; add only if a feature demands it |
| L4 | Wikimedia rate limits | Already solved — ~1.1s spacing + exponential backoff in `scripts/` |
| L5 | Caching correctness | Static generation makes most caching questions moot |
| L6 | Copy stragglers after rebrand | QA grep for destination-name leakage in rendered output |
| L7 | Dependency freshness | 0 vulnerabilities, 457 packages, current majors |

---

## Top five, ranked

1. **C5 — fabricated data returns under deadline pressure.** Highest likelihood, and it destroys the one thing that makes this project defensible.
2. **C1 — citation dilution.** Silent, invisible in a demo, irreversible in perception.
3. **C2 — hallucinated practical data.** The only risk here that harms a real traveller.
4. **C4 — breaking Sikkim.** Would trade a working product for an unfinished one.
5. **H1 — unbounded API cost.** The only risk that can fail suddenly and unrecoverably.

Note that four of the five are **integrity** risks, not engineering risks. The engineering is tractable; the discipline is the hard part.
