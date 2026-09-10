# Phase 4 — Review Workflow, Source Quality and Verified Narrative

**Completed 2026-08-25.** Phase 3 could research a destination. Phase 4 makes that research reviewable, raises the authority of what it reads, and lets a model write prose — under a verifier that checks every sentence against approved claims.

**The claim this phase rests on:** generated prose is safe to publish only when each sentence is decomposed into factual atoms and every atom is found in an approved claim. Similarity is never accepted as proof, because the sentences that most need rejecting are the ones that resemble the claims closely while adding one new fact.

---

## 1. Source discovery changes

Phase 3 proposed only Wikipedia and Wikivoyage, so every claim it produced landed at encyclopedia tier — accurate, and thin.

Discovery now walks tiers in order: **official government / tourism / institutional → academic / museum → reputable publication → encyclopedia last**. Encyclopedia sources are still proposed, because rejecting them would lose real coverage; they simply no longer come first.

**Official URLs come from a hand-verified registry** (`scripts/research/source-registry.mjs`), never from a pattern or a model. Each entry was fetched and checked before it was added, and records the date and status. Guessing a plausible portal address returns a 404 or somebody else's site rendered as authoritative — both worse than the gap they close.

Three defects had to be fixed before tier-1 sources actually contributed anything:

| Defect | Symptom | Fix |
|---|---|---|
| HTML→text kept navigation | 66 KB from Rajasthan Tourism was almost entirely menu labels | `htmlToProse()` takes paragraph-bearing elements only, drops nav/header/footer, and requires ≥80 chars |
| Extractor tuned on encyclopedia prose | *"Planned by Vidyadhar Bhattacharya, Jaipur holds the distinction of being the first planned city of India"* matched no factual marker | Markers widened; dated sentences admitted to history/heritage without a category-hint match; cookie-banner boilerplate filtered |
| Scope parser did not know `forDestination()` | **All 29 official-source claims silently rejected as out-of-scope** | Parser handles both alias and `forDestination` forms, still failing closed on anything unrecognised |

The third was the important one: discovery, retrieval and extraction were all working, and a regex that had not kept up with the file it reads was discarding everything they produced.

## 2. Source quality model

Reuses the Phase 2.5 `Source` architecture — no duplicate provenance system. Each retrieved document carries `tier` (authority), `type` (publisher kind), `publisher`, `scope`, `retrievalMethod`, `retrievedAt` and `url`, which together answer *"why was this source trusted?"*

**Confidence follows the best source backing a claim**, not the model's certainty: official/institutional/academic → `high`, encyclopedia/reputable → `medium`, other-public → `unverified`. Each claim records `confidenceReason`.

**Corroboration.** The same statement from a *different* source is no longer discarded as a duplicate — its evidence is merged into the original claim and confidence rises to `high` with a `corroboratingSources` list. Same source, still a duplicate. *Honest limitation:* with verbatim-sentence extraction, two publishers rarely phrase a fact identically, so this fires in unit tests but not yet in the pilot runs.

## 3-4. Review workflow and UI

```
.data/research/jobs/      RAW research      — unreviewed, never public
.data/research/reviews/   decisions + audit
.data/research/approved/  APPROVED knowledge — the only publishable layer
```

Separate **directories**, not a status field on one record: a status field can be misread by one careless consumer, whereas a directory a component never opens cannot leak.

**Reviewer CLI** (`npm run review -- …`): `queue`, `show`, `approve`, `reject`, `defer`, `request`, `approve-all`, `audit`, `narrative`.

**Reviewer UI** at `/review` and `/review/[destinationId]` — utilitarian, read-only, `force-dynamic`, `noindex`, and **404 in production unless `TERRASTORY_REVIEW_UI=1`**. One view carries the claim, its type, confidence and why, the source with authority tier and URL, the verbatim evidence span with character offsets, any conflict, and the decision already recorded. A reviewer does not open five files to understand one claim.

The UI is deliberately read-only. Decisions go through the CLI, which calls the same gate.

## 5. Approval model

The seven conditions live in `approvalBlockers()` — **in the model, not the interface**. One interface is never the only consumer, and the second one would re-implement the rules and get one wrong.

1. source exists · 2. evidence exists · 3. evidence verified against its document (offset + content hash) · 4. source in scope for the destination · 5. practical-data rules pass · 6. no unresolved conflict · 7. status is `validated`

All failures are returned, not the first. Rejecting, deferring or requesting changes is always permitted; only **approval** must clear the gate.

Decisions are a closed set of four: `approved` · `rejected` · `deferred` · `changes-requested`. Every extra state is a state something can get stuck in.

## 6. Audit trail

Every decision writes `{ claimId, previousStatus, newStatus, reviewer, reason, at }`. `--reviewer` is required — a decision without an owner is not an audit trail. Recording the previous status is what makes a later reversal legible.

## 7. Published knowledge model

`rebuildApproved()` **derives** the approved file from raw research plus decisions rather than appending, so a reversed approval actually disappears. The gate is re-checked during the rebuild, because a source can change after approval; claims that no longer clear it are listed as `lapsed` rather than silently dropped.

**Raw research cannot reach the public app.** `qa:narrative` asserts that only `src/app/review/**` imports the review store and that no public page reads `.data`. Verified in a production build: `/` and `/destinations/jaipur` contain zero claim ids.

## 8-9. Narrative generation and sentence verification

```
approved claims → exclude conflicted → generate → split → atoms → verify each → assemble survivors
```

Conflicted claims are excluded **at the input**, so the model never sees a disputed date to average, choose between, or hedge into "around 1710". Excluding at input beats filtering output.

Each sentence is decomposed into **years · numbers · entities · superlatives · connectives**, and every atom must appear in a supporting claim. One unsupported atom rejects the sentence — no partial credit, because a sentence publishes as a unit.

**Superlatives and connectives are the ones that matter.** "One of the most important Buddhist sites" is a claim about rank that a founding date does not support. "Because of this it became a centre of learning" is two assertions, and a claim set often supports only the first.

Two refinements found by testing:

- **Direct restatement.** A sentence that *is* an approved claim is supported by the strongest evidence available. Without this, a perfectly sourced sentence carrying no year, number or proper noun was rejected as "asserts nothing checkable". Containment is one-directional — a claim may contain the sentence, never the reverse, so a sentence containing a claim *plus* extra facts still falls through to the atom checks.
- **Grounding backstop.** Atoms checking out is necessary, not sufficient: "the monastery was destroyed" contains no atom. At least 60% of content words must come from the claim set. This is a floor, not a similarity score standing in for proof.

## 10. Practical-data firewall

Unchanged from Phase 3 and extended to the narrative path, where it runs **first** — before atom checking. A source may well state opening hours; that does not let the narrative engine restate them. `qa:narrative` asserts that a sentence pairing a supported founding date with an opening time is rejected as `practical-data`.

## 11. Conflict handling

Unresolved conflicts block approval (gate condition 6) and their claims are excluded before generation. Tested three ways: the compromise "around 1710" fails verification because 1710 appears in no claim; neither original date can be silently chosen; both claims are preserved.

## 12. Test results

`npm run qa:narrative` — **71 checks, all passing**, covering the 20 required areas and TEST A–J.

| Test | Case | Result |
|---|---|---|
| A | Fully supported sentence | accepted |
| B | Unsupported factual claim ("300 monks") | rejected |
| C | Unsupported date ("expanded in 1984") | rejected |
| D | Opening time | rejected by firewall |
| E | Conflicting claims | excluded; compromise unverifiable |
| F | Supported paraphrase / paraphrase + new fact | accepted / rejected |
| G | Connective and smuggled superlative | rejected |
| H | Sikkim source backing a Kyoto claim | rejected |
| I | Approval writes audit entry | verified |
| J | Raw research in the public app | structurally impossible |

## 13-15. Pilot results

| Destination | Sources | Validated | **Official-tier claims** | Approved | Sentences verified | Rejected | Blocks |
|---|---|---|---|---|---|---|---|
| **Sikkim** | 2 | 16 | **0** | 16 | 16 | 0 | 4 |
| **Jaipur** | 4 | 35 | **21** | 35 | 36 | 0 | 4 |
| **Kyoto** | 4 | 15 | **1** | 15 | 15 | 0 | 4 |

**Jaipur is the phase's proof**: 21 of 35 claims now come from the Rajasthan tourism department and the Ministry of Tourism, against Phase 3's 10 encyclopedia-only claims.

**Sikkim's 0 is honest, not a failure.** `sikkimtourism.gov.in` is a client-rendered SPA returning ~14 characters of text. It is registered with `rendersServerSide: false` and reported as a recorded retrieval failure, so the gap is stated rather than hidden. Rendering JavaScript to extract claims would need its own provenance argument and is out of scope.

**Kyoto's 1** reflects thin English prose on its official sites, not a pipeline problem.

Sikkim's curated content is untouched: no diff to `monasteries.ts`, `stories/` or `history.ts`, and all content counts match the Phase 2 baseline.

## 16-18. Files and dependencies

**Created:** `scripts/research/source-registry.mjs`, `review.mjs`, `narrative.mjs`, `narrative-job.mjs` · `scripts/review/cli.mjs` · `scripts/qa/narrative-integrity.mjs` · `src/lib/research/review-store.ts` · `src/app/review/page.tsx`, `src/app/review/[destinationId]/page.tsx` · four docs.

**Modified:** `scripts/research/{core,sources,claims,provider}.mjs` · `src/data/sources.ts` (4 verified official sources, additive) · `scripts/qa/destination-integrity.mjs` (scope-parser fix) · `package.json`.

**New dependencies: none.** Phase 3's `@anthropic-ai/sdk` devDependency is unchanged.

## 19. Cost implications

No new per-request cost — research and narrative are both offline jobs, and no page calls a model. Deterministic gates run before any provider call: unregistered destination, disallowed host, unavailable provider and duplicate detection all fail without spending a token. Narrative generation runs once per (category, claimType) group over approved claims only, which is a far smaller input than source documents.

## 20. Security implications

Host allowlist extended by three verified entries (`kyoto.travel`, `.lg.jp`, `.pref.kyoto.jp`) — by suffix rather than opening `.jp`. Prompt-injection defences unchanged and still backstopped by the requirement that a claim needs a verbatim span. New surface: the review UI, gated off in production, `noindex`, read-only, and unable to approve anything without the model-level gate.

## 21. Remaining limitations

- **Approved knowledge is not published into pages.** Phase 4 stops at the approval boundary by design; nothing in the public app reads approved claims yet.
- **Corroboration rarely fires** with verbatim-sentence extraction (see §2).
- **The Anthropic narrative path is unexercised** — no API key in this environment, so all pilot runs used the deterministic provider. The verifier is provider-independent and was tested against adversarial sentences directly, but a real model's output has not been run through it here.
- **Conflict detection is dated-disagreement only**; broader semantic contradiction needs a model.
- **Sikkim has no readable tier-1 source**, so its claims remain encyclopedia-tier.
- **`qa:stories-map` fails in this environment** on a `networkidle` navigation to `/explore` — CartoDB tiles return 400 under burst (verified: 10 rapid tile requests, the 10th returns 400). 45 of its checks pass first, `/explore` renders 46 markers correctly in isolation, and nothing in its import graph was touched by Phase 4. Same tile flakiness Phase 2.5 documented, aggravated by this session's network volume. It should be re-run on a machine that is not being throttled before being treated as a real signal.

## 22. Phase 5 prerequisites

1. **Publish approved knowledge into destination pages** — the natural next step, and the first time researched content becomes visible.
2. **Exercise the generative path with a real key**, and measure what fraction of model sentences survive verification. That number is the honest measure of whether generative narrative is worth its cost.
3. **Write-capable review UI** with proper auth, if more than one curator is expected — file-based storage assumes a single writer.
4. **Depth propagation in rendering**: `researched` content must be visually distinguishable and must not inherit authority from `deep` neighbours.
5. **Expand the official-source registry** for the remaining destinations, each URL verified by hand.
