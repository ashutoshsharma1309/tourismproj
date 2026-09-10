import type { Coordinates } from "@/types";
/* The interest vocabulary lives with the planner, which is the thing that
   consumes it. A capsule reuses it rather than declaring a parallel set. */
import type { JourneyInterest } from "@/lib/planner/types";

/**
 * The destination capsule — TerraStory's compact content format.
 *
 * WHY THIS EXISTS
 * ---------------
 * Sikkim's corpus is 15 monastery records, 70 stories, 26 dated events, 38
 * places, 78 archive objects, 180 audio files and a source registry — about
 * four megabytes of hand-verified TypeScript spread across a dozen modules.
 * It is the flagship, and it should stay that way.
 *
 * It is also completely unaffordable as a template. Fifteen destinations at
 * that shape would be sixty megabytes of content to write, verify, keep true
 * and ship; a hundred would be unthinkable. And most of it would be
 * pretending: nobody is going to produce 70 verified cultural stories for
 * every city on a registry.
 *
 * A capsule is the honest alternative. One file, one destination, a few
 * dozen entries at most, every one of them carrying a source. It is not a
 * cut-down Sikkim — it is a different promise: *these few things are true and
 * here is who says so*, instead of *this place has been exhaustively
 * catalogued*.
 *
 * WHAT A CAPSULE IS NOT
 * ---------------------
 * It has no field for opening hours, ticket prices, availability, booking
 * links, ratings or rankings. That is not an oversight to be filled in later:
 * those are the fields tourism software invents, and a schema that cannot
 * express them cannot be made to lie about them. §I2 and §I8 of
 * docs/protected-features.md are enforced here by the type system.
 *
 * WHAT IT SHARES WITH THE DEEP FORMAT
 * -----------------------------------
 * The vocabulary. A capsule place carries the same kind of category a Sikkim
 * place does, a capsule experience is tagged with the same interest themes
 * the planner and discovery already understand, and provenance has the same
 * shape. That is what lets a capsule destination flow through discovery, the
 * planner, search and the global layer without any of them learning a second
 * content model — see `src/lib/destinations/capsule.ts`.
 */

/** How confident the author is, in the archive's own vocabulary. */
export type CapsuleConfidence = "high" | "medium" | "unverified";

/**
 * A citation. Every factual item in a capsule carries at least one.
 *
 * `url` is required because a source nobody can open is not a source. `title`
 * and `publisher` are what gets rendered beside the claim, so a reader can
 * judge the authority without following the link.
 */
export interface CapsuleSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** ISO date this was last checked. */
  retrievedAt: string;
  confidence: CapsuleConfidence;
  /**
   * How this source was obtained — the same vocabulary the source registry
   * has required since Phase 2.5. It is required here for the same reason:
   * a reader deserves to know whether a person went and read the page, or a
   * script fetched it, and "model-proposed" must never be able to hide.
   */
  retrievalMethod: "human-curated" | "agent-api" | "web-search" | "model-proposed";
}

/** A thing a visitor can stand in front of. */
export interface CapsulePlace {
  id: string;
  name: string;
  /** The record's own classification — "Fort", "Temple", "Museum", "Lake". */
  category: string;
  /** One or two sentences, drawn from the cited source. */
  summary: string;
  /**
   * Present ONLY where a source publishes a coordinate. Absent means the
   * place is not plotted and no distance involving it is ever computed —
   * exactly as Dubdi is handled in the deep format.
   */
  coordinates?: Coordinates;
  /**
   * A site-root-relative path to a vendored image, or absent. Never a remote
   * URL: hotlinked media rate-limits and rots. Absent renders as a neutral
   * panel, never as another place's photograph.
   */
  image?: string;
  /** What the photograph shows. Required whenever `image` is present. */
  imageAlt?: string;
  /** Ids into the capsule's own `sources`. At least one. */
  sourceIds: string[];
}

/**
 * Something to do or understand, tied to places.
 *
 * `themes` uses the same interest vocabulary as the planner and discovery, so
 * a capsule destination answers "show me heritage" without any of those
 * systems being taught a new type.
 */
export interface CapsuleExperience {
  id: string;
  title: string;
  /** Why this is worth a visitor's time, in the source's own terms. */
  explanation: string;
  themes: JourneyInterest[];
  /** Ids of places in this capsule. May be empty for a non-sited experience. */
  placeIds: string[];
  sourceIds: string[];
}

/** A dated event, or a period where only a period is known. */
export interface CapsuleHistoryEntry {
  id: string;
  /** Four-digit year where a source states one. */
  year?: number;
  /** What a reader sees: "1592", "17th century", "c. 800 BCE". */
  period: string;
  title: string;
  summary: string;
  /** Places this event is recorded as belonging to. */
  placeIds: string[];
  sourceIds: string[];
}

/** What a cultural entry is. Fixed, because a fourth kind needs a decision. */
export type CapsuleCultureKind = "food" | "festival" | "craft";

/**
 * A dish, a festival, or a craft — what a place *does*, as opposed to what
 * a visitor stands in front of.
 *
 * WHY THIS IS NOT A PLACE
 * -----------------------
 * A cuisine has no coordinate and a festival is not a building. Modelling
 * them as places would have put them on the map, into distance calculations
 * and into the planner's stop list, all of which would be wrong. They are a
 * separate kind precisely so the systems that consume places do not have to
 * pretend these are ones.
 *
 * WHAT IT DELIBERATELY CANNOT SAY
 * -------------------------------
 * There is no field for a date, a venue, a ticket, or a price. A festival
 * that "happens in October" is a `season` string quoted from a source; a
 * festival that happens *on 14 October 2026* is a scheduling claim this
 * project has no feed for and will not guess at. §I2 and §I8 apply here
 * exactly as they do to places.
 */
export interface CapsuleCultureEntry {
  id: string;
  kind: CapsuleCultureKind;
  name: string;
  /** One or two sentences, drawn from the cited source. */
  summary: string;
  /**
   * When a source states a recurring season or month in prose — "celebrated
   * in July", "an autumn festival". Never a specific date, and absent unless
   * a source says it.
   */
  season?: string;
  /** A vendored local path, never a remote URL. */
  image?: string;
  imageAlt?: string;
  /** Places in this capsule this is documented as belonging to. May be empty. */
  placeIds: string[];
  sourceIds: string[];
}

/**
 * A documented place to stay.
 *
 * WHY THIS IS THE NARROWEST POSSIBLE VERSION
 * ------------------------------------------
 * The obvious thing to build is a hotel directory: name, address, phone,
 * rate, rating, availability, a booking button. Every one of those fields is
 * either data this project has no licensed feed for or data it would have to
 * invent, and inventing a phone number for a real business is the single
 * worst thing this codebase could do — it sends real people to a wrong
 * number.
 *
 * So this type holds what a *source* publishes about a property of
 * documented significance: what it is, when it opened, where it stands. It is
 * a heritage record that happens to be a hotel, not an inventory line.
 *
 * There is no `phone`, no `rate`, no `rating`, no `availability` and no
 * `bookingUrl`, and there must never be one. Sikkim's own stays are a
 * different thing entirely — those come from the state's licensed-operator
 * register, which is real registry data with a real provenance chain
 * (`src/data/hotels.ts`).
 */
export interface CapsuleStay {
  id: string;
  name: string;
  /** "Historic hotel", "Heritage property", "Palace hotel". */
  category: string;
  /** One or two sentences, drawn from the cited source. */
  summary: string;
  /** Where a source publishes a coordinate. Absent means never plotted. */
  coordinates?: Coordinates;
  /**
   * The year the property opened AS A HOTEL, where a source states one.
   *
   * Kept strictly separate from `buildingYear`, because conflating them
   * publishes a false claim under a true-sounding label: the Hotel de Crillon
   * occupies a building of 1758 and opened as a hotel in 1909, and The
   * Peninsula Paris a building of 1903 that opened as a hotel in 2014. The
   * first version of this field took whichever date came first and labelled
   * it "Opened", which was wrong by a hundred and eleven years.
   */
  openedYear?: number;
  /** The year the building itself dates from, where a source states one. */
  buildingYear?: number;
  /** A vendored local path, never a remote URL. */
  image?: string;
  imageAlt?: string;
  /**
   * The property's own website, where a source publishes one.
   *
   * Retrieved from Wikidata's P856, not composed from the hotel's name. The
   * distinction matters: a guessed URL either 404s or, worse, resolves to
   * somebody else's site.
   */
  website?: string;
  /**
   * A published telephone number, where a source states one (Wikidata P1329).
   *
   * ABSENT IS THE NORMAL CASE — 2 of 62 stays have one. It must stay that
   * way: a plausible-looking number for a real hotel sends a real person to a
   * stranger, which is the single worst thing this codebase could publish.
   * There is no fallback, no formatting of a partial number, and no
   * "contact the property" link standing in for one.
   */
  phone?: string;
  /**
   * The street address a source publishes (Wikidata P6375), verbatim. Absent
   * where none is published — never composed from the name and the city.
   */
  address?: string;
  /** The contact e-mail a register publishes for the unit, verbatim. */
  email?: string;
  sourceIds: string[];
}

/**
 * A cultural narrative.
 *
 * `claimType` is not optional and not derived. The deep format has carried it
 * since the archive began — documented history, oral tradition and legend are
 * never silently merged (§I5) — and a capsule inherits the same rule.
 */
export interface CapsuleStory {
  id: string;
  title: string;
  summary: string;
  claimType: "documented history" | "oral tradition" | "legend";
  placeIds: string[];
  sourceIds: string[];
}

/**
 * One destination's compact content. One file, lazily imported, and only for
 * the destination it belongs to.
 */
export interface DestinationCapsule {
  destinationId: string;
  /**
   * A one-line statement of what this capsule covers, written by the author.
   * Rendered above the content so a reader knows the scope before reading —
   * "the fortified city and its water architecture", not "everything about
   * Jaipur".
   */
  scope: string;
  places: CapsulePlace[];
  experiences: CapsuleExperience[];
  history: CapsuleHistoryEntry[];
  stories: CapsuleStory[];
  /** Food, festivals and crafts. Empty where no source could be retrieved. */
  culture: CapsuleCultureEntry[];
  /** Documented places to stay. Empty where none has a published record. */
  stays: CapsuleStay[];
  sources: CapsuleSource[];
  /** ISO date the capsule was last reviewed by a human. */
  reviewedAt: string;
  reviewedBy: string;
}

/** What `validateCapsule` reports. A capsule with any error is not loaded. */
export interface CapsuleValidation {
  ok: boolean;
  errors: string[];
  counts: {
    places: number;
    experiences: number;
    history: number;
    stories: number;
    culture: number;
    stays: number;
    sources: number;
  };
}
