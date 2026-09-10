import { hasCapsuleId } from "@/data/destinations/capsules/ids";
import { getDestination } from "@/lib/destinations/registry";
import type { CapabilitySet, DestinationCapability, DestinationSummary } from "@/types/destination";

/**
 * Destination-scoped content access.
 *
 * WHY EVERY ACCESSOR IS ASYNC
 * ---------------------------
 * Each one dynamically imports the module it needs. Two reasons:
 *
 *   1. Bundle cost. A static import here would make every consumer of this
 *      module pull in every content module — Sikkim's travel-agent register
 *      alone is 24,000 lines of JSON. Dynamic import means a page pays for
 *      the content it renders and nothing else.
 *
 *   2. Absent content is normal. A planned destination has no modules to
 *      load. Returning [] from an async accessor is the natural shape for
 *      that, and it means a destination with no data cannot crash a page —
 *      it renders as empty, which the capability model then hides entirely.
 *
 * These run in server components at build time, so nothing here reaches the
 * browser. Do not call them from a client component.
 *
 * WHY THE SIKKIM BRANCH IS EXPLICIT
 * ---------------------------------
 * Sikkim's content lives in modules written before destinations existed, and
 * Phase 2 deliberately does not rewrite them (270 indexed pages, and the
 * §22-sourced records are the product's credibility base). So this layer
 * ADAPTS them to the destination interface rather than migrating them. When
 * a second destination is populated it registers here the same way, and the
 * pages above this layer do not change.
 */

/** Every accessor returns [] for a destination that has no such content. */
const EMPTY: never[] = [];

function isSikkim(destinationId: string): boolean {
  return destinationId === "sikkim";
}

/**
 * PHASE 17 — the second content format.
 *
 * A destination now gets its content from one of two places: Sikkim's deep
 * modules, or a capsule. This layer is where that choice is made, and it is
 * the ONLY place that knows there are two formats. Everything above it —
 * discovery, the planner, search, comparison, the global layer — receives the
 * same record shapes it always did, because `capsule.ts` projects a capsule
 * onto them.
 *
 * The capsule is loaded once per accessor call and memoised per request by
 * the module system's own import cache; the importer itself is lazy, so a
 * destination without a capsule pays nothing and a destination with one pays
 * only for its own file.
 */
async function capsuleFor(destinationId: string) {
  /*
   * Membership is answered from `ids.ts`, which imports nothing. A
   * destination without a capsule therefore performs NO dynamic import at all
   * — the guarantee `qa:destination` has asserted since Phase 2.5, preserved
   * now that there is a second content format to ask about.
   */
  if (isSikkim(destinationId) || !hasCapsuleId(destinationId)) return null;
  const { loadCapsule } = await import("@/data/destinations/capsules");
  return loadCapsule(destinationId);
}

/* -------------------------------------------------------------------------
   Content accessors
   ------------------------------------------------------------------------- */

/** Heritage sites. In Sikkim these are the catalogued monasteries. */
export async function getSites(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { monasteries } = await import("@/data/monasteries");
  return monasteries;
}

/** Sites that carry an authoritative coordinate and may be plotted. */
export async function getMappableSites(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { mappableMonasteries } = await import("@/data/monasteries");
  return mappableMonasteries;
}

export async function getPlaces(destinationId: string) {
  if (isSikkim(destinationId)) {
    const { places } = await import("@/data/places");
    return places;
  }
  const capsule = await capsuleFor(destinationId);
  if (!capsule) return EMPTY;
  const { capsulePlaces } = await import("@/lib/destinations/capsule");
  return capsulePlaces(capsule);
}

export async function getStories(destinationId: string) {
  if (isSikkim(destinationId)) {
    const { stories } = await import("@/data/stories/index");
    return stories;
  }
  const capsule = await capsuleFor(destinationId);
  if (!capsule) return EMPTY;

  /*
   * A capsule's own "stories" were place records under another name: the
   * title was the place's name, the body was one sentence from that place's
   * article, and seven of them sat under Stories on Paris's hub while the
   * same seven places sat under Places three sections above.
   *
   * Where retrieved narrative exists for a destination it REPLACES them
   * rather than joining them, because the two would be the same subjects
   * twice. Everything above this layer — the detail route, the capability
   * that opens it, the index, the nav entry — keys on `content`, so nothing
   * else has to know this happened.
   */
  const { editorialStories, hasEditorialStories } = await import(
    "@/data/generated/stories/index"
  );
  if (hasEditorialStories(destinationId)) {
    const editorial = await editorialStories(destinationId);
    if (editorial.length > 0) return editorial;
  }

  const { capsuleStories } = await import("@/lib/destinations/capsule");
  return capsuleStories(capsule);
}

export async function getHistory(destinationId: string) {
  if (isSikkim(destinationId)) {
    const { historyEvents } = await import("@/data/history");
    return historyEvents;
  }
  const capsule = await capsuleFor(destinationId);
  if (!capsule) return EMPTY;

  /*
   * A capsule's events were a building's founding date and one sentence, so
   * `historyPages` was false and the timeline was a flat list with no eras.
   * Where retrieved prose exists it REPLACES them — same subjects, more of
   * them — and everything above this layer keys on `description`, so the
   * detail route, the capability and the nav entry follow without being told.
   */
  const { editorialHistory, hasEditorialHistory } = await import(
    "@/data/generated/history/index"
  );
  if (hasEditorialHistory(destinationId)) {
    const enriched = await editorialHistory(destinationId);
    if (enriched.length > 0) return enriched as never[];
  }
  const { capsuleHistory } = await import("@/lib/destinations/capsule");
  return capsuleHistory(capsule);
}

export async function getCulture(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { cultureVideos } = await import("@/data/culture-videos");
  return cultureVideos;
}

export async function getStays(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { publicStays } = await import("@/data/curated-stays");
  return publicStays;
}

/**
 * A capsule destination's food, festivals and crafts.
 *
 * Deliberately NOT folded into `getCulture`. That returns Sikkim's culture
 * *films* — a different shape entirely — and a function whose return type
 * depends on which destination you pass it is the kind of convenience that
 * costs a type error later. Sikkim keeps its own richer surfaces; the other
 * fourteen get these.
 */
export async function getCapsuleCulture(destinationId: string) {
  const capsule = await capsuleFor(destinationId);
  return capsule?.culture ?? [];
}

/**
 * A destination's food, festivals and crafts, for consumers above this layer.
 *
 * Identical in behaviour to `getCapsuleCulture` and deliberately different in
 * name. The planner and discovery must not know which storage format a
 * destination uses — that is this layer's single job, and a consumer that
 * imports something called `getCapsuleCulture` has been told. Sikkim answers
 * with an empty list because its culture is held as films in a different
 * shape, not because it has no culture; when a second format grows these
 * records, it is answered from here and no consumer changes.
 */
export async function getCultureRecords(destinationId: string) {
  return getCapsuleCulture(destinationId);
}

/**
 * A capsule destination's documented places to stay.
 *
 * Separate from `getStays` for the same reason, and for a sharper one:
 * Sikkim's stays come from the state's licensed-operator register and carry a
 * licence status, a grade and a real provenance chain. These are heritage
 * records that happen to be hotels. Merging them would let a page render one
 * as though it were the other.
 */
export async function getCapsuleStays(destinationId: string) {
  const capsule = await capsuleFor(destinationId);
  return capsule?.stays ?? [];
}

export async function getArchive(destinationId: string) {
  if (!isSikkim(destinationId)) {
    /*
     * A catalogue retrieved from open collections. Sikkim's archive is a
     * different corpus with its own vocabulary; this is the other fourteen's,
     * and its presence is what turns their `archive` capability on.
     */
    const { archiveObjects, hasArchive } = await import("@/data/generated/archive/index");
    if (hasArchive(destinationId)) {
      const objects = await archiveObjects(destinationId);
      if (objects.length > 0) return objects as never[];
    }
  }
  return getArchiveInner(destinationId);
}

async function getArchiveInner(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { archiveItems } = await import("@/data/archive");
  return archiveItems;
}

export async function getMapSites(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { mapSites } = await import("@/data/map-sites");
  return mapSites;
}

export async function getAudioGuides(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { audioGuides } = await import("@/data/audio");
  return audioGuides;
}

export async function getPanoramas(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { panoramas } = await import("@/data/panoramas");
  return panoramas;
}

export async function getTradeOperators(destinationId: string) {
  if (!isSikkim(destinationId)) return EMPTY;
  const { travelAgents } = await import("@/data/travel-agents");
  return travelAgents;
}

/**
 * Sources citable as evidence for this destination.
 *
 * Phase 2.5 replaced a Sikkim-only stub with real scoping. Every source now
 * declares whether it is destination-specific, country-wide or a global
 * reference work, and this filters on that declaration — so a planned
 * destination correctly receives the global reference works (Wikipedia,
 * Commons, OpenStreetMap) and none of Sikkim's government portals.
 *
 * The destination's country is passed through so `country`-scoped sources
 * resolve; a source scoped to a country fails closed when none is supplied.
 */
export async function getSources(destinationId: string) {
  const destination = getDestination(destinationId);
  if (!destination) return EMPTY;
  const { sourcesForDestination } = await import("@/data/sources");
  return sourcesForDestination(destinationId, destination.country.code);
}

/**
 * The capsule itself, for surfaces that render its own shape — its scope
 * line, its experiences and its citation list. Null for Sikkim (which has the
 * deep format) and for a destination with no capsule.
 */
export async function getCapsule(destinationId: string) {
  return capsuleFor(destinationId);
}

/* -------------------------------------------------------------------------
   Capabilities — derived, never declared
   ------------------------------------------------------------------------- */

const NO_CAPABILITIES: CapabilitySet = {
  knowledge: false,
  sites: false,
  places: false,
  stories: false,
  history: false,
  storyPages: false,
  historyPages: false,
  culture: false,
  festivals: false,
  food: false,
  stays: false,
  trade: false,
  archive: false,
  map: false,
  audio: false,
  video: false,
  panorama: false,
  permits: false,
  responsible: false,
  preservation: false,
  experiences: false,
  tripPlanner: false,
};

/**
 * Work out what a destination can actually offer by looking at its content.
 *
 * Nothing here is hand-declared. A capability flag that is maintained by hand
 * drifts the moment someone adds content and forgets to flip it, or flips it
 * hoping content will follow — and then the navigation promises a section
 * that renders empty. Deriving from presence means the flag cannot lie, which
 * is what makes "no blank cards, no broken sections, no fake placeholders" a
 * structural guarantee rather than a thing to remember.
 *
 * A planned destination short-circuits: no content modules are loaded at all.
 */
export async function resolveCapabilities(destinationId: string): Promise<CapabilitySet> {
  const destination = getDestination(destinationId);
  if (!destination) return NO_CAPABILITIES;

  /*
   * Published knowledge is the one capability a `planned` destination can
   * gain, and only by going through research, review and approval. It is
   * checked before the planned short-circuit for exactly that reason: a
   * destination with reviewer-approved facts is no longer "not yet
   * available", even though it is nothing like Sikkim.
   */
  const { hasPublishedKnowledge } = await import("@/data/published-knowledge");
  const knowledge = hasPublishedKnowledge(destinationId);

  /*
   * PHASE 17: a capsule overrides the `planned` short-circuit.
   *
   * Depth is declared on the registry record and a capsule is a separate
   * file, so the two can disagree — someone adds the capsule and forgets the
   * depth. Capabilities are derived from CONTENT PRESENCE, and that rule has
   * to survive a stale declaration: if the capsule is there, its content is
   * real and the destination is not "planned", whatever the record says.
   */
  const capsule = await capsuleFor(destinationId);

  if (destination.depth === "planned" && !knowledge && !capsule) return NO_CAPABILITIES;
  if (destination.depth === "planned" && !capsule) {
    return { ...NO_CAPABILITIES, knowledge: true };
  }

  const [
    sites, places, stories, history, culture, cultureRecords,
    stays, archive, map, audio, panoramas, trade,
  ] =
    await Promise.all([
      getSites(destinationId),
      getPlaces(destinationId),
      getStories(destinationId),
      getHistory(destinationId),
      getCulture(destinationId),
      /* The other fourteen's own food, festival and craft records. */
      getCultureRecords(destinationId),
      getStays(destinationId),
      getArchive(destinationId),
      getMapSites(destinationId),
      getAudioGuides(destinationId),
      getPanoramas(destinationId),
      getTradeOperators(destinationId),
    ]);

  /*
   * Festivals and food are story categories rather than separate corpora, so
   * they are derived from the stories that carry those categories — matching
   * how the archive actually shelves them.
   */
  const categories = new Set(
    (stories as { category?: string }[]).map((s) => s.category).filter(Boolean) as string[],
  );

  return {
    knowledge,
    sites: sites.length > 0,
    places: places.length > 0,
    stories: stories.length > 0,
    history: history.length > 0,
    /* Long-form records carry `content` / `description` paragraphs. A capsule
       entry has neither, so it gets no section index and no detail page —
       and the index cannot fall back to Sikkim's, which is what it did. */
    storyPages: stories.some((story) => "content" in (story as object)),
    historyPages: history.some((event) => "description" in (event as object)),
    /*
     * Culture is EITHER Sikkim's films OR a destination's own documented
     * subjects. It was the first only, so fourteen destinations holding 195
     * food, festival and craft records between them had no Culture route and
     * no Culture entry in their navigation — the records rendered as three
     * short blocks partway down the hub and stopped there.
     */
    culture: culture.length > 0 || cultureRecords.length > 0,
    festivals: categories.has("Festivals"),
    food: categories.has("Food & Flavours"),
    stays: stays.length > 0,
    trade: trade.length > 0,
    archive: archive.length > 0,
    map: map.length > 0,
    audio: audio.length > 0,
    /* Video coverage travels with the culture shelves in this dataset. */
    video: culture.length > 0,
    /* A panorama record exists only where a capture was actually published. */
    panorama: panoramas.length > 0,
    /*
     * Practical and editorial pages are authored per destination, not
     * derived from a corpus. Sikkim has them; a destination that has not
     * been researched has not had them written, and must not link to them.
     */
    /*
     * A journey can be planned wherever there is something sourced to visit.
     * Derived from content presence like every other capability — never
     * declared — so a destination cannot advertise a planner over an empty
     * experience set. Distinct from `tripPlanner` below, which is the
     * Sikkim-only road-corridor itinerary.
     */
    experiences: sites.length > 0 || places.length > 0,
    permits: destination.depth === "deep",
    responsible: destination.depth === "deep",
    preservation: destination.depth === "deep",
    /*
     * The planner needs a hand-authored road-corridor graph. Sikkim has one;
     * nothing else does, and inventing travel times is exactly the kind of
     * fabrication this project deleted once. See
     * docs/trip-planner-generalization-notes.md.
     */
    tripPlanner: destination.depth === "deep",
  };
}

export async function getDestinationSummary(destinationId: string): Promise<DestinationSummary | null> {
  const destination = getDestination(destinationId);
  if (!destination) return null;
  const capabilities = await resolveCapabilities(destinationId);
  return {
    destination,
    capabilities,
    hasContent: Object.values(capabilities).some(Boolean),
  };
}

export function availableCapabilities(capabilities: CapabilitySet): DestinationCapability[] {
  return (Object.keys(capabilities) as DestinationCapability[]).filter((k) => capabilities[k]);
}
