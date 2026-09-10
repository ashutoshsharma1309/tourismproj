# Phase 9 — Live Model Results

## 1. API status — LIVE MODEL UNAVAILABLE

**Fifth consecutive phase.** Checked through the project's documented configuration paths only, as the brief specifies — no rummaging outside them.

```
process.env.ANTHROPIC_API_KEY      unset
process.env.ANTHROPIC_AUTH_TOKEN   unset
.env / .env.local                  no ANTHROPIC entry

$ npm run research:evaluate -- --preflight
PRE-FLIGHT
  BLOCKED at credential: ANTHROPIC_API_KEY is not set.

$ npm run research:evaluate -- --live
  sikkim   NOT EXECUTED
  jaipur   NOT EXECUTED
  kyoto    NOT EXECUTED
```

## 2–10. Measurements

| # | Metric | Value |
|---|---|---|
| 2 | Model | **none invoked** (`claude-opus-5` configured) |
| 3 | Total calls | **0** |
| 4 | Input tokens | not measured |
| 5 | Output tokens | not measured |
| 6 | Cached tokens | not measured |
| 7 | Cost | **$0.00** |
| 8 | Latency | not measured |
| 9 | **Survival rate** | **NOT MEASURED** |
| 10 | **Composition ratio** | **NOT MEASURED** |
| 11 | Unsupported assertion rate | not measured |
| 12 | Practical-data rejection rate | not measured |
| 13 | Conflict rejection rate | not measured |

**Nothing simulated, nothing estimated.** The deterministic provider's figures (100% survival, ~0% composition) are a property of a restatement engine and appear nowhere as model performance.

## 11. Adversarial results

Ten cases (A–J) run against **the verifier**, using prose a model plausibly produces. These measure the verifier's decision boundary, not any model.

| Case | Input | Result |
|---|---|---|
| A | Unsupported historical date ("completed in 1734") | rejected |
| B | Unsupported number ("over 20,000 workers") | rejected |
| C | Unsupported superlative ("most celebrated") | rejected |
| D | Unsupported causal link ("which shaped the traditions") | rejected |
| E | Unsupported present-tense claim ("today it remains") | rejected |
| F | Practical information ("opens daily at 8am") | rejected by firewall |
| G | Conflicting claims | excluded at input; compromise unverifiable |
| H | Plausible unsupported cultural statement | rejected |
| I | Engaging transition, all facts supported | **accepted** |
| J | Multi-claim synthesis, all facts supported | **accepted** |

I and J are the pair that matters: style and synthesis are free; the moment either carries a fact the claims do not, it is refused.

## 12. Narrative quality

Measured on published output, all from the deterministic provider:

| Destination | Blocks | Sentences | Survival | Composition | Redundancy |
|---|---|---|---|---|---|
| Sikkim | 2 | 9 | 100% | ~0% | 0% |
| Jaipur | 3 | 15 | 100% | ~0% | 0% |
| Kyoto | 2 | 9 | 100% | ~0% | 0% |

100% survival beside ~0% composition is the signature of restatement. The metric is doing its job on a generator that is not composing — and cannot say anything about one that might.

## 13–15. Destination results

| | Depth | Basis | Facts | Timeline | Threads | Sources | claimSetVersion |
|---|---|---|---|---|---|---|---|
| **Sikkim** | deep | declared | 16 | 9 | 2 | 2 | `79e8bb58df397508` |
| **Jaipur** | curated | earned | 35 | 22 | 8 | 4 | `d8c89d5b15d1781e` |
| **Kyoto** | researched | earned | 15 | 7 | 4 | 3 | `9c561e7bde377ca7` |

`claimSetVersion` is new in Phase 9 (Objective 5): a fingerprint of the exact approved claim set an output was built from. Without it a survival rate recorded today could not be compared against one recorded later, because the input may have changed underneath.

## 16. Fallback results

Phase 8 injected ten provider failure modes (auth, rate limit, timeout, refusal, 503, network, malformed, empty, null, wrong type) — 40 checks, all passing — and demonstrated end-to-end that removing all narrative leaves every destination returning 200 with facts, timeline, threads and sources intact.

**The remaining untested piece is unchanged:** the server-side refusal `fallbacks` request parameter needs a real API round-trip. Objective 8 conditions it on the provider executing successfully, which has not happened. Still not built.

## 17. Publication decision

**AI NOT PUBLISHED.** Full reasoning: `phase-9-ai-publication-decision.md`.

## 18. Remaining limitations

- **The generator is unmeasured.** Five phases of infrastructure around a model that has never produced a sentence.
- **The server-side refusal fallback is unverified**, by design.
- **Composition is unproven.** The pipeline is built for it — claim graph, plan, modes, entailment-aware verifier — and nothing has exercised it.
- **Sikkim's research remains encyclopedia-tier**; its `deep` badge comes entirely from the curated archive.
- **The contradiction guard is narrow**: a named subject and a differing founding year. Broader semantic contradiction needs a model, and regex-based detection of it would be worse than none.

## What Phase 9 changed

Three real gaps, all closed:

1. **Curated-content contradiction guard** — required by several briefs, never implemented. Now parses the 15 curated monastery records, blocks contradicting claims from publication, and surfaces the disagreement to the reviewer rather than deleting it.
2. **`claimSetVersion`** — required by Objective 5, absent. Now recorded on every published destination.
3. **`ANTHROPIC_API_KEY` undocumented** in `.env.example`. The project's own configuration file did not mention the variable that has blocked five phases. It now does.

Plus: the live harness now runs the real pipeline across all five narrative modes and records every metric Objective 5 lists, and `--preflight` confirms a credential works before an eighteen-call evaluation discovers it does not.
