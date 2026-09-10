# Phase 6 — Live AI Evaluation

## REAL MODEL TEST NOT EXECUTED

**No Anthropic API key was available.** No live model run was performed. This is the second consecutive phase in which the live evaluation could not run, and nothing has been estimated in its place.

```
ANTHROPIC_API_KEY      unset
ANTHROPIC_AUTH_TOKEN   unset
ant CLI                absent
~/.config/anthropic    absent
.env / .env.local      no key
provider self-report   anthropic: UNAVAILABLE
```

| Metric | Value |
|---|---|
| Real model calls | **0** |
| Model | `claude-opus-5` (configured, never invoked) |
| Total tokens | **not measured** |
| Cache usage | **not measured** |
| Total cost | **$0.00** — no calls made |
| Average latency | **not measured** |
| **Survival rate (real model)** | **NOT MEASURED** |
| Unsupported assertion rate (real model) | **NOT MEASURED** |

To run it:

```bash
export ANTHROPIC_API_KEY=...
npm run research:evaluate -- --live
```

---

## Provider audit (Objective 1)

The provider was inspected rather than replaced. Everything checks out against the current API surface:

| Aspect | Finding |
|---|---|
| Key handling | `process.env.ANTHROPIC_API_KEY`, never hardcoded; `sk-ant-` appears nowhere |
| Model | `claude-opus-5` |
| Structured output | `output_config.format` with `{ type: "json_schema", schema }` |
| Thinking | `{ type: "adaptive" }` |
| Prompt caching | `cache_control: { type: "ephemeral" }` on the system prompt |
| Refusals | `stop_reason === "refusal"` raises rather than being swallowed |
| Malformed output | Rejected, never repaired |
| Retries / timeout | SDK defaults — 2 retries, 10-minute timeout |
| Token accounting | `response.usage` captured on `lastUsage`; never estimated |

**One gap, deliberately left open.** The provider does not pass the server-side refusal `fallbacks` parameter, which is recommended for Opus-tier models so a policy decline retries on a fallback model rather than simply stopping. It was **not added**, because it is untestable API surface on a path that has never executed: a wrong beta header or parameter shape would produce a 400 on the first real run, which is worse than having no fallback. It belongs in the same session as the first live call, where it can be verified. Recorded as a Phase 7 item.

## What WAS measured

### Verifier accuracy — 10/10 (unchanged)

The ten required model-output cases still behave correctly after Phase 6's changes to the verifier. This measures the **verifier**, not any model.

### Composition ratio — the number that matters

Survival rate alone is not enough: a model scores 100% by writing *"Sikkim has monasteries."* Safe, verifiable, useless. So Phase 6 measures **composition ratio** — the share of accepted sentences drawing on more than one claim. A pure restatement engine scores **0 by definition**, because each of its sentences is exactly one claim.

Measured across all three destinations with the deterministic provider:

| Destination | Mode | Survival | Coverage | **Composition** | Redundancy | Words/sentence |
|---|---|---|---|---|---|---|
| Sikkim | HISTORICAL | 100% | 55% | **0%** | 0% | 20 |
| Sikkim | HERITAGE | 100% | 100% | **0%** | 0% | 13 |
| Sikkim | DESTINATION_OVERVIEW | 100% | 27% | **0%** | 0% | 20 |
| Jaipur | HISTORICAL | 100% | 29% | **0%** | 0% | 24 |
| Jaipur | CULTURAL | 100% | 100% | **0%** | 0% | 22 |
| Jaipur | HERITAGE | 100% | 100% | **0%** | 0% | 23 |
| Jaipur | DESTINATION_OVERVIEW | 100% | 13% | **0%** | 0% | 26 |
| Kyoto | HISTORICAL | 100% | 100% | **17%** | 0% | 24 |
| Kyoto | HERITAGE | 100% | 100% | **0%** | 0% | 25 |
| Kyoto | DESTINATION_OVERVIEW | 100% | 85% | **25%** | 0% | 25 |

**This table is the honest answer to the phase's central question.** 100% survival next to ~0% composition is precisely the "technically safe, practically useless" failure the brief warned about, and the metric catches it. The deterministic provider is a **restatement engine**, exactly as it has been labelled since Phase 3, and now there is a number proving it rather than a caveat asserting it.

(Kyoto's 17% and 25% are incidental: two claims happened to share enough entities that a sentence matched both as supporting. They are not composition.)

**Composition therefore remains unproven.** The pipeline is built for it — claim graph, narrative plan, mode-specific prompts, and a verifier that now accepts genuinely entailed transitions — but only a real model can exercise it, and no real model has run.

## Evaluation dataset

Six task shapes are covered by the five narrative modes (`scripts/research/narrative-modes.mjs`), each specifying audience, structure, allowed claim types, sentence budget and style:

| Brief task | Mode |
|---|---|
| A — Historical overview | `HISTORICAL` |
| B — Cultural overview | `CULTURAL` |
| C — Heritage story | `HERITAGE` |
| D — Tradition / festival | `STORY` |
| E — Place-focused | `HERITAGE` (categories include `places`) |
| F — Short tourism introduction | `DESTINATION_OVERVIEW` |

Practical data is excluded from every mode by the firewall, which runs before verification in the narrative path.

## Survival rate — exact definition

```
survival rate = accepted sentences / (accepted + rejected) sentences
```

Sentences carrying no checkable assertion are rejected as `no-factual-content` and **do count** in the denominator, because a sentence a model wrote that cannot be checked is a sentence that cannot be published. Purely stylistic sentences are not silently excused; the honest consequence is that a padding-heavy narrative scores lower, which is the intended signal.

Rejections are bucketed as `practical` · `unsupported` · `grounding` · `no-content` · `other`, so a low rate can be attributed rather than just observed.

## Prompt and verification versioning

Every generated block records `promptVersion` (**6.1.0**), `verificationVersion` (**6.1.0**), `model`, `mode` and `cacheKey`. This is what makes a future comparison meaningful: a survival rate is only comparable against another measured with the same prompt and the same verifier.

## Caching

Cache key covers destination, mode, provider, prompt version, verification version, and **claim id + claim text**. Verified: a second run reuses all blocks; bumping the prompt version recomposes all four modes. Including claim *text* means an edited claim invalidates rather than serving prose built from a superseded fact.

## Failure handling

A narrative below **60% supported sentences is not published at all**. A paragraph assembled from a third of its sentences is fragments with the connective tissue removed — worse than the claim list it came from. Below the threshold the destination keeps its approved claims and has no narrative: **AI is optional enrichment, and a destination must remain useful without it.**

Provider failure on one mode does not fail the job; it is recorded and the remaining modes proceed.
