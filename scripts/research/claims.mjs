/**
 * Agents 4-7 — claim extraction, evidence, validation, conflict detection.
 *
 * This is where a provider's proposals become either validated claims or
 * recorded rejections. Nothing is dropped silently: every proposal ends up in
 * the job with a status and, when rejected, a machine-readable reason. An
 * unexplained disappearance would be indistinguishable from a bug, and a
 * reviewer needs to see what the engine refused as much as what it accepted.
 *
 * The ordering is deliberate. The practical-data guard runs BEFORE evidence
 * verification, so a well-evidenced opening time is still rejected — being
 * correctly sourced does not make practical data publishable through this
 * pipeline (see docs/practical-data-policy.md).
 */

import { readFileSync } from "node:fs";

import { TIER_RANK } from "./source-registry.mjs";

import {
  claimFingerprint,
  detectPracticalData,
  stableId,
  verifyEvidenceSpan,
} from "./core.mjs";

/* =========================================================================
   SOURCE REGISTRY — read from the typed registry, not re-declared
   ========================================================================= */

let registryCache = null;

/**
 * Read source scopes out of src/data/sources.ts.
 *
 * Parsed rather than duplicated so the engine cannot disagree with the
 * application about which sources exist or what they may be cited for. The
 * scope aliases (SIKKIM / INDIA / GLOBAL) are the constants that file defines.
 */
function sourceRegistry() {
  if (registryCache) return registryCache;
  const src = readFileSync("src/data/sources.ts", "utf8");
  const out = new Map();
  for (const m of src.matchAll(/^  "([a-z0-9-]+)": \{(.*?)^  \},/gms)) {
    const [, id, block] = m;
    /*
     * Scope forms in src/data/sources.ts: the three shorthand aliases, and
     * `forDestination("id")` for destinations added since Phase 4.
     *
     * The parser originally knew only the aliases, so every Phase 4 official
     * source silently failed scope resolution and all 29 of its claims were
     * rejected as out-of-scope. The tier-1 sources were being retrieved and
     * extracted correctly the whole time; a regex that had not kept up with
     * the file it reads was discarding them. `forDestination` is handled
     * explicitly rather than by a catch-all, so an unrecognised form still
     * fails closed.
     */
    const aliased = block.match(/scope:\s*(SIKKIM|INDIA|GLOBAL)\s*,/)?.[1] ?? null;
    const perDestination = block.match(/scope:\s*forDestination\("([a-z0-9-]+)"\)/)?.[1] ?? null;
    const scope =
      aliased === "GLOBAL"
        ? { kind: "global" }
        : aliased === "INDIA"
          ? { kind: "country", countryCode: "IN" }
          : aliased === "SIKKIM"
            ? { kind: "destination", destinationId: "sikkim" }
            : perDestination
              ? { kind: "destination", destinationId: perDestination }
              : null;
    out.set(id, {
      id,
      scope,
      retrievalMethod: block.match(/retrievalMethod:\s*"([a-z-]+)"/)?.[1] ?? null,
      url: block.match(/url:\s*"([^"]+)"/)?.[1] ?? null,
    });
  }
  registryCache = out;
  return out;
}

/**
 * Mirror of sourceAppliesTo() in src/data/sources.ts.
 *
 * Structural, switching on scope kind — never matching on id, name or URL.
 * A country-scoped source fails closed when no country is supplied.
 */
export function sourceInScope(sourceId, destination) {
  const source = sourceRegistry().get(sourceId);
  if (!source || !source.scope) return false;
  switch (source.scope.kind) {
    case "global":
      return true;
    case "country":
      return Boolean(destination.country) && source.scope.countryCode === destination.country.code;
    case "destination":
      return source.scope.destinationId === destination.id;
    default:
      return false;
  }
}

export function knownSource(sourceId) {
  return sourceRegistry().has(sourceId);
}

/* =========================================================================
   AGENTS 4 + 5 — CLAIM AND EVIDENCE EXTRACTION
   ========================================================================= */

/**
 * Turn provider proposals into claims, verifying evidence as we go.
 *
 * Every proposal takes one of two paths and no third exists:
 *   - its quote is found verbatim in the document, and it becomes a claim
 *     carrying an Evidence record with a real character offset; or
 *   - it is rejected, with the reason recorded.
 *
 * There is no branch that keeps a claim whose span could not be located. That
 * is what makes fabricated evidence unrepresentable rather than discouraged:
 * a provider may assert anything, and an assertion the source does not
 * contain simply cannot acquire an Evidence record.
 */
export function extractClaims({ proposals, document, destination, task, providerName }) {
  const claims = [];
  /*
   * The same sentence can appear twice in one document — templated pages
   * repeat a blurb, and Wikivoyage restates a line under two headings. The
   * second occurrence is not a second fact, and letting it through produced
   * two records with identical ids, one validated and one rejected as a
   * duplicate of itself.
   */
  const seenInDocument = new Set();

  for (const proposal of proposals) {
    const key = String(proposal.statement ?? "").trim().toLowerCase();
    if (key && seenInDocument.has(key)) continue;
    if (key) seenInDocument.add(key);
    const base = {
      destinationId: destination.id,
      category: task.category,
      statement: String(proposal.statement ?? "").trim(),
      claimType: proposal.claimType,
      proposedBy: providerName,
      proposedAt: new Date().toISOString(),
      evidence: [],
      confidence: "unverified",
    };
    /*
     * The source id is part of the claim id.
     *
     * Without it, the same sentence extracted for the same category from two
     * documents produced the SAME id, so a validated record and a
     * duplicate-rejected record shared one identifier — and the rejection
     * read "duplicates <its own id>". Ambiguous ids break provenance: a
     * published claim id could resolve to a rejected record.
     *
     * Including the source keeps ids unique per (destination, category,
     * statement, source) while staying deterministic, so re-running over
     * unchanged sources still reproduces them.
     */
    base.id = stableId("claim", destination.id, task.category, base.statement, document.sourceId);

    /* Malformed proposals never reach the verifier. */
    if (!base.statement || !proposal.quote) {
      claims.push({ ...base, status: "rejected", rejectionReason: "malformed" });
      continue;
    }

    /* G5 FIRST. A practical claim is rejected even when perfectly evidenced —
       correct sourcing does not make an opening time publishable here. */
    const practical = detectPracticalData(base.statement);
    if (practical.practical) {
      claims.push({
        ...base,
        status: "rejected",
        rejectionReason: "practical-data",
        rejectionDetail: practical.pattern,
      });
      continue;
    }

    /* The verification that carries the whole contract. */
    const span = verifyEvidenceSpan(document.text, proposal.quote);
    if (!span) {
      claims.push({ ...base, status: "rejected", rejectionReason: "evidence-not-in-source" });
      continue;
    }

    claims.push({
      ...base,
      status: "proposed",
      evidence: [
        {
          sourceId: document.sourceId,
          quote: span.quote,
          locator: { charStart: span.charStart, charEnd: span.charEnd, url: document.url },
          evidenceType: proposal.evidenceType === "supporting-context" ? "supporting-context" : "direct-statement",
          retrievedAt: document.retrievedAt,
          contentHash: document.contentHash,
        },
      ],
    });
  }

  return claims;
}

/* =========================================================================
   AGENT 6 — VALIDATION
   ========================================================================= */

const VALID_CLAIM_TYPES = new Set(["documented history", "oral tradition", "legend", "travel story"]);

/**
 * Confidence follows source authority, not model certainty.
 *
 * A model's stated confidence describes its own state, which is not evidence
 * about the world. Tier is a property of the publisher and is what this
 * archive has always used, so it is what decides confidence here.
 */
function confidenceForTier(tier) {
  if (tier === "official-government" || tier === "official-tourism" || tier === "institutional") return "high";
  if (tier === "academic" || tier === "museum-university") return "high";
  if (tier === "encyclopedia" || tier === "reputable-publication") return "medium";
  return "unverified";
}

/**
 * Validate the full chain: CLAIM -> EVIDENCE -> SOURCE -> DESTINATION.
 *
 * Deterministic throughout. A model could be asked whether a span supports a
 * claim, and a later phase may add that as an ADDITIONAL check — but it must
 * never replace these, because a semantic judgement cannot establish that a
 * source is in scope or that a span exists.
 */
export function validateClaims({ claims, destination, documents }) {
  const byId = new Map(documents.map((d) => [d.sourceId, d]));
  const seenFingerprints = new Map();
  const out = [];

  for (const claim of claims) {
    /* Already rejected upstream — carried through, never re-examined. */
    if (claim.status === "rejected") {
      out.push(claim);
      continue;
    }

    const reject = (reason, detail) =>
      out.push({ ...claim, status: "rejected", rejectionReason: reason, ...(detail ? { rejectionDetail: detail } : {}) });

    if (!VALID_CLAIM_TYPES.has(claim.claimType)) {
      reject("malformed", `unknown claimType "${claim.claimType}"`);
      continue;
    }
    if (!claim.evidence || claim.evidence.length === 0) {
      reject("no-evidence");
      continue;
    }

    let failed = null;
    for (const ev of claim.evidence) {
      const doc = byId.get(ev.sourceId);
      if (!doc) { failed = ["unknown-source", ev.sourceId]; break; }

      /* Re-verify against the document rather than trusting the offset stored
         earlier. Cheap, and it catches a claim whose source was re-fetched
         and changed underneath it. */
      if (doc.text.slice(ev.locator.charStart, ev.locator.charEnd) !== ev.quote) {
        failed = ["evidence-not-in-source", "offset no longer matches document"];
        break;
      }
      if (ev.contentHash !== doc.contentHash) {
        failed = ["evidence-not-in-source", "source content changed since extraction"];
        break;
      }
      /* A source not registered cannot be cited at all. */
      if (!knownSource(ev.sourceId)) { failed = ["unknown-source", ev.sourceId]; break; }
      /* And a registered source must be in scope for THIS destination. */
      if (!sourceInScope(ev.sourceId, destination)) {
        failed = ["source-out-of-scope", `${ev.sourceId} is not citable for ${destination.id}`];
        break;
      }
    }
    if (failed) { reject(failed[0], failed[1]); continue; }

    /*
     * Duplicate vs. corroboration.
     *
     * The same statement arriving twice is not one thing. From the SAME
     * source it is a repeat and adds nothing. From a DIFFERENT source it is
     * independent corroboration — two publishers asserting the same fact —
     * and treating that as a duplicate was throwing away the strongest
     * signal the pipeline can produce.
     *
     * So a repeat from a new source merges its evidence into the original
     * claim and raises confidence; a repeat from the same source is still
     * rejected as a duplicate.
     */
    const fingerprint = claimFingerprint(destination.id, claim.statement);
    const priorId = seenFingerprints.get(fingerprint);
    if (priorId) {
      const prior = out.find((c) => c.id === priorId);
      const priorSources = new Set((prior?.evidence ?? []).map((e) => e.sourceId));
      const newSources = claim.evidence.filter((e) => !priorSources.has(e.sourceId));

      if (prior && newSources.length > 0) {
        prior.evidence.push(...newSources);
        prior.corroboratingSources = [...new Set(prior.evidence.map((e) => e.sourceId))];
        /* Independent agreement between two registered sources is the one
           thing that can lift a claim above its best single source. */
        if (prior.confidence !== "high" && prior.corroboratingSources.length >= 2) {
          prior.confidence = "high";
          prior.confidenceReason = `corroborated by ${prior.corroboratingSources.length} independent sources`;
        }
        reject("duplicate", `merged as corroboration into ${priorId}`);
      } else {
        reject("duplicate", `duplicates ${priorId}`);
      }
      continue;
    }
    seenFingerprints.set(fingerprint, claim.id);

    /* Confidence follows the BEST source backing the claim. */
    const tiers = claim.evidence.map((e) => byId.get(e.sourceId)?.tier);
    const best = tiers.sort((a, b) => (TIER_RANK[a] ?? 9) - (TIER_RANK[b] ?? 9))[0];
    out.push({
      ...claim,
      status: "validated",
      confidence: confidenceForTier(best),
      confidenceReason: `best supporting source tier: ${best}`,
      corroboratingSources: [...new Set(claim.evidence.map((e) => e.sourceId))],
    });
  }

  return out;
}

/* =========================================================================
   AGENT 7 — CONFLICT DETECTION
   ========================================================================= */

/**
 * Find validated claims that disagree.
 *
 * Scoped to what can be detected deterministically and stated honestly: two
 * claims about the same subject that assert different years. Broader semantic
 * contradiction needs a model and belongs in a later phase — claiming to
 * detect it with regexes would be worse than not claiming to.
 *
 * Neither claim is chosen and neither is discarded. Both are marked
 * `conflicted` and a Conflict record preserves them for a person. The archive
 * already works this way: VisitingHours distinguishes an official schedule
 * from a reported one instead of picking a winner.
 */
export function detectConflicts({ claims, destination }) {
  const validated = claims.filter((c) => c.status === "validated");
  const conflicts = [];
  const conflicted = new Map();

  /*
   * Group by subject — the named entity a claim is about.
   *
   * An earlier version took the first capitalised run, which made "The" and
   * "Built" into subjects and produced confident false positives: two
   * unrelated Kyoto sentences both starting "The" were reported as a dated
   * disagreement. A conflict report that cries wolf is worse than none,
   * because it trains a reviewer to dismiss the real ones.
   *
   * So: skip sentence-initial function words, require a multi-character
   * capitalised token, and prefer the longest capitalised phrase — which is
   * usually the proper noun the sentence is actually about.
   */
  const STOPWORDS = new Set([
    "the", "a", "an", "this", "that", "these", "those", "it", "its", "he", "she",
    "they", "built", "founded", "established", "constructed", "located", "known",
    "during", "after", "before", "in", "on", "at", "by", "from", "as", "when",
    "although", "however", "today", "later", "many", "most", "some", "several",
  ]);
  const subjectOf = (statement) => {
    const phrases = [...statement.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3})\b/g)]
      .map((m) => m[1])
      .filter((phrase) => !STOPWORDS.has(phrase.split(/\s+/)[0].toLowerCase()));
    if (phrases.length === 0) return null;
    /* Longest phrase = most specific entity. */
    phrases.sort((a, b) => b.length - a.length);
    return phrases[0].toLowerCase();
  };
  const yearsIn = (statement) => [...statement.matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)].map((m) => m[1]);

  const bySubject = new Map();
  for (const claim of validated) {
    const subject = subjectOf(claim.statement);
    const years = yearsIn(claim.statement);
    if (!subject || years.length === 0) continue;
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push({ claim, years });
  }

  for (const [subject, entries] of bySubject) {
    if (entries.length < 2) continue;
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i];
        const b = entries[j];
        const shared = a.years.some((y) => b.years.includes(y));
        if (shared) continue;
        /*
         * Same named entity, both dated, no year in common. One more guard:
         * the two claims must be making the same KIND of assertion, or
         * "founded in 1734" and "renovated in 1799" read as a contradiction
         * when they are a sequence. Approximated by requiring a shared
         * assertion verb.
         */
        const verbsOf = (t) => new Set(
          [...t.toLowerCase().matchAll(/\b(founded|built|established|constructed|completed|consecrated|opened|designated|destroyed|rebuilt)\b/g)]
            .map((m) => m[1]),
        );
        const va = verbsOf(a.claim.statement);
        const vb = verbsOf(b.claim.statement);
        if (![...va].some((v) => vb.has(v))) continue;
        const id = stableId("conflict", destination.id, a.claim.id, b.claim.id);
        conflicts.push({
          id,
          destinationId: destination.id,
          claimIds: [a.claim.id, b.claim.id],
          subject: `${subject}: conflicting years ${a.years.join("/")} vs ${b.years.join("/")}`,
          detectedAt: new Date().toISOString(),
          resolution: "unresolved",
        });
        for (const c of [a.claim, b.claim]) {
          const list = conflicted.get(c.id) ?? [];
          conflicted.set(c.id, [...list, c.id === a.claim.id ? b.claim.id : a.claim.id]);
        }
      }
    }
  }

  const marked = claims.map((c) =>
    conflicted.has(c.id) ? { ...c, status: "conflicted", conflictsWith: conflicted.get(c.id) } : c,
  );
  return { claims: marked, conflicts };
}
