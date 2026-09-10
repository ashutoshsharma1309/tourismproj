/**
 * Agents 8-9 and the job orchestrator.
 *
 * A research run is a JOB. It is executed by scripts/research/run.mjs from a
 * terminal, writes to .data/research/, and is not importable from the
 * application — so "research must not run during a page render" is a property
 * of where this code lives, not a rule someone has to remember.
 *
 * Output lands in .data/, which is gitignored, exactly where community archive
 * submissions land. That is deliberate: machine-generated knowledge gets the
 * same treatment as a stranger's contribution, because the argument for
 * reviewing one applies unchanged to the other.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { detectConflicts, extractClaims, validateClaims } from "./claims.mjs";
import { detectPracticalData, stableId } from "./core.mjs";
import { getDestination } from "./destinations.mjs";
import { getProvider } from "./provider.mjs";
import { discoverSources, retrieveAll } from "./sources.mjs";

const JOBS_DIR = join(process.cwd(), ".data", "research", "jobs");

/* =========================================================================
   AGENT 8 — KNOWLEDGE STRUCTURER
   ========================================================================= */

/**
 * Group validated knowledge by category.
 *
 * Note what cannot happen here: there is no practical-travel category to put
 * anything in. The structurer could not emit an opening time even if a claim
 * carrying one had survived every earlier gate, because no field exists to
 * hold it. Structure is the last of the three independent defences behind G5.
 */
export function structureKnowledge({ claims, conflicts, destination }) {
  const byCategory = new Map();
  for (const claim of claims) {
    if (claim.status !== "validated" && claim.status !== "conflicted") continue;
    if (!byCategory.has(claim.category)) byCategory.set(claim.category, []);
    byCategory.get(claim.category).push(claim);
  }

  return [...byCategory.entries()].map(([category, categoryClaims]) => ({
    destinationId: destination.id,
    category,
    claims: categoryClaims,
    conflicts: conflicts.filter((c) => c.claimIds.some((id) => categoryClaims.some((cl) => cl.id === id))),
  }));
}

/* =========================================================================
   AGENT 9 — NARRATIVE SYNTHESIS
   ========================================================================= */

/**
 * Compose narrative from validated claims ONLY.
 *
 * The narrative layer restates verified knowledge. It is never permitted to
 * become a new source of facts, so this does not call a provider at all: it
 * assembles blocks whose sentences are the validated claims themselves, each
 * block carrying the ids it was built from.
 *
 * That is a deliberate limitation rather than an unfinished feature. A model
 * asked to write flowing prose "from these claims" reliably adds connective
 * assertions — a date here, a motive there — that no claim supports and no
 * reviewer can trace. Until a mechanism exists to verify generated prose
 * sentence-by-sentence against its claim set, composing without a model is
 * the honest option. Phase 4 can revisit it with that verification in place.
 *
 * Conflicted claims are excluded: an unresolved disagreement must not be
 * narrated as settled.
 */
export function synthesiseNarrative({ knowledge }) {
  const blocks = [];
  for (const record of knowledge) {
    const usable = record.claims.filter((c) => c.status === "validated");
    if (usable.length === 0) continue;

    /* One block per claim type, so a legend is never blended into a
       paragraph of documented history. */
    const byType = new Map();
    for (const claim of usable) {
      if (!byType.has(claim.claimType)) byType.set(claim.claimType, []);
      byType.get(claim.claimType).push(claim);
    }

    for (const [claimType, group] of byType) {
      blocks.push({
        text: group.map((c) => c.statement).join(" "),
        claimIds: group.map((c) => c.id),
        claimType,
        category: record.category,
      });
    }
  }

  /* A block citing nothing is not a narrative, it is an assertion. Rejected
     rather than stored, so the invariant holds by construction. */
  return blocks.filter((b) => b.claimIds.length > 0 && !detectPracticalData(b.text).practical);
}

/* =========================================================================
   JOB STORE
   ========================================================================= */

function jobsDir() {
  if (!existsSync(JOBS_DIR)) mkdirSync(JOBS_DIR, { recursive: true });
  return JOBS_DIR;
}

/**
 * Job identity is derived from its inputs.
 *
 * Same destination, same categories, same provider produces the same id — so
 * asking twice reuses the first answer instead of paying for it again. This is
 * the primary cost control, and it is why nothing here uses a random id.
 */
export function jobId(destinationId, categories, providerName) {
  return stableId("job", destinationId, [...categories].sort().join(","), providerName);
}

export function loadJob(id) {
  const path = join(jobsDir(), `${id}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function saveJob(result) {
  writeFileSync(join(jobsDir(), `${result.job.id}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

export function listJobs() {
  if (!existsSync(JOBS_DIR)) return [];
  return readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(JOBS_DIR, f), "utf8")).job;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/* =========================================================================
   ORCHESTRATION
   ========================================================================= */

const DEFAULT_CATEGORIES = ["history", "heritage", "culture", "festivals"];

/**
 * Run one research job end to end.
 *
 * Stages are explicit and separately observable. Nothing is collapsed into a
 * single provider call, and the provider is consulted at exactly one stage —
 * proposing claims from a document that has already been fetched, normalised
 * and hashed.
 */
export async function runResearchJob({
  destinationId,
  categories = DEFAULT_CATEGORIES,
  providerName = "auto",
  force = false,
  onProgress = () => {},
} = {}) {
  /* Resolve against the registry. An unregistered id never reaches a fetch. */
  const destination = getDestination(destinationId);
  const provider = getProvider(providerName);

  if (!provider.available()) {
    throw new Error(`Provider "${provider.name}" unavailable: ${provider.unavailableReason()}`);
  }

  const id = jobId(destination.id, categories, provider.name);

  if (!force) {
    const existing = loadJob(id);
    /*
     * Only a completed job is reusable. A failed one is a record of what went
     * wrong, not an answer — reusing it would turn one transient rate-limit
     * into a permanent "no sources for this destination", which is exactly
     * the kind of silent wrong answer this engine exists to avoid.
     */
    if (existing && existing.job?.status === "pending-review") {
      onProgress({ stage: "cache", message: `Reusing job ${id}` });
      return { ...existing, reused: true };
    }
    if (existing) {
      onProgress({ stage: "cache", message: `Previous attempt ${existing.job?.status}; re-running` });
    }
  }

  const job = {
    id,
    destinationId: destination.id,
    categories,
    status: "running",
    createdAt: new Date().toISOString(),
    provider: provider.name,
  };

  const stats = {
    sourcesDiscovered: 0, sourcesRetrieved: 0, sourcesFailed: 0,
    claimsProposed: 0, claimsRejectedNoEvidence: 0, claimsRejectedPractical: 0,
    claimsValidated: 0, conflictsDetected: 0,
  };

  try {
    /* 1. PLAN */
    onProgress({ stage: "plan", message: `Planning ${categories.length} categories` });
    const planned = await provider.plan({ destination, categories });
    const plan = { destinationId: destination.id, createdAt: new Date().toISOString(), ...planned };

    /* 2. DISCOVER */
    onProgress({ stage: "discover", message: "Discovering sources" });
    const candidates = discoverSources(destination);
    stats.sourcesDiscovered = candidates.length;

    /* 3. RETRIEVE + NORMALISE */
    onProgress({ stage: "retrieve", message: `Retrieving ${candidates.length} sources` });
    const { documents, failures } = await retrieveAll(candidates, destination, { force });
    stats.sourcesRetrieved = documents.length;
    stats.sourcesFailed = failures.length;

    if (documents.length === 0) {
      /* No sources means no knowledge. It does not mean fall back to the
         model's memory of the place. */
      const failed = {
        job: { ...job, status: "failed", completedAt: new Date().toISOString(), error: "No sources could be retrieved", stats },
        plan, documents: [], failures, knowledge: [], narrative: [], allClaims: [],
      };
      saveJob(failed);
      return failed;
    }

    /* 4-5. EXTRACT CLAIMS + EVIDENCE */
    const allClaims = [];
    for (const task of plan.tasks) {
      for (const document of documents) {
        onProgress({ stage: "extract", message: `${task.category} <- ${document.title}` });
        let proposals = [];
        try {
          proposals = await provider.proposeClaims({ destination, task, document });
        } catch (err) {
          /* A provider failure on one document does not fail the job; it is
             recorded and the run continues with what it has. */
          failures.push({ url: document.url, reason: `provider: ${err.message}`, attemptedAt: new Date().toISOString() });
          continue;
        }
        stats.claimsProposed += proposals.length;
        allClaims.push(...extractClaims({ proposals, document, destination, task, providerName: provider.name }));
      }
    }

    stats.claimsRejectedPractical = allClaims.filter((c) => c.rejectionReason === "practical-data").length;
    stats.claimsRejectedNoEvidence = allClaims.filter(
      (c) => c.rejectionReason === "evidence-not-in-source" || c.rejectionReason === "no-evidence",
    ).length;

    /* 6. VALIDATE */
    onProgress({ stage: "validate", message: `Validating ${allClaims.length} claims` });
    const validated = validateClaims({ claims: allClaims, destination, documents });

    /* 7. CONFLICTS */
    const { claims: withConflicts, conflicts } = detectConflicts({ claims: validated, destination });
    stats.conflictsDetected = conflicts.length;
    stats.claimsValidated = withConflicts.filter((c) => c.status === "validated").length;

    /* 8. STRUCTURE */
    const knowledge = structureKnowledge({ claims: withConflicts, conflicts, destination });

    /* 9. SYNTHESISE */
    const narrative = synthesiseNarrative({ knowledge });

    /* PENDING REVIEW — the only success state. There is no publish step here
       and no code path that sets one. */
    const result = {
      job: { ...job, status: "pending-review", completedAt: new Date().toISOString(), stats },
      plan, documents, failures, knowledge, narrative, allClaims: withConflicts,
    };
    saveJob(result);
    return result;
  } catch (err) {
    const failed = {
      job: { ...job, status: "failed", completedAt: new Date().toISOString(), error: err.message, stats },
      plan: { destinationId: destination.id, createdAt: job.createdAt, tasks: [], anticipatedGaps: [] },
      documents: [], failures: [], knowledge: [], narrative: [], allClaims: [],
    };
    saveJob(failed);
    return failed;
  }
}

export { DEFAULT_CATEGORIES };
