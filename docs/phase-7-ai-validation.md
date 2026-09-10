# Phase 7 — AI Validation

## REAL MODEL TEST NOT EXECUTED

**Third consecutive phase.** The command was run exactly as the brief specifies:

```
$ npm run research:evaluate -- --live

LIVE MODE — measures the model
  sikkim   NOT EXECUTED — ANTHROPIC_API_KEY is not set.
  jaipur   NOT EXECUTED — ANTHROPIC_API_KEY is not set.
  kyoto    NOT EXECUTED — ANTHROPIC_API_KEY is not set.
```

Environment:

```
ANTHROPIC_API_KEY      unset
ANTHROPIC_AUTH_TOKEN   unset
ant CLI                absent
~/.config/anthropic    absent
.env / .env.local      no key
```

| Metric | Value |
|---|---|
| Model tested | **none** (`claude-opus-5` configured, never invoked) |
| Total calls | **0** |
| Input tokens | not measured |
| Output tokens | not measured |
| Cache usage | not measured |
| Latency | not measured |
| Cost | **$0.00** |
| **Survival rate** | **NOT MEASURED** |
| **Composition ratio (real model)** | **NOT MEASURED** |
| Unsupported assertion rate | not measured |
| Practical-data rejections | not measured |
| Conflict rejections | not measured |

Nothing above has been estimated, and no figure elsewhere in this repository should be read as a real-model measurement.

---

## This is now the project's central open question

Three phases of AI infrastructure have been built on an assumption that has never been tested. The verifier is measured and sound; the generator has never run. Everything downstream of "can a model write prose that clears this bar?" is unproven.

The cost of answering it is one environment variable and roughly a dollar of tokens:

```bash
export ANTHROPIC_API_KEY=...
npm run research:evaluate -- --live
```

Until then TerraStory is, accurately described, **a verification system with a placeholder generator**. That is a real and defensible thing to have built — the hard part of a source-grounded system is the verification, not the generation — but it should not be described as an AI storytelling product.

## What was measured instead

### Composition ratio — the metric that exposes the gap

Introduced in Phase 6, measured again here after the experience-layer changes. It counts accepted sentences drawing on **more than one claim**; a restatement engine scores 0 by definition.

| Destination | Modes published | Sentences | Survival | Composition |
|---|---|---|---|---|
| Sikkim | 2 | 9 | 100% | **~0%** |
| Jaipur | 3 | 15 | 100% | **~0%** |
| Kyoto | 2 | 9 | 100% | **~0%** |

100% survival beside ~0% composition is the deterministic provider behaving exactly as labelled: it restates approved claims, one per sentence. **The metric is working; the generator that would move it has not run.**

### Verifier accuracy — 10/10, unchanged

The ten required model-output cases still behave correctly. This measures the verifier, not any model, and it has now held across three phases of changes to the surrounding system.

### AI failure fallback — exercised in practice

Because no model is available, every destination page in this build renders **without generated narrative from a real model** and remains complete: approved facts, timeline, connection threads and sources all present. That is not a hypothetical fallback — it is the state the site is currently in, and it works.

## Provider status

Configuration audited in Phase 6 and unchanged: `claude-opus-5`, structured output via `output_config.format`, adaptive thinking, prompt caching on the system prompt, refusal handling, usage capture, SDK defaults of 2 retries and a 10-minute timeout.

**Still deliberately absent:** the server-side refusal `fallbacks` parameter. It remains untestable API surface on a path that has never executed, and a malformed beta header would fail the first real run. It should be added in the same session as the first live call, where it can be verified immediately.

## Rejection analysis

With the deterministic provider every sentence is a restated claim, so the rejection buckets are empty by construction — which is itself the finding. The buckets exist and are exercised by fixtures:

| Bucket | Fixture case | Behaviour |
|---|---|---|
| `practical` | "opens daily at 6am" | rejected before atom checking |
| `unsupported` | "expanded in 1984", "400 followers" | rejected on the specific atom |
| `grounding` | substantive unchecked vocabulary | rejected below 60% overlap |
| `no-content` | "It has a long and storied past." | rejected as uncheckable |
| conflict | "founded around 1710" | excluded at input, unverifiable if produced |

## Phase 8 recommendation

Obtain a key and run the live evaluation **before building anything else**. The measured composition ratio determines whether generative narrative is worth keeping at all — and if a real model scores poorly, the correct response is to improve prompting and claim packaging, not to relax the verifier.
