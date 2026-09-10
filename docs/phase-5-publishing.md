# Phase 5 — Approved Knowledge to Destination Experience

**Completed 2026-08-25.** Phase 4 stopped at the approval boundary. Phase 5 carries approved knowledge onto destination pages, implements destination depth so a researched place cannot pass for a curated one, and builds the evaluation harness for measuring generated prose.

**Headline:** Sikkim renders as **deep**, Jaipur as **curated**, Kyoto as **researched** — three different labels from the same component, each earned or declared for a stated reason.

**Also headline, and less pleasant:** the real-model evaluation was **not executed**. No API key exists here. See `phase-5-model-evaluation.md`.

---

## 1. Publishing architecture

```
.data/research/jobs/       raw research      — never read by the app
.data/research/reviews/    decisions + audit
.data/research/approved/   approved claims   — the publisher's ONLY input
        │
        ▼  scripts/research/publish.mjs   (deterministic, no model)
src/data/generated/published-knowledge.json
        │
        ▼  src/data/published-knowledge.ts (typed reader)
/destinations/[destinationId]              (prerendered)
```

Four properties define the publisher:

**Deterministic.** No model is consulted. It does not choose, rank or write anything — publication is a filter. The payload carries no timestamp, so the same approved input produces a byte-identical file; `qa:publishing` asserts two consecutive runs match.

**Approved-only.** It reads `.data/research/approved/` and nothing else. Pending, rejected and conflicted claims are not filtered out later — they are never read.

**Re-verified.** Every claim is checked again at this boundary: evidence present, span still matching by offset, content hash unchanged, source registered and in scope, no practical data. Approval is a point-in-time decision about a source that can change afterwards.

**Traceable.** Every published fact keeps its claim id, verbatim evidence span, source id, tier and URL.

Output lands in `src/data/generated/` — the same build-time convention every other agent in this project uses — so pages prerender from it and the application never reads `.data/` at request time.

## 2. Destination depth model

`scripts/research/depth.mjs`.

```
planned  →  researched  →  curated        ← ceiling for the pipeline
                             deep         ← declared only, never earned
```

**`PIPELINE_MAX_DEPTH = "curated"`.** The authority-inheritance defence is a missing enum value rather than a check: `deep` is not something `assessDepth()` can return. A destination becomes deep only by a destination record declaring it, backed by an actual curated archive.

Thresholds for `curated`, each answering a specific way a thin destination can look complete:

| Threshold | Value | Why |
|---|---|---|
| Approved claims | ≥ 20 | Below this a page is a stub with citations |
| Categories covered | ≥ 3 | A destination researched only for its founding date is not "known" |
| Higher-tier claims | ≥ 1 | Encyclopedia-only coverage stays `researched`, however many claims |
| Distinct sources | ≥ 2 | The account should not rest on one publisher |

These are judgement calls and are documented as such. They were **not** tuned to make the pilots look finished — Kyoto misses on claim count and is reported as `researched`, and Sikkim's *own research* would only earn `researched` too.

`reconcileDepth()` is deliberately asymmetric: a declared `deep` protects a curated archive from being downgraded by a thin research run, and there is no path by which declaring anything makes a research-derived destination look better than its evidence. Tested: `reconcileDepth({declaredDepth: "curated", earned: "researched"})` returns `researched`.

## 3. Authority rules

A destination never inherits depth from sharing a country, a source, a category, a component, or a link with Sikkim. Verified by test:

- **500 official-tier claims across 4 categories and 9 sources → `curated`, not `deep`.**
- Jaipur and Sikkim share a country code; only Sikkim is deep.
- One approved claim from a government source → `researched`, not `curated`.
- No approved claims → `planned`.

**Source quality is not destination depth.** A government source raises confidence in the claim it backs. One excellent source producing one excellent claim is one claim.

## 4. Narrative publishing and 5. sentence provenance

A narrative block publishes only if every claim it cites also published, it cites at least one claim, and it passes the practical-data screen a third time. Blocks carry `claimIds`, `sentenceCount`, `generatedBy` and `verifiedAt`, so any sentence can be walked back to claims, evidence and source.

If verification fails the sentence is not published — the Phase 4 boundary is unchanged and untouched by this phase.

## 6. Source attribution

Each fact names its source inline as a link; the verbatim span is carried in the link's `title` so a specific claim can be checked without cluttering the page; the full source list sits once at the end with tiers.

Every destination page carries an **honesty panel**. Sikkim's says:

> *Depth declared from curated content. On research evidence alone this destination would rank "researched".*

Kyoto's says:

> *Depth earned from evidence: 15 approved facts across 4 topics, 1 from official or academic sources, 3 distinct sources. Short of the next level: 15 approved claims (needs 20).*

The same component renders both, so the honesty has to come from what it says rather than how it looks.

**One bug caught here:** the depth badge originally read from the static registry record, so Jaipur showed "35 approved facts… curated" beneath a badge saying "Not yet available". The badge now uses earned depth — which the model caps at `curated`, so it can never promote a destination to deep.

## 7-8. Model evaluation and survival rate

**REAL MODEL TEST NOT EXECUTED — no API key.** Full detail in `phase-5-model-evaluation.md`.

Measured instead: **verifier accuracy 10/10** on the ten required model-output cases, including a plausible hallucination ("who had travelled from Tsurphu with 400 followers") rejected on its unsupported number and entity.

| Metric | Value |
|---|---|
| Real model calls | **0** |
| Survival rate (real model) | **not measured** |
| Rejection rate (real model) | **not measured** |
| Estimated cost | **$0.00** — no calls made |
| Latency | **not measured** |
| Verifier accuracy (fixtures) | 10/10 |

All pilot narrative came from the deterministic provider, which restates approved claims; its 100% verification rate is a control, not evidence about a model.

## 9. Practical-data separation

Unchanged and now enforced at **four** independent points: extraction (before evidence verification), approval gate, narrative sentence verification (before atom checking), and publication. `qa:publishing` confirms 66 published claims and every narrative block are clean.

## 10. Search-index considerations

Published knowledge **does not enter the ⌘K index**, so no cross-destination search leak is possible today; `qa:publishing` asserts it and that every index entry still points at a default-destination route.

Adding a `destinationId` per entry was considered and rejected for now: the index is serialised into every page and already accounts for ~265 KB of a ~300 KB document, so ~1,140 extra fields would be a measurable regression for a property that currently holds by construction. **Deferred to Phase 6**, where the index needs destination scoping anyway before a second destination's content can be searchable.

## 11. Pilot results

| Destination | Depth | Basis | Earned | Claims | Categories | Higher-tier | Sources | Narrative |
|---|---|---|---|---|---|---|---|---|
| **Sikkim** | `deep` | declared | `researched` | 16 | 4 | 0 | 2 | 4 blocks |
| **Jaipur** | `curated` | earned | `curated` | 35 | 4 | **21** | 4 | 4 blocks |
| **Kyoto** | `researched` | earned | `researched` | 15 | 4 | 1 | 3 | 4 blocks |

Badges render as **Deep archive / Curated / Researched / Not yet available** (Delhi) — four distinct states from one component.

Sikkim's curated content is untouched: no diff to `monasteries.ts`, `places.ts`, `history.ts` or `stories/`, and all content counts match the Phase 2 baseline (180 audio files, 12 languages, 347 images).

## 12. QA results

| Suite | Result |
|---|---|
| typecheck · lint · build | PASS · PASS · PASS (286 pages) |
| `qa:publishing` | **PASS — 51 checks** |
| `qa:narrative` | PASS |
| `qa:research` | PASS — 88 checks |
| `qa:destination` | PASS — 87 checks |
| `qa:heritage` · `qa:gallery` · `qa:integrity` · `qa:industry` | PASS |
| `qa:immersive` · `qa:flows` · `qa:a11y` · `qa:industry-flows` | PASS |
| **`qa:stories-map`** | **INTERMITTENT — not marked green** |

**`qa:stories-map`, reproduced and classified.** Two consecutive runs this session: **attempt 1 PASSED, attempt 2 FAILED**, both at the same `/explore` navigation using `waitUntil: "networkidle"`. Measured cause: `basemaps.cartocdn.com` returns **200 for nine rapid tile requests then 400** for the tenth onward. The suite loads the map twice; the second load runs into the limit and networkidle never settles. `/explore` renders 46 markers correctly in isolation, and nothing in its import graph was changed by Phase 5. **Environmental and intermittent — it passed in this same session, which rules out a code defect.** Not weakened, not marked green; re-run on a machine that is not being throttled.

**Three real defects were found by these tests and fixed:**

1. **Claim-id collision.** Ids were `(destination, category, statement)`, so the same sentence from two documents produced one id shared by a validated record and a duplicate-rejected one — the rejection read *"duplicates its own id"*, and a published claim id could resolve to a rejected record. Ids now include the source.
2. **Intra-document repetition.** The same sentence appearing twice in one document produced two identical claims. Deduped at extraction — a repeat is not a second fact.
3. **Depth badge read the wrong field** (see §6).

Two test expectations were also corrected — not weakened — where Phase 5 legitimately changed behaviour: `qa:research`'s duplicate test now exercises the cross-document path (same-document repeats are dropped earlier), and `qa:destination` now asserts that destinations *with* published knowledge render their own content **without claiming deep authority**, while the fourteen isolation checks still cover every non-Sikkim destination.

## 13. Remaining limitations

- **The survival rate is unmeasured.** The single most important open number in the project.
- **Approved knowledge is not in the search index**, so a visitor cannot find Jaipur's facts through ⌘K.
- **Sikkim's research is encyclopedia-only** — its own portal is a JS SPA. Its `deep` badge comes entirely from the curated archive.
- **Kyoto sits below the curated threshold** on claim count; more official English-language sources would move it.
- **Depth thresholds are judgement calls** and should be revisited once more destinations exist.
- **File-based review storage assumes a single writer.**
- **Narrative is still restatement**, not composition, until a real model is exercised and measured.

## 14. Phase 6 prerequisites

1. **Obtain an API key and run `npm run research:evaluate -- --live`.** Everything about generative narrative is speculative until that number exists.
2. **Destination-scope the search index** — needed before a second destination's content can be searchable, and the deferred item from §10.
3. **Depth propagation in linking**: a `deep` page linking a `researched` one must render that link at the weaker confidence.
4. **Expand the official-source registry** for remaining destinations, each URL verified by hand.
5. **Decide whether narrative composition is worth it** — on the measured survival rate, not on principle.
