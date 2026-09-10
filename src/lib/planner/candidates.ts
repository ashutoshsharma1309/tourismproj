import {
  getCultureRecords,
  getHistory,
  getPlaces,
  getSites,
  getStories,
} from "@/lib/destinations/content";
import { destinationPath } from "@/lib/destinations/resolve";
import { ALL_INTERESTS } from "./types";
import type {
  Experience,
  ExperienceReference,
  InterestBasis,
  JourneyInterest,
  PracticalNote,
} from "./types";

/**
 * Building planner candidates from the destination's EXISTING knowledge graph.
 *
 * There is no planner content database. Every candidate is assembled from
 * records the archive already publishes and already shows elsewhere, reached
 * through the same `content.ts` accessors the rest of the destination uses.
 * That is deliberate: a second corpus would be a second thing to keep true.
 *
 * THE GRAPH THIS READS
 * --------------------
 *   HistoryEvent.relatedPlaces      -> Place.slug
 *   HistoryEvent.relatedMonasteries -> Monastery.slug
 *   Story.relatedMonasteries        -> Monastery.slug
 *
 * Those edges are authored on the history and story records themselves, so a
 * site's historical and cultural weight is measured by how much of the
 * archive actually points at it — not by anything this file decides.
 *
 * WHAT IS DELIBERATELY NOT DERIVED
 * --------------------------------
 * Opening hours, prices, travel times, closing days, availability. None of
 * these exist on any record, so none appear here. `practical` carries only
 * fields a record genuinely publishes — a documented permit requirement and a
 * published elevation.
 */

/* Structural shapes of the records this reads. The accessors are typed per
   destination, so the planner states the fields it depends on and ignores
   the rest. */
interface SiteRecord {
  slug: string;
  name: string;
  district?: string;
  tradition?: string;
  establishedYear?: number;
  description: string;
  image?: string | null;
  coordinates?: { lat: number; lng: number };
  wikipediaUrl?: string;
}

interface PlaceRecord {
  slug: string;
  /** Set by compact formats whose records have no long-form page. */
  detailHref?: string;
  /** Set by a format that STATES its interests instead of implying them. */
  interests?: string[];
  name: string;
  category: string;
  group: string;
  district?: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  image?: string | null;
  imageAlt?: string;
  wikipediaUrl?: string;
  permitNote?: string;
  elevation?: number;
}

interface HistoryRecord {
  slug: string;
  title: string;
  detailHref?: string;
  relatedPlaces?: string[];
  relatedMonasteries?: string[];
}

interface StoryRecord {
  slug: string;
  title: string;
  detailHref?: string;
  category?: string;
  relatedMonasteries?: string[];
  /** Stories name places too — `food.ts` alone points at eight towns. */
  relatedPlaces?: string[];
}

/**
 * Place categories and groups mapped to traveller interests.
 *
 * This is a classification table, not an inference: each entry restates what
 * the record's own `category` already says. A "Museum" supports the Museums
 * interest because it is catalogued as a museum.
 */
const PLACE_CATEGORY_INTERESTS: Record<string, JourneyInterest[]> = {
  Lake: ["nature"],
  Waterfall: ["nature"],
  River: ["nature"],
  Pass: ["nature"],
  Valley: ["nature"],
  Peak: ["nature"],
  "Nature reserve": ["nature"],
  "Tea garden": ["nature", "local"],
  Stupa: ["sacred", "heritage"],
  Temple: ["sacred", "heritage", "architecture"],
  Museum: ["museums", "heritage", "history"],
  "Heritage site": ["heritage", "history", "architecture"],
  Town: ["local", "culture"],
  Viewpoint: ["nature"],
};

/**
 * Cultural record kinds mapped to interests.
 *
 * Three kinds, fixed by `CapsuleCultureKind`. Like the category table above
 * this restates the record's own classification rather than inferring from
 * its prose: a craft supports Art because it is catalogued as a craft.
 */
const CULTURE_KIND_INTERESTS: Record<string, JourneyInterest[]> = {
  food: ["food", "culture"],
  festival: ["culture"],
  craft: ["art", "culture"],
};

/** What each cultural kind is called on a card. */
const CULTURE_KIND_LABEL: Record<string, string> = {
  food: "Food",
  festival: "Festival",
  craft: "Craft",
};

/**
 * Story categories mapped to interests.
 *
 * A story that names a site tells us what KIND of interest that site serves —
 * a site referenced by three "Architecture" stories is an architecture
 * experience because the archive shelves it that way.
 */
const STORY_CATEGORY_INTERESTS: Record<string, JourneyInterest[]> = {
  "Sikkim History": ["history"],
  "Monastery Heritage": ["sacred", "heritage"],
  Festivals: ["culture"],
  "Folk Music & Dance": ["culture", "art"],
  "Lepcha Heritage": ["culture"],
  "Bhutia Heritage": ["culture"],
  "Nepali Heritage": ["culture"],
  "Folklore & Oral Tradition": ["culture"],
  "Food & Flavours": ["food"],
  Architecture: ["architecture"],
  "Traditional Knowledge": ["culture", "local"],
  "Languages & Script": ["culture"],
  "Art & Craft": ["art"],
  "Sacred Landscapes": ["sacred", "nature"],
  "Nature & Culture": ["nature", "culture"],
  "Heritage Trails": ["heritage"],
  "Markets & Community Life": ["local"],
  "Responsible Tourism": ["local"],
  "Heritage Preservation": ["heritage"],
};

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

/** A story that names a record, kept with the shelf it sits on. */
interface StoryShelf {
  category: string;
  interests: JourneyInterest[];
  ref: ExperienceReference;
}

/** An interest the record's own type or category carries. */
function recordBasis(interests: JourneyInterest[], detail: string): InterestBasis[] {
  return interests.map((interest) => ({ interest, kind: "record" as const, detail, refs: [] }));
}

/** The history interest, earned by being named in dated events. */
function historyBasis(refs: ExperienceReference[]): InterestBasis[] {
  if (refs.length === 0) return [];
  return [
    {
      interest: "history",
      kind: "history",
      detail: `named in ${refs.length} dated ${refs.length === 1 ? "event" : "events"} in this destination's history`,
      refs,
    },
  ];
}

/**
 * Interests earned through stories, grouped by the shelf they came from.
 *
 * One entry per (interest, category) pair, so "nature" earned through Sacred
 * Landscapes and through Nature & Culture reads as two separate, checkable
 * statements rather than one vague total.
 */
function storyBasis(shelves: StoryShelf[]): InterestBasis[] {
  const grouped = new Map<string, { interest: JourneyInterest; category: string; refs: ExperienceReference[] }>();
  for (const shelf of shelves) {
    for (const interest of shelf.interests) {
      const key = `${interest}::${shelf.category}`;
      const existing = grouped.get(key);
      if (existing) existing.refs.push(shelf.ref);
      else grouped.set(key, { interest, category: shelf.category, refs: [shelf.ref] });
    }
  }
  return [...grouped.values()]
    /* Stable order: strongest evidence first, then alphabetically. */
    .sort((a, b) => b.refs.length - a.refs.length || a.category.localeCompare(b.category))
    .map(({ interest, category, refs }) => ({
      interest,
      kind: "stories" as const,
      detail: `${refs.length} ${refs.length === 1 ? "story" : "stories"} shelved under ${category} name it`,
      refs,
    }));
}

/**
 * Build every candidate experience for a destination.
 *
 * Returns [] for a destination with no catalogued visitable records. That is a
 * real answer, and the planner surfaces it as a gap rather than filling it.
 */
export async function buildCandidates(destinationId: string): Promise<Experience[]> {
  const [sitesRaw, placesRaw, historyRaw, storiesRaw, culture] = await Promise.all([
    getSites(destinationId),
    getPlaces(destinationId),
    getHistory(destinationId),
    getStories(destinationId),
    getCultureRecords(destinationId),
  ]);

  const sites = sitesRaw as unknown as SiteRecord[];
  const places = placesRaw as unknown as PlaceRecord[];
  const history = historyRaw as unknown as HistoryRecord[];
  const stories = storiesRaw as unknown as StoryRecord[];

  /* Invert the graph once: slug -> the records that point at it. */
  const historyBySite = new Map<string, ExperienceReference[]>();
  const historyByPlace = new Map<string, ExperienceReference[]>();
  for (const event of history) {
    const ref: ExperienceReference = {
      slug: event.slug,
      title: event.title,
      /* A record from a compact format says where it lives; only the deep
         format has a page per event. */
      href: event.detailHref ?? destinationPath(destinationId, "history", event.slug),
    };
    for (const slug of event.relatedMonasteries ?? []) {
      historyBySite.set(slug, [...(historyBySite.get(slug) ?? []), ref]);
    }
    for (const slug of event.relatedPlaces ?? []) {
      historyByPlace.set(slug, [...(historyByPlace.get(slug) ?? []), ref]);
    }
  }

  const storiesBySite = new Map<string, ExperienceReference[]>();
  const storyShelvesBySite = new Map<string, StoryShelf[]>();
  const storiesByPlace = new Map<string, ExperienceReference[]>();
  const storyShelvesByPlace = new Map<string, StoryShelf[]>();
  for (const story of stories) {
    const ref: ExperienceReference = {
      slug: story.slug,
      title: story.title,
      href: story.detailHref ?? destinationPath(destinationId, "stories", story.slug),
    };
    const interests = STORY_CATEGORY_INTERESTS[story.category ?? ""] ?? [];
    /* The category travels with the reference. An interest earned through
       stories has to be able to name the shelf it came from — "3 stories
       shelved under Sacred Landscapes" — and that is impossible once the
       category has been flattened into a bare interest list. */
    const shelf: StoryShelf = { category: story.category ?? "", interests, ref };
    for (const slug of story.relatedMonasteries ?? []) {
      storiesBySite.set(slug, [...(storiesBySite.get(slug) ?? []), ref]);
      storyShelvesBySite.set(slug, [...(storyShelvesBySite.get(slug) ?? []), shelf]);
    }
    /*
     * `relatedPlaces` is the same kind of authored edge as
     * `relatedMonasteries` and was simply not being read: a town named by
     * eight food stories and a town named by none looked identical to the
     * planner, so "Culture" could not distinguish them. Reading it is not a
     * new relationship — it is the one the archive already states.
     */
    for (const slug of story.relatedPlaces ?? []) {
      storiesByPlace.set(slug, [...(storiesByPlace.get(slug) ?? []), ref]);
      storyShelvesByPlace.set(slug, [...(storyShelvesByPlace.get(slug) ?? []), shelf]);
    }
  }

  const experiences: Experience[] = [];

  for (const site of sites) {
    const historyRefs = historyBySite.get(site.slug) ?? [];
    const storyRefs = storiesBySite.get(site.slug) ?? [];
    /* A catalogued religious site is sacred heritage by definition; anything
       further comes from the stories and events that actually name it. */
    const typeLabel = site.tradition ? `${site.tradition} monastery` : "Heritage site";
    const interestBasis: InterestBasis[] = [
      ...recordBasis(["sacred", "heritage"], `catalogued as a ${typeLabel.toLowerCase()}`),
      ...historyBasis(historyRefs),
      ...storyBasis(storyShelvesBySite.get(site.slug) ?? []),
    ];
    const interests = uniq(interestBasis.map((basis) => basis.interest));

    experiences.push({
      id: `site:${site.slug}`,
      destinationId,
      title: site.name,
      kind: "site",
      typeLabel,
      area: site.district ?? null,
      coordinates: site.coordinates,
      summary: site.description,
      href: destinationPath(destinationId, "monasteries", site.slug),
      image: site.image ?? null,
      imageAlt: site.name,
      interests,
      interestBasis,
      historyRefs,
      storyRefs,
      evidence: site.wikipediaUrl
        ? [{ label: "Wikipedia", href: site.wikipediaUrl }]
        : [],
      /* Monastery records publish no permit or elevation field. */
      practical: [],
    });
  }

  for (const place of places) {
    const historyRefs = historyByPlace.get(place.slug) ?? [];
    const storyRefs = storiesByPlace.get(place.slug) ?? [];
    /*
     * A record that STATES its interests is believed; only one that does not
     * gets them inferred from its category. The category table was written
     * for one destination's vocabulary and does not know a ghat, a promenade
     * or a railway terminus — inferring for a compact record flattened a
     * whole riverfront to "heritage".
     */
    const stated = (place.interests ?? []).filter((interest): interest is JourneyInterest =>
      (ALL_INTERESTS as string[]).includes(interest),
    );
    const interestBasis: InterestBasis[] = [
      ...(stated.length > 0
        ? recordBasis(stated, "listed under it by the record itself")
        : recordBasis(
            PLACE_CATEGORY_INTERESTS[place.category] ?? ["heritage"],
            `catalogued as a ${place.category.toLowerCase()}`,
          )),
      ...historyBasis(historyRefs),
      ...storyBasis(storyShelvesByPlace.get(place.slug) ?? []),
    ];
    const interests = uniq(interestBasis.map((basis) => basis.interest));

    /* Practical notes: ONLY fields the record actually publishes. */
    const practical: PracticalNote[] = [];
    if (place.permitNote) practical.push({ label: "Permit", value: place.permitNote });
    if (typeof place.elevation === "number") {
      practical.push({ label: "Elevation", value: `${place.elevation.toLocaleString()} m` });
    }

    experiences.push({
      id: `place:${place.slug}`,
      destinationId,
      title: place.name,
      kind: "place",
      typeLabel: place.category,
      area: place.district ?? null,
      coordinates: place.coordinates,
      summary: place.description,
      href: place.detailHref ?? destinationPath(destinationId, "places", place.slug),
      image: place.image ?? null,
      imageAlt: place.imageAlt ?? place.name,
      interests,
      interestBasis,
      historyRefs,
      storyRefs,
      evidence: place.wikipediaUrl ? [{ label: "Wikipedia", href: place.wikipediaUrl }] : [],
      practical,
    });
  }

  /*
   * Food, festivals and crafts.
   *
   * These records existed, were sourced, carried vendored photographs, and
   * were rendered on the destination page — but never reached this pool, so
   * they contributed no interests and never appeared in discovery. Delhi
   * offered four interests while holding eight foods, six festivals and four
   * crafts; the content was not missing, it was unreachable.
   *
   * The interest each kind carries is the record's own classification
   * restated, exactly as `PLACE_CATEGORY_INTERESTS` restates a category. A
   * festival is culture because it is catalogued as a festival. Nothing here
   * infers a fact the capsule did not state.
   */
  for (const entry of culture) {
    const basisDetail = `catalogued as a ${entry.kind}`;
    const interestBasis = recordBasis(CULTURE_KIND_INTERESTS[entry.kind] ?? ["culture"], basisDetail);

    experiences.push({
      id: `culture:${entry.id}`,
      destinationId,
      title: entry.name,
      kind: "culture",
      typeLabel: CULTURE_KIND_LABEL[entry.kind] ?? "Cultural record",
      /* A dish or a festival belongs to a destination, not to a district. */
      area: null,
      summary: entry.summary,
      /*
       * The destination hub, where `DestinationCulture` renders these — NOT
       * the /culture route, which serves Sikkim's culture films and does not
       * read capsules at all. A dish has no page of its own, and one showing
       * a name and a sentence would be worse than the card it came from.
       */
      href: `${destinationPath(destinationId)}#culture-${entry.id}`,
      image: entry.image ?? null,
      imageAlt: entry.imageAlt ?? entry.name,
      interests: uniq(interestBasis.map((basis) => basis.interest)),
      interestBasis,
      historyRefs: [],
      storyRefs: [],
      evidence: [],
      /* A season is published only where a source states one in prose. */
      practical: entry.season ? [{ label: "Season", value: entry.season }] : [],
    });
  }

  /* Deterministic order before any scoring: same input, same itinerary. */
  return experiences.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Which interests this destination can actually satisfy.
 *
 * Objective 3: never show a wall of generic checkboxes. An interest appears
 * only when at least one real candidate supports it.
 */
export function availableInterests(candidates: Experience[]): JourneyInterest[] {
  const present = new Set<JourneyInterest>();
  for (const c of candidates) for (const i of c.interests) present.add(i);
  return [...present].sort();
}
