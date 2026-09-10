/**
 * The publisher — approved knowledge to application data.
 *
 * The last gate before machine-derived content becomes something a visitor
 * reads. Four properties define it:
 *
 *   DETERMINISTIC. The same approved input always yields the same output.
 *     No model is consulted. A model does not choose what is published, does
 *     not rank claims, and does not write anything here. Publication is a
 *     filter, not a judgement.
 *
 *   APPROVED-ONLY. It reads .data/research/approved/ and nothing else. Raw
 *     research, pending claims, rejected claims and conflicted claims are not
 *     inputs — not filtered out later, simply never read.
 *
 *   RE-VERIFIED. Every claim is checked again at this boundary: evidence
 *     present, span still matching, source registered and in scope, no
 *     practical data. A claim approved last week whose source changed since
 *     does not ride through on the strength of the old decision.
 *
 *   TRACEABLE. Every published fact keeps its claim id, evidence span,
 *     source id, tier and URL, so a reader can be walked back from a sentence
 *     on a page to the document it came from.
 *
 * Output goes to src/data/generated/published-knowledge.json — build-time
 * data, the same convention every other agent in this project uses. That
 * means published knowledge is prerendered into static pages and the
 * application never reads .data/ at request time.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { detectPracticalData } from "./core.mjs";
import { knownSource, sourceInScope } from "./claims.mjs";
import { getDestination, listDestinations } from "./destinations.mjs";
import { assessDepth, reconcileDepth } from "./depth.mjs";
import { loadApproved, JOBS_DIR } from "./review.mjs";
import { loadNarrative } from "./narrative-job.mjs";
import { buildClaimGraph, yearsIn } from "./claim-graph.mjs";
import { curatedFacts, findContradictions } from "./curated-guard.mjs";

const OUT_FILE = join(process.cwd(), "src", "data", "generated", "published-knowledge.json");

/** Source metadata for attribution, gathered from the jobs that retrieved it. */
function sourceIndex(destinationId) {
  const index = new Map();
  if (!existsSync(JOBS_DIR)) return index;
  for (const file of readdirSync(JOBS_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const r = JSON.parse(readFileSync(join(JOBS_DIR, file), "utf8"));
      if (r.job.destinationId !== destinationId) continue;
      for (const d of r.documents ?? []) {
        index.set(d.sourceId, {
          sourceId: d.sourceId,
          title: d.title,
          publisher: d.publisher ?? null,
          url: d.url,
          tier: d.tier,
          type: d.type,
          retrievedAt: d.retrievedAt,
          text: d.text,
          contentHash: d.contentHash,
        });
      }
    } catch {
      /* An unreadable job contributes no sources; its claims then fail
         re-verification below rather than publishing unbacked. */
    }
  }
  return index;
}

/**
 * Re-verify one approved claim at the publication boundary.
 *
 * Returns null when the claim may publish, or a reason when it may not.
 * Deliberately repeats checks the approval gate already made: approval is a
 * point-in-time decision about a source that can change afterwards.
 */
function publicationBlocker(claim, sources, destination, curated = []) {
  if (claim.status !== "validated") return `status is ${claim.status}`;

  /*
   * Never overwrite the curated archive.
   *
   * A research claim asserting a different founding year for a monastery the
   * archive already records is blocked from publication and surfaced for a
   * curator. The curated record was verified by a person against a cited
   * source; this one was not. The disagreement is preserved rather than
   * resolved automatically.
   */
  const contradictions = findContradictions(claim, curated);
  if (contradictions.length > 0) return `contradicts curated content — ${contradictions[0].detail}`;
  if (!claim.evidence || claim.evidence.length === 0) return "no evidence";
  if (detectPracticalData(claim.statement).practical) return "practical travel data";

  for (const ev of claim.evidence) {
    if (!knownSource(ev.sourceId)) return `source ${ev.sourceId} is not registered`;
    if (!sourceInScope(ev.sourceId, destination)) return `source ${ev.sourceId} is out of scope`;
    const doc = sources.get(ev.sourceId);
    if (!doc) return `source document ${ev.sourceId} unavailable`;
    if (doc.contentHash !== ev.contentHash) return `source ${ev.sourceId} changed since approval`;
    if (doc.text.slice(ev.locator.charStart, ev.locator.charEnd) !== ev.quote) {
      return `evidence span no longer matches ${ev.sourceId}`;
    }
  }
  return null;
}

/**
 * Build the published knowledge for one destination.
 *
 * Categories with no publishable claims are omitted entirely rather than
 * emitted empty — a destination that has not been researched for festivals
 * has no festivals section, not a section saying so.
 */
export function publishDestination(destinationId) {
  const destination = getDestination(destinationId);
  const approved = loadApproved(destinationId);
  const sources = sourceIndex(destinationId);

  const published = [];
  const withheld = [];
  const curated = curatedFacts(destinationId);

  for (const claim of approved.claims ?? []) {
    const blocker = publicationBlocker(claim, sources, destination, curated);
    if (blocker) {
      withheld.push({ claimId: claim.id, reason: blocker });
      continue;
    }
    published.push({
      id: claim.id,
      category: claim.category,
      statement: claim.statement,
      claimType: claim.claimType,
      confidence: claim.confidence,
      approvedBy: claim.approvedBy,
      approvedAt: claim.approvedAt,
      /* Attribution travels with the fact. */
      sources: claim.evidence.map((ev) => {
        const doc = sources.get(ev.sourceId);
        return {
          sourceId: ev.sourceId,
          title: doc?.title ?? ev.sourceId,
          publisher: doc?.publisher ?? null,
          url: doc?.url ?? ev.locator.url,
          tier: doc?.tier ?? null,
          quote: ev.quote,
          retrievedAt: ev.retrievedAt,
        };
      }),
    });
  }

  /* Group into categories, omitting empty ones. */
  const byCategory = new Map();
  for (const claim of published) {
    if (!byCategory.has(claim.category)) byCategory.set(claim.category, []);
    byCategory.get(claim.category).push(claim);
  }

  /* Narrative: only blocks whose cited claims all survived publication. */
  const narrative = loadNarrative(destinationId);
  const publishedIds = new Set(published.map((c) => c.id));
  const narrativeBlocks = [];
  const withheldNarrative = [];
  for (const block of narrative.blocks ?? []) {
    const missing = (block.claimIds ?? []).filter((id) => !publishedIds.has(id));
    if (missing.length > 0 || (block.claimIds ?? []).length === 0) {
      withheldNarrative.push({ blockId: block.id, reason: missing.length ? `cites unpublished claims` : "cites nothing" });
      continue;
    }
    if (detectPracticalData(block.text).practical) {
      withheldNarrative.push({ blockId: block.id, reason: "practical travel data" });
      continue;
    }
    narrativeBlocks.push({
      id: block.id,
      mode: block.mode ?? null,
      category: block.category,
      claimType: block.claimType,
      text: block.text,
      claimIds: block.claimIds,
      sentenceCount: block.sentenceCount,
      generatedBy: block.generatedBy,
      verifiedAt: block.verifiedAt,
    });
  }

  /* ---------------------------------------------------------------------
     TIMELINE — dated facts, in order, each carrying its own provenance.

     Built only from published claims that actually carry a year. Nothing is
     interpolated: a period with no sourced fact simply has no entry, which
     is why a destination's timeline can have gaps and should.
     --------------------------------------------------------------------- */
  const timeline = published
    .map((claim) => {
      const years = yearsIn(claim.statement);
      if (years.length === 0) return null;
      return {
        claimId: claim.id,
        year: Math.min(...years),
        /* The span, when a claim names two dates. */
        endYear: years.length > 1 ? Math.max(...years) : null,
        title: claim.statement,
        category: claim.category,
        claimType: claim.claimType,
        sources: claim.sources.map((s) => ({ title: s.title, publisher: s.publisher, url: s.url })),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year || a.claimId.localeCompare(b.claimId));

  /* ---------------------------------------------------------------------
     CONNECTIONS — relationships a reader can follow, and only ones the
     claims themselves establish.

     Derived from the same claim graph the narrative planner uses, filtered
     to the two kinds a visitor can actually act on: two facts about the same
     named subject, and two facts whose dates put them in sequence. Category
     and source edges are useful internally and are not surfaced — "these
     share a publisher" is not a discovery.
     --------------------------------------------------------------------- */
  const graph = buildClaimGraph(published.map((c) => ({ ...c, evidence: [] })));
  const byClaimId = new Map(published.map((c) => [c.id, c]));
  const connections = graph.edges
    .filter((e) => e.kind === "shares-entity")
    .map((e) => ({
      subject: e.because,
      claimIds: [e.from, e.to],
      statements: [byClaimId.get(e.from)?.statement, byClaimId.get(e.to)?.statement].filter(Boolean),
    }))
    /* One entry per subject, gathering everything said about it. */
    .reduce((acc, edge) => {
      const key = edge.subject.split(",")[0].trim();
      const existing = acc.find((a) => a.subject === key);
      if (existing) {
        for (const id of edge.claimIds) if (!existing.claimIds.includes(id)) existing.claimIds.push(id);
      } else {
        acc.push({ subject: key, claimIds: [...edge.claimIds] });
      }
      return acc;
    }, [])
    .filter((c) => c.claimIds.length > 1)
    .map((c) => ({
      subject: c.subject,
      claimIds: c.claimIds,
      statements: c.claimIds.map((id) => byClaimId.get(id)?.statement).filter(Boolean),
    }))
    .sort((a, b) => b.claimIds.length - a.claimIds.length || a.subject.localeCompare(b.subject))
    /* A page showing sixty "subjects" is a database dump; the strongest few
       are what a reader can follow. */
    .slice(0, 8);

  const tiers = Object.fromEntries([...sources.values()].map((s) => [s.sourceId, s.tier]));
  const earned = assessDepth({ approvedClaims: approved.claims ?? [], sourceTiers: tiers });
  const depth = reconcileDepth({ declaredDepth: destination.depth, earned });

  /*
   * A fingerprint of the exact approved claim set this output was built from.
   * Objective 5 requires it: without it a stored survival rate cannot be
   * compared against a later one, because the input may have changed.
   */
  const claimSetVersion = createHash("sha256")
    .update(published.map((c) => `${c.id}:${c.statement}`).sort().join("|"))
    .digest("hex")
    .slice(0, 16);

  return {
    destinationId,
    claimSetVersion,
    depth,
    categories: [...byCategory.entries()]
      .map(([category, claims]) => ({ category, claims }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    narrative: narrativeBlocks,
    timeline,
    connections,
    /* Attribution list for the page footer — distinct sources actually used. */
    sourcesUsed: [...new Set(published.flatMap((c) => c.sources.map((s) => s.sourceId)))]
      .map((id) => {
        const doc = sources.get(id);
        return { sourceId: id, title: doc?.title ?? id, publisher: doc?.publisher ?? null, url: doc?.url ?? null, tier: doc?.tier ?? null };
      })
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "")),
    stats: {
      approved: (approved.claims ?? []).length,
      published: published.length,
      withheld: withheld.length,
      narrativeBlocks: narrativeBlocks.length,
      narrativeWithheld: withheldNarrative.length,
      timelineEntries: timeline.length,
      connections: connections.length,
    },
    withheld,
    withheldNarrative,
  };
}

/** Publish every destination that has approved knowledge. */
export function publishAll() {
  const destinations = {};
  for (const d of listDestinations()) {
    const result = publishDestination(d.id);
    /* A destination with nothing publishable is omitted, so the application
       has no empty record to render around. */
    if (result.categories.length === 0 && result.narrative.length === 0) continue;
    destinations[d.id] = result;
  }

  const payload = {
    /* No timestamp in the payload: it would make the output non-deterministic
       and produce a diff on every run even when nothing changed. */
    schema: 1,
    destinations,
  };

  const dir = join(process.cwd(), "src", "data", "generated");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export { OUT_FILE };
