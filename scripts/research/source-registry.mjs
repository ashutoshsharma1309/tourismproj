/**
 * Curated official-source registry — the input to tiered discovery.
 *
 * WHY THIS IS A HAND-CURATED LIST
 * -------------------------------
 * Phase 3's discovery proposed only Wikipedia and Wikivoyage, which is why
 * every claim landed at encyclopedia tier. The fix is not to let a model
 * guess official URLs: a guessed portal address returns either a 404 or,
 * worse, somebody else's site rendered as authoritative. Both outcomes are
 * worse than the gap they close.
 *
 * So every entry below was fetched and checked by hand before being added.
 * The `verified` field records the date that happened and `verifiedStatus`
 * what came back. An entry that stops resolving becomes a recorded retrieval
 * failure, never a silent omission.
 *
 * ADDING AN ENTRY is a deliberate edit to this file, reviewed like any other
 * change, and its host must also be on the allowlist in sources.mjs.
 */

/**
 * Authority tiers, mapped to the SourceTier vocabulary in
 * src/lib/research/types.ts. Tier 1 is searched first and encyclopedia
 * sources are only ever used to supplement what the higher tiers did not
 * cover — see orderCandidates() in sources.mjs.
 */
export const TIER_RANK = {
  "official-government": 1,
  "official-tourism": 1,
  institutional: 1,
  academic: 2,
  "museum-university": 2,
  "reputable-publication": 3,
  encyclopedia: 4,
  "other-public": 4,
};

/**
 * Per-destination official sources.
 *
 * Deliberately sparse. Only entries verified to return server-rendered prose
 * are listed; a portal that is a JavaScript shell is recorded here with
 * `rendersServerSide: false` so discovery can report *why* a tier-1 source
 * produced nothing rather than appearing not to have tried.
 */
export const OFFICIAL_SOURCES = {
  sikkim: [
    {
      url: "https://sikkimtourism.gov.in/",
      title: "Sikkim Tourism — Tourism & Civil Aviation Department, Government of Sikkim",
      publisher: "Government of Sikkim",
      tier: "official-government",
      type: "government",
      sourceRegistryId: "sikkim-tourism-portal",
      format: "html",
      rationale: "The state's own tourism department portal — the highest authority for Sikkim.",
      verified: "2026-08-25",
      verifiedStatus: 200,
      /*
       * Returns ~14 characters of text: the page is a client-rendered SPA
       * with no server-side prose. Recorded rather than removed, because
       * "the authoritative source publishes nothing a crawler can read" is
       * itself a finding, and it is why Sikkim's research leans on
       * encyclopedia tier. Rendering JS to extract claims is out of scope
       * and would need its own provenance argument.
       */
      rendersServerSide: false,
    },
  ],
  jaipur: [
    {
      url: "https://tourism.rajasthan.gov.in/jaipur.html",
      title: "Jaipur — Department of Tourism, Government of Rajasthan",
      publisher: "Government of Rajasthan",
      tier: "official-government",
      type: "government",
      sourceRegistryId: "rajasthan-tourism-jaipur",
      format: "html",
      rationale: "State tourism department page for the destination.",
      verified: "2026-08-25",
      verifiedStatus: 200,
      rendersServerSide: true,
    },
    {
      url: "https://www.incredibleindia.gov.in/en/rajasthan/jaipur",
      title: "Jaipur — Incredible India, Ministry of Tourism",
      publisher: "Ministry of Tourism, Government of India",
      tier: "official-tourism",
      type: "government",
      sourceRegistryId: "incredible-india-jaipur",
      format: "html",
      rationale: "National tourism ministry destination page.",
      verified: "2026-08-25",
      verifiedStatus: 200,
      rendersServerSide: true,
    },
  ],
};

/**
 * Sources registered in src/data/sources.ts that Phase 4 discovery may cite.
 *
 * A document may only be cited if its sourceId is registered AND in scope for
 * the destination (checked in claims.mjs). New official sources therefore
 * need a registry entry before their claims can validate — which is the
 * intended friction: adding an authority is a reviewed act.
 */
export function officialSourcesFor(destinationId) {
  return OFFICIAL_SOURCES[destinationId] ?? [];
}

/** Tier 1 and 2 only — used to report whether authoritative coverage exists. */
export function hasHigherTierCoverage(destinationId) {
  return officialSourcesFor(destinationId).some(
    (s) => TIER_RANK[s.tier] <= 2 && s.rendersServerSide,
  );
}
