import { TSD_FEE_PER_PERSON } from "@/lib/booking";
import type { PlannerInterest, PlannerPreferences, PlannerStyle } from "@/types";

/**
 * The route half of the trip planner.
 *
 * WHAT THIS FILE IS
 * -----------------
 * It decides WHERE the traveller sleeps, in what order, on which day, and
 * WHICH archive records fill each half of each day. It resolves none of them:
 * a day here holds `{ kind: "place", slug: "tsomgo-lake" }`, never a sentence.
 * The prose comes from the record itself in `src/app/planner/_lib/itinerary.ts`,
 * which reads `src/data/places.ts` and `src/data/monasteries.ts` and copies
 * their own sourced descriptions.
 *
 * That split is not tidiness. `PlannerForm` is a client component and shows a
 * live route preview, so whatever it imports is shipped to the browser —
 * `src/data/monasteries.ts` pulls 400 KB of audio-guide JSON behind it. Slugs
 * are strings, so the form can preview the real route without any of that.
 *
 * WHAT REPLACED WHAT, AND WHY
 * ---------------------------
 * The previous version held four hand-written "anchors", each with two to four
 * hand-written day templates, and cycled them with `templates[i % length]`. It
 * produced, verifiably:
 *
 *   - /planner/result?duration=14 → Days 5–8 repeated Days 1–4 word for word,
 *     including "Arrive in Gangtok · Airport/NJP pickup" on Day 5 of a trip
 *     already five days old.
 *   - /planner/result?duration=10 → Day 10 slept in Lachung (north), Day 11
 *     opened at Buddha Park in Ravangla (south) with no drive between them.
 *     That is roughly 250 km of mountain road, unmentioned and unbudgeted.
 *   - /planner/result?duration=8 → Lachung → Pelling as one day, described as
 *     "Drive west along the Rangeet gorge (5–6 h)" — a fabricated road time,
 *     and measured from Gangtok, where the traveller was not.
 *   - Every day's prose was invented: momo-making sessions, bonfires, hotel
 *     stoves, "5–6 h" drives. None of it came from a source.
 *
 * The rules that replaced it:
 *
 *   1. Sikkim's roads radiate from Gangtok. Bases are connected by an explicit
 *      corridor graph (CORRIDOR) built from that road structure, and a plan may
 *      only move between adjacent bases. `repairRoute` enforces it after the
 *      fact as well, so no future edit can smuggle an undrivable hop back in.
 *   2. North Sikkim is a loop, not a stop. Any northern block starts from
 *      Gangtok, and its last day drives back to Gangtok. It is never entered or
 *      left sideways.
 *   3. A base change costs a day. The drive is the day's morning, not a line of
 *      prose stapled to a sightseeing day.
 *   4. Nothing is visited twice. A global used-set spans the whole trip.
 *   5. A day is one cluster of neighbours, so the day does not criss-cross.
 *   6. Days are only allotted to a base while that base still has unvisited
 *      clusters. That is what makes the repeat-day bug unrepresentable.
 */

/* ==========================================================================
   Bases, and the roads between them
   ========================================================================== */

export type BaseKey = "gangtok" | "lachen" | "lachung" | "ravangla" | "pelling" | "zuluk";

/**
 * Where a plan can sleep. `placeSlug` points at the record in
 * `src/data/places.ts` that carries the coordinate and the description —
 * neither is repeated here, so neither can drift.
 */
export const BASES: Record<BaseKey, { name: string; placeSlug: string }> = {
  gangtok: { name: "Gangtok", placeSlug: "gangtok" },
  lachen: { name: "Lachen", placeSlug: "lachen" },
  lachung: { name: "Lachung", placeSlug: "lachung" },
  ravangla: { name: "Ravangla", placeSlug: "ravangla" },
  pelling: { name: "Pelling", placeSlug: "pelling" },
  zuluk: { name: "Zuluk", placeSlug: "dzuluk" },
};

/**
 * The road structure, as an adjacency list.
 *
 * `via` names only towns that exist in `src/data/places.ts`, so the result page
 * can link every one of them to its own sourced record. Rangpo and Legship are
 * on two of these roads and are deliberately not named: this archive holds no
 * record for either, and an itinerary should not be the first place a name
 * appears.
 *
 * `stops` are the archive records that lie on that road — candidates for the
 * afternoon of a driving day, in preference order.
 */
interface CorridorEdge {
  a: BaseKey;
  b: BaseKey;
  via: string[];
  stops: { kind: StopKind; slug: string }[];
}

const p = (slug: string) => ({ kind: "place" as const, slug });
const m = (slug: string) => ({ kind: "monastery" as const, slug });

const CORRIDOR: CorridorEdge[] = [
  {
    a: "gangtok",
    b: "lachen",
    via: ["mangan", "chungthang"],
    stops: [p("kabi-lungchok"), m("phodong"), m("phensang"), p("mangan"), p("chungthang")],
  },
  {
    a: "gangtok",
    b: "lachung",
    via: ["mangan", "chungthang"],
    stops: [p("kabi-lungchok"), m("phodong"), m("phensang"), p("mangan"), p("chungthang")],
  },
  { a: "lachen", b: "lachung", via: ["chungthang"], stops: [p("chungthang")] },
  { a: "gangtok", b: "ravangla", via: ["singtam"], stops: [p("temi-tea-garden"), p("singtam")] },
  {
    a: "gangtok",
    b: "pelling",
    via: ["singtam", "ravangla", "gyalshing"],
    stops: [p("buddha-park-ravangla"), p("temi-tea-garden"), p("gyalshing")],
  },
  {
    a: "ravangla",
    b: "pelling",
    via: ["gyalshing"],
    stops: [m("tashiding"), p("gyalshing")],
  },
  { a: "gangtok", b: "zuluk", via: ["rongli"], stops: [p("rongli"), p("aritar")] },
];

function edgeBetween(a: BaseKey, b: BaseKey): CorridorEdge | undefined {
  return CORRIDOR.find((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
}

/** Bases reachable from `base` without an intervening night. */
function neighbours(base: BaseKey): BaseKey[] {
  return CORRIDOR.filter((edge) => edge.a === base || edge.b === base).map((edge) =>
    edge.a === base ? edge.b : edge.a,
  );
}

/**
 * Shortest chain of bases between two points, inclusive of both ends.
 *
 * A result longer than two means the hop cannot be driven without sleeping
 * somewhere in between — the Lachung → Ravangla class of defect. `repairRoute`
 * uses it to refuse such a day rather than print it.
 */
export function corridorPath(from: BaseKey, to: BaseKey): BaseKey[] {
  if (from === to) return [from];
  const queue: BaseKey[][] = [[from]];
  const seen = new Set<BaseKey>([from]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1]!;
    for (const next of neighbours(last)) {
      if (seen.has(next)) continue;
      const extended = [...path, next];
      if (next === to) return extended;
      seen.add(next);
      queue.push(extended);
    }
  }
  return [from, to];
}

/* ==========================================================================
   The catalogue: which archive record is visited from which base
   ========================================================================== */

export type DaySlot = "Morning" | "Afternoon" | "Evening";
/** How much of the day the PLAN sets aside. Not an opening time — see UI note. */
export type StopHold = "Half day" | "Short stop";
export type StopKind = "place" | "monastery";

interface CatalogueStop {
  kind: StopKind;
  slug: string;
  /** Day-cluster this belongs to: one cluster is at most one day. */
  cluster: string;
  interests: PlannerInterest[];
  hold: StopHold;
}

/**
 * Day clusters.
 *
 * A cluster is a set of sites close enough to each other to be one day from
 * one base, and it is the unit a day is built from. Grouping is what stops a
 * day reading Rumtek → Nathu La → Rabdentse; the result page checks it again
 * against the published coordinates, because a cluster typed by hand is still
 * typed by hand.
 */
interface Cluster {
  id: string;
  base: BaseKey;
  /**
   * Whether the day stays within reach of the base in the evening.
   *
   * A day out to Tsomgo, Yumthang or Varsey ends with the drive back, so it
   * gets two sites and an evening at the base. Only a cluster in the base's own
   * town may fill all three slots. The planner used to schedule an evening at
   * an alpine sanctuary 40 km up a border road.
   */
  local: boolean;
  /** Permit destinations, by slug in src/data/permits.ts, that this day enters. */
  permits: string[];
  stops: CatalogueStop[];
}

function cluster(
  id: string,
  base: BaseKey,
  local: boolean,
  permits: string[],
  stops: [StopKind, string, PlannerInterest[], StopHold][],
): Cluster {
  return {
    id,
    base,
    local,
    permits,
    stops: stops.map(([kind, slug, interests, hold]) => ({
      kind,
      slug,
      cluster: id,
      interests,
      hold,
    })),
  };
}

const CLUSTERS: Cluster[] = [
  /* ------------------------------------------------------------- Gangtok */
  cluster("gangtok-town", "gangtok", true, [], [
    ["place", "gangtok", ["Culture", "Food"], "Short stop"],
    ["place", "do-drul-chorten", ["Monasteries", "Culture"], "Short stop"],
    ["place", "namgyal-institute-of-tibetology", ["Culture", "Monasteries"], "Half day"],
    ["place", "banjhakri-falls", ["Culture"], "Short stop"],
  ]),
  cluster("gangtok-ridge", "gangtok", true, [], [
    ["monastery", "enchey", ["Monasteries", "Culture"], "Half day"],
    ["monastery", "tsuklakhang", ["Monasteries", "Culture"], "Short stop"],
    ["place", "hanuman-tok", ["Culture"], "Short stop"],
  ]),
  cluster("gangtok-rumtek", "gangtok", false, [], [
    ["monastery", "rumtek", ["Monasteries", "Culture"], "Half day"],
    ["monastery", "lingdum", ["Monasteries", "Culture"], "Half day"],
    ["place", "fambong-lho", ["Trekking"], "Half day"],
  ]),
  cluster("gangtok-tsomgo", "gangtok", false, ["tsomgo-baba-mandir", "nathula-pass"], [
    ["place", "tsomgo-lake", ["Lakes", "Adventure"], "Half day"],
    ["place", "nathu-la", ["Adventure", "Culture"], "Half day"],
    ["place", "kyongnosla-alpine-sanctuary", ["Trekking"], "Short stop"],
  ]),
  cluster("gangtok-north-ridge", "gangtok", false, [], [
    ["monastery", "phodong", ["Monasteries", "Culture"], "Half day"],
    ["monastery", "phensang", ["Monasteries"], "Short stop"],
    ["place", "kabi-lungchok", ["Culture"], "Short stop"],
  ]),

  /* --------------------------------------------------------------- North */
  cluster("lachen-gurudongmar", "lachen", false, ["gurudongmar", "thangu-chopta-valley"], [
    ["place", "gurudongmar-lake", ["Lakes", "Adventure"], "Half day"],
    ["monastery", "lachen", ["Monasteries", "Culture"], "Short stop"],
    ["place", "lachen", ["Culture"], "Short stop"],
  ]),
  cluster("lachung-yumthang", "lachung", false, ["yumthang"], [
    ["place", "yumthang-valley", ["Adventure", "Trekking", "Lakes"], "Half day"],
    ["monastery", "lachung", ["Monasteries", "Culture"], "Short stop"],
    ["place", "lachung", ["Culture"], "Short stop"],
  ]),

  /* --------------------------------------------------------------- South */
  cluster("ravangla-buddha-park", "ravangla", true, [], [
    ["place", "buddha-park-ravangla", ["Monasteries", "Culture"], "Half day"],
    ["monastery", "ralang", ["Monasteries", "Culture"], "Half day"],
    ["place", "ravangla", ["Culture", "Food"], "Short stop"],
  ]),
  cluster("ravangla-maenam", "ravangla", false, ["maenam-trekking", "national-park-wildlife-sanctuary"], [
    ["place", "maenam-wildlife-sanctuary", ["Trekking", "Adventure"], "Half day"],
    ["monastery", "kewzing", ["Monasteries", "Culture"], "Short stop"],
  ]),
  cluster("ravangla-namchi", "ravangla", false, [], [
    ["place", "temi-tea-garden", ["Culture", "Food"], "Half day"],
    ["place", "namchi", ["Culture", "Monasteries"], "Half day"],
    ["place", "jorethang", ["Food", "Culture"], "Short stop"],
    ["place", "rangeet-teesta-confluence", ["Culture", "Lakes"], "Short stop"],
  ]),

  /* ---------------------------------------------------------------- West */
  cluster("pelling-pemayangtse", "pelling", true, [], [
    ["monastery", "pemayangtse", ["Monasteries", "Culture"], "Half day"],
    ["place", "rabdentse", ["Culture", "Trekking"], "Half day"],
    ["place", "pelling", ["Culture"], "Short stop"],
  ]),
  cluster("pelling-khecheopalri", "pelling", false, [], [
    ["place", "khecheopalri-lake", ["Lakes", "Culture"], "Half day"],
    ["place", "yuksom", ["Culture", "Monasteries"], "Half day"],
    ["monastery", "dubdi", ["Monasteries", "Trekking"], "Short stop"],
  ]),
  cluster("pelling-sanga-choeling", "pelling", false, [], [
    ["monastery", "sanga-choeling", ["Monasteries", "Trekking"], "Half day"],
    ["monastery", "tashiding", ["Monasteries", "Culture"], "Half day"],
    ["place", "gyalshing", ["Culture"], "Short stop"],
  ]),
  cluster("pelling-rinchenpong", "pelling", false, ["national-park-wildlife-sanctuary"], [
    ["monastery", "rinchenpong", ["Monasteries", "Culture"], "Half day"],
    ["place", "varsey-rhododendron-sanctuary", ["Trekking", "Adventure"], "Half day"],
    ["place", "soreng", ["Culture"], "Short stop"],
  ]),

  /* ------------------------------------------------------------ Silk road */
  cluster("zuluk-silk-route", "zuluk", true, [], [
    ["place", "dzuluk", ["Adventure", "Culture"], "Short stop"],
    ["place", "aritar", ["Culture", "Lakes"], "Half day"],
    ["place", "rongli", ["Culture"], "Short stop"],
  ]),
];

const CLUSTERS_BY_BASE = (base: BaseKey) => CLUSTERS.filter((c) => c.base === base);

function stopKey(stop: { kind: StopKind; slug: string }): string {
  return `${stop.kind}:${stop.slug}`;
}

function findCatalogueStop(ref: { kind: StopKind; slug: string }): CatalogueStop | undefined {
  for (const c of CLUSTERS) {
    const hit = c.stops.find((s) => s.kind === ref.kind && s.slug === ref.slug);
    if (hit) return hit;
  }
  return undefined;
}

/* ==========================================================================
   Pace — what the party size and travel style actually change
   ========================================================================== */

export interface Pace {
  key: "unhurried" | "standard";
  label: string;
  /** Sites the plan will schedule in one day. */
  maxStopsPerDay: number;
  /** Extra days a base change must leave spare before the plan will make one. */
  movePadding: number;
  note: string;
}

/**
 * Style and headcount used to change exactly one number: the TSD fee, and even
 * that was inferred rather than counted. They now change the plan.
 *
 * The rule is a planning choice and is stated as one. It claims nothing about
 * how fast anyone travels — it says what THIS plan does with the answer.
 */
export function paceFor(style: PlannerStyle, travellers: number): Pace {
  const unhurried = style === "Family" || style === "Group" || travellers >= 5;
  return unhurried
    ? {
        key: "unhurried",
        label: "Unhurried",
        maxStopsPerDay: 2,
        movePadding: 1,
        note: "Two sites a day, and a base is only changed when the trip has a spare day for the drive — the pace this plan uses for a family or a group.",
      }
    : {
        key: "standard",
        label: "Standard",
        maxStopsPerDay: 3,
        movePadding: 0,
        note: "Up to three sites a day. Each change of base still gets its own day for the drive.",
      };
}

/* ==========================================================================
   Which parts of Sikkim this trip can reach
   ========================================================================== */

type BlockKey = "north" | "west" | "south" | "silk";

interface Block {
  key: BlockKey;
  /** Days the block consumes, including its drive days. */
  cost: number;
  /** Shortest trip this block belongs in at all. */
  minDuration: number;
  score: number;
}

function blocksFor(interests: PlannerInterest[], pace: Pace): Block[] {
  const has = (interest: PlannerInterest) => (interests.includes(interest) ? 1 : 0);
  const pad = pace.movePadding;
  return [
    {
      key: "north",
      /* Up, one full day at altitude, and back. Nothing shorter is a real
         North Sikkim trip, which is why 6 days is the floor. */
      cost: 3,
      minDuration: 6 + pad,
      score: 2 + 3 * has("Lakes") + 3 * has("Adventure") + has("Trekking"),
    },
    {
      key: "west",
      cost: 3,
      minDuration: 5 + pad,
      score: 2 + 3 * has("Monasteries") + 2 * has("Culture") + has("Trekking") + has("Lakes"),
    },
    {
      key: "south",
      cost: 2,
      minDuration: 5 + pad,
      score: 1 + 2 * has("Monasteries") + 2 * has("Culture") + has("Food") + has("Trekking"),
    },
    {
      key: "silk",
      cost: 2,
      minDuration: 6 + pad,
      /* The old Tibet trade road is a border route on a separate permit. It is
         offered when someone asked for it, not as filler. */
      score: has("Adventure") ? 4 + has("Culture") : 0,
    },
  ];
}

/** Full days a base can fill before it runs out of unvisited clusters. */
function capacityOf(base: BaseKey): number {
  return CLUSTERS_BY_BASE(base).length;
}

/* ==========================================================================
   Day specs — the sleeping order, before any content
   ========================================================================== */

interface DaySpec {
  base: BaseKey;
  kind: "arrival" | "travel" | "full";
  from?: BaseKey;
  /** Where the drive sits in a travel day. Afternoon only for Lachen → Lachung. */
  legSlot?: DaySlot;
  /** Cluster the morning belongs to when the drive is in the afternoon. */
  morningCluster?: string;
}

function routeSpecs(duration: number, interests: PlannerInterest[], pace: Pace): DaySpec[] {
  const specs: DaySpec[] = [];
  const push = (spec: DaySpec) => specs.push(spec);

  /* Short trips stay in the east. Anything else spends the trip on the road. */
  if (duration <= 4) {
    push({ base: "gangtok", kind: "arrival" });
    for (let i = 1; i < duration; i++) push({ base: "gangtok", kind: "full" });
    return specs;
  }

  let gangtokDays = 2;
  let remaining = duration - gangtokDays;

  const chosen = new Map<BlockKey, number>();
  for (const block of blocksFor(interests, pace).sort((a, b) => b.score - a.score)) {
    if (block.score <= 0) continue;
    if (duration < block.minDuration) continue;
    if (remaining < block.cost + pace.movePadding) continue;
    chosen.set(block.key, block.cost);
    remaining -= block.cost;
  }

  /* Leftover days extend a stay rather than adding another drive. */
  let lachen = false;
  const order = blocksFor(interests, pace)
    .filter((block) => chosen.has(block.key))
    .sort((a, b) => b.score - a.score)
    .map((block) => block.key);

  let grew = true;
  while (remaining > 0 && grew) {
    grew = false;
    for (const key of order) {
      if (remaining === 0) break;
      const days = chosen.get(key)!;
      if (key === "west" && days < 1 + capacityOf("pelling")) {
        chosen.set(key, days + 1);
        remaining--;
        grew = true;
      } else if (key === "south" && days < 1 + capacityOf("ravangla")) {
        chosen.set(key, days + 1);
        remaining--;
        grew = true;
      } else if (
        key === "north" &&
        !lachen &&
        duration >= 9 &&
        (interests.includes("Lakes") || interests.includes("Adventure"))
      ) {
        /* The fourth day is what buys Lachen, and Lachen is what buys
           Gurudongmar. Below that the plan does not offer either. */
        lachen = true;
        chosen.set(key, days + 1);
        remaining--;
        grew = true;
      }
    }
    if (remaining > 0 && gangtokDays < 1 + capacityOf("gangtok")) {
      gangtokDays++;
      remaining--;
      grew = true;
    }
  }

  push({ base: "gangtok", kind: "arrival" });
  for (let i = 1; i < gangtokDays; i++) push({ base: "gangtok", kind: "full" });

  if (chosen.has("silk")) {
    push({ base: "zuluk", kind: "travel", from: "gangtok" });
    push({ base: "gangtok", kind: "travel", from: "zuluk" });
  }

  if (chosen.has("north")) {
    if (lachen) {
      push({ base: "lachen", kind: "travel", from: "gangtok" });
      push({
        base: "lachung",
        kind: "travel",
        from: "lachen",
        legSlot: "Afternoon",
        morningCluster: "lachen-gurudongmar",
      });
      push({ base: "lachung", kind: "full" });
      push({ base: "gangtok", kind: "travel", from: "lachung" });
    } else {
      push({ base: "lachung", kind: "travel", from: "gangtok" });
      push({ base: "lachung", kind: "full" });
      push({ base: "gangtok", kind: "travel", from: "lachung" });
    }
  }

  if (chosen.has("south")) {
    const days = chosen.get("south")!;
    push({ base: "ravangla", kind: "travel", from: "gangtok" });
    for (let i = 1; i < days; i++) push({ base: "ravangla", kind: "full" });
  }

  if (chosen.has("west")) {
    const days = chosen.get("west")!;
    push({
      base: "pelling",
      kind: "travel",
      from: chosen.has("south") ? "ravangla" : "gangtok",
    });
    for (let i = 1; i < days; i++) push({ base: "pelling", kind: "full" });
  }

  return specs;
}

/**
 * The guard that makes the impossible route unrepresentable.
 *
 * `routeSpecs` only ever emits adjacent hops, and this re-checks every one of
 * them against the corridor graph anyway. A hop that needs an intervening night
 * is rewritten into the nights it needs, and the tail of the trip is trimmed so
 * the day count the traveller asked for is still the day count they get.
 *
 * It has no effect on any plan this file currently produces. It is here so that
 * the next person to add a base cannot reintroduce Lachung → Ravangla by
 * forgetting a rule they never read.
 */
function repairRoute(specs: DaySpec[], duration: number): DaySpec[] {
  const repaired: DaySpec[] = [];
  for (const spec of specs) {
    if (spec.kind === "travel" && spec.from && spec.from !== spec.base) {
      const path = corridorPath(spec.from, spec.base);
      for (let i = 1; i < path.length - 1; i++) {
        repaired.push({ base: path[i]!, kind: "travel", from: path[i - 1]! });
      }
      repaired.push({ ...spec, from: path[path.length - 2]! });
    } else {
      repaired.push(spec);
    }
  }
  return repaired.slice(0, duration);
}

/* ==========================================================================
   Filling the days
   ========================================================================== */

export interface PlannedStop {
  slot: DaySlot;
  kind: StopKind;
  slug: string;
  hold: StopHold;
}

export interface PlannedTravel {
  slot: DaySlot;
  from: BaseKey;
  to: BaseKey;
  /** Place slugs of the towns the road runs through. */
  via: string[];
}

export interface PlannedDay {
  day: number;
  base: BaseKey;
  kind: DaySpec["kind"];
  travel?: PlannedTravel;
  stops: PlannedStop[];
  /** Permit destination slugs (src/data/permits.ts) this day's route enters. */
  permits: string[];
}

const SLOTS: DaySlot[] = ["Morning", "Afternoon", "Evening"];

function scoreCluster(c: Cluster, interests: PlannerInterest[], used: Set<string>): number {
  return c.stops
    .filter((stop) => !used.has(stopKey(stop)))
    .reduce(
      (total, stop) =>
        total + 1 + 2 * stop.interests.filter((i) => interests.includes(i)).length,
      0,
    );
}

function fillDays(specs: DaySpec[], interests: PlannerInterest[], pace: Pace): PlannedDay[] {
  const used = new Set<string>();
  const usedClusters = new Set<string>();
  const days: PlannedDay[] = [];

  /*
   * The day's cluster: the best-scoring one this base has not spent yet.
   *
   * When every cluster at a base has had its day and the base still has days
   * left, the one with the most sites still unvisited is re-opened. That is the
   * only way a base is visited twice, and it can only ever show sites the trip
   * has not already seen — which is what makes the old `templates[i % length]`
   * repeat (Day 5 of a 14-day trip re-running Day 1 verbatim) unrepresentable.
   */
  const takeCluster = (base: BaseKey): Cluster | undefined => {
    const ranked = CLUSTERS_BY_BASE(base)
      .map((c) => ({ c, score: scoreCluster(c, interests, used) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    return (ranked.find((entry) => !usedClusters.has(entry.c.id)) ?? ranked[0])?.c;
  };

  const takeShortStop = (base: BaseKey): CatalogueStop | undefined =>
    CLUSTERS_BY_BASE(base)
      .flatMap((c) => c.stops)
      .find((stop) => stop.hold === "Short stop" && !used.has(stopKey(stop)));

  specs.forEach((spec, index) => {
    const day: PlannedDay = {
      day: index + 1,
      base: spec.base,
      kind: spec.kind,
      stops: [],
      permits: [],
    };

    const addStop = (stop: CatalogueStop, slot: DaySlot) => {
      used.add(stopKey(stop));
      day.stops.push({ slot, kind: stop.kind, slug: stop.slug, hold: stop.hold });
      const owner = CLUSTERS.find((c) => c.id === stop.cluster);
      for (const permit of owner?.permits ?? []) {
        if (!day.permits.includes(permit)) day.permits.push(permit);
      }
    };

    if (spec.kind === "travel" && spec.from) {
      const edge = edgeBetween(spec.from, spec.base);
      const legSlot = spec.legSlot ?? "Morning";
      day.travel = {
        slot: legSlot,
        from: spec.from,
        to: spec.base,
        via: edge?.via ?? [],
      };

      /* Gurudongmar in the morning, the transfer down to Lachung after it —
         the only day in the plan whose drive is not the first thing in it. */
      if (legSlot === "Afternoon" && spec.morningCluster) {
        const morning = CLUSTERS.find((c) => c.id === spec.morningCluster);
        const first = morning?.stops.find((stop) => !used.has(stopKey(stop)));
        if (first) addStop(first, "Morning");
        if (morning) usedClusters.add(morning.id);
      }

      /* One halt on the road, from the archive's own records of that road. */
      if (legSlot === "Morning" && edge) {
        for (const ref of edge.stops) {
          const candidate = findCatalogueStop(ref);
          if (!candidate || used.has(stopKey(candidate))) continue;
          addStop(candidate, "Afternoon");
          break;
        }
      }

      const evening = takeShortStop(spec.base);
      if (evening) addStop(evening, "Evening");
    } else if (spec.kind === "arrival") {
      /* Arrival day: nothing before check-in, and nothing that needs a drive. */
      for (const slot of ["Afternoon", "Evening"] as DaySlot[]) {
        if (day.stops.length >= pace.maxStopsPerDay) break;
        const stop = takeShortStop(spec.base);
        if (stop) addStop(stop, slot);
      }
    } else {
      const chosen = takeCluster(spec.base);
      if (chosen) {
        usedClusters.add(chosen.id);
        /* A day out of town keeps its evening for the drive back. */
        const room = Math.min(pace.maxStopsPerDay, chosen.local ? 3 : 2);
        const available = chosen.stops.filter((stop) => !used.has(stopKey(stop)));
        available.slice(0, room).forEach((stop, position) => {
          addStop(stop, SLOTS[position] ?? "Evening");
        });
      }
    }

    days.push(day);
  });

  return days;
}

/* ==========================================================================
   The plan
   ========================================================================== */

export interface RouteRun {
  base: BaseKey;
  location: string;
  /** Nights, i.e. days spent based here in this unbroken run. */
  days: number;
  fromDay: number;
  toDay: number;
}

export interface ItineraryCost {
  tsd: number;
  chargeable: number;
  exempt: number;
}

export interface RoutePlan {
  days: number;
  nights: number;
  /** What was asked for, when it was outside 1–14 and had to be brought inside. */
  requestedDuration: number;
  durationAdjusted: boolean;
  interests: PlannerInterest[];
  travelStyle: PlannerStyle;
  travellers: number;
  pace: Pace;
  dayPlans: PlannedDay[];
  /** Consecutive days in one base, collapsed — the route in one line. */
  stops: RouteRun[];
  route: string;
  name: string;
  cost: ItineraryCost;
  /** Permit destination slugs across the whole route. */
  permits: string[];
}

export function planRoute(prefs: PlannerPreferences): RoutePlan {
  const requestedDuration = Math.round(prefs.duration) || 1;
  const duration = Math.min(14, Math.max(1, requestedDuration));
  const interests = prefs.interests.length ? prefs.interests : ["Culture" as const];
  const travellers = Math.min(20, Math.max(1, Math.round(prefs.travellers || 1)));
  const pace = paceFor(prefs.travelStyle, travellers);

  const specs = repairRoute(routeSpecs(duration, interests, pace), duration);
  const dayPlans = fillDays(specs, interests, pace);

  const stops: RouteRun[] = [];
  for (const day of dayPlans) {
    const last = stops[stops.length - 1];
    if (last && last.base === day.base) {
      last.days += 1;
      last.toDay = day.day;
    } else {
      stops.push({
        base: day.base,
        location: BASES[day.base].name,
        days: 1,
        fromDay: day.day,
        toDay: day.day,
      });
    }
  }

  /*
   * The statutory TSD fee, counted rather than inferred. It is the one figure
   * this project can state to the rupee; accommodation and transport have no
   * licensed rates feed behind them and are not estimated.
   */
  const exempt = Math.min(travellers, Math.max(0, Math.round(prefs.childrenUnderFive ?? 0)));
  const chargeable = travellers - exempt;

  const route = stops.map((stop) => stop.location).join(" → ");
  const permits = [...new Set(dayPlans.flatMap((day) => day.permits))];

  return {
    days: duration,
    nights: Math.max(0, duration - 1),
    requestedDuration,
    durationAdjusted: requestedDuration !== duration,
    interests,
    travelStyle: prefs.travelStyle,
    travellers,
    pace,
    dayPlans,
    stops,
    route,
    /*
     * The heading. It used to be the whole route string, which on a North
     * Sikkim loop runs to five arrows and wraps to three lines — and the route
     * is printed directly beneath it anyway. The route line is the better place
     * for the route, because it is the line that can show Gangtok twice without
     * reading like a mistake.
     */
    name: `${duration} ${duration === 1 ? "day" : "days"} in Sikkim`,
    cost: { tsd: TSD_FEE_PER_PERSON * chargeable, chargeable, exempt },
    permits,
  };
}

export { edgeBetween as corridorEdge };
