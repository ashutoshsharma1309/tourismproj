/**
 * TerraStory — the destination model.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Sikkim was never a *value* in this codebase. It was an unstated global
 * assumption: no entity carried a destination identifier, and the only thing
 * naming the place was a closed union of six district names in `@/types`.
 * That made "add Kyoto" a compile error rather than a data task.
 *
 * This file introduces the missing dimension. It is deliberately additive —
 * nothing here replaces an existing type, and the Sikkim domain types are
 * now *derived* from a destination record rather than hand-written unions
 * (see `SikkimDistrict` in ./index.ts). Same content, one source of truth.
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is not a schema for a database (there is none, by design — see
 * docs/phase-2-implementation.md §Database decision), and it is not a
 * content model for the research engine (Phase 3). It describes what a
 * destination *is*, and what it can *offer*.
 */

import type { Coordinates } from "@/types";

/* =========================================================================
   DEPTH — how well a destination is actually known
   ========================================================================= */

/**
 * How much verified content stands behind a destination.
 *
 * This is the mechanism that lets TerraStory hold fifteen destinations
 * without pretending they are equally well known. It is rendered to the
 * visitor, not kept internal: a reader is told what they are looking at
 * before they click, which is the same instinct that put /preservation in
 * the product — publish the gaps rather than hide them.
 *
 * The rule, enforced by review and not by code alone: depth may LOWER a
 * claim's presentation, never raise it, and nothing automated may promote a
 * destination. Promotion is a human decision, exactly as an archive
 * submission can only be published by a curator.
 */
export type DataDepth =
  /** Human-curated, source-registry-backed, QA-enforced. Sikkim only. */
  | "deep"
  /** Human-reviewed, narrower coverage, same sourcing standard. */
  | "curated"
  /** Machine-assembled from retrieved sources. Always labelled. Phase 3+. */
  | "researched"
  /**
   * A hand-written capsule: a few dozen sourced entries in one file. PHASE 17.
   *
   * This is the level that makes the platform affordable. It sits below
   * `researched` not because a human wrote it — a human writes `deep` too —
   * but because of BREADTH: a capsule states a handful of things well and
   * says nothing about the rest, where a researched destination has had a
   * whole retrieval and review pipeline run across its topics.
   */
  | "capsule"
  /** Registered in the architecture; no content yet. Renders nothing. */
  | "planned";

/**
 * Depth, ordered. Higher means more of the destination has been covered — it
 * says nothing about the place itself, and nothing here may be used to rank
 * destinations for a visitor (see docs/phase-15-global-intelligence.md).
 */
export const DATA_DEPTH_ORDER: Record<DataDepth, number> = {
  deep: 4,
  curated: 3,
  researched: 2,
  capsule: 1,
  planned: 0,
};

/*
 * PLAIN WORDS, NOT TIER NAMES. These read "Deep archive", "Curated",
 * "Tourism capsule" — the names of the tiers in the data model, shown as a
 * badge beside the destination's name. A traveller cannot decode them, and
 * "Curated" beside Jaipur read as a quality mark. The badge now says how much
 * has been documented, which is the one thing it measures.
 */
export const DATA_DEPTH_LABEL: Record<DataDepth, string> = {
  deep: "Deeply documented",
  curated: "Well documented",
  researched: "Researched",
  capsule: "Documented",
  planned: "Being catalogued",
};

/**
 * What each level actually promises a visitor.
 *
 * The badge alone tells a reader that destinations differ; it does not tell
 * them HOW. A visitor who opens a capsule after Sikkim should know before
 * they scroll that they are looking at a short, sourced summary rather than a
 * thin version of an archive — otherwise "less content" reads as "broken",
 * which is the failure this whole model exists to prevent.
 */
export const DATA_DEPTH_SUMMARY: Record<DataDepth, string> = {
  deep: "Fully catalogued — places, stories, a timeline, an archive and a planner, every claim traced to its source.",
  curated: "Reviewer-approved knowledge on several topics, each with the source it came from.",
  researched: "Assembled from retrieved sources and reviewed before publication.",
  capsule: "A short, sourced set of places, stories and culture — nothing beyond what a source says.",
  planned: "We are still cataloguing this destination. Nothing is shown until it has a source.",
};

/* =========================================================================
   ADMINISTRATIVE DIVISIONS — the generic replacement for SikkimDistrict
   ========================================================================= */

/**
 * A first-level subdivision of a destination.
 *
 * `kind` exists because "district" is not universal: Kyoto has wards, Paris
 * arrondissements, Rome rioni, New York boroughs. Rendering "District:
 * Higashiyama" would be quietly wrong, and this model would rather carry the
 * right noun than flatten every place into Indian administrative vocabulary.
 */
export interface AdministrativeDivision {
  /** Stable identifier, unique within the destination. */
  id: string;
  /** Display name in the destination's own convention. */
  name: string;
  kind: DivisionKind;
}

export type DivisionKind =
  | "district"
  | "prefecture"
  | "ward"
  | "arrondissement"
  | "borough"
  | "rione"
  | "province"
  | "region"
  | "municipality"
  | "other";

export const DIVISION_KIND_LABEL: Record<DivisionKind, string> = {
  district: "District",
  prefecture: "Prefecture",
  ward: "Ward",
  arrondissement: "Arrondissement",
  borough: "Borough",
  rione: "Rione",
  province: "Province",
  region: "Region",
  municipality: "Municipality",
  other: "Area",
};

/* =========================================================================
   TAXONOMIES — the generic replacement for MonasteryTradition
   ========================================================================= */

/**
 * A destination-scoped controlled vocabulary.
 *
 * MonasteryTradition (Nyingma, Kagyu, Karma Kagyu, Zurmang Kagyu) is a
 * genuinely useful domain concept for Sikkim's gompas and is NOT discarded —
 * it becomes a taxonomy belonging to Sikkim rather than a constraint on the
 * whole architecture. Kyoto would declare Zen/Shingon/Tendai; Rome would
 * declare architectural periods; New York might declare none at all.
 *
 * Closedness is preserved. It simply moves from a compile-time union that
 * every destination shares to a per-destination declaration — an invented
 * value is still unrepresentable, because a site's taxonomy references are
 * validated against the destination that owns them.
 */
export interface Taxonomy {
  id: string;
  /** Rendered as the filter's legend, e.g. "Tradition". */
  label: string;
  values: TaxonomyValue[];
}

export interface TaxonomyValue {
  id: string;
  label: string;
}

/** A reference from a record to one value of one taxonomy. */
export interface TaxonomyRef {
  taxonomyId: string;
  valueId: string;
}

/* =========================================================================
   CAPABILITIES — what a destination can actually offer
   ========================================================================= */

/**
 * The experiences a destination can support.
 *
 * These are NOT hand-written booleans. Hand-maintained capability flags
 * drift: someone adds content and forgets the flag, or sets a flag hoping
 * content will follow, and the navigation promises a page that renders
 * empty. `resolveCapabilities()` in @/lib/destinations derives every value
 * from whether content actually exists, so the flag cannot lie.
 *
 * A destination that reports `false` for a capability is not linked to that
 * section at all — which is how "no blank cards, no broken sections, no fake
 * placeholders" is achieved structurally rather than by remembering to check.
 */
export type DestinationCapability =
  /** Published, reviewer-approved research knowledge. Phase 5. */
  | "knowledge"
  | "sites"
  | "places"
  | "stories"
  | "history"
  /**
   * PHASE 18 — the records are long-form enough to carry their own pages.
   *
   * `stories` and `history` mean a destination HAS such records. These mean
   * they are the deep format's kind: body paragraphs, key facts, sources, a
   * verification note. A capsule's two-sentence entries are real content and
   * render on its discovery page, but a page of their own would be a heading
   * over a line — and, until this existed, the section index rendered
   * SIKKIM's archive under another destination's URL.
   */
  | "storyPages"
  | "historyPages"
  | "culture"
  | "festivals"
  | "food"
  | "stays"
  | "trade"
  | "archive"
  | "map"
  | "audio"
  | "video"
  | "panorama"
  | "permits"
  | "responsible"
  | "preservation"
  /**
   * Visitable, sourced experiences exist — heritage sites, places, or both.
   * This is what makes a trip PLAN possible, and it is why it is separate
   * from `tripPlanner`: that flag means Sikkim's hand-authored road-corridor
   * planner, which needs a corridor graph no other destination has.
   */
  | "experiences"
  | "tripPlanner";

export type CapabilitySet = Record<DestinationCapability, boolean>;

export const CAPABILITY_LABEL: Record<DestinationCapability, string> = {
  knowledge: "Researched knowledge",
  sites: "Heritage sites",
  places: "Places",
  stories: "Stories",
  history: "History",
  storyPages: "Stories",
  historyPages: "History",
  culture: "Culture",
  festivals: "Festivals",
  food: "Food",
  stays: "Stays",
  trade: "Trade register",
  archive: "Archive",
  map: "Map",
  audio: "Audio guides",
  video: "Video",
  panorama: "Panoramas",
  permits: "Entry requirements",
  responsible: "Responsible travel",
  preservation: "Data gaps",
  experiences: "Experiences",
  tripPlanner: "Road itinerary",
};

/* =========================================================================
   DESTINATION
   ========================================================================= */

export interface DestinationGeography {
  /** Map framing centre. Not rendered as a factual claim. */
  centre: Coordinates;
  /** [southWest, northEast] — map bounds. */
  bounds?: [Coordinates, Coordinates];
  /** IANA timezone, e.g. "Asia/Kolkata". */
  timezone: string;
}

export interface DestinationCountry {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
}

export interface DestinationRegion {
  name: string;
  /** What the region is called locally — state, prefecture, région… */
  kind: DivisionKind;
}

/**
 * The photograph a destination is shared with.
 *
 * WHY THIS IS ON THE DESTINATION RECORD
 * Before this field existed the root layout's `openGraph` block was the only
 * social card in the application, so sharing `/destinations/paris` posted a
 * photograph of Rumtek Monastery in Sikkim with alt text naming Sikkim. That
 * is not a styling problem: it is a false claim about what a place looks
 * like, made in the one context — a shared link — where nobody can see the
 * page's own corrections.
 *
 * Optional, and deliberately so. A destination with no photograph of its own
 * emits NO card image rather than borrowing another destination's, which is
 * the same rule the rest of the archive follows: absent beats invented.
 */
export interface DestinationSocialCard {
  /**
   * Site-root-relative path to a vendored image under `public/`. Not a
   * Commons URL — social scrapers do not follow a hotlink that rate-limits,
   * and every photograph here is vendored anyway (see src/data/images.ts).
   */
  url: string;
  /** Real pixel dimensions. A wrong declaration crops badly on every platform. */
  width: number;
  height: number;
  /** What the photograph actually shows, naming the place it was taken. */
  alt: string;
}

/**
 * A destination: the unit of identity, depth and content ownership.
 *
 * Everything above a destination (country, world) is navigation only and owns
 * no content. Everything below it (divisions, sites, stories) belongs to
 * exactly one destination.
 *
 * Note what is absent: no description, no highlights, no "best time to
 * visit", no counts. Those are factual claims and belong to content modules
 * that carry provenance. A destination record is identity and geography —
 * the things that are true regardless of how much has been researched.
 */
export interface Destination {
  /** Stable id and URL segment, e.g. "sikkim". */
  id: string;
  /** Display name. */
  name: string;
  /** Full name where the short one is ambiguous, e.g. "Kōchi" vs "Kochi". */
  formalName?: string;
  country: DestinationCountry;
  region?: DestinationRegion;
  geography: DestinationGeography;
  depth: DataDepth;
  /**
   * Divisions this destination declares. The single source of truth for
   * "which districts exist" — previously duplicated across four modules.
   * Empty for a planned destination.
   */
  divisions: AdministrativeDivision[];
  /** Destination-scoped controlled vocabularies. Empty is valid. */
  taxonomies: Taxonomy[];
  /**
   * Content languages actually available — not aspirational. Sikkim declares
   * the twelve its audio guides really exist in.
   */
  languages: string[];
  /**
   * The photograph this destination is shared with. Absent means no card
   * image at all — never a fallback to another destination's photograph.
   *
   * (`contentBasePath` used to sit here. It existed so the eventual move of
   * Sikkim's content under `/destinations/sikkim` would be a one-field
   * change. Phase 11 made that move, nothing ever read the field, and a
   * record still declaring `"/"` was simply wrong — so it is gone.)
   */
  socialCard?: DestinationSocialCard;
}

/** A destination plus its derived capabilities. */
export interface DestinationSummary {
  destination: Destination;
  capabilities: CapabilitySet;
  /** True when any capability is available. */
  hasContent: boolean;
}
