# TerraStory Research Engine — Conceptual Design

**Status: design only. Nothing here is implemented in Phase 1.** Target build: Phase 3.

**Premise correction from the audit:** the brief describes integrating with "existing AI engines" and "existing agents". There are none — the project contains no LLM integration of any kind, and `scripts/*.mjs` are deterministic ETL jobs. This engine is **new construction**. What already exists and is reusable is the *retrieval* half (ingestion scripts) and the *epistemic* half (source registry, claim types, licence pipeline).

---

## 1. The problem this engine must solve

Two proven capabilities, never yet combined:

- **Tapestry proves coverage.** Any location on Earth, researched and narrated in minutes.
- **Sikkim Darshan proves credibility.** Every rendered claim traceable to a named source, or it does not ship.

Tapestry achieves coverage by relaxing attribution to a task-level bibliography. Sikkim Darshan achieves credibility by doing everything at human authoring speed. **TerraStory's technical thesis is that a research engine can be constrained to produce §22-compliant output** — machine speed without abandoning traceability.

If that thesis fails, the correct outcome is fewer destinations, not looser sourcing.

## 2. Design rules (non-negotiable)

1. **No claim without a source.** Every emitted factual block carries `sourceIds[]`. Uncited claims are **discarded before persistence**, not rendered with a caveat.
2. **Claim typing at generation.** Every block is classified `documented history | oral tradition | legend | travel story` at synthesis time, matching the existing `ClaimType`.
3. **Practical data is never synthesised.** Opening hours, admission prices, fees, permits and entry requirements come from official sources or render `unpublished`. **This is the single hardest rule and the one most likely to be eroded under deadline.**
4. **Depth is declared, never inferred.** Output is `researched` until a human promotes it.
5. **Fail loudly.** No silent JSON repair, no plausible stubs. A failed stage yields a failed task.
6. **Authoring-time, not visitor-time.** Research runs as a job producing reviewable artifacts. Visitors read precomputed destinations.
7. **Media stays licence-verified.** The engine may propose imagery; only the existing licence pipeline admits it.

Rule 6 is the deepest divergence from Tapestry and the one that resolves most of its risks at once: latency stops mattering, cost becomes bounded and predictable, and a human review gate becomes possible.

## 3. Pipeline

```
DESTINATION + DIMENSION  (authoring job, not a page request)
        │
   ┌────▼─────────────┐
   │ 1 SCOPE          │  Resolve destination identity: country, region, divisions,
   │                  │  official portals, canonical local-language names.
   └────┬─────────────┘  Deterministic. No model.
        │
   ┌────▼─────────────┐
   │ 2 PLAN           │  Per dimension AND per claim type, emit 8–12 queries.
   │                  │  Separate "documented history" queries from "legend" queries
   └────┬─────────────┘  so provenance is planned, not reconstructed.
        │
   ┌────▼─────────────┐
   │ 3 DISCOVER       │  Parallel retrieval. Tiered by SourceType:
   │                  │  government > encyclopedia > commons > press > excluded.
   └────┬─────────────┘  Reuses existing scripts/ Wikipedia + Commons clients.
        │
   ┌────▼─────────────┐
   │ 4 COLLECT        │  Fetch, extract, normalise. Record retrievedAt + URL.
   └────┬─────────────┘
        │
   ┌────▼─────────────┐
   │ 5 VALIDATE       │  Reachability, licence, domain reputation, corroboration
   │                  │  count. Below threshold ⇒ dropped here, before synthesis.
   └────┬─────────────┘
        │
   ┌────▼─────────────┐
   │ 6 EXTRACT        │  Per source: atomic claims, each with a verbatim span,
   │                  │  the source id, and a proposed claimType.
   └────┬─────────────┘  ← THE CITATION-PRESERVING STEP TAPESTRY LACKS
        │
   ┌────▼─────────────┐
   │ 7 SYNTHESIZE     │  Compose narrative FROM THE CLAIM SET ONLY, one call per
   │                  │  dimension. Each block references the claim ids it uses.
   └────┬─────────────┘
        │
   ┌────▼─────────────┐
   │ 8 VERIFY         │  Mechanical: every block cites ≥1 claim; every claim traces
   │                  │  to a validated source; no practical-data field synthesised;
   └────┬─────────────┘  contradictions flagged. Violations ⇒ block dropped.
        │
   ┌────▼─────────────┐
   │ 9 STAGE          │  Persist as depth:"researched", status:"pending-review".
   └────┬─────────────┘  Mirrors the archive-submission invariant exactly.
        │
   ┌────▼─────────────┐
   │ 10 CURATE (human)│  Approve / edit / reject. Only a human sets "curated".
   └──────────────────┘
```

**Step 6 is the architectural centre.** Tapestry hands raw source text to synthesis and asks for a narrative; attribution is lost in that step and cannot be recovered afterwards. Extracting *atomic, span-anchored claims first* means synthesis composes from already-attributed units, so citation survives by construction rather than by instruction.

**Steps 9–10 reuse an invariant this codebase already implements.** `src/lib/archive-submissions.ts` guarantees no code path can publish a submission — approval is a human action taken outside the app. Applying the identical rule to machine-generated knowledge is the cheapest possible safeguard, and the pattern is already proven here.

## 4. Provider recommendation

Tapestry is Gemini-specific (`@google/genai`, Google Search grounding, Imagen, Cloud TTS/Translate). TerraStory should keep the pipeline provider-agnostic behind interfaces, with a default.

**Recommended default: Claude, `claude-opus-5`** for extraction (6), synthesis (7) and verification (8); `claude-haiku-4-5` for cheap mechanical passes such as validation triage (5).

Reasons specific to this project:

| Need | Capability |
|---|---|
| Long source corpora in one pass | 1M-token context — a whole dimension's sources fit without chunking, which is what forces Tapestry's truncation-repair hack |
| Schema-valid output without repair | Structured outputs via `output_config.format`; strict tool schemas. Removes `repairTruncatedJson` entirely |
| Retrieval without a second vendor | Server-side web search tool `web_search_20260209` (with `allowed_domains` / `blocked_domains`) — maps directly onto `SourceType` tiering and the exclusion list |
| Cost control on re-runs | Prompt caching; cache reads ≈0.1× input cost. A destination's source corpus is stable across dimension passes, so caching applies well |
| Bulk authoring runs | Batch API at 50% cost — and this is an authoring-time pipeline (rule 6), so latency is irrelevant |

Current pricing (per 1M tokens): `claude-opus-5` $5 in / $25 out · `claude-sonnet-5` $3/$15 · `claude-haiku-4-5` $1/$5.

**This is a default, not a lock-in.** Stages 2, 6, 7 and 8 should sit behind interfaces so a provider swap is a config change. Retrieval likewise: the built-in web search tool, Tavily, or the existing Wikipedia/Commons clients should be interchangeable.

## 5. Cost estimate

Authoring-time, one full pass over one destination — 8 knowledge dimensions:

| Stage | Input | Output |
|---|---|---|
| Plan × 8 | ~16K | ~4K |
| Extract + Synthesize × 8 | ~360K | ~48K |
| Verify × 8 | ~40K | ~4K |
| **Total** | **~416K** | **~56K** |

| Model | Per destination | 14 new destinations | With 5 authoring iterations |
|---|---|---|---|
| `claude-opus-5` | ~$3.48 | ~$49 | ~$244 |
| `claude-sonnet-5` | ~$2.09 | ~$29 | ~$146 |
| Batch API (50%) | ~$1.74 / ~$1.05 | ~$25 / ~$15 | ~$122 / ~$73 |

**Authoring cost is not a meaningful risk** — the whole 15-destination corpus costs less than a modest cloud bill, even with heavy iteration.

**The real cost risk is visitor-triggered research.** At ~$3 per run, an open "research any location" button costs ~$3,000 per 1,000 uses, unbounded and adversarially abusable. This is precisely why rule 6 exists. If an on-demand mode is ever added it needs auth, hard per-user rate limits (Tapestry's `userRateLimits` pattern), and a global spend cap.

Two figures deliberately **not** estimated here because I have no verified rate for them: the per-search cost of the server-side web search tool, and image-generation cost if generative imagery is ever adopted. Both must be confirmed against current pricing before Phase 3 budgeting rather than guessed.

## 6. Connecting to the existing architecture

The engine attaches at four existing seams, and **nothing about the Sikkim path changes**:

1. **Ingestion (`scripts/`)** — the Wikipedia/Commons clients, rate limiting (~1.1s + backoff) and licence verification become stages 3–5. Already written and battle-tested.
2. **Source registry (`src/data/sources.ts`)** — the engine writes `Source` records in the existing shape, adding `retrievalMethod: "agent" | "web-search"` so machine-found sources are distinguishable from human-curated ones.
3. **Staging (`src/lib/archive-submissions.ts`)** — the pending-review pattern is reused verbatim for machine output.
4. **QA harness (`scripts/qa/`)** — a new `qa:research` enforces stage 8 in CI: build fails if any published block lacks a citation, or if any practical-data field carries a synthesised value.

**Sikkim is not researched by this engine.** It stays `deep`, human-curated, untouched. The engine's first target is one `curated` destination — Kyoto is the recommended pilot, being conceptually closest to Sikkim (temples, well-documented, strong open data) while still breaking every Sikkim-specific assumption, which makes it an honest test.

## 7. Failure modes and responses

| Failure | Response |
|---|---|
| No sources meet the quality threshold | Dimension yields nothing. Destination shows a gap on its preservation page. **Never** fall back to unsourced generation |
| Sources contradict | Both recorded; rendered as disputed with both citations — the existing `VisitingHours` `official`/`reported` split is the model |
| Synthesis emits an uncited claim | Block dropped at stage 8 |
| Model proposes a hallucinated opening time | Rejected by rule 3 — practical fields have no synthesis path at all |
| Truncation / malformed output | Task fails loudly, retries with a smaller dimension slice. No silent repair |
| Cultural or religious misrepresentation | `claimType` + human curation gate; sacred-context claims require `government`- or `encyclopedia`-tier sourcing |
| Licence-unclear imagery | Rejected by the existing licence pipeline before it can reach a page |
