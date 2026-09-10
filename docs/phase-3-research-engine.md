# Phase 3 — Source-Grounded Research Engine

**Completed 2026-08-25.** The first phase to introduce AI into this project. The engine researches a destination from real public sources and produces claims that each carry a verbatim, machine-verified span from the document that supports them.

**The central design claim:** the LLM is a processing tool, never the source of truth. Fabricated evidence is not discouraged here — it is unrepresentable, because a span that is not literally present in a retrieved document cannot acquire an Evidence record.

---

## 1. Architecture

```
DESTINATION (resolved against the registry — never a free-form string)
     │
     ▼
RESEARCH JOB ── id derived from (destination, categories, provider); reused if complete
     │
     ▼
 1. PLAN ─────────── deterministic; one task per category, typed by expected claim type
     │
 2. DISCOVER ─────── allowlisted candidate sources; states no facts
     │
 3. RETRIEVE ─────── HTTPS only, allowlisted hosts, 1.1s + backoff, cached on disk
     │
 4. NORMALISE ────── NFC, refs stripped, whitespace collapsed, SHA-256 hashed
     │
 5. EXTRACT ──────── ◄── THE ONLY PROVIDER CALL. Proposals, not facts.
     │
 6. EVIDENCE ─────── indexOf against the document. No match ⇒ no claim.
     │
 7. VALIDATE ─────── claim → evidence → source → destination, all deterministic
     │
 8. CONFLICTS ────── both preserved, neither chosen
     │
 9. STRUCTURE ────── grouped by category; no practical field exists to fill
     │
10. SYNTHESISE ───── narrative from validated claims only; no provider call
     │
     ▼
PENDING-REVIEW ── the only success state. There is no publish step.
```

Stages are explicit and separately observable. Nothing is collapsed into a single provider call, and the provider is consulted at exactly one of ten stages.

**The engine lives in `scripts/research/`, not `src/`.** That is why "research must not run during a page render" is a property of where the code lives rather than a rule to remember — the application literally cannot import it. `qa:research` asserts this.

## 2. Agent responsibilities

| # | Agent | Module | Uses LLM? | Responsibility |
|---|---|---|---|---|
| 1 | Planner | `provider.mjs` | No | Categories → typed tasks + anticipated gaps |
| 2 | Discovery | `sources.mjs` | No | Candidate URLs, publishers, tiers. States no facts |
| 3 | Retriever | `sources.mjs` | No | Fetch, normalise, hash, cache, dedupe, record failures |
| 4 | Claim extractor | `provider.mjs` + `claims.mjs` | **Yes** | Propose claims from a retrieved document |
| 5 | Evidence extractor | `core.mjs` + `claims.mjs` | No | Verify spans; attach locators |
| 6 | Validator | `claims.mjs` | No | The full relationship chain |
| 7 | Conflict detector | `claims.mjs` | No | Dated disagreements about one entity |
| 8 | Structurer | `pipeline.mjs` | No | Group into knowledge records |
| 9 | Synthesiser | `pipeline.mjs` | No | Narrative from validated claims only |

**Only agent 4 calls a model.** Everything that decides what is true is deterministic — a deliberate inversion of the Tapestry pipeline, where synthesis both writes and decides.

Planning is deterministic for both providers because a model is not needed to know that a heritage destination has a history and a set of festivals; using one there adds cost and variance for no gain.

## 3-7. Lifecycles

**Research job** — `queued → running → { pending-review | failed }`. There is no `published` state; the type cannot express one. Id is derived from inputs, so asking twice reuses the answer. Failed jobs are *not* reused: that would turn one transient rate-limit into a permanent "no sources for this destination".

**Source** — discovered (allowlisted) → retrieved (paced, cached) → normalised → hashed → scoped. Failures recorded with a reason and never substituted. Full policy: `research-source-policy.md`.

**Claim** — `proposed → { validated | rejected | conflicted }`. Rejection reasons are machine-readable and rejected claims are **retained**: a reviewer needs to see what the engine refused as much as what it accepted.

**Evidence** — proposed span → `indexOf` verification → locator + content hash → re-verified at validation. Full model: `evidence-model.md`.

**Validation order matters.** The practical-data guard runs *before* evidence verification, so a perfectly evidenced opening time is still rejected — correct sourcing does not make practical data publishable through this pipeline.

## 8. Conflict handling

Two validated claims about the same named entity, both dated, with no year in common and a shared assertion verb. Both are marked `conflicted`, a `Conflict` record preserves them, and `resolution` is permanently `"unresolved"` — there is no automated resolution path.

The archive already worked this way: `VisitingHours` distinguishes an `official` schedule from a `reported` one rather than picking a winner.

**Conflict detection was tuned down during this phase, not up.** The first version took the leading capitalised run as the subject, which made "The" and "Built" into entity names and reported two unrelated Kyoto sentences as a dated disagreement. A conflict report that cries wolf is worse than none, because it trains a reviewer to dismiss the real ones. Now: stopwords excluded, longest proper-noun phrase preferred, and a shared assertion verb required so "founded in 1734" and "renovated in 1799" read as a sequence rather than a contradiction. All three cases are regression-tested.

## 9. Practical-data restrictions

Three independent defences, each of which would have to fail. Full policy: **`practical-data-policy.md`**.

1. **Structural** — no practical `ResearchCategory` exists; there is nowhere to put an opening time.
2. **Behavioural** — `detectPracticalData()` over every proposed claim, before validation, independent of what the model was instructed.
3. **Architectural** — the provider is only ever asked to extract. No code path is shaped `LLM → generate`.

## 10. Pending-review flow

```
AI RESEARCH → CLAIMS + EVIDENCE → VALIDATION → PENDING-REVIEW → (human) → PUBLISH
```

Output is written to `.data/research/jobs/` — gitignored, outside `public/`, the same place community archive submissions land. That is deliberate: machine-generated knowledge gets the same treatment as a stranger's contribution, because the argument for reviewing one applies unchanged to the other.

Sikkim's curated content is untouched. The engine writes nothing into `src/data/`, asserted by test.

## 11. LLM integration

**Provider: Claude, `claude-opus-5`**, via `@anthropic-ai/sdk` (a **devDependency** — the engine is offline tooling and nothing reaches the application bundle).

Selected on properties this pipeline needs:

| Need | Why this model |
|---|---|
| Whole document in one pass | 1M-token context — the truncation-repair hack Tapestry needs never arises |
| Malformed output rejected at the boundary | Native structured output (`output_config.format` with a JSON schema) |
| Extraction fidelity | Strong instruction adherence; extraction is the only task asked of it |
| Cost on repeat scans | Prompt caching — the same document is scanned once per category |

**Not selected for brand familiarity.** The `ResearchProvider` interface is the real commitment; the model is one implementation behind it.

**Two providers, both real:**

- `anthropic` — used when `ANTHROPIC_API_KEY` is set.
- `rule-based` — a deterministic extractor using linguistic patterns. **Not a mock**: it reads the same real documents and produces the same verified spans. It exists because the pipeline's guarantees must be demonstrable without a model, and because it is the honest default when no key is configured.

When no key is set, the Anthropic provider reports **UNAVAILABLE** rather than degrading silently — following the convention `heritage-360-finder.mjs` already established in this project: *without a key, the check is reported as unavailable, never guessed*.

Every stored job records which provider produced its proposals.

## 12. Cost controls

- Research is an **offline job**, never a page request. No visitor triggers a model call.
- Job ids derived from inputs; a completed job is reused rather than re-run.
- Documents cached on disk; a re-run over unchanged sources makes no network calls.
- Deterministic gates run **before** the provider: an unregistered destination, a disallowed host or an unavailable provider all fail without spending a token.
- Duplicate documents collapse by content hash.
- Extraction is capped per document per task.

## 13. Caching

| Layer | Location | Key |
|---|---|---|
| Retrieved documents | `.data/research/cache/` | SHA-256 of URL |
| Completed jobs | `.data/research/jobs/` | `(destination, sorted categories, provider)` |
| Claim ids | derived | `(destination, category, statement)` |

Deterministic ids mean a re-run over unchanged sources produces identical claims — which is what makes reuse and deduplication work without a database. **No database was introduced** (Phase 2.5 decision, unchanged).

## 14. Failure handling

Every failure mode the brief lists is handled and tested: source unavailable, timeout, rate limit (backoff, then recorded), malformed page, empty page, missing article, duplicate source, contradictory claims, missing evidence, unsupported destination, provider failure, invalid structured output, partial completion.

**Nothing is silently fabricated.** Zero retrieved sources fails the job. A provider error on one document does not fail the whole job — it is recorded and the run continues with what it has.

**Model output is never repaired.** Tapestry's `repairTruncatedJson()` returns a plausible-looking stub on failure; in a knowledge product that is worse than an error, because it is indistinguishable from success. Unparseable output is rejected.

## 15. Security

| Surface | Control |
|---|---|
| SSRF | Host allowlist + HTTPS only, checked before any fetch. Blocks `file://`, `localhost`, `169.254.169.254` |
| Module injection | No dynamic import is built from any input; all specifiers are literals |
| Path traversal | Destinations resolve against the registry; `../../etc/passwd` throws |
| Prompt injection | Untrusted delimiters + delimiter stripping + **the backstop that a claim still needs a verbatim span**, so injected text cannot manufacture a source |
| Untrusted config | Source content cannot alter destination configuration — it never reaches a writer |

Retrieved content is DATA. There is deliberately no keyword-based "malicious text" detection: leaky and lossy, since a heritage article legitimately discussing instructions is not an attack. **Containment beats detection.**

## 16. Testing

`npm run qa:research` — **86 checks, all passing**, covering the twenty required areas. The tests that matter most are adversarial: fabricated evidence, paraphrased evidence, tampered documents, practical-data claims, out-of-scope sources, prompt injection. Each tries to make a failure happen and asserts that it does not.

Two real defects were found by these tests and fixed: MediaWiki section headers leaking into claim statements, and false-positive conflict detection. A third — a practical-guard gap on "available for booking" — was found, fixed, and the fix's own over-reach caught and corrected. All are regression-locked.

## 17. Initial destination scope

Sikkim (deep reference), Jaipur (new Indian destination), Kyoto (international). Real sources, real spans, no fabrication.

| Destination | Sources | Proposed | Validated | Practical rejected | Duplicates | Conflicts | Narrative blocks |
|---|---|---|---|---|---|---|---|
| **Sikkim** | 2 | 15 | 12 | 1 | 2 | 0 | 3 |
| **Jaipur** | 2 | 10 | 10 | 0 | 0 | 0 | 3 |
| **Kyoto** | 2 | 14 | 11 | 0 | 3 | 0 | 4 |

**38 evidence spans stored, 38 verified byte-exact, 0 mismatched.**

The Sikkim practical rejection is instructive: a Wikivoyage sentence about a monastery founding an academy for orphans, rejected because it ended with a price. The historical content was real; the guard fired on the currency amount. That is the documented tradeoff working, and the reviewer sees the rejection with its reason.

## 18. Future expansion

**Before more destinations:** an approval tool (there is currently no UI for a curator to act on `pending-review` output), and higher-tier sources — two encyclopedia-tier sources per destination is thin, and government portals are where the confidence is.

**Before AI-written narrative:** synthesis currently composes from validated claims without a model, deliberately. A model asked to write flowing prose "from these claims" reliably adds connective assertions no claim supports. Generative narrative needs sentence-level verification against the claim set first — that is a Phase 4 problem, not an oversight.

**Not in this phase, by instruction:** image generation, global map, trip-planner generalisation, populating the remaining destinations.
