# Phase 6 — Verified Composition

Phase 5 shipped narrative that was **restatement**: approved claims concatenated in extraction order. Phase 6 builds the machinery for genuine composition — and, critically, extends the verifier so composition can be *checked* rather than trusted.

**The rule that governs everything here:** the generator may choose order, phrasing, transitions and emphasis. It may not introduce a fact. The verifier decides which is which, and the generator never touches the verifier.

---

## 1. Claim graph

`scripts/research/claim-graph.mjs`. Structure is derived deterministically from properties the claims actually have — because a model asked to find structure will invent it, and *"these two developments were connected"* is exactly the sentence that reads well and is supported by nothing.

**Every edge records why it exists.** There are no similarity scores and no embeddings in this file, for that reason.

| Edge | Derived from | Recorded reason |
|---|---|---|
| `shares-entity` | Same proper noun in both statements | The shared entity |
| `temporal` | Both carry a year | `"1705 precedes 1913"`, directed earlier→later |
| `same-category` | Same knowledge area | The category |
| `same-source` | Same backing document | The source id |

`same-source` exists for the reverse question — which parts of a narrative would collapse if one source were withdrawn — not because two facts sharing a publisher are related in the world.

## 2. Narrative planning

`planNarrative()` produces a deterministic plan: chronological ordering first (a heritage narrative that jumps between centuries reads as a list however well written), undated claims grouped by shared entity, plus the **chronology** the model may rely on and the **through-lines** (entities appearing in more than one claim).

Ties break on claim id, so the same claim set always yields the same plan — which is what keeps the narrative cache valid.

## 3. Composition

The model receives the plan as *material*, not as facts: every line of it restates something already in a claim. The prompt tells it to compose rather than list, and states precisely which transitions are permitted and which are not.

The prompt is guidance. **The verifier is the boundary**, and it is applied to the model's output regardless of what the prompt said.

## 4. Sentence verification — the connective problem

This is the hard part, and the phase's main technical contribution.

Phase 5 rejected *every* connective unless the phrase appeared in a claim. That is safe and makes composition impossible: prose without transitions is a list. The question that makes it tractable is logical, not stylistic:

> **Does the connective assert something the supported claims already entail, or something new?**

| Class | Examples | Verdict | Reasoning |
|---|---|---|---|
| **Causal / evaluative** | because of this, as a result, this made, **shaped**, **influenced**, **gave rise to**, **cemented** | **Reject** unless a claim carries the relationship | Two supported facts side by side entail neither cause nor significance |
| **Present continuation** | today it, it remains, continues to, to this day | **Reject** | A claim about 1705 supports nothing about now |
| **Process** | over time, eventually, gradually, came to be | **Reject** | Two dated facts do not entail a process between them |
| **Ordering** | later, subsequently, thereafter | **Accept** only when the claims carry both dates it orders | 1705 < 1913 is entailed by two claims |
| **Additive** | also, in addition, alongside, likewise | **Accept** | Conjunction of supported facts is supported |

**The bolded evaluative verbs are new in Phase 6, and they are a tightening.** Previously *"These traditions shaped the region's cultural identity"* was rejected only incidentally — it happened to contain no date or proper noun, so it failed the "asserts nothing checkable" test. Now it is rejected for the right reason: it asserts a significance no claim contains.

**The ordering allowance is the one thing Phase 6 permits that Phase 5 did not**, and the condition is strict: at least two distinct years, present in the supporting claims, spanning the ordering. *"Founded in 1705, it was later rebuilt in 1913"* passes; *"founded in 1705 and was later expanded"* is refused, because "later" would assert an undated second event.

### Proof that the verifier was not weakened

The temptation in a phase like this is to relax the verifier until the generator looks good. The guard is mechanical — every prior suite passes unchanged:

| Suite | Before | After |
|---|---|---|
| `qa:narrative` (Phase 4) | 71/71 | **71/71** |
| `qa:research` (Phase 3) | 88/88 | **88/88** |
| `qa:publishing` (Phase 5) | 51/51 | **52/52** |
| Fixture accuracy (Phase 5) | 10/10 | **10/10** |

`qa:composition` additionally re-asserts every category of smuggled assertion — unsupported date, number, entity, superlative, causal, present-continuation, process, practical data — and the four newly-rejected evaluative verbs.

## 5. Narrative modes

Five, deliberately. `allowedClaimTypes` is the load-bearing field: a historical overview built partly from legends would present folklore with the authority of record, which is the failure `claimType` has guarded against since Phase 1.

| Mode | Audience | Claim types | Max sentences |
|---|---|---|---|
| `HISTORICAL` | What happened here and when | documented history | 6 |
| `CULTURAL` | Daily life, practice, craft | documented history, oral tradition | 5 |
| `HERITAGE` | What to see | documented history | 6 |
| `STORY` | Narrative and belief | oral tradition, legend, travel story | 5 |
| `DESTINATION_OVERVIEW` | Just arrived, knows nothing | documented history | 4 |

`STORY` is the only mode admitting legends, and it carries the label so a reader is never left guessing the register.

## 6. Provenance

Every published sentence retains, internally:

```
sentenceId · claimIds · evidenceIds (source@charStart-charEnd) ·
sourceIds · destinationId · verified
```

Every block additionally carries `mode`, `promptVersion`, `verificationVersion`, `model`, `survivalRate` and `cacheKey`.

**Verified: 45 of 45 stored sentences carry the full chain.** None of it is shown to the reader — the destination page shows prose and source attribution, never claim ids, review states or agent names.

## 7. Rejection behaviour

- Unsupported sentence → **sentence dropped**, reason recorded.
- Narrative below **60% supported** → **whole narrative withheld**; the destination keeps its approved claims.
- Provider failure → recorded; other modes continue.
- Conflicted claims → excluded **at the input**, so the model never sees a disputed date to average.
- A mode with fewer than two eligible claims → produces nothing rather than a sentence of padding.

Rejections are retained with their reasons. A silent drop is indistinguishable from the model simply not having written it.

## 8. Does composition actually work?

**Unproven, and measured as unproven.** The composition ratio is **~0% across every mode** with the deterministic provider — which is correct, since it restates claims one per sentence. The metric works; the generator that would exercise it has not run.

The machinery is in place: graph, plan, modes, compositional prompt, and a verifier that now accepts genuinely entailed transitions while rejecting more assertion types than before. Whether a real model produces prose that clears it is the open question, and it needs one API key to answer.
