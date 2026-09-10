import type { GuideDestination, GuideIndex, GuideRecord, GuideRecordKind } from "@/lib/guide-index";

/**
 * The guide's response engine.
 *
 * Pure, synchronous, and deterministic: the same question always produces the
 * same answer, because the answer is retrieved rather than written. There is no
 * model here and no network call. Everything this returns is either a sentence
 * typed against a record, a list of records, or a count of them.
 *
 * WHAT "GROUNDED" MEANS IN PRACTICE
 *
 * The engine may say "Pemayangtse, founded 1705, Nyingma, Gyalshing district",
 * because each of those four values is a field on a record that cites its
 * source. It may say "three monasteries in Gyalshing", because that is a count.
 * It may not say "Pemayangtse is best visited in the morning", because no
 * record holds that, and there is no code path here that could produce it.
 *
 * When nothing matches, the engine says so and offers what it does hold. It
 * never pads an empty result — an honest "I don't have that" is the whole
 * reason this is a retrieval engine and not a chat model.
 *
 * SCOPE COMES FIRST
 *
 * The engine used to answer every question from Sikkim's corpus unless the
 * question happened to name another destination. On Kyoto's page, "temples"
 * listed Sikkim's monasteries, "hotels" listed Sikkim's register, "permits"
 * explained Sikkim's Protected Area Permit, and "hello" answered "Tashi
 * delek" — one destination presenting itself as the product, on fourteen
 * pages that were not about it.
 *
 * So `respond` now resolves a scope before anything else: a destination
 * named in the question wins, then the destination whose page the visitor is
 * on, then the whole archive. Sikkim keeps its deep engine — districts,
 * traditions, permits, the register, the fee — because only Sikkim holds
 * those records. Every other destination is answered by `respondDestination`
 * from its own places, experiences, history, stories, food, festivals, crafts
 * and documented stays, and nothing else.
 */

export type GuideItemKind = "monastery" | "destination" | GuideRecordKind;

export interface GuideItem {
  kind: GuideItemKind;
  title: string;
  meta: string;
  blurb?: string;
  href: string;
  external?: boolean;
}

export interface GuideChip {
  label: string;
  /** Text fed back into the engine when tapped. */
  send: string;
}

export type GuideBlock =
  | { kind: "text"; text: string }
  | { kind: "note"; text: string }
  | { kind: "items"; items: GuideItem[] }
  | { kind: "link"; href: string; label: string }
  | { kind: "chips"; chips: GuideChip[] };

export interface GuideReply {
  blocks: GuideBlock[];
}

/** Where the visitor is. The engine answers from that destination's records. */
export interface GuideContext {
  destinationId?: string | null;
}

const MAX_ITEMS = 6;

function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Word-boundary membership, for the destination engine's vocabularies.
 *
 * `hasAny` is a substring test, which is right for phrases ("how much") and
 * wrong for short words: "do" is inside "doors", "art" is inside "Chartar",
 * "eat" is inside "theatre". The destination vocabularies below hold words
 * like these, so they are tested as whole words. Sikkim's engine keeps
 * `hasAny` and its longer vocabularies unchanged.
 */
function hasWord(text: string, words: readonly string[]): boolean {
  return words.some((w) =>
    w.includes(" ") ? text.includes(w) : new RegExp(`\\b${w}\\b`).test(text),
  );
}

/**
 * Singular/plural forms of a token.
 *
 * Without this, asking for "lakes" returned two results and neither was
 * Tsomgo: every lake in the archive is recorded as "… Lake", singular, and a
 * word-boundary match on "lakes" hits none of them. The two it did return had
 * the plural sitting in their prose — a heritage site whose blurb mentions
 * lakes ranked above the actual lakes.
 */
function variants(token: string): string[] {
  const out = new Set([token]);
  if (token.endsWith("ies") && token.length > 4) out.add(`${token.slice(0, -3)}y`);
  if (token.endsWith("es") && token.length > 3) out.add(token.slice(0, -2));
  if (token.endsWith("s") && token.length > 3) out.add(token.slice(0, -1));
  return [...out];
}

/** Score a record against the query. Word-boundary aware, so "art" ≠ "Chartar". */
function score(haystack: string, tokens: string[]): number {
  const hay = normalise(haystack);
  let total = 0;
  for (const token of tokens) {
    if (token.length < 3) continue;
    let best = 0;
    for (const form of variants(token)) {
      if (hay === form) best = Math.max(best, 12);
      else if (new RegExp(`\\b${form}(s|es)?\\b`).test(hay)) best = Math.max(best, 6);
      else if (hay.includes(form)) best = Math.max(best, 2);
    }
    total += best;
  }
  return total;
}

/** Score against a record's NAME only — used for "rumtek", "tsomgo" lookups. */
function nameScore(name: string, tokens: string[]): number {
  return score(name, tokens);
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "is", "are",
  "was", "were", "be", "been", "i", "me", "my", "we", "us", "our", "you", "your",
  "what", "which", "who", "how", "can", "could", "would", "should", "do", "does",
  "did", "tell", "show", "give", "want", "like", "about", "with", "near", "there",
  "some", "any", "please", "thanks", "know", "see", "go", "get", "have", "has",
  "sikkim", "sikkimese", "place", "places", "thing", "things", "visit", "visiting",
]);

function tokenise(query: string): string[] {
  return normalise(query)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/* ------------------------------------------------------------------ intents */

const PLAN_WORDS = ["plan", "itinerary", "trip", "route", "days", "schedule", "journey"];
const MONASTERY_WORDS = ["monastery", "monasteries", "gompa", "gompas", "temple", "temples", "monk"];
const PLACE_WORDS = ["lake", "lakes", "pass", "waterfall", "peak", "hill", "park", "sanctuary", "hot spring", "valley", "river"];
const STORY_WORDS = ["story", "stories", "festival", "festivals", "food", "dance", "music", "craft", "legend", "tradition", "culture", "community"];
const STAY_WORDS = ["stay", "stays", "hotel", "hotels", "accommodation", "lodge", "resort", "where to sleep"];
const PERMIT_WORDS = ["permit", "permits", "pap", "ilp", "inner line", "restricted", "protected area"];
const FEE_WORDS = ["fee", "fees", "tsd", "levy", "tax", "charge", "sustainability"];
/* Money questions that are NOT about the state fee. Checked first, because
   "how much is a room at the Mayfair" is a rates question, and answering it
   with the ₹50 visitor fee would be answering a different question. */
const MONEY_WORDS = ["cost", "costs", "how much", "expensive", "cheap", "price", "budget", "money"];
const LODGING_WORDS = ["room", "rooms", "night", "hotel", "hotels", "stay", "resort", "lodge"];
const AUDIO_WORDS = ["audio", "narration", "narrated", "language", "languages", "listen", "guide in"];
const GREETING_WORDS = ["hi", "hello", "hey", "namaste", "namaskar", "tashi delek", "good morning", "good evening"];
const HELP_WORDS = ["help", "what can you", "who are you", "what do you", "capabilities"];
const COMPARE_WORDS = ["compare", "comparison", "versus", " vs ", "difference between"];

function districtIn(query: string, index: GuideIndex): string | null {
  const q = normalise(query);
  for (const d of index.districts) if (q.includes(normalise(d))) return d;
  /* Towns visitors name that are not districts. Each maps to the district the
     records actually carry, so the answer stays true to the data. */
  const ALIASES: Record<string, string> = {
    pelling: "Gyalshing",
    yuksom: "Gyalshing",
    geyzing: "Gyalshing",
    gyalshing: "Gyalshing",
    lachung: "Mangan",
    lachen: "Mangan",
    chungthang: "Mangan",
    "north sikkim": "Mangan",
    ravangla: "Namchi",
    namchi: "Namchi",
    "south sikkim": "Namchi",
    "west sikkim": "Gyalshing",
    "east sikkim": "Gangtok",
    rumtek: "Gangtok",
  };
  for (const [alias, district] of Object.entries(ALIASES)) {
    if (q.includes(alias)) return district;
  }
  return null;
}

function traditionIn(query: string, index: GuideIndex): string | null {
  const q = normalise(query);
  for (const t of index.traditions) if (q.includes(normalise(t))) return t;
  if (q.includes("nyingma")) return "Nyingma";
  if (q.includes("kagyu")) return "Kagyu";
  return null;
}

/* ------------------------------------------------------------------ helpers */

const monasteryItem = (m: GuideIndex["monasteries"][number]): GuideItem => ({
  kind: "monastery",
  title: m.name,
  meta: `${m.tradition} · ${m.district} · founded ${m.year}`,
  blurb: m.blurb,
  href: m.href,
});

const placeItem = (p: GuideIndex["places"][number]): GuideItem => ({
  kind: "place",
  title: p.name,
  meta: [p.category, `${p.district} district`, p.elevation ? `${p.elevation} m` : null]
    .filter(Boolean)
    .join(" · "),
  blurb: p.blurb,
  href: p.href,
});

const storyItem = (s: GuideIndex["stories"][number]): GuideItem => ({
  kind: "story",
  title: s.title,
  meta: `${s.category} · ${s.claim}`,
  blurb: s.blurb,
  href: s.href,
});

const stayItem = (s: GuideIndex["stays"][number]): GuideItem => ({
  kind: "stay",
  title: s.name,
  /* Most of the register carries no star category — 22 of 905 — so the meta
     line falls back to the address rather than printing an empty grade. */
  meta: [s.category, `${s.district} district`].filter(Boolean).join(" · "),
  blurb: s.address ?? undefined,
  href: s.href,
  external: true,
});

const KIND_LABEL: Record<GuideRecordKind, { one: string; many: string }> = {
  place: { one: "Place", many: "places" },
  experience: { one: "Experience", many: "experiences" },
  history: { one: "History", many: "dated events" },
  story: { one: "Story", many: "stories" },
  food: { one: "Food", many: "dishes" },
  festival: { one: "Festival", many: "festivals" },
  craft: { one: "Craft", many: "crafts" },
  stay: { one: "Stay", many: "documented stays" },
};

const recordItem = (r: GuideRecord): GuideItem => ({
  kind: r.kind,
  title: r.name,
  meta: [r.destinationName, KIND_LABEL[r.kind].one, r.category, r.season]
    .filter(Boolean)
    .join(" · "),
  blurb: r.blurb,
  href: r.href,
});

const STARTER_CHIPS: GuideChip[] = [
  { label: "Plan my trip", send: "plan my trip" },
  { label: "Monasteries near Pelling", send: "monasteries in Pelling" },
  { label: "Do I need a permit?", send: "permits" },
  { label: "What does it cost?", send: "fees" },
];

const GLOBAL_CHIPS: GuideChip[] = [
  { label: "Tell me about Kyoto", send: "Kyoto" },
  { label: "Tell me about Paris", send: "Paris" },
  { label: "Tell me about Varanasi", send: "Varanasi" },
  { label: "Compare two destinations", send: "compare" },
];

/**
 * The destination a question names, if any.
 *
 * People type "New York", not "New York City". Matching on the registry name
 * alone missed it — the one destination out of fifteen whose common name is
 * shorter than its registered one. So each destination is matched on its name
 * AND on that name minus a trailing generic word, and the LONGEST matching
 * key wins so a shorter alias can never shadow a fuller name.
 */
function namedDestination(q: string, index: GuideIndex): GuideDestination | undefined {
  const keys = (index.destinations ?? []).flatMap((d) => {
    const full = normalise(d.name);
    const short = full.replace(/\s+(city|prefecture)$/, "");
    const forms = short !== full && short.length > 2 ? [full, short] : [full];
    return forms.map((key) => ({ key, destination: d }));
  });
  return keys
    .filter(({ key }) => key.length > 2 && q.includes(key))
    .sort((a, b) => b.key.length - a.key.length)[0]?.destination;
}

/**
 * A landmark named in the question, wherever it is catalogued.
 *
 * "What is the ticket price for the Colosseum?" names no destination, so it
 * used to be answered by the generic fee handler — which returned Sikkim's
 * statutory visitor fee. That fee is real and correctly labelled, so nothing
 * was fabricated; it was simply the wrong place. A reader asking about Rome
 * should be told about Rome.
 *
 * Only names of six characters or more are matched. "Fort", "Museum" and
 * "Palace" appear in dozens of records across the archive, and a short-name
 * match would send half the questions in the product to whichever
 * destination happened to sort first.
 */
function namedRecordIn(q: string, records: GuideRecord[]): GuideRecord | undefined {
  return records
    .map((record) => ({ record, key: normalise(record.name) }))
    .filter(({ key }) => key.length >= 6 && q.includes(key))
    .sort((a, b) => b.key.length - a.key.length)[0]?.record;
}

function landmarkReply(record: GuideRecord, all: GuideRecord[]): GuideReply {
  const siblings = all
    .filter((r) => r.destinationId === record.destinationId && r.name !== record.name)
    .slice(0, 4);
  return {
    blocks: [
      {
        kind: "text",
        text: `${record.name} is catalogued under ${record.destinationName}. ${record.blurb}`,
      },
      { kind: "link", href: record.href, label: `Open ${record.name}` },
      ...(siblings.length > 0
        ? [{ kind: "items" as const, items: siblings.map(recordItem) }]
        : []),
      {
        kind: "note",
        text: "Quoted from the record's own summary. I hold no opening hours or ticket prices for any destination — the only price in this product is Sikkim's statutory visitor fee.",
      },
    ],
  };
}

function fallback(index: GuideIndex, query: string): GuideReply {
  const tokens = tokenise(query);

  /* Last resort before giving up: one ranked pass over everything. */
  const ranked: Array<{ item: GuideItem; s: number }> = [];
  for (const m of index.monasteries) {
    const s = score(`${m.name} ${m.district} ${m.tradition} ${m.blurb}`, tokens);
    if (s > 0) ranked.push({ item: monasteryItem(m), s });
  }
  for (const p of index.places) {
    const s = score(`${p.name} ${p.district} ${p.category} ${p.blurb}`, tokens);
    if (s > 0) ranked.push({ item: placeItem(p), s });
  }
  for (const st of index.stories) {
    const s = score(`${st.title} ${st.category} ${st.communities.join(" ")} ${st.blurb}`, tokens);
    if (s > 0) ranked.push({ item: storyItem(st), s });
  }

  ranked.sort((a, b) => b.s - a.s);

  if (ranked.length > 0) {
    return {
      blocks: [
        { kind: "text", text: `Here is what the archive holds on that — ${ranked.length} match${ranked.length === 1 ? "" : "es"}, closest first.` },
        { kind: "items", items: ranked.slice(0, MAX_ITEMS).map((r) => r.item) },
        { kind: "chips", chips: STARTER_CHIPS },
      ],
    };
  }

  return {
    blocks: [
      {
        kind: "text",
        text: "I don't hold anything on that, and I would rather say so than guess.",
      },
      {
        kind: "note",
        text: `I can only answer from what this archive has actually catalogued: ${index.facts.monasteryCount} monasteries, ${index.facts.placeCount} places, ${index.facts.storyCount} cultural stories, ${index.facts.stayCount} registered stays, plus permits and the state's visitor fee. I have no live data — no weather, no opening hours, no prices, no bookings.`,
      },
      { kind: "chips", chips: STARTER_CHIPS },
    ],
  };
}

/* -------------------------------------------------------------------- entry */

export function respond(query: string, index: GuideIndex, context: GuideContext = {}): GuideReply {
  const q = normalise(query);
  const named = q ? namedDestination(q, index) : undefined;
  const here = (index.destinations ?? []).find((d) => d.id === context.destinationId) ?? null;
  const scope = named ?? here;

  if (scope && scope.id !== "sikkim") return respondDestination(query, index, scope);
  if (scope) return respondSikkim(query, index);
  return respondGlobal(query, index);
}

/* ======================================================================
   A destination other than Sikkim, answered from its own records
   ====================================================================== */

/*
 * These vocabularies are the destination engine's, tested as whole words.
 * They are deliberately broad on the "what kind of thing" axis and silent on
 * the "how good is it" axis: the engine can find a temple, a dish or a
 * festival, and cannot be asked to rank them.
 */
const SEE_WORDS = [
  "see", "visit", "explore", "sight", "sights", "sightseeing", "landmark", "landmarks",
  "attraction", "attractions", "monument", "monuments", "building", "buildings",
  "temple", "temples", "shrine", "shrines", "church", "churches", "cathedral",
  "mosque", "mosques", "dargah", "synagogue", "museum", "museums", "gallery",
  "fort", "forts", "fortress", "palace", "palaces", "castle", "tower", "towers",
  "garden", "gardens", "park", "parks", "market", "markets", "bazaar", "bazaars",
  "ghat", "ghats", "bridge", "bridges", "square", "beach", "beaches", "island",
  "lake", "river", "riverfront", "harbour", "harbor", "tomb", "tombs", "mausoleum",
  "ruins", "archaeology", "archaeological", "architecture", "heritage", "old town",
  "neighbourhood", "neighborhood", "district", "quarter",
] as const;
const HISTORY_WORDS = [
  "history", "historical", "historic", "past", "founded", "built", "century",
  "centuries", "dynasty", "empire", "kingdom", "colonial", "era", "timeline",
  "origin", "origins", "ancient", "medieval", "when was", "how old", "date", "dates",
] as const;
const FOOD_WORDS = [
  "food", "foods", "eat", "eating", "eats", "dish", "dishes", "cuisine", "cook",
  "cooking", "drink", "drinks", "tea", "coffee", "sweet", "sweets", "dessert",
  "snack", "snacks", "restaurant", "restaurants", "street food", "meal", "meals",
  "breakfast", "lunch", "dinner",
] as const;
const FESTIVAL_WORDS = [
  "festival", "festivals", "celebration", "celebrations", "celebrate", "carnival",
  "procession", "processions", "fair", "fairs", "puja", "pilgrimage", "season",
] as const;
const CRAFT_WORDS = [
  "craft", "crafts", "handicraft", "handicrafts", "artisan", "artisans", "weaving",
  "textile", "textiles", "pottery", "embroidery", "carving", "souvenir", "souvenirs",
  "shopping", "shop", "handmade", "workshop", "workshops",
] as const;
const CULTURE_WORDS = [
  "culture", "cultural", "tradition", "traditions", "custom", "customs", "people",
  "community", "communities", "art", "arts", "dance", "music", "life", "local",
] as const;
const TALE_WORDS = [
  "story", "stories", "legend", "legends", "myth", "myths", "tale", "tales",
  "folklore", "narrative", "narratives",
] as const;
const DO_WORDS = [
  "things to do", "what to do", "to do", "experience", "experiences", "activity",
  "activities", "highlights", "why go", "why visit", "worth", "recommend",
] as const;
const STAY_WORDS_D = [
  "stay", "stays", "hotel", "hotels", "accommodation", "lodge", "lodging", "resort",
  "guesthouse", "hostel", "where to sleep", "sleep",
] as const;

/** What a destination genuinely cannot answer, and the reason. Typed, not composed. */
interface Gap {
  triggers: readonly string[];
  question: string;
  reason: (name: string) => string;
}

const DESTINATION_GAPS: Gap[] = [
  {
    triggers: ["open", "opening", "hours", "timing", "timings", "close", "closing", "closed", "what time"],
    question: "opening hours",
    reason: (name) =>
      `The archive records no opening hours for anything in ${name}. Hours change, no source here publishes them, and a guessed hour sends someone to a locked door — so none is given. Check the place's own notice or official page on the day.`,
  },
  {
    triggers: ["price", "prices", "ticket", "tickets", "entry fee", "admission", "rate", "rates", "tariff", "cost", "costs", "how much", "expensive", "cheap", "budget", "fee", "fees"],
    question: "prices",
    reason: (name) =>
      `I hold no ticket prices or room rates for anything in ${name}. Nothing in this product is priced except Sikkim's statutory visitor fee, which is a published rule rather than a rate. Prices belong to the venue's own page.`,
  },
  {
    triggers: ["weather", "temperature", "forecast", "rain", "snow", "climate", "how cold", "how hot", "humid"],
    question: "weather and forecasts",
    reason: () =>
      "This is a heritage archive, not a weather service. Nothing here is a live feed, so there is no forecast to give you.",
  },
  {
    triggers: ["book", "booking", "reserve", "reservation", "buy", "tickets online", "availability"],
    question: "bookings",
    reason: (name) =>
      `Nothing here is bookable. There is no booking integration and no payment path — ${name}'s records link to the sources that describe each place, and booking stays with the venue.`,
  },
  {
    triggers: ["flight", "flights", "train", "trains", "airport", "railway", "metro", "bus", "buses", "taxi", "how do i get", "how to reach", "how to get", "transport", "transportation"],
    question: "transport",
    reason: (name) =>
      `Transport schedules for ${name} are not in this archive, and no licensed feed supplies them. The planner orders places by interest and keeps a day's walking sane; it quotes no fares and books nothing.`,
  },
  {
    triggers: ["permit", "permits", "visa", "visas", "inner line", "protected area", "restricted area"],
    question: "permits and visas",
    reason: (name) =>
      `No permit or visa rule is catalogued for ${name}. The permits module covers Sikkim's Protected Area Permit only, because that is the one this archive has sourced; for anything else, the issuing authority's own page is the record.`,
  },
];

/** "16 places, 7 experiences, 12 dated events and 15 dishes" — counted, never claimed. */
function holdings(records: GuideRecord[]): string {
  const counts = new Map<GuideRecordKind, number>();
  for (const r of records) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const order: GuideRecordKind[] = ["place", "experience", "history", "story", "food", "festival", "craft", "stay"];
  const parts = order
    .filter((kind) => (counts.get(kind) ?? 0) > 0)
    .map((kind) => {
      const n = counts.get(kind) ?? 0;
      return `${n} ${n === 1 ? KIND_LABEL[kind].one.toLowerCase() : KIND_LABEL[kind].many}`;
    });
  if (parts.length === 0) return "no records yet";
  if (parts.length === 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Chips a destination can honour: offered only where the kind has records. */
function destinationChips(name: string, records: GuideRecord[]): GuideChip[] {
  const has = (...kinds: GuideRecordKind[]) => records.some((r) => kinds.includes(r.kind));
  const chips: GuideChip[] = [];
  if (has("place", "experience")) chips.push({ label: `What should I see in ${name}?`, send: "what should I see" });
  if (has("food", "festival")) chips.push({ label: "Food and festivals", send: "food and festivals" });
  if (has("history")) chips.push({ label: "History", send: "history" });
  if (has("stay")) chips.push({ label: "Where to stay", send: "where to stay" });
  else if (has("story")) chips.push({ label: "Stories", send: "stories" });
  chips.push({ label: "Plan my trip", send: "__plan__" });
  return chips.slice(0, 4);
}

function sectionFor(destinationId: string, kinds: GuideRecordKind[], hub: string): string {
  if (kinds.every((k) => k === "food" || k === "festival" || k === "craft")) {
    return `/destinations/${destinationId}/culture`;
  }
  if (kinds.every((k) => k === "stay")) return hub;
  return `/destinations/${destinationId}/discover`;
}

function rank(records: GuideRecord[], tokens: string[]): GuideRecord[] {
  if (tokens.length === 0) return [];
  return records
    .map((record) => ({
      record,
      s:
        nameScore(record.name, tokens) * 3 +
        score(`${record.blurb} ${record.category ?? ""} ${record.themes.join(" ")}`, tokens),
    }))
    .filter((entry) => entry.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((entry) => entry.record);
}

function respondDestination(query: string, index: GuideIndex, dest: GuideDestination): GuideReply {
  const q = normalise(query);
  const mine = (index.records ?? []).filter((r) => r.destinationId === dest.id);
  const nameWords = normalise(dest.name).split(" ");
  /* The destination's own name carries no topic. */
  const tokens = tokenise(query).filter((t) => !nameWords.some((w) => w === t || w.includes(t)));
  const chips = destinationChips(dest.name, mine);
  const hubLink: GuideBlock = { kind: "link", href: dest.href, label: `Open ${dest.name}, ${dest.country}` };
  const quoteNote: GuideBlock = {
    kind: "note",
    text: `Every line is ${dest.name}'s own catalogued record — the archive's summary, with its source on the record's page. I write nothing myself.`,
  };
  const holdingsNote: GuideBlock = {
    kind: "note",
    text: `For ${dest.name} I hold ${holdings(mine)}. I have no live data — no opening hours, prices, weather or bookings — and I'll say so rather than guess.`,
  };

  if (!q) {
    return { blocks: [{ kind: "text", text: `Ask me anything about ${dest.name}.` }, holdingsNote, { kind: "chips", chips }] };
  }

  /* ---- greeting / help ---- */
  const greetingOnly =
    q.length <= 24 && GREETING_WORDS.some((g) => q === g || q.startsWith(`${g} `));
  if (greetingOnly) {
    return {
      blocks: [
        { kind: "text", text: `Hello. I'm the archive's guide for ${dest.name} — I answer from its catalogued records, and I'll tell you when something isn't in here.` },
        holdingsNote,
        { kind: "chips", chips },
      ],
    };
  }
  if (hasAny(q, HELP_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: `For ${dest.name} I can find ${holdings(mine)}, and plan a day-by-day route with you.` },
        {
          kind: "note",
          text: "Everything I say comes from a catalogued record — I compose nothing. That also means I can't tell you opening hours, prices, festival dates for a given year, or the weather. Ask and I'll show you exactly why not.",
        },
        { kind: "chips", chips },
      ],
    };
  }

  /* ---- compare / plan: handled by other surfaces ---- */
  if (hasAny(q, COMPARE_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: "Comparison is counts only — what has been catalogued for each destination, never which is better." },
        { kind: "link", href: "/destinations/compare", label: "Compare destinations" },
      ],
    };
  }
  if (hasAny(q, PLAN_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: `Let's build one for ${dest.name}. Three quick questions and I'll hand it to the planner.` },
        { kind: "chips", chips: [{ label: "Start planning", send: "__plan__" }] },
      ],
    };
  }

  /* ---- a landmark by name, in this destination ----
     Two strengths. `exact` means the record's whole name is in the question
     ("tell me about Red Fort"), and it outranks the kind vocabulary below —
     "fort" is a kind word, but a visitor who typed the full name wants that
     record, not a list of forts with it somewhere inside. `landmark` adds the
     fuzzy form ("the eiffel"), which only gets its turn once no kind word
     has claimed the question. */
  const exact = namedRecordIn(q, mine);
  const landmark =
    exact ??
    mine
      .map((record) => ({ record, s: nameScore(record.name, tokens) }))
      .filter(({ s }) => s >= 12 || (s >= 6 && tokens.length <= 2))
      .sort((a, b) => b.s - a.s)[0]?.record;
  const landmarkReplyIn = (record: GuideRecord): GuideReply => {
    const siblings = mine.filter((r) => r.kind === record.kind && r.name !== record.name).slice(0, 4);
    return {
      blocks: [
        { kind: "text", text: `${record.name} is catalogued under ${dest.name}. ${record.blurb}` },
        { kind: "link", href: record.href, label: `Open ${record.name}` },
        ...(siblings.length > 0 ? [{ kind: "items" as const, items: siblings.map(recordItem) }] : []),
        quoteNote,
      ],
    };
  };

  /* ---- things the archive cannot answer ---- */
  const gap = DESTINATION_GAPS.find((g) => hasWord(q, g.triggers));
  if (gap) {
    return {
      blocks: [
        ...(landmark
          ? [
              { kind: "text" as const, text: `${landmark.name} is catalogued under ${dest.name}. ${landmark.blurb}` },
              { kind: "link" as const, href: landmark.href, label: `Open ${landmark.name}` },
            ]
          : [{ kind: "text" as const, text: `I can't help with ${gap.question}.` }]),
        { kind: "note", text: gap.reason(dest.name) },
        ...(landmark ? [] : [{ kind: "chips" as const, chips }]),
      ],
    };
  }

  if (exact) return landmarkReplyIn(exact);

  /* ---- a kind of thing: places, history, food, festivals, crafts, stays, stories, experiences ---- */
  const wanted: GuideRecordKind[] = [];
  if (hasWord(q, STAY_WORDS_D)) wanted.push("stay");
  else if (hasWord(q, FOOD_WORDS)) wanted.push("food");
  else if (hasWord(q, FESTIVAL_WORDS)) wanted.push("festival");
  else if (hasWord(q, CRAFT_WORDS)) wanted.push("craft");
  else if (hasWord(q, HISTORY_WORDS)) wanted.push("history");
  else if (hasWord(q, TALE_WORDS)) wanted.push("story");
  else if (hasWord(q, CULTURE_WORDS)) wanted.push("food", "festival", "craft");
  else if (hasWord(q, DO_WORDS)) wanted.push("experience");
  else if (hasWord(q, SEE_WORDS)) wanted.push("place");
  /* "food and festivals" names two kinds; the first branch above took one. */
  if (wanted.length === 1 && wanted[0] === "food" && hasWord(q, FESTIVAL_WORDS)) wanted.push("festival");

  if (wanted.length > 0) {
    let candidates = mine.filter((r) => wanted.includes(r.kind));
    /* A destination with no experiences still has places to see, and one with
       no places still has experiences that name them. */
    if (candidates.length === 0 && wanted.includes("experience")) candidates = mine.filter((r) => r.kind === "place");
    if (candidates.length === 0 && wanted.includes("place")) candidates = mine.filter((r) => r.kind === "experience");
    /* Culture words with no culture records: the stories carry it. */
    if (candidates.length === 0 && wanted.includes("food")) candidates = rank(mine, ["food", "cuisine", "dish", ...tokens]);
    if (candidates.length === 0 && wanted.includes("festival")) candidates = rank(mine, ["festival", "celebration", ...tokens]);

    if (candidates.length > 0) {
      /* The kind word stays a topic: "temples" ranks the places whose
         category or name says temple above the rest, and a destination with
         no temple catalogued falls back to all its places rather than to
         nothing. */
      const ranked = rank(candidates, tokens);
      const shown = (ranked.length > 0 ? ranked : candidates).slice(0, MAX_ITEMS);
      const [first] = wanted;
      const label = (n: number) =>
        wanted.length === 1 && first ? (n === 1 ? KIND_LABEL[first].one.toLowerCase() : KIND_LABEL[first].many) : n === 1 ? "record" : "records";
      return {
        blocks: [
          {
            kind: "text",
            text:
              ranked.length > 0
                ? `${ranked.length} of ${dest.name}'s ${label(candidates.length)} ${ranked.length === 1 ? "matches" : "match"}, closest first.`
                : `${candidates.length} ${label(candidates.length)} catalogued for ${dest.name}${candidates.length > MAX_ITEMS ? ` — the first ${MAX_ITEMS}` : ""}.`,
          },
          { kind: "items", items: shown.map(recordItem) },
          { kind: "link", href: sectionFor(dest.id, wanted, dest.href), label: wanted.every((k) => k === "stay") ? `Open ${dest.name}` : `Browse ${dest.name}'s ${label(candidates.length)}` },
          ...(wanted.includes("stay")
            ? [{ kind: "note" as const, text: "A documented stay is a heritage record that happens to be a hotel — what a source publishes about it, with no rate, rating, phone or availability, because none is held." }]
            : [quoteNote]),
        ],
      };
    }

    if (wanted.includes("stay")) {
      return {
        blocks: [
          { kind: "text", text: `No documented stay is catalogued for ${dest.name} yet.` },
          { kind: "note", text: "Stays here are heritage records with a published source, not a hotel directory. Where no source publishes one, none is listed — and no rate, rating or phone number is held anywhere in this product." },
          hubLink,
        ],
      };
    }
    return {
      blocks: [
        { kind: "text", text: `Nothing of that kind is catalogued for ${dest.name} yet.` },
        holdingsNote,
        { kind: "chips", chips },
      ],
    };
  }

  /* ---- a named record, fuzzily ---- */
  if (landmark) return landmarkReplyIn(landmark);

  /* ---- free text over everything this destination holds ---- */
  const ranked = rank(mine, tokens);
  if (ranked.length > 0) {
    return {
      blocks: [
        { kind: "text", text: `From ${dest.name}'s catalogued records, ${ranked.length} match${ranked.length === 1 ? "es" : ""}, closest first.` },
        { kind: "items", items: ranked.slice(0, MAX_ITEMS).map(recordItem) },
        hubLink,
        quoteNote,
      ],
    };
  }

  /* ---- only the name, or nothing that matches ---- */
  if (tokens.length === 0) {
    return {
      blocks: [
        { kind: "text", text: `Here is what ${dest.name} holds: ${holdings(mine)}.` },
        { kind: "items", items: mine.filter((r) => r.kind === "place" || r.kind === "experience").slice(0, MAX_ITEMS).map(recordItem) },
        hubLink,
        { kind: "chips", chips },
      ],
    };
  }
  return {
    blocks: [
      { kind: "text", text: `I don't hold anything on that for ${dest.name}, and I would rather say so than guess.` },
      holdingsNote,
      { kind: "chips", chips },
    ],
  };
}

/* ======================================================================
   No destination in scope: the whole archive
   ====================================================================== */

function respondGlobal(query: string, index: GuideIndex): GuideReply {
  const q = normalise(query);
  const all = index.records ?? [];
  const destinations = index.destinations ?? [];
  if (!q) return fallback(index, query);

  const greetingOnly =
    q.length <= 24 && GREETING_WORDS.some((g) => q === g || q.startsWith(`${g} `));
  if (greetingOnly || hasAny(q, HELP_WORDS)) {
    return {
      blocks: [
        {
          kind: "text",
          text: `I answer from the catalogued records of ${destinations.length} destinations — their places, experiences, history, stories, food, festivals and crafts — and I write nothing myself. Name a destination, or ask about a landmark.`,
        },
        {
          kind: "items",
          items: destinations.slice(0, MAX_ITEMS).map((d) => ({
            kind: "destination" as const,
            title: d.name,
            meta: `${d.country} · ${all.filter((r) => r.destinationId === d.id).length} records`,
            href: d.href,
          })),
        },
        { kind: "link", href: "/destinations", label: `All ${destinations.length} destinations` },
        { kind: "chips", chips: GLOBAL_CHIPS },
      ],
    };
  }

  if (hasAny(q, COMPARE_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: "Comparison is counts only — what has been catalogued for each destination, never which is better." },
        { kind: "link", href: "/destinations/compare", label: "Compare destinations" },
      ],
    };
  }

  if (hasAny(q, PLAN_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: "Let's build one. Three quick questions and I'll hand it to the planner." },
        { kind: "chips", chips: [{ label: "Start planning", send: "__plan__" }] },
      ],
    };
  }

  /* A landmark anywhere reaches its own destination. */
  const landmark = namedRecordIn(q, all);
  if (landmark) return landmarkReply(landmark, all);

  /* Sikkim is the only destination with monasteries, permits, a fee and audio
     guides, so those questions are Sikkim's to answer — and its engine names
     Sikkim in every such reply, so nothing passes as the product's. */
  if (hasAny(q, MONASTERY_WORDS) || hasAny(q, PERMIT_WORDS) || hasAny(q, FEE_WORDS) || hasAny(q, AUDIO_WORDS)) {
    return respondSikkim(query, index);
  }

  const gap = DESTINATION_GAPS.find((g) => hasWord(q, g.triggers));
  if (gap) {
    return {
      blocks: [
        { kind: "text", text: `I can't help with ${gap.question}.` },
        { kind: "note", text: gap.reason("any destination") },
        { kind: "chips", chips: GLOBAL_CHIPS },
      ],
    };
  }

  const tokens = tokenise(query);
  const ranked = rank(all, tokens);
  if (ranked.length > 0) {
    const places = new Set(ranked.slice(0, MAX_ITEMS).map((r) => r.destinationName));
    return {
      blocks: [
        { kind: "text", text: `Across the archive, ${ranked.length} record${ranked.length === 1 ? "" : "s"} match${ranked.length === 1 ? "es" : ""} — from ${[...places].join(", ")}. Closest first.` },
        { kind: "items", items: ranked.slice(0, MAX_ITEMS).map(recordItem) },
        { kind: "note", text: "Each line is the archive's own summary of that record, with its source on the record's page." },
        { kind: "chips", chips: GLOBAL_CHIPS },
      ],
    };
  }

  return {
    blocks: [
      { kind: "text", text: "I don't hold anything on that, and I would rather say so than guess." },
      { kind: "note", text: `I answer only from the catalogued records of ${destinations.length} destinations. Name one — ${destinations.slice(0, 5).map((d) => d.name).join(", ")} — or ask about a landmark.` },
      { kind: "chips", chips: GLOBAL_CHIPS },
    ],
  };
}

/* ======================================================================
   Sikkim: the deep corpus — districts, traditions, permits, register, fee
   ====================================================================== */

function respondSikkim(query: string, index: GuideIndex): GuideReply {
  const q = normalise(query);
  if (!q) return fallback(index, query);

  const tokens = tokenise(query);
  const district = districtIn(query, index);
  const tradition = traditionIn(query, index);

  /* A landmark from another destination, asked about on Sikkim's page. */
  const foreign = namedRecordIn(q, (index.records ?? []).filter((r) => r.destinationId !== "sikkim"));
  if (foreign) return landmarkReply(foreign, index.records ?? []);

  /* ---- greeting / help ----
     Gated on the whole message being a greeting, not on an empty token list:
     "hello" tokenises to ["hello"], so the old `tokens.length === 0` test
     never fired and the friendliest possible opener was answered with
     "I don't hold anything on that". */
  const greetingOnly =
    q.length <= 24 && GREETING_WORDS.some((g) => q === g || q.startsWith(`${g} `));
  if (greetingOnly) {
    return {
      blocks: [
        { kind: "text", text: "Tashi delek. I'm the archive's guide for Sikkim — I answer from catalogued records, and I'll tell you when something isn't in here." },
        { kind: "chips", chips: STARTER_CHIPS },
      ],
    };
  }

  if (hasAny(q, HELP_WORDS)) {
    return {
      blocks: [
        {
          kind: "text",
          text: `For Sikkim I can find monasteries, places, stories and stays, explain permits and the state's visitor fee, and plan a day-by-day route with you.`,
        },
        {
          kind: "note",
          text: "Everything I say comes from a catalogued record — I compose nothing. That also means I can't tell you opening hours, room rates, festival dates for a given year, or the weather. Ask and I'll show you exactly why not.",
        },
        { kind: "chips", chips: STARTER_CHIPS },
      ],
    };
  }

  if (hasAny(q, COMPARE_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: "Comparison is counts only — what has been catalogued for each destination, never which is better." },
        { kind: "link", href: "/destinations/compare", label: "Compare destinations" },
      ],
    };
  }

  /* ---- planning: handled by the component's guided flow ---- */
  if (hasAny(q, PLAN_WORDS)) {
    return {
      blocks: [
        { kind: "text", text: "Let's build one. Three quick questions and I'll hand it to the itinerary planner." },
        { kind: "chips", chips: [{ label: "Start planning", send: "__plan__" }] },
      ],
    };
  }

  /* ---- permits ---- */
  if (hasAny(q, PERMIT_WORDS)) {
    const gated = index.places.filter((p) => p.permitNote);
    return {
      blocks: [
        {
          kind: "text",
          text: `Yes, for some places in Sikkim. ${gated.length} of the ${index.facts.placeCount} mapped places in this archive record a permit requirement — usually the Protected Area Permit for areas near the border, arranged through a registered operator.`,
        },
        { kind: "items", items: gated.slice(0, MAX_ITEMS).map(placeItem) },
        { kind: "link", href: "/destinations/sikkim/permits", label: "Read the department's permit rules" },
        {
          kind: "note",
          text: "Each permit note is quoted from the source that documents it. Requirements change — confirm with your operator before you travel.",
        },
      ],
    };
  }

  /* ---- money about lodging is a rates question, and rates are not held ---- */
  if (hasAny(q, MONEY_WORDS) && hasAny(q, LODGING_WORDS)) {
    const gap = index.openQuestions.find((g) => g.question === "room rates");
    if (gap) {
      return {
        blocks: [
          { kind: "text", text: "I can't tell you what a room costs." },
          { kind: "note", text: gap.reason },
          { kind: "link", href: "/destinations/sikkim/hotels", label: "See the register instead" },
        ],
      };
    }
  }

  /* ---- the visitor fee ---- */
  if (hasAny(q, FEE_WORDS) || hasAny(q, MONEY_WORDS)) {
    return {
      blocks: [
        {
          kind: "text",
          text: `Sikkim charges a Tourism Sustainability Development fee of ₹${index.facts.tsdFee} per person. It is one-time, valid a month, collected by your hotel at check-in, and children under 5 and government-work visitors are exempt.`,
        },
        {
          kind: "note",
          text: "That is the only cost this project quotes. It has no licensed rates feed, so it estimates nothing for hotels, transport or activities — the planner's cost panel carries this one line and nothing else.",
        },
        { kind: "link", href: "/destinations/sikkim/hotels", label: "How the fee works" },
      ],
    };
  }

  /* ---- audio guides ---- */
  if (hasAny(q, AUDIO_WORDS)) {
    const blocked = index.facts.blockedAudioLanguages;
    return {
      blocks: [
        {
          kind: "text",
          text: `Every catalogued monastery in Sikkim has a narrated guide in ${index.facts.audioLanguages.join(", ")}.`,
        },
        {
          kind: "note",
          text: `The guides are machine-narrated from verified record fields and are not yet translation-reviewed — the player says so on every one. ${blocked.length} further languages are blocked, including ${blocked
            .slice(0, 2)
            .map((b) => b.label)
            .join(" and ")}, each for a named reason rather than for want of trying.`,
        },
        { kind: "link", href: "/destinations/sikkim/monasteries", label: "Browse the monasteries" },
      ],
    };
  }

  /* ---- things the archive cannot answer ---- */
  const gap = index.openQuestions.find((g) => hasAny(q, g.triggers));
  if (gap) {
    return {
      blocks: [
        { kind: "text", text: `I can't help with ${gap.question}.` },
        { kind: "note", text: gap.reason },
        { kind: "chips", chips: STARTER_CHIPS },
      ],
    };
  }

  /* ---- a bare name: "rumtek", "tsomgo", "pemayangtse" ----
     This has to run before the district branch. "rumtek" is aliased to Gangtok
     so that "monasteries near Rumtek" works, which meant typing just "rumtek"
     answered with ten places in Gangtok district and never mentioned Rumtek
     Monastery itself. A name the archive knows outranks every category and
     district heuristic — but NOT the checks above it. Sitting any higher, this
     answered "what are the opening hours of Rumtek" with the Rumtek record and
     never mentioned that the hours are the one thing the archive lacks. */
  const categorical = hasAny(q, [
    ...MONASTERY_WORDS, ...PLACE_WORDS, ...STORY_WORDS, ...STAY_WORDS,
  ]);
  if (!categorical && tokens.length > 0) {
    const named: Array<{ item: GuideItem; s: number }> = [];
    for (const m of index.monasteries) {
      const v = nameScore(m.name, tokens);
      if (v >= 6) named.push({ item: monasteryItem(m), s: v + 1 });
    }
    for (const p of index.places) {
      const v = nameScore(p.name, tokens);
      if (v >= 6) named.push({ item: placeItem(p), s: v });
    }
    if (named.length > 0) {
      named.sort((a, b) => b.s - a.s);
      const related = tokens.length > 2 ? [] : index.stories
        .map((st) => ({ st, v: score(`${st.title} ${st.blurb}`, tokens) }))
        .filter((r) => r.v >= 6)
        .sort((a, b) => b.v - a.v)
        .slice(0, 2)
        .map((r) => storyItem(r.st));
      return {
        blocks: [
          { kind: "text", text: `Here's what the Sikkim archive holds on that.` },
          { kind: "items", items: [...named.slice(0, 3).map((n) => n.item), ...related] },
        ],
      };
    }
  }

  /* ---- stays ---- */
  if (hasAny(q, STAY_WORDS)) {
    const starred = hasAny(q, ["star", "luxury", "5-star", "five star", "best"]);
    let matches = district
      ? index.stays.filter((s) => s.district === district)
      : index.stays;
    if (starred) matches = matches.filter((s) => s.category);

    return {
      blocks: [
        {
          kind: "text",
          /* The count has to describe the list underneath it. This printed
             "905 properties" above six five-star ones, because it read the
             register total whenever no district was named. */
          text: starred
            ? `${matches.length} graded ${matches.length === 1 ? "property" : "properties"}${district ? ` in ${district} district` : ""} — the register grades only ${index.facts.stayWithCategory} of ${index.facts.stayCount}.`
            : district
              ? `${matches.length} registered ${matches.length === 1 ? "stay" : "stays"} in ${district} district.`
              : `${index.facts.stayCount} properties on Sikkim's tourism register.`,
        },
        { kind: "items", items: matches.slice(0, MAX_ITEMS).map(stayItem) },
        {
          kind: "note",
          text: `This is the Tourism Department's own register of licensed establishments, not a recommendation list — name, district, address and registration only. It grades just ${index.facts.stayWithCategory} of ${index.facts.stayCount} with a star category, and carries no price, rating or review anywhere, so neither do I.`,
        },
        { kind: "link", href: "/destinations/sikkim/hotels", label: "See the full register" },
      ],
    };
  }

  /* ---- monasteries ---- */
  if (hasAny(q, MONASTERY_WORDS) || tradition) {
    let matches = index.monasteries;
    const filters: string[] = [];
    if (district) {
      matches = matches.filter((m) => m.district === district);
      filters.push(`in ${district} district`);
    }
    if (tradition) {
      matches = matches.filter((m) => m.tradition.includes(tradition));
      filters.push(`of the ${tradition} tradition`);
    }
    if (hasAny(q, ["old", "oldest", "first", "ancient", "earliest"])) {
      matches = [...matches].sort((a, b) => a.year - b.year);
      filters.push("oldest first");
    }

    if (matches.length === 0) {
      return {
        blocks: [
          { kind: "text", text: `No catalogued monastery is ${filters.join(" and ")}.` },
          { kind: "note", text: `The archive holds ${index.facts.monasteryCount}, across ${index.districts.join(", ")}.` },
          { kind: "link", href: "/destinations/sikkim/monasteries", label: "Browse all monasteries" },
        ],
      };
    }

    return {
      blocks: [
        {
          kind: "text",
          text: `${matches.length} catalogued ${matches.length === 1 ? "monastery" : "monasteries"} in Sikkim${filters.length ? ", " + filters.join(", ") : ""}.`,
        },
        { kind: "items", items: matches.slice(0, MAX_ITEMS).map(monasteryItem) },
        { kind: "link", href: "/destinations/sikkim/monasteries", label: "Open the explorer" },
      ],
    };
  }

  /* ---- places ---- */
  if (hasAny(q, PLACE_WORDS) || (district && !hasAny(q, STORY_WORDS))) {
    let matches = index.places;
    if (district) matches = matches.filter((p) => p.district === district);
    const byWord = tokens.length
      ? matches.filter((p) => score(`${p.name} ${p.category} ${p.group} ${p.blurb}`, tokens) > 0)
      : [];
    const chosen = byWord.length > 0 ? byWord : matches;

    if (chosen.length > 0) {
      return {
        blocks: [
          {
            kind: "text",
            text: district
              ? `${chosen.length} mapped ${chosen.length === 1 ? "place" : "places"} in ${district} district.`
              : `${chosen.length} mapped ${chosen.length === 1 ? "place" : "places"} in Sikkim match.`,
          },
          { kind: "items", items: chosen.slice(0, MAX_ITEMS).map(placeItem) },
          { kind: "link", href: "/destinations/sikkim/explore", label: "See them on the map" },
        ],
      };
    }
  }

  /* ---- stories ---- */
  if (hasAny(q, STORY_WORDS)) {
    const matches = tokens.length
      ? index.stories
          .map((s) => ({ s, v: score(`${s.title} ${s.category} ${s.communities.join(" ")} ${s.blurb}`, tokens) }))
          .filter((r) => r.v > 0)
          .sort((a, b) => b.v - a.v)
          .map((r) => r.s)
      : index.stories;

    if (matches.length > 0) {
      return {
        blocks: [
          {
            kind: "text",
            text: `${matches.length} ${matches.length === 1 ? "story" : "stories"} in the Sikkim archive on that.`,
          },
          { kind: "items", items: matches.slice(0, MAX_ITEMS).map(storyItem) },
          {
            kind: "note",
            text: "Each story says whether it is documented history, oral tradition or legend, and cites its sources.",
          },
          { kind: "link", href: "/destinations/sikkim/stories", label: "Browse all stories" },
        ],
      };
    }
  }

  return fallback(index, query);
}
