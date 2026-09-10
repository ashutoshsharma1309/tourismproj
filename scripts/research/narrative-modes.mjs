/**
 * Narrative modes.
 *
 * Five, deliberately. A mode changes what a narrative is FOR — who reads it,
 * how it is organised, which claim types belong in it — and each one is a
 * separate prompt to maintain and a separate output shape to verify. Dozens
 * of near-identical modes would be maintenance cost pretending to be
 * capability.
 *
 * `allowedClaimTypes` is the load-bearing field. A historical overview built
 * partly from legends would present folklore with the authority of record,
 * which is the failure `claimType` has guarded against since Phase 1. Modes
 * make that guard explicit at the composition boundary rather than leaving it
 * to the model to observe.
 */

export const PROMPT_VERSION = "6.1.0";

export const NARRATIVE_MODES = {
  HISTORICAL: {
    id: "HISTORICAL",
    label: "Historical overview",
    audience: "A visitor who wants to know what happened here and when.",
    structure: "Chronological. Earliest dated fact first, following the supplied order.",
    allowedClaimTypes: ["documented history"],
    categories: ["history"],
    maxSentences: 6,
    style: "Plain, factual, past tense. No scene-setting, no evocation.",
  },
  CULTURAL: {
    id: "CULTURAL",
    label: "Cultural overview",
    audience: "A visitor who wants to understand daily life, practice and craft.",
    structure: "Thematic. Group related practices; do not force a chronology.",
    allowedClaimTypes: ["documented history", "oral tradition"],
    categories: ["culture", "traditions"],
    maxSentences: 5,
    style: "Descriptive but restrained. Attribute practices to communities as the claims do.",
  },
  HERITAGE: {
    id: "HERITAGE",
    label: "Heritage sites",
    audience: "A visitor deciding what to see.",
    structure: "Site by site. Keep all claims about one site together.",
    allowedClaimTypes: ["documented history"],
    categories: ["heritage", "attractions", "places"],
    maxSentences: 6,
    style: "Concrete. Name the site in each sentence rather than relying on pronouns.",
  },
  STORY: {
    id: "STORY",
    label: "Stories and traditions",
    audience: "A reader interested in narrative and belief.",
    structure: "One story at a time.",
    /* Legends are welcome HERE and only here, and the mode carries the label
       so a reader is never left to guess which register they are reading. */
    allowedClaimTypes: ["oral tradition", "legend", "travel story"],
    categories: ["stories", "festivals", "traditions"],
    maxSentences: 5,
    style: "Narrative, but never presenting a legend as established fact.",
  },
  DESTINATION_OVERVIEW: {
    id: "DESTINATION_OVERVIEW",
    label: "Introduction",
    audience: "Someone who has just arrived on the page and knows nothing.",
    structure: "Broadest facts first, then one or two specifics.",
    allowedClaimTypes: ["documented history"],
    categories: ["history", "heritage", "culture"],
    maxSentences: 4,
    style: "Short. Orienting. No superlatives unless a claim contains one.",
  },
};

export function modeFor(id) {
  const mode = NARRATIVE_MODES[id];
  if (!mode) throw new Error(`Unknown narrative mode "${id}". Available: ${Object.keys(NARRATIVE_MODES).join(", ")}`);
  return mode;
}

/**
 * Claims eligible for a mode.
 *
 * Filtered by BOTH category and claim type. A legend about a festival is
 * eligible for STORY and not for HISTORICAL, even though both may draw on
 * the festivals category.
 */
export function claimsForMode(claims, mode) {
  return claims.filter(
    (c) => mode.categories.includes(c.category) && mode.allowedClaimTypes.includes(c.claimType),
  );
}
