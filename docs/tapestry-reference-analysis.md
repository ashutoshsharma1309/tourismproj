# Tapestry Reference Analysis

**Source:** `github.com/tarinagarwal/tapestry` (public, ~5 MB), inspected at commit on `main`, 2026-08-24.
**Self-description:** *"Click anywhere on Earth. Tapestry's AI researches history, writes a cinematic narrative, illustrates it with generated imagery, and narrates it aloud, all interleaved, all streaming."*

**Stance:** studied as a reference architecture, not a template. Its pipeline *shape* is the most valuable thing in it. Its output *contract* is the thing TerraStory must not adopt.

---

## 1. Tapestry architecture

Next.js 15 App Router + React 19, MongoDB Atlas, Google Cloud Storage, JWT auth. ~8,010 lines of components, ~2,078 lines of lib, 14 API routes (~1,008 lines). Only **two pages**: `/` (the globe app) and `/share/[token]`.

Whole-system flow:

```
3D Globe (Google Photorealistic Tiles) → click → reverse geocode (Google Geocoding)
  → confirmation dialog → POST /api/storytelling/research  [SSE]
     ├─ Step 1 PLAN      Gemini → 10–12 targeted search queries
     ├─ Step 2 SEARCH    Tavily, parallel, text + images, dedupe by URL
     └─ Step 3 SYNTHESIZE Gemini + Google Search grounding → structured JSON
  → persist researchTask in MongoDB
  → on-demand: Imagen (images) · Cloud TTS (audio) · Cloud Translate (languages)
  → render in one of 5 display modes
```

The architectural inversion versus Sikkim Darshan is total: Tapestry is **request-time generative**, Sikkim Darshan is **build-time curated**. Neither is wrong; they optimise for opposite things (coverage vs. certainty).

## 2. Location discovery

`src/components/globe.tsx` (408 lines) wraps Google's **Photorealistic 3D Tiles** via `Map Tiles API` + `Maps JavaScript API`. Any click yields `{lat, lng}`; `reverseGeocode()` resolves a name with a three-tier fallback — typed result → `natural_feature` → unrestricted. Zoom maps to camera range via `40_000_000 / 2^zoom`.

**Strong idea:** the entire product entry point is one gesture — click the Earth. No search box, no taxonomy, no menu.
**Hard constraint:** requires a paid Google Maps key. Sikkim Darshan uses free OSM/Leaflet tiles. Adopting the globe adds a per-load billable dependency.

## 3. Research planning

`planQueries()` — Gemini with a JSON schema requesting *"10–12 targeted search queries covering different historical aspects"*, plus optional `customInstructions`. The prompt enumerates desired angles including *"lesser-known facts, myths, legends, and local folklore"*.

**Strong idea:** decomposing one location into a *portfolio* of queries before searching. This is the single most transferable technique in the repo, and it maps cleanly onto TerraStory's knowledge dimensions (history, festivals, food, architecture, sacred landscape, crafts).

**Caution:** that same prompt line instructs the model to seek myths and folklore *in the same undifferentiated stream as documented history*. Sikkim Darshan already solved this with `claimType`. TerraStory must plan queries **per claim type**, so a legend arrives labelled as a legend rather than being separated after the fact.

## 4. Source retrieval

`src/lib/tavily-client.ts` (96 lines) — Tavily search, run in parallel across the planned queries, returning text results and images, deduped by URL, with a caller-supplied `excludedSources` blocklist.

**Strong idea:** parallel multi-query retrieval with an exclusion list — the exclusion list in particular is a real editorial control.
**Gap:** no source *quality* tiering. A government statistics portal and a content-farm listicle enter synthesis with equal standing. Sikkim Darshan's `SourceType` (`government | press | encyclopedia | commons | internal`) is precisely the missing discriminator.

## 5. Source grounding

Two mechanisms, layered:
1. Retrieved Tavily text is injected into the synthesis prompt as `[Source N] title / URL / content`.
2. Gemini runs with **Google Search grounding** enabled; `groundingMetadata.groundingChunks` are extracted and stored.

Both are captured on the research task as `sources[]` and `groundingSources[]`.

**The decisive limitation — read this before adopting anything:** grounding is captured at the **task** level, never at the **claim** level. The narrative is `sections[].blocks[]`, and no block type carries a source reference. The result is a **bibliography, not attribution**: a reader can see that 30 sources were consulted, but cannot determine which source supports any given sentence — nor whether any does.

Sikkim Darshan's §22 rule is the exact inverse: *every factual claim rendered must point at an entry in `sources.ts`, or it does not ship.* **These two contracts are incompatible.** Resolving that is the central design problem of the TerraStory research engine.

## 6. Knowledge synthesis

`synthesize()` calls Gemini with the full search corpus and a JSON schema, returning `ResearchOutput`. Notable engineering: `repairTruncatedJson()` (~70 lines) walks the raw string backwards, closes unterminated strings, pops unbalanced brackets and re-parses — a hand-rolled recovery for hitting `maxOutputTokens` mid-JSON, falling back to a stub with `summary: "The research output was too large…"`.

**Honest read:** this is a pragmatic workaround for a real failure mode, and it works. It is also a symptom — a single mega-call producing an entire multi-section document. TerraStory should avoid needing it by **segmenting synthesis** (one call per knowledge dimension) and using strict structured outputs with schema-level validation. Silent JSON repair is especially dangerous in a source-grounded product: the stub path produces a *plausible-looking* empty result rather than a loud failure.

## 7. Historical storytelling

`ResearchSection.stage` is a fixed six-beat documentary arc: `opening → discovery → key_events → human_layer → today → closing`. Text blocks are styled `narration | headline | quote | caption`.

**Strong idea, and a genuinely good one.** A fixed narrative spine gives every location a coherent shape and makes output predictable to render. `human_layer` — the ordinary-lives beat — is a thoughtful inclusion.

Sikkim Darshan's 74 stories are individually better written (human-authored, sourced, claim-typed) but have **no consistent arc** across a destination. Tapestry's spine is directly adoptable, and `today → closing` is the natural hinge from *understanding a place* to *visiting it* — which is exactly the tourism transition the SIH problem statement asks for and which Tapestry itself never makes.

## 8. Timeline generation

`timeline[]` of `{ year: string, title, description, imagePrompt }`, rendered by `timeline-explorer.tsx` (480 lines).

**Note:** `year` is a **string**, so "c. 1642", "17th century" and "1642" all validate — flexible for real historical vagueness, useless for sorting or range queries. Sikkim Darshan's `src/data/history.ts` (1,072 lines) uses numeric years with eras. TerraStory should take Tapestry's *auto-generation* and Sikkim Darshan's *typed structure*: numeric `year`/`endYear` plus an optional display string for uncertainty.

## 9. Image / media generation

`src/lib/gcp/imagen.ts` — `gemini-2.5-flash-image`, `responseModalities: ['TEXT','IMAGE']`, 16:9. The prompt template: *"A historical, cinematic illustration … Style: photorealistic, dramatic lighting, historically accurate, documentary photography."* Results persist to GCS. `smart-image.tsx` (253 lines) reconciles generated images with Tavily-found ones.

**This is the sharpest conflict in the entire comparison.** Tapestry instructs a model to produce *photorealistic documentary photography* of historical scenes that were never photographed, and presents them inline with the narrative. Sikkim Darshan ships only Wikimedia Commons photographs, HEAD-verified, credited, licence-checked, with a QA rule preventing reuse across places — and warns on `/archive` when an object was photographed outside Sikkim.

**Adoptable only with a hard constraint:** generated imagery must carry `ImageAsset.origin: "ai-generated"`, be visibly labelled, and be barred from any slot that implies documentary evidence (site hero, archive object, gallery). See `future-destination-model.md` §7.

## 10. Audio

`src/lib/gcp/tts.ts` — Google Cloud TTS, default voice `en-US-Journey-D`, BCP-47 configurable. Delivered over **SSE as base64 chunks** (`{type:'chunk', index, total, audioBase64}`), so narration begins before the whole file exists.

**Comparison:** Tapestry generates on demand, in one voice, in the browser session. Sikkim Darshan pre-renders 180 files across 12 languages with per-language natively-composed scripts. Tapestry's approach scales to any location instantly; Sikkim Darshan's is higher quality and free to serve. **Chunked SSE streaming is worth adopting** for researched destinations; pre-rendering stays right for deep ones.

## 11. Translation

`src/lib/gcp/translate.ts` (233 lines) — Cloud Translation over the rendered narrative.

**Do not adopt as-is.** Sikkim Darshan explicitly rejected runtime translation: scripts are *composed natively per language* because an earlier bug spliced English prose into a Hindi frame. Machine-translating cultural and religious terminology is exactly where that fails worst. For `researched` destinations machine translation is defensible **if labelled as machine-translated**; for `deep` content it is a regression.

## 12. Frontend experience

`history-research-interface.tsx` (1,167 lines) orchestrates; five display modes share one `ResearchOutput`: `documentary-scroll` (630), `flipbook-view` (619, `react-pageflip`), `timeline-explorer` (480), `interleaved-narrative` (396), plus a gallery. Zustand for state, TanStack Query for data, Radix UI + Tailwind, `next-themes`.

**Strong idea:** *one canonical data shape, many presentations.* Adding a display mode costs nothing in the pipeline. Sikkim Darshan's pages are bespoke per content type; a shared renderable content model would be a real gain.

**Caution:** the 1,167-line orchestrator and 8,010 lines of components for two pages indicate significant complexity concentration. Do not import that structure.

## 13. Backend architecture

14 API routes, all thin. SSE via `ReadableStream` for research and TTS. Long jobs tracked as `researchTasks` documents with status, so a disconnect doesn't lose work. Per-user rate limiting in `userRateLimits`. Share tokens give public read access to a task.

**Strong ideas, all adoptable:** the task-document pattern, SSE progress, per-user rate limits, and token-based sharing are exactly what a runtime research engine needs — and Sikkim Darshan currently has **no** request-time infrastructure at all (both its API routes are `force-static`).

## 14. Data architecture

MongoDB collections: `users`, `userRateLimits`, `researchTasks`. Generated media in GCS.

**Observation:** research output is stored as a **denormalised document per task**, not as entities. Two users researching Kyoto produce two unrelated documents. There is no place — no accumulating knowledge base, no dedupe, no entity identity. Tapestry is a *research session* product; TerraStory is a *destination* product. This difference is fundamental and is why TerraStory cannot simply store Tapestry's output shape.

## 15. Features worth adapting

| Feature | Why | Adapted how |
|---|---|---|
| **Plan → Search → Synthesize** | Best transferable idea in the repo | Per knowledge dimension and per claim type; feeds the existing ingestion scripts |
| **Query-portfolio planning** | Turns one place into structured coverage | Planned per dimension |
| **Multi-query parallel retrieval + exclusion list** | Real editorial control | Add `SourceType` quality tiering |
| **Six-beat narrative spine** | Coherent shape per destination | Extend `today → closing` into the tourism transition Tapestry never makes |
| **Auto timeline extraction** | Sikkim's timeline is hand-built | Emit into the typed numeric-year model |
| **SSE progress streaming** | Research takes minutes | Adopt directly |
| **Task documents + status** | Survives disconnects | Adopt directly |
| **Rate limiting + share tokens** | Cost control, virality | Adopt directly |
| **Chunked TTS streaming** | Instant narration | For `researched` destinations only |
| **One shape, many display modes** | Cheap presentation variety | Adopt as a renderable content model |

## 16. Features worth rebuilding

| Feature | Problem | Rebuild as |
|---|---|---|
| **`ResearchOutput` schema** | **No per-claim citation** | Every block carries `sourceIds[]` + `claimType`; unsupported claims are dropped, not rendered |
| **Single mega synthesis call** | Needs `repairTruncatedJson` | Segmented per-dimension calls, strict structured outputs, loud failure |
| **`repairTruncatedJson`** | Silent recovery yields plausible-but-empty output | Schema validation + retry; never silently repair a knowledge artifact |
| **Generated photorealistic imagery** | Reads as documentary evidence | Allowed only with `origin:"ai-generated"`, labelled, barred from evidentiary slots |
| **Runtime machine translation** | Already rejected by this project | Native composition for `deep`; labelled MT for `researched` |
| **String `year` in timeline** | Unsortable | Numeric `year`/`endYear` + display string |
| **Per-task denormalised storage** | No accumulating knowledge | Entity-level storage keyed `(destinationId, slug)` |

## 17. Features not relevant to TerraStory

- **Click-anywhere-on-Earth as the product.** TerraStory curates ~15 flagship destinations; unlimited arbitrary locations conflicts with per-destination depth and cost control. The *globe gesture* is worth keeping for the curated set.
- **Flipbook display mode** (`react-pageflip`, 619 lines) — charming, but a page-turn skeuomorph does not serve trip planning.
- **JWT/bcrypt auth as built** — Tapestry needs accounts for per-user rate limits and history. TerraStory should add auth only when a feature requires it (see `features-to-avoid.md`).
- **`/api/proxy-image`** — an artifact of hotlinking third-party search images; unnecessary with licence-verified assets.
- **`/api/env-status` + missing-keys dialog** — a demo affordance for a many-key app.

## 18. Risks of adopting Tapestry concepts

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Citation dilution.** Adopting `ResearchOutput` as-is silently destroys the §22 rule — TerraStory's main differentiator | **CRITICAL** | Per-claim `sourceIds[]` mandatory in the schema; a QA rule fails the build on any uncited factual block |
| R2 | **AI imagery read as evidence** in a heritage archive; cultural and religious misrepresentation | **CRITICAL** | `ImageAsset.origin`; visible labels; barred from hero/archive/gallery slots |
| R3 | **Hallucinated tourism facts.** Wrong opening hours, fees or permits cause real harm | **CRITICAL** | Practical data (hours, fees, permits, entry rules) may **never** come from synthesis — official sources only, else `unpublished` |
| R4 | **Unbounded API cost.** Gemini + Tavily + Imagen + TTS + Translate + Maps, per request | **HIGH** | Curated destinations, precomputed and cached; rate limits; see risk register |
| R5 | **Google Maps dependency** replaces free OSM tiles with a billable per-load key | **HIGH** | Keep Leaflet/OSM for destination maps; evaluate the globe as a separate, cached entry surface |
| R6 | **Provider lock-in.** Tapestry is Gemini-specific (`@google/genai`, Google Search grounding, Imagen, Cloud TTS/Translate) | **MEDIUM** | Provider-agnostic pipeline interfaces; see research-engine doc for the model recommendation |
| R7 | **Latency.** Multi-minute research is fatal to a tourism discovery flow | **HIGH** | Precompute destinations; research is an authoring-time job, not a visitor-facing wait |
| R8 | **Complexity import.** A 1,167-line orchestrator, 5 display modes, MongoDB + GCS + 6 external services | **MEDIUM** | Adopt the pipeline, not the frontend architecture |
| R9 | **Silent-failure paths** (`repairTruncatedJson` stub) hide broken research | **MEDIUM** | Fail loudly; never render a stub as content |
| R10 | **Licence/copyright** on Tavily-surfaced third-party images | **HIGH** | Keep the existing licence pipeline; only licence-verified media ships |

---

## Bottom line

Take Tapestry's **pipeline** — plan, parallel retrieval, segmented synthesis, streaming, task documents, narrative spine. Reject its **contract** — uncited narrative, generative photorealism, per-session storage, runtime translation.

Tapestry proves *coverage* is achievable: any place on Earth, in minutes. Sikkim Darshan proves *credibility* is achievable: every claim traceable. **TerraStory's entire technical thesis is that these are combinable** — that a research engine can be made to produce output that satisfies §22. That is the thesis Phase 3 must prove, and it is what neither reference system does today.
