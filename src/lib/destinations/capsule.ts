import type {
  CapsuleValidation,
  DestinationCapsule,
} from "@/types/capsule";

/**
 * Capsule validation and adaptation.
 *
 * TWO JOBS, AND THE ORDER MATTERS
 * -------------------------------
 *   1. **Refuse a capsule that cannot be trusted.** Validation runs at the
 *      load boundary, before a single entry reaches a page. A capsule with an
 *      unsourced claim, a dangling source id, an image without alt text or a
 *      fabricated practical field is not partially rendered and not repaired
 *      — it is dropped, and the destination falls back to "not yet
 *      available". Failing closed is the whole point: a content format that
 *      silently degrades is a format that eventually ships a lie.
 *
 *   2. **Adapt it to the shapes the application already speaks.** Discovery,
 *      the planner, search and the global layer consume the *deep* format's
 *      record shapes. Rather than teach four subsystems a second model, a
 *      capsule is projected onto those shapes here. That projection is the
 *      reason Phase 17 adds no parallel architecture.
 *
 * NO RUNTIME IMPORTS
 * ------------------
 * Everything this file imports is `import type`, which TypeScript erases. That
 * is deliberate: it lets `scripts/qa/content-framework.mjs` import this module
 * directly under Node's type stripping and exercise the validator against real
 * fixtures, instead of asserting things about its source text.
 */

/* -------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */

/** Fields a capsule must never contain, whatever a future author intends. */
const FORBIDDEN_KEYS = [
  "price",
  "prices",
  "ticket",
  "tickets",
  "fee",
  "fees",
  "cost",
  "hours",
  "openingHours",
  "timings",
  "availability",
  "booking",
  "bookingUrl",
  "rating",
  "ratings",
  "stars",
  "rank",
  "ranking",
];

/**
 * Phrases that mark an unsupported ranking claim.
 *
 * A capsule is prose written by a person, so the schema alone cannot stop
 * "the most beautiful fort in India" appearing in a summary. This does. The
 * list is deliberately short and specific — it flags marketing superlatives,
 * not ordinary adjectives — and it applies to text the AUTHOR wrote, which is
 * every text field in a capsule.
 */
const FORBIDDEN_PHRASES = [
  "best destination",
  "best place",
  "most beautiful",
  "must see",
  "must-see",
  "must visit",
  "must-visit",
  "top 10",
  "top ten",
  "number one",
  "world famous",
  "world-famous",
  "unmissable",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** How a source may have been obtained. `model-proposed` is never publishable. */
const RETRIEVAL_METHODS = ["human-curated", "agent-api", "web-search", "model-proposed"];

function textOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textOf);
  if (value && typeof value === "object") return Object.values(value).flatMap(textOf);
  return [];
}

function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)]);
  }
  return [];
}

/**
 * Check a capsule. Returns every problem, not the first — an author fixing a
 * file should see the whole list once rather than discover it one line at a
 * time.
 */
export function validateCapsule(capsule: DestinationCapsule): CapsuleValidation {
  const errors: string[] = [];
  const sourceIds = new Set(capsule.sources.map((source) => source.id));
  const placeIds = new Set(capsule.places.map((place) => place.id));

  if (!capsule.destinationId) errors.push("destinationId is empty");
  if (!capsule.scope?.trim()) errors.push("scope is empty — say what this capsule covers");
  if (!ISO_DATE.test(capsule.reviewedAt ?? "")) {
    errors.push(`reviewedAt "${capsule.reviewedAt}" is not an ISO date`);
  }
  if (!capsule.reviewedBy?.trim()) errors.push("reviewedBy is empty — a capsule is reviewed by a person");

  /* Sources first: everything else cites them. */
  for (const source of capsule.sources) {
    if (!source.url?.startsWith("http")) {
      errors.push(`source ${source.id}: url must be a resolvable link`);
    }
    if (!source.publisher?.trim()) errors.push(`source ${source.id}: publisher is required`);
    if (!ISO_DATE.test(source.retrievedAt ?? "")) {
      errors.push(`source ${source.id}: retrievedAt "${source.retrievedAt}" is not an ISO date`);
    }
    if (!RETRIEVAL_METHODS.includes(source.retrievalMethod)) {
      errors.push(`source ${source.id}: retrievalMethod "${source.retrievalMethod}" is not one of ${RETRIEVAL_METHODS.join(", ")}`);
    }
    if (source.retrievalMethod === "model-proposed") {
      errors.push(
        `source ${source.id}: model-proposed sources may not be published — a model suggesting a citation is not a citation`,
      );
    }
  }
  const duplicateSources = capsule.sources
    .map((source) => source.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateSources.length > 0) {
    errors.push(`duplicate source ids: ${[...new Set(duplicateSources)].join(", ")}`);
  }

  /** Every factual item carries at least one resolvable citation. */
  const cited = (
    kind: string,
    items: { id: string; sourceIds: string[] }[],
  ) => {
    for (const item of items) {
      if (!item.sourceIds || item.sourceIds.length === 0) {
        errors.push(`${kind} ${item.id}: no source — every claim in a capsule cites one`);
        continue;
      }
      for (const id of item.sourceIds) {
        if (!sourceIds.has(id)) errors.push(`${kind} ${item.id}: cites unknown source "${id}"`);
      }
    }
  };

  cited("place", capsule.places);
  cited("experience", capsule.experiences);
  cited("history", capsule.history);
  cited("story", capsule.stories);
  cited("culture", capsule.culture ?? []);
  cited("stay", capsule.stays ?? []);

  /** Cross-references must resolve inside this capsule. */
  const references = (
    kind: string,
    items: { id: string; placeIds: string[] }[],
  ) => {
    for (const item of items) {
      for (const id of item.placeIds ?? []) {
        if (!placeIds.has(id)) errors.push(`${kind} ${item.id}: references unknown place "${id}"`);
      }
    }
  };
  references("experience", capsule.experiences);
  references("history", capsule.history);
  references("story", capsule.stories);
  references("culture", capsule.culture ?? []);

  for (const place of capsule.places) {
    if (place.image && !place.imageAlt?.trim()) {
      errors.push(`place ${place.id}: image without alt text`);
    }
    if (place.image && /^https?:/i.test(place.image)) {
      errors.push(`place ${place.id}: image must be a vendored local path, not a remote URL`);
    }
    if (place.coordinates) {
      const { lat, lng } = place.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        errors.push(`place ${place.id}: coordinates out of range`);
      }
    }
  }

  /*
   * PHASE B — the checks a bigger capsule needs.
   *
   * At six places a duplicate id or an empty title is obvious on sight. At
   * thirteen, across fourteen destinations, it is not, and a capsule that
   * fails quietly is worse than one that fails loudly — the validator drops
   * the whole file rather than rendering part of it.
   */
  const duplicatePlaces = capsule.places
    .map((place) => place.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicatePlaces.length > 0) {
    errors.push(`duplicate place ids: ${[...new Set(duplicatePlaces)].join(", ")}`);
  }
  for (const kind of ["experiences", "history", "stories", "culture", "stays"] as const) {
    /* `?? []` because culture and stays arrived after the first fixtures were
       written, and a validator that throws on an older shape cannot report
       what is wrong with it. */
    const ids = (capsule[kind] ?? []).map((item) => item.id);
    const duplicates = ids.filter((id, index, all) => all.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`duplicate ${kind} ids: ${[...new Set(duplicates)].join(", ")}`);
    }
  }

  for (const place of capsule.places) {
    if (!place.name?.trim()) errors.push(`place ${place.id}: name is empty`);
    if (!place.category?.trim()) errors.push(`place ${place.id}: category is empty`);
    if (!place.summary?.trim()) errors.push(`place ${place.id}: summary is empty`);
  }

  /*
   * CULTURE AND STAYS — the same rules as places, plus the ones that keep
   * these two kinds from quietly becoming a listings product.
   *
   * The type already makes a price or a phone number unspellable. These
   * checks cover what a type cannot: a `season` that is actually a date, and
   * a stay that has been given an implausible opening year by a parser.
   */
  const CULTURE_KINDS = new Set(["food", "festival", "craft"]);
  for (const entry of capsule.culture ?? []) {
    if (!entry.name?.trim()) errors.push(`culture ${entry.id}: name is empty`);
    if (!entry.summary?.trim()) errors.push(`culture ${entry.id}: summary is empty`);
    if (!CULTURE_KINDS.has(entry.kind)) {
      errors.push(`culture ${entry.id}: kind "${entry.kind}" is not food, festival or craft`);
    }
    if (entry.image && !entry.imageAlt?.trim()) {
      errors.push(`culture ${entry.id}: image without alt text`);
    }
    if (entry.image && /^https?:/i.test(entry.image)) {
      errors.push(`culture ${entry.id}: image must be a vendored local path, not a remote URL`);
    }
    /*
     * A season may say "in autumn" or "in the month of Shravan". It may not
     * say "14 October 2026" — that is a scheduling claim, and this product
     * has no feed that could keep it true.
     */
    if (entry.season && /\b\d{1,2}[\/-]\d{1,2}\b|\b(19|20)\d{2}\b/.test(entry.season)) {
      errors.push(`culture ${entry.id}: season "${entry.season}" looks like a specific date, not a recurring season`);
    }
  }

  for (const stay of capsule.stays ?? []) {
    if (!stay.name?.trim()) errors.push(`stay ${stay.id}: name is empty`);
    if (!stay.category?.trim()) errors.push(`stay ${stay.id}: category is empty`);
    if (!stay.summary?.trim()) errors.push(`stay ${stay.id}: summary is empty`);
    if (stay.image && !stay.imageAlt?.trim()) {
      errors.push(`stay ${stay.id}: image without alt text`);
    }
    if (stay.image && /^https?:/i.test(stay.image)) {
      errors.push(`stay ${stay.id}: image must be a vendored local path, not a remote URL`);
    }
    for (const [field, value] of [
      ["openedYear", stay.openedYear],
      ["buildingYear", stay.buildingYear],
    ] as const) {
      if (value === undefined) continue;
      if (!Number.isInteger(value) || value > 2026 || value < 1000) {
        errors.push(`stay ${stay.id}: ${field} ${value} is not a plausible year`);
      }
    }
    /* A hotel cannot have opened before the building it occupies existed. */
    if (
      stay.openedYear !== undefined &&
      stay.buildingYear !== undefined &&
      stay.openedYear < stay.buildingYear
    ) {
      errors.push(
        `stay ${stay.id}: opened ${stay.openedYear} predates its building of ${stay.buildingYear}`,
      );
    }
    if (stay.coordinates) {
      const { lat, lng } = stay.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        errors.push(`stay ${stay.id}: coordinates out of range`);
      }
    }
    /* A website is a link somebody can open, or it is not published. */
    if (stay.website !== undefined && !/^https?:\/\//i.test(stay.website)) {
      errors.push(`stay ${stay.id}: website "${stay.website}" is not a resolvable link`);
    }
    /*
     * A telephone number must look like one a source published: an
     * international form, not a fragment and not a placeholder. This is a
     * shape check, not a validity check — the guarantee that the number is
     * real comes from it having been retrieved rather than written.
     */
    if (stay.phone !== undefined && !/^\+?[\d][\d\s().-]{5,}$/.test(stay.phone)) {
      errors.push(`stay ${stay.id}: phone "${stay.phone}" is not a published telephone number`);
    }
  }

  /* A year, where one is stated, must be a year — and a capsule may not claim
     a date beyond the present, which is the shape a parsing bug takes. */
  const thisYear = 2026;
  for (const entry of capsule.history) {
    if (entry.year === undefined) continue;
    if (!Number.isInteger(entry.year) || entry.year > thisYear) {
      errors.push(`history ${entry.id}: year ${entry.year} is not a plausible year`);
    }
  }

  /* An interest must be one the planner's vocabulary knows, or discovery will
     silently drop the record it is attached to. */
  const INTERESTS = new Set([
    "history", "heritage", "culture", "architecture", "sacred",
    "museums", "nature", "food", "art", "local",
  ]);
  for (const experience of capsule.experiences) {
    for (const theme of experience.themes) {
      if (!INTERESTS.has(theme)) {
        errors.push(`experience ${experience.id}: "${theme}" is not a known interest`);
      }
    }
  }

  /* Two claims saying the same sentence are one claim counted twice. */
  const summaries = [...capsule.history, ...capsule.stories].map((item) => item.summary.trim());
  const duplicateClaims = summaries.filter((text, index, all) => all.indexOf(text) !== index);
  if (duplicateClaims.length > 0) {
    errors.push(`${new Set(duplicateClaims).size} claim(s) published more than once`);
  }

  for (const story of capsule.stories) {
    if (!story.claimType) {
      errors.push(`story ${story.id}: claimType is required — history, oral tradition and legend are never merged`);
    }
  }

  /* Fabrication guards. Both run over the whole document. */
  const forbiddenKeys = [...new Set(keysOf(capsule))].filter((key) =>
    FORBIDDEN_KEYS.includes(key),
  );
  if (forbiddenKeys.length > 0) {
    errors.push(
      `forbidden field(s) present: ${forbiddenKeys.join(", ")} — practical data must come from a verified source, not a capsule`,
    );
  }

  const haystack = textOf(capsule).join("   ").toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (haystack.includes(phrase)) {
      errors.push(`unsupported ranking claim: "${phrase}"`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    counts: {
      places: capsule.places.length,
      experiences: capsule.experiences.length,
      history: capsule.history.length,
      stories: capsule.stories.length,
      culture: (capsule.culture ?? []).length,
      stays: (capsule.stays ?? []).length,
      sources: capsule.sources.length,
    },
  };
}

/* -------------------------------------------------------------------------
   Adaptation — capsule shapes onto the shapes the app already consumes
   ------------------------------------------------------------------------- */

/**
 * A capsule place, in the shape `content.ts` hands to discovery, the planner
 * and the map.
 *
 * The deep format's `Place` carries more than this — a Wikipedia URL, a
 * district, a permit note, an elevation — and every one of those is optional
 * downstream, which is what makes the projection possible without either side
 * changing. `district` becomes the capsule's scope line, because that is the
 * only grouping a capsule genuinely has and the planner needs SOMETHING to
 * group a day by.
 */
export function capsulePlaces(capsule: DestinationCapsule) {
  const anchor = (hash: string) => `/destinations/${capsule.destinationId}/discover#${hash}`;

  /*
   * A place's interests come from the experiences that name it.
   *
   * Without this the planner falls back to guessing from the record's
   * category, and a category table written for Sikkim's vocabulary does not
   * know what a ghat is — Varanasi's riverfront came out as "Heritage" and
   * nothing else. The capsule already states which themes each place carries;
   * this is reading what it said.
   */
  const themesByPlace = new Map<string, string[]>();
  for (const experience of capsule.experiences) {
    for (const placeId of experience.placeIds) {
      themesByPlace.set(placeId, [
        ...new Set([...(themesByPlace.get(placeId) ?? []), ...experience.themes]),
      ]);
    }
  }

  return capsule.places.map((place) => ({
    slug: place.id,
    name: place.name,
    category: place.category,
    group: "Heritage",
    district: capsule.scope,
    coordinates: place.coordinates,
    description: place.summary,
    image: place.image ?? null,
    imageAlt: place.imageAlt ?? place.name,
    /* The first cited source doubles as the record's provenance link, which
       is what the deep format's `wikipediaUrl` is used for downstream. */
    wikipediaUrl: capsule.sources.find((source) => source.id === place.sourceIds[0])?.url,
    /*
     * Where this record's page is. A capsule place has no long-form page —
     * the discovery card IS its record, and it is anchored there. Consumers
     * prefer this over the deep format's `/places/<slug>` route, which for a
     * capsule would be a page with a name and one sentence on it.
     */
    detailHref: anchor(`place-${place.id}`),
    /** Stated by the capsule, not inferred from a category table. */
    interests: themesByPlace.get(place.id) ?? [],
  }));
}

/** Capsule history, in the shape the history accessors return. */
export function capsuleHistory(capsule: DestinationCapsule) {
  const anchor = (hash: string) => `/destinations/${capsule.destinationId}/discover#${hash}`;
  return capsule.history.map((entry) => ({
    slug: entry.id,
    title: entry.title,
    yearLabel: entry.period,
    shortDescription: entry.summary,
    relatedPlaces: entry.placeIds,
    relatedMonasteries: [],
    relatedStories: [],
    detailHref: anchor(`history-${entry.id}`),
  }));
}

/** Capsule stories, in the shape the story accessors return. */
export function capsuleStories(capsule: DestinationCapsule) {
  const anchor = (hash: string) => `/destinations/${capsule.destinationId}/discover#${hash}`;
  return capsule.stories.map((story) => ({
    slug: story.id,
    title: story.title,
    summary: story.summary,
    claimType: story.claimType,
    /* A capsule has no category shelves, so it declares none rather than
       inventing one: the planner's story-category interest mapping simply
       finds nothing, and the experience's own themes carry the interests. */
    category: undefined,
    relatedPlaces: story.placeIds,
    relatedMonasteries: [],
    detailHref: anchor(`story-${story.id}`),
  }));
}

/**
 * The interests a capsule can satisfy, taken from its experiences.
 *
 * Deliberately NOT derived from prose. An experience states its themes; a
 * capsule that carries no experience carries no interests, and the discovery
 * page then offers none rather than guessing from words in a summary.
 */
export function capsuleThemes(capsule: DestinationCapsule) {
  return [...new Set(capsule.experiences.flatMap((experience) => experience.themes))].sort();
}
