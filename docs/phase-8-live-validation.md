# Phase 8 — Live AI Validation and Provider Resilience

## LIVE MODEL: NOT EXECUTED

**Fourth consecutive phase.** The command was run exactly as specified, and the failure was diagnosed rather than assumed.

```
$ npm run research:evaluate -- --live

LIVE MODE — measures the model
  sikkim   NOT EXECUTED — ANTHROPIC_API_KEY is not set.
  jaipur   NOT EXECUTED — ANTHROPIC_API_KEY is not set.
  kyoto    NOT EXECUTED — ANTHROPIC_API_KEY is not set.
```

### Diagnosis — is this a configuration bug or an absent credential?

Objective 1 required diagnosing the actual issue rather than falling back silently. The SDK was exercised directly:

```
SDK loads:                true
client constructed:       true
apiKey resolved by SDK:   NO — no credential source found
```

Credential discovery, exhaustively:

| Source | Result |
|---|---|
| `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `CLAUDE_API_KEY` | unset |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_PROFILE` | unset |
| `ant` CLI | not installed |
| `~/.config/anthropic`, `~/.anthropic`, `~/.claude/.credentials.json` | absent |
| `~/.zshrc`, `~/.zprofile`, `~/.bashrc`, `~/.bash_profile` | no key |
| `.env`, `.env.local`, `.env.production` | no key |

**The provider gate is behaving correctly. There is no credential to use.** The SDK constructs fine and resolves no key from any of its documented sources.

### Measurements that therefore do not exist

| Metric | Value |
|---|---|
| Model used | **none** (`claude-opus-5` configured, never invoked) |
| API status | reachable, unauthenticated — never called |
| Total calls | **0** |
| Input / output / cached tokens | **not measured** |
| Total cost | **$0.00** |
| Average latency | **not measured** |
| **Survival rate (real model)** | **NOT MEASURED** |
| **Composition ratio (real model)** | **NOT MEASURED** |
| Unsupported assertion rate (real model) | **NOT MEASURED** |
| Practical-data rejection rate (real model) | **NOT MEASURED** |
| Conflict rejection rate (real model) | **NOT MEASURED** |

Nothing has been estimated or simulated. The deterministic provider's figures (100% survival, ~0% composition) appear nowhere in this document as model performance — they are a property of a restatement engine and are reported as such.

---

## What this phase did instead: proved the failure path

Phase 8's Objective 6 says to implement refusal and error fallbacks **only in the session where the live provider is exercised**, and not to build speculative infrastructure. That splits cleanly:

| Failure mode | Testable without a key? | Action |
|---|---|---|
| Authentication failure | **Yes** — inject a 401 | Built + tested |
| Rate limit (429) | **Yes** | Built + tested |
| Timeout | **Yes** | Built + tested |
| Provider refusal | **Yes** | Built + tested |
| API unavailable (503) | **Yes** | Built + tested |
| Network failure | **Yes** | Built + tested |
| Malformed structured output | **Yes** | Built + tested |
| Unexpected response (empty / null / wrong type) | **Yes** | Built + tested |
| **Server-side `fallbacks` request parameter** | **No** — needs a real API round-trip | **Not built**, per the brief |

### Fault injection, not source inspection

Earlier phases asserted failure handling by checking a `catch` block existed. That proves the code was written, not that the page survives. `runNarrativeJob` now accepts an injectable provider **for testing only**, and `qa:resilience` makes each failure actually happen.

**Ten fault modes × four assertions = 40 checks, all passing:**

| Fault | Completes without throwing | Publishes nothing | Records a reason | Claims intact |
|---|---|---|---|---|
| auth · ratelimit · timeout · refusal · unavailable · network · malformed · empty · null · wrongtype | ✓ | ✓ | ✓ | ✓ (35 claims) |

**One real hardening came out of this.** A provider returning `null`, `""` or a number previously reached `verifyNarrative()` and produced zero sentences — indistinguishable from a model that simply had nothing to say. Those are different problems and a reviewer needs to know which occurred, so an unexpected response type is now an explicit `provider-failure`.

### The end-to-end proof: total AI failure

The strongest available test of "AI failure does not break the website" is to remove all AI output and render the site.

Narrative was withdrawn entirely and the site republished and rebuilt:

```
sikkim   narrative 0 block(s)
jaipur   narrative 0 block(s)
kyoto    narrative 0 block(s)
build: PASS (286/286)
```

| Destination | HTTP | Facts | Timeline | Threads | Sources | Page length |
|---|---|---|---|---|---|---|
| Sikkim | **200** | ✓ | ✓ | ✓ | ✓ | 5,458 chars |
| Jaipur | **200** | ✓ | ✓ | ✓ | ✓ | 13,491 chars |
| Kyoto | **200** | ✓ | ✓ | ✓ | ✓ | 6,827 chars |

**AI is enrichment, not dependency — demonstrated, not claimed.** Narrative was then restored and the published output verified identical apart from `verifiedAt` timestamps on regenerated blocks.

## Adversarial cases A–F

These measure **the verifier's** response to prose a model plausibly produces. They are not measurements of a model; no model ran.

| Test | Case | Result |
|---|---|---|
| **A** | Historical narrative with an invented detail ("over 20,000 workers") | **rejected** — unsupported number |
| **B** | Unsupported causal link ("which shaped the city's traditions") | **rejected** — causal relationship |
| **C** | A date absent from the claims ("completed in 1734") | **rejected** — unsupported year |
| **D** | Tourism prose with opening hours | **rejected** — practical-data firewall |
| **E** | Conflicting claims | **excluded at input**; compromise ("around 1596") unverifiable |
| **F** | Engaging restructuring, nothing added | **accepted** |
| **F** | Engaging style plus a flourish ("most celebrated of India's planned cities") | **rejected** — superlative |

TEST F is the pair that matters: style may improve freely, and the moment style carries a fact the claims do not, it is refused.

## Metric definitions, asserted

`qa:resilience` verifies the metrics compute as documented rather than trusting the implementation:

- **Survival rate** = accepted / (accepted + rejected). Verified 2/3 on a known set. The denominator is not manipulated — a sentence carrying factual claims is evaluated, and one carrying nothing checkable still counts as unpublishable.
- **Composition ratio** = accepted sentences citing >1 claim / accepted. Verified 1/2 on a known set.
- **Unsupported assertion rate** reported separately, verified 1/3.
- **Coverage** = distinct claims used / claims available.

## Secret hygiene

`qa:resilience` scans every `.mjs`, `.ts`, `.tsx`, `.md` and `.json` under `scripts/`, `docs/` and `src/` for an API key pattern. **Zero occurrences.** The key is read only from `process.env`, never printed, never written to generated documentation.

## Regression

| Check | Result |
|---|---|
| Depth unchanged by any of this | deep / curated / researched |
| Sikkim curated records untouched | ✓ |
| Search grouped by owning destination | ✓ |
| Destination scope still the default | ✓ |
| Current-destination ranking in global search | ✓ |
| No practical data on any published surface | ✓ |
| Generation cannot run during a page render | ✓ |
| Content counts vs. baseline | 180 audio / 12 languages / 347 images — unchanged |

## What is still unknown

**Everything about the generator.** Four phases have built verification, planning, modes, provenance, caching, resilience and an experience layer around a model that has never produced a sentence. The verifier is measured and sound; the thing it exists to check has not run.

The accurate description of TerraStory today remains: **a verification system with a placeholder generator, and a demonstrated-safe failure path.** That is a genuinely strong position — the hard half of a source-grounded product is the verification — but it is not "AI-generated tourism storytelling", and should not be presented as such.

## Recommended Phase 9

1. **Obtain a key. Run `npm run research:evaluate -- --live`.** Nothing else in this project is worth building first.
2. **In that same session**, add the server-side refusal `fallbacks` parameter and verify it against the real API — the one failure mode still unproven.
3. Read the measured composition ratio. If a real model composes well, the experience layer is ready for it. If it does not, fix prompting, claim packaging and planning — **never the verifier**.
