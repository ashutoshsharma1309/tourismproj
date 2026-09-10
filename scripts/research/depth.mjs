/**
 * Destination knowledge depth — how well a place is actually known.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * ------------------------------------
 * Depth is earned per destination, from that destination's own evidence.
 * It is never inherited — not from sharing a country with Sikkim, not from
 * sharing a source, not from being rendered by the same component, and not
 * from linking to a deep destination. Nothing about Sikkim can make Jaipur
 * deep, and the reason is structural rather than a rule someone remembers:
 * `deep` is not a value this module can return.
 *
 * SOURCE QUALITY IS NOT DESTINATION DEPTH
 * A government source raises confidence in the CLAIM it backs. It says
 * nothing about how completely the destination has been researched. One
 * excellent source producing one excellent claim is one claim.
 */

/**
 * `deep` means a human-curated corpus with the archive's full apparatus
 * behind it — cited records, licence-verified media, narrated guides, a QA
 * harness enforcing the sourcing rules. Sikkim has that because people built
 * it over months.
 *
 * A research pipeline cannot produce it, so this module cannot award it. The
 * ladder below tops out at `curated`, and `deep` comes only from a
 * destination record declaring it. That is the whole authority-inheritance
 * defence, expressed as a missing enum value rather than a check.
 */
export const PIPELINE_MAX_DEPTH = "curated";

/**
 * Thresholds for `curated`.
 *
 * These are judgement calls and are documented as such. They are chosen to
 * describe a destination a reader would recognise as covered — not tuned to
 * make the pilot destinations look finished. Each one answers a specific way
 * a thin destination can look complete:
 */
export const CURATED_THRESHOLDS = {
  /* Enough claims that the destination has substance rather than a headline.
     Below this a page is a stub with citations. */
  minApprovedClaims: 20,
  /* Coverage across topics, so a destination researched only for its
     founding date does not read as fully known. */
  minCategories: 3,
  /* At least one claim from an official, institutional or academic source.
     A destination known only from encyclopedias is `researched`, however
     many claims it has — which is exactly Sikkim's own situation for
     machine research, and the model should say so rather than flatter it. */
  minHigherTierClaims: 1,
  /* More than one source, so the account does not rest on a single publisher. */
  minDistinctSources: 2,
};

const HIGHER_TIERS = new Set([
  "official-government", "official-tourism", "institutional",
  "academic", "museum-university",
]);

/**
 * Assess depth from approved knowledge alone.
 *
 * Deterministic: the same approved input always yields the same depth. No
 * model is consulted, and no claim is weighted by anything but its source
 * tier — which was itself established deterministically.
 *
 * Returns the reasons as well as the verdict, because "why is Kyoto only
 * researched?" is a question a reviewer will ask and an unexplained label is
 * not an answer.
 */
export function assessDepth({ approvedClaims = [], sourceTiers = {} } = {}) {
  const claims = approvedClaims.filter((c) => c.status === "validated");

  if (claims.length === 0) {
    return {
      depth: "planned",
      reasons: ["No approved claims."],
      metrics: { approvedClaims: 0, categories: 0, higherTierClaims: 0, distinctSources: 0 },
    };
  }

  const categories = new Set(claims.map((c) => c.category));
  const sources = new Set(claims.flatMap((c) => (c.evidence ?? []).map((e) => e.sourceId)));
  const higherTierClaims = claims.filter((c) =>
    (c.evidence ?? []).some((e) => HIGHER_TIERS.has(sourceTiers[e.sourceId])),
  ).length;

  const metrics = {
    approvedClaims: claims.length,
    categories: categories.size,
    higherTierClaims,
    distinctSources: sources.size,
  };

  const shortfalls = [];
  if (metrics.approvedClaims < CURATED_THRESHOLDS.minApprovedClaims) {
    shortfalls.push(`${metrics.approvedClaims} approved claims (needs ${CURATED_THRESHOLDS.minApprovedClaims})`);
  }
  if (metrics.categories < CURATED_THRESHOLDS.minCategories) {
    shortfalls.push(`${metrics.categories} categories covered (needs ${CURATED_THRESHOLDS.minCategories})`);
  }
  if (metrics.higherTierClaims < CURATED_THRESHOLDS.minHigherTierClaims) {
    shortfalls.push(`no claim from an official, institutional or academic source`);
  }
  if (metrics.distinctSources < CURATED_THRESHOLDS.minDistinctSources) {
    shortfalls.push(`${metrics.distinctSources} distinct source (needs ${CURATED_THRESHOLDS.minDistinctSources})`);
  }

  if (shortfalls.length === 0) {
    return {
      depth: PIPELINE_MAX_DEPTH,
      reasons: [
        `${metrics.approvedClaims} approved claims across ${metrics.categories} categories`,
        `${metrics.higherTierClaims} from higher-tier sources, ${metrics.distinctSources} distinct sources`,
      ],
      metrics,
    };
  }

  return { depth: "researched", reasons: shortfalls, metrics };
}

/**
 * Reconcile a destination's declared depth with what its research earned.
 *
 * The declared value wins when it is `deep`, because that describes a
 * curated corpus this pipeline never touches. Everywhere else the earned
 * value wins, so a destination cannot be labelled better than its evidence.
 *
 * Note the asymmetry is deliberate and one-directional: declaring `deep`
 * protects Sikkim's curated archive from being downgraded by a thin research
 * run, and there is no path by which declaring anything makes a
 * research-derived destination look better than it is.
 */
export function reconcileDepth({ declaredDepth, earned }) {
  if (declaredDepth === "deep") {
    return {
      depth: "deep",
      basis: "declared",
      note: "Human-curated archive. Research adds to it and cannot change its depth.",
      earned: earned.depth,
      metrics: earned.metrics,
      reasons: earned.reasons,
    };
  }
  return {
    depth: earned.depth,
    basis: "earned",
    note: null,
    earned: earned.depth,
    metrics: earned.metrics,
    reasons: earned.reasons,
  };
}
