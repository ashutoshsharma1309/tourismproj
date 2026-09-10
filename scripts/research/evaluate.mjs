/**
 * Narrative survival-rate evaluation.
 *
 * Measures how much generated prose survives verification. Two modes, and the
 * distinction between them is the point:
 *
 *   FIXTURE MODE  — runs hand-written narratives through the verifier. This
 *     measures THE VERIFIER: does it accept what it should and reject what it
 *     should? It measures nothing about any model.
 *
 *   LIVE MODE     — runs a real provider, then measures its output. This
 *     measures THE MODEL: how often does it write supportable prose?
 *
 * Live mode requires ANTHROPIC_API_KEY. Without it the harness reports the
 * provider as UNAVAILABLE and runs fixtures only. It does not estimate what a
 * model "would have" scored, because a survival rate is a measurement and an
 * imagined one is worthless.
 *
 * THE VERIFIER IS NOT TUNED BY THIS HARNESS. If a model scores badly the
 * correct response is to report the number, not to loosen the checks. A
 * verifier adjusted until the generator passes measures nothing at all.
 */

import { createHash } from "node:crypto";

import { detectPracticalData } from "./core.mjs";
import { getProvider } from "./provider.mjs";
import { getDestination } from "./destinations.mjs";
import { excludeConflicted, splitSentences, verifyNarrative } from "./narrative.mjs";
import { planNarrative } from "./claim-graph.mjs";
import { NARRATIVE_MODES, PROMPT_VERSION, claimsForMode } from "./narrative-modes.mjs";
import { loadApproved } from "./review.mjs";

/* =========================================================================
   FIXTURES — the ten required model-output cases
   =========================================================================
   Each is prose a model plausibly produces from the claim set beneath it.
   `expect` is what SHOULD happen, so the harness reports verifier accuracy
   rather than just counting acceptances.
   ========================================================================= */

const CLAIMS = [
  { id: "e1", category: "history", claimType: "documented history", status: "validated",
    statement: "Rumtek Monastery was founded in 1966 by the sixteenth Karmapa." },
  { id: "e2", category: "history", claimType: "documented history", status: "validated",
    statement: "Rumtek Monastery is the seat of the Karma Kagyu lineage in exile." },
  { id: "e3", category: "culture", claimType: "documented history", status: "validated",
    statement: "The Losar festival marks the Tibetan new year." },
];

const CONFLICTED = [
  { id: "x1", category: "history", claimType: "documented history", status: "conflicted",
    statement: "The monastery was founded in 1700." },
  { id: "x2", category: "history", claimType: "documented history", status: "conflicted",
    statement: "The monastery was founded in 1720." },
];

export const FIXTURES = [
  { id: 1, name: "fully supported historical narrative", expect: "accept",
    text: "Rumtek Monastery was founded in 1966 by the sixteenth Karmapa. Rumtek Monastery is the seat of the Karma Kagyu lineage in exile." },
  { id: 2, name: "supported cultural narrative", expect: "accept",
    text: "The Losar festival marks the Tibetan new year." },
  { id: 3, name: "unsupported connective statement", expect: "reject",
    text: "Because of this it became a centre of learning for the whole region." },
  { id: 4, name: "unsupported date", expect: "reject",
    text: "Rumtek Monastery was founded in 1966 and was rebuilt in 1992." },
  { id: 5, name: "unsupported superlative", expect: "reject",
    text: "Rumtek Monastery is the largest monastery in the Himalayas." },
  { id: 6, name: "contains practical information", expect: "reject",
    text: "Rumtek Monastery was founded in 1966 and opens daily at 6am." },
  { id: 7, name: "uses a conflicting claim", expect: "reject",
    text: "The monastery was founded around 1710.", claims: CONFLICTED },
  { id: 8, name: "plausible hallucination", expect: "reject",
    text: "Rumtek Monastery was founded in 1966 by the sixteenth Karmapa, who had travelled from Tsurphu with 400 followers." },
  { id: 9, name: "harmless descriptive language", expect: "accept",
    text: "Rumtek Monastery is the seat of the Karma Kagyu lineage in exile." },
  { id: 10, name: "multiple claims in one sentence", expect: "accept",
    text: "Founded in 1966 by the sixteenth Karmapa, Rumtek Monastery is the seat of the Karma Kagyu lineage in exile." },
];

/** Classify why a sentence was refused, for the rejection breakdown. */
function bucket(reason) {
  if (reason === "practical-data") return "practical";
  if (reason === "unsupported-assertion") return "unsupported";
  if (reason === "no-supporting-claim") return "unsupported";
  if (reason === "insufficient-grounding") return "grounding";
  if (reason === "no-factual-content") return "no-content";
  return "other";
}

export function runFixtures() {
  const rows = [];
  let correct = 0;

  for (const f of FIXTURES) {
    const claims = f.claims ?? CLAIMS;
    /* Conflicted claims never reach generation, so the fixture sees the same
       filtered set the real pipeline would hand a model. */
    const { usable } = excludeConflicted(claims, [
      { id: "cf", claimIds: ["x1", "x2"], subject: "founding year", resolution: "unresolved" },
    ]);
    const verdict = verifyNarrative(f.text, usable);
    const outcome = verdict.accepted.length > 0 && verdict.rejected.length === 0 ? "accept" : "reject";
    const ok = outcome === f.expect;
    if (ok) correct += 1;
    rows.push({
      ...f,
      outcome, ok,
      accepted: verdict.accepted.length,
      rejected: verdict.rejected.length,
      reasons: verdict.rejected.map((r) => r.reason),
    });
  }
  return { rows, correct, total: FIXTURES.length, accuracy: correct / FIXTURES.length };
}

/* =========================================================================
   LIVE MODE
   ========================================================================= */

/**
 * Run a real provider over a destination's approved claims and measure what
 * survives. Returns null when the provider is unavailable — never a
 * fabricated result.
 */
export async function runLive({ destinationId, providerName = "anthropic" } = {}) {
  const provider = getProvider(providerName);
  if (!provider.available()) {
    return { executed: false, provider: provider.name, reason: provider.unavailableReason() };
  }

  const destination = getDestination(destinationId);
  const approved = loadApproved(destinationId);
  const conflicts = [];
  const { usable, excluded } = excludeConflicted(approved.claims ?? [], conflicts);
  if (usable.length === 0) {
    return { executed: false, provider: provider.name, reason: "no approved claims to generate from" };
  }

  /* Fingerprint of the exact claim set, so a result is comparable later. */
  const claimSetVersion = createHash("sha256")
    .update(usable.map((c) => `${c.id}:${c.statement}`).sort().join("|"))
    .digest("hex")
    .slice(0, 16);

  const metrics = {
    executed: true, provider: provider.name, destinationId,
    model: "claude-opus-5", promptVersion: PROMPT_VERSION, claimSetVersion,
    calls: 0, totalSentences: 0, accepted: 0, rejected: 0,
    rejections: { practical: 0, unsupported: 0, grounding: 0, "no-content": 0, other: 0 },
    latencyMs: [], inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    conflictExclusions: excluded.length,
    tasks: [], failures: [],
  };

  /*
   * One run per narrative mode. The modes are the six tasks the evaluation
   * asks for — introduction, historical, cultural, heritage, story, and the
   * short visitor-facing overview — and running the real pipeline rather than
   * a parallel test path means the measurement describes what would actually
   * ship.
   */
  for (const mode of Object.values(NARRATIVE_MODES)) {
    const claims = claimsForMode(usable, mode);
    if (claims.length < 2) {
      metrics.tasks.push({ task: mode.id, skipped: "fewer than two eligible claims" });
      continue;
    }
    const plan = planNarrative({ claims, mode: mode.id });
    const claimType = claims[0].claimType;

    const started = Date.now();
    let text;
    try {
      text = await provider.generateNarrative({ destination, claims, claimType, mode, plan });
      metrics.calls += 1;
    } catch (err) {
      metrics.failures.push({ task: mode.id, error: err.message });
      metrics.tasks.push({ task: mode.id, error: err.message });
      continue;
    }
    const latencyMs = Date.now() - started;
    metrics.latencyMs.push(latencyMs);

    /* Usage as reported by the API. Absent stays absent. */
    const usage = provider.lastUsage ?? null;
    if (usage) {
      metrics.inputTokens += usage.input_tokens ?? 0;
      metrics.outputTokens += usage.output_tokens ?? 0;
      metrics.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
      metrics.cacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
    }

    const verdict = verifyNarrative(text, claims);
    const total = verdict.accepted.length + verdict.rejected.length;
    metrics.totalSentences += total;
    metrics.accepted += verdict.accepted.length;
    metrics.rejected += verdict.rejected.length;
    for (const r of verdict.rejected) metrics.rejections[bucket(r.reason)] += 1;

    metrics.tasks.push({
      task: mode.id,
      claims: claims.length,
      sentences: total,
      accepted: verdict.accepted.length,
      rejected: verdict.rejected.length,
      survival: total === 0 ? null : verdict.accepted.length / total,
      latencyMs,
      usage,
      quality: measureQuality({
        accepted: verdict.accepted, rejected: verdict.rejected, availableClaims: claims.length,
      }),
      /* The refused sentences, so a low score can be explained rather than
         merely observed. */
      rejectedSentences: verdict.rejected.map((r) => ({ sentence: r.sentence, reason: r.reason, detail: r.detail })),
    });
  }

  const acceptedQuality = metrics.tasks.filter((t) => t.quality);
  metrics.survivalRate = metrics.totalSentences === 0 ? null : metrics.accepted / metrics.totalSentences;
  metrics.unsupportedRate = metrics.totalSentences === 0 ? null : metrics.rejections.unsupported / metrics.totalSentences;
  metrics.practicalRate = metrics.totalSentences === 0 ? null : metrics.rejections.practical / metrics.totalSentences;
  metrics.compositionRatio = metrics.accepted === 0
    ? null
    : acceptedQuality.reduce((n, t) => n + (t.quality.compositionRatio ?? 0) * t.accepted, 0) / metrics.accepted;
  metrics.avgLatencyMs = metrics.latencyMs.length
    ? Math.round(metrics.latencyMs.reduce((a, b) => a + b, 0) / metrics.latencyMs.length)
    : null;

  /* claude-opus-5: $5 per 1M input, $25 per 1M output. Cached reads are
     billed at roughly a tenth of input; reported separately rather than
     folded in, so the figure stays checkable. */
  metrics.estimatedCostUsd =
    metrics.inputTokens || metrics.outputTokens
      ? Number(((metrics.inputTokens / 1e6) * 5 + (metrics.outputTokens / 1e6) * 25).toFixed(4))
      : null;
  metrics.costPerNarrativeUsd =
    metrics.estimatedCostUsd !== null && metrics.calls > 0
      ? Number((metrics.estimatedCostUsd / metrics.calls).toFixed(4))
      : null;

  return metrics;
}

/**
 * Pre-flight: confirm the credential works before spending anything.
 *
 * A full evaluation is eighteen calls across three destinations. Discovering
 * a bad key on call one of eighteen is avoidable, so this makes the smallest
 * possible request first and reports exactly what came back.
 */
export async function preflight() {
  const provider = getProvider("anthropic");
  if (!provider.available()) {
    return { ok: false, stage: "credential", detail: provider.unavailableReason() };
  }
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const started = Date.now();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    });
    return {
      ok: true, stage: "complete",
      model: response.model,
      latencyMs: Date.now() - started,
      usage: response.usage ?? null,
      stopReason: response.stop_reason,
    };
  } catch (err) {
    return { ok: false, stage: "api", detail: `${err.status ?? ""} ${err.message}`.trim() };
  }
}

/* =========================================================================
   QUALITY — because survival rate alone is not enough
   =========================================================================

   A model can score 100% survival by writing "Sikkim has monasteries." Safe,
   verifiable, useless. These measures exist so that a high survival rate
   cannot be mistaken for a good narrative, and they are reported as a table
   rather than folded into a single score — a composite would hide exactly
   the trade-off a reader needs to see.
   ========================================================================= */

/**
 * Measure a narrative against the claims it was built from.
 *
 * `coverage` — what share of available claims the narrative actually used.
 *   Low coverage with high survival is the "Sikkim has monasteries" failure.
 *
 * `compositionRatio` — share of accepted sentences drawing on MORE THAN ONE
 *   claim. This is the number that separates composition from restatement: a
 *   pure restatement engine scores 0 by definition, because each of its
 *   sentences is exactly one claim.
 *
 * `redundancy` — share of sentences repeating content already stated.
 *
 * `readability` — mean words per sentence. Reported, not judged: there is no
 *   threshold here, because the right length depends on the mode.
 */
export function measureQuality({ accepted, rejected, availableClaims }) {
  const total = accepted.length + rejected.length;
  const usedClaimIds = new Set(accepted.flatMap((a) => a.claimIds ?? []));
  const multiClaim = accepted.filter((a) => (a.claimIds ?? []).length > 1).length;

  const seen = new Set();
  let repeats = 0;
  for (const a of accepted) {
    const key = String(a.sentence).toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 60);
    if (seen.has(key)) repeats += 1;
    seen.add(key);
  }

  const words = accepted.map((a) => String(a.sentence).trim().split(/\s+/).length);

  return {
    factualSupport: total === 0 ? null : accepted.length / total,
    sentenceSurvivalRate: total === 0 ? null : accepted.length / total,
    unsupportedAssertionRate: total === 0 ? null : rejected.filter((r) => r.reason === "unsupported-assertion").length / total,
    coverage: availableClaims === 0 ? null : usedClaimIds.size / availableClaims,
    compositionRatio: accepted.length === 0 ? null : multiClaim / accepted.length,
    redundancy: accepted.length === 0 ? null : repeats / accepted.length,
    readabilityWordsPerSentence: words.length === 0 ? null : Math.round(words.reduce((a, b) => a + b, 0) / words.length),
    acceptedSentences: accepted.length,
    rejectedSentences: rejected.length,
    claimsUsed: usedClaimIds.size,
    claimsAvailable: availableClaims,
  };
}

/** Practical-data firewall check over any generated text. */
export function firewallCheck(text) {
  return splitSentences(text).map((s) => ({ sentence: s, practical: detectPracticalData(s).practical }));
}
