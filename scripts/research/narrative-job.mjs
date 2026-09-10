/**
 * Narrative generation as a job.
 *
 * Runs from a terminal, reads ONLY approved knowledge, writes verified blocks
 * to .data/research/narrative/. Never invoked during a page render, and never
 * reads the raw research directory — a narrative can only be built from claims
 * a person approved.
 *
 * The order of operations is the safety property:
 *
 *   approved claims → exclude conflicted → generate → verify each sentence →
 *   assemble from survivors → store
 *
 * Conflicted claims are excluded at the INPUT, so a disputed date is never in
 * the prompt for the model to average, choose between, or hedge into "around
 * 1710". Excluding at input is stronger than filtering output.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createHash } from "node:crypto";

import { getDestination } from "./destinations.mjs";
import { planNarrative } from "./claim-graph.mjs";
import { NARRATIVE_MODES, PROMPT_VERSION, claimsForMode } from "./narrative-modes.mjs";
import { getProvider } from "./provider.mjs";
import { loadApproved } from "./review.mjs";
import { assembleBlock, excludeConflicted, verifyNarrative } from "./narrative.mjs";
import { measureQuality } from "./evaluate.mjs";
import { listJobFiles, JOBS_DIR } from "./review.mjs";

const NARRATIVE_DIR = join(process.cwd(), ".data", "research", "narrative");

const dir = () => {
  if (!existsSync(NARRATIVE_DIR)) mkdirSync(NARRATIVE_DIR, { recursive: true });
  return NARRATIVE_DIR;
};

/** Conflicts recorded across this destination's research jobs. */
function conflictsFor(destinationId) {
  const out = [];
  for (const file of listJobFiles()) {
    try {
      const r = JSON.parse(readFileSync(join(JOBS_DIR, file), "utf8"));
      if (r.job.destinationId !== destinationId) continue;
      for (const k of r.knowledge ?? []) out.push(...(k.conflicts ?? []));
    } catch {
      /* An unreadable job contributes no conflicts; the review queue reports it. */
    }
  }
  return out;
}

export function loadNarrative(destinationId) {
  const path = join(dir(), `${destinationId}.json`);
  if (!existsSync(path)) return { destinationId, blocks: [], rejected: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { destinationId, blocks: [], rejected: [] };
  }
}

/**
 * Generate and verify narrative for one destination.
 *
 * Returns both what survived and what was refused. The rejections are the
 * interesting half: they are the record of what a model tried to assert
 * without support, and discarding them silently would hide exactly the
 * behaviour this phase exists to control.
 */
/**
 * Cache key for one composition.
 *
 * Covers everything that could change the output: the claim set (by id AND
 * statement, so an edited claim invalidates), the mode, the model/provider,
 * the prompt version and the verification version. Any change to one of them
 * is a different narrative and must not be served from cache.
 */
function narrativeCacheKey({ destinationId, mode, claims, provider }) {
  const claimPart = claims
    .map((c) => `${c.id}:${c.statement}`)
    .sort()
    .join("|");
  return createHash("sha256")
    .update([destinationId, mode.id, provider, PROMPT_VERSION, VERIFICATION_VERSION, claimPart].join("::"))
    .digest("hex")
    .slice(0, 24);
}

/** Bumped whenever the verifier's decision boundary changes. */
export const VERIFICATION_VERSION = "6.1.0";

/**
 * A narrative falling below this share of supported sentences is not
 * published at all.
 *
 * A paragraph assembled from the third of its sentences that survived is not
 * prose — it is fragments with the connective tissue removed, and it reads
 * worse than the claim list it came from. Below the threshold the destination
 * keeps its approved claims and simply has no narrative: AI is optional
 * enrichment, and a destination must remain useful without it.
 */
export const MIN_SURVIVAL_TO_PUBLISH = 0.6;

export async function runNarrativeJob({
  destinationId, providerName = "auto", force = false, onProgress = () => {},
  /*
   * Injectable provider, for fault-injection testing only.
   *
   * The failure modes that matter here — auth rejected, rate limited, timed
   * out, refused, malformed output — cannot be produced on demand from a real
   * API, and asserting on a `catch` block by reading the source proves
   * nothing about what actually happens to the page. This lets the test suite
   * make each failure occur and observe the result.
   *
   * Production callers pass `providerName` and never this.
   */
  provider: injectedProvider = null,
} = {}) {
  const destination = getDestination(destinationId);
  const provider = injectedProvider ?? getProvider(providerName);
  if (!provider.available()) {
    throw new Error(`Provider "${provider.name}" unavailable: ${provider.unavailableReason()}`);
  }

  const approved = loadApproved(destinationId);
  if (approved.claims.length === 0) {
    return {
      destinationId, provider: provider.name, generatedAt: new Date().toISOString(),
      blocks: [], rejected: [],
      note: "No approved claims. Narrative generation requires reviewer approval first.",
    };
  }

  const conflicts = conflictsFor(destinationId);
  const { usable, excluded } = excludeConflicted(approved.claims, conflicts);

  const previous = force ? { blocks: [] } : loadNarrative(destinationId);
  const cachedByKey = new Map((previous.blocks ?? []).map((b) => [b.cacheKey, b]));

  const blocks = [];
  const rejected = [];
  const modeReports = [];
  let cacheHits = 0;

  for (const mode of Object.values(NARRATIVE_MODES)) {
    const modeClaims = claimsForMode(usable, mode);
    /* A mode with too little to say produces nothing rather than a sentence
       of padding. */
    if (modeClaims.length < 2) continue;

    const cacheKey = narrativeCacheKey({ destinationId, mode, claims: modeClaims, provider: provider.name });
    const cached = cachedByKey.get(cacheKey);
    if (cached) {
      cacheHits += 1;
      blocks.push(cached);
      modeReports.push({ mode: mode.id, cached: true, sentences: cached.sentenceCount, survival: cached.survivalRate });
      onProgress({ stage: "cache", message: `${mode.id}: reused` });
      continue;
    }

    /* The plan is derived deterministically; the model composes from it. */
    const plan = planNarrative({ claims: modeClaims, mode: mode.id });
    const claimType = modeClaims[0].claimType;

    onProgress({ stage: "compose", message: `${mode.id} from ${modeClaims.length} claim(s)` });
    let text;
    const startedAt = Date.now();
    try {
      text = await provider.generateNarrative({
        destination, claims: modeClaims, claimType, mode, plan,
      });
      /*
       * An unexpected provider response is a failure, not content. A provider
       * returning null, a number, or an empty string used to reach
       * verifyNarrative() and produce zero sentences, which was indistinguish-
       * able from a model that simply had nothing to say. They are different
       * problems and a reviewer needs to see which occurred.
       */
      if (typeof text !== "string" || text.trim().length === 0) {
        throw new Error(`Provider returned ${text === null ? "null" : typeof text} instead of narrative text`);
      }
    } catch (err) {
      rejected.push({ mode: mode.id, sentence: null, reason: "provider-failure", detail: err.message });
      modeReports.push({ mode: mode.id, error: err.message });
      continue;
    }
    const latencyMs = Date.now() - startedAt;

    /* THE BOUNDARY — unchanged, and independent of everything above. */
    const verdict = verifyNarrative(text, modeClaims);
    const total = verdict.accepted.length + verdict.rejected.length;
    const survivalRate = total === 0 ? 0 : verdict.accepted.length / total;

    onProgress({ stage: "verify", message: `${mode.id}: ${verdict.accepted.length}/${total} sentences verified` });
    for (const r of verdict.rejected) rejected.push({ mode: mode.id, ...r });

    modeReports.push({
      mode: mode.id, cached: false, claims: modeClaims.length,
      sentences: total, accepted: verdict.accepted.length, survival: survivalRate,
      latencyMs, usage: provider.lastUsage ?? null,
      quality: measureQuality({
        accepted: verdict.accepted, rejected: verdict.rejected, availableClaims: modeClaims.length,
      }),
    });

    if (survivalRate < MIN_SURVIVAL_TO_PUBLISH) {
      rejected.push({
        mode: mode.id, sentence: null, reason: "below-survival-threshold",
        detail: `${Math.round(survivalRate * 100)}% supported, needs ${Math.round(MIN_SURVIVAL_TO_PUBLISH * 100)}%`,
      });
      continue;
    }

    const block = assembleBlock({
      accepted: verdict.accepted, category: mode.categories[0], claimType,
      destinationId, generatedBy: provider.name,
    });
    if (!block) continue;

    blocks.push({
      ...block,
      mode: mode.id,
      cacheKey,
      promptVersion: PROMPT_VERSION,
      verificationVersion: VERIFICATION_VERSION,
      model: provider.name,
      survivalRate,
      /* Per-sentence provenance, kept internally for audit. Never rendered. */
      sentences: verdict.accepted.map((a, i) => ({
        sentenceId: `${block.id}_s${i}`,
        text: a.sentence,
        claimIds: a.claimIds,
        evidenceIds: a.claimIds.flatMap((id) => {
          const c = modeClaims.find((x) => x.id === id);
          return (c?.evidence ?? []).map((e) => `${e.sourceId}@${e.locator.charStart}-${e.locator.charEnd}`);
        }),
        sourceIds: [...new Set(a.claimIds.flatMap((id) => {
          const c = modeClaims.find((x) => x.id === id);
          return (c?.evidence ?? []).map((e) => e.sourceId);
        }))],
        destinationId,
        verified: true,
      })),
    });
  }

  /*
   * Cross-block redundancy.
   *
   * Modes overlap by design — DESTINATION_OVERVIEW and HISTORICAL both draw
   * on the same dated claims — and without this a reader met the same
   * sentence twice on one page, once in the introduction and again under
   * "History". The per-block redundancy metric could not see it, because
   * within each block the sentences were distinct.
   *
   * Blocks are processed in mode order, so the introduction keeps the
   * sentence and later sections lose the repeat. A block emptied by this is
   * dropped rather than rendered as a heading with nothing under it.
   */
  const seenSentences = new Set();
  const deduped = [];
  let sentencesDropped = 0;
  for (const block of blocks) {
    const kept = (block.sentences ?? []).filter((sentence) => {
      const key = sentence.text.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      if (seenSentences.has(key)) {
        sentencesDropped += 1;
        return false;
      }
      seenSentences.add(key);
      return true;
    });
    if (kept.length === 0) continue;
    deduped.push({
      ...block,
      sentences: kept,
      text: kept.map((k) => k.text).join(" "),
      sentenceCount: kept.length,
      claimIds: [...new Set(kept.flatMap((k) => k.claimIds))],
    });
  }
  blocks.length = 0;
  blocks.push(...deduped);

  const totalSentences = modeReports.reduce((n, m) => n + (m.sentences ?? 0), 0);
  const totalAccepted = modeReports.reduce((n, m) => n + (m.accepted ?? m.sentences ?? 0), 0);

  const payload = {
    destinationId,
    provider: provider.name,
    promptVersion: PROMPT_VERSION,
    verificationVersion: VERIFICATION_VERSION,
    generatedAt: new Date().toISOString(),
    blocks, rejected, modeReports,
    excludedForConflict: excluded.map((c) => ({ id: c.id, statement: c.statement })),
    stats: {
      approvedClaims: approved.claims.length,
      usableClaims: usable.length,
      excludedForConflict: excluded.length,
      modesAttempted: modeReports.length,
      cacheHits,
      blocksPublished: blocks.length,
      sentencesAccepted: blocks.reduce((n, b) => n + b.sentenceCount, 0),
      sentencesRejected: rejected.filter((r) => r.sentence).length,
      sentencesDeduplicated: sentencesDropped,
      overallSurvivalRate: totalSentences === 0 ? null : totalAccepted / totalSentences,
    },
  };

  writeFileSync(join(dir(), `${destinationId}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export { NARRATIVE_DIR };
