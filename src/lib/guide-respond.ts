import type { GuideIndex } from "@/lib/guide-index";

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
 */

/* `history` joins the four Sikkim-shaped kinds: the cross-destination record
   set carries dated events, and an event is not a place. */
export type GuideItemKind = "monastery" | "place" | "story" | "stay" | "history";

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

const STARTER_CHIPS: GuideChip[] = [
  { label: "Plan my trip", send: "plan my trip" },
  { label: "Monasteries near Pelling", send: "monasteries in Pelling" },
  { label: "Do I need a permit?", send: "permits" },
  { label: "What does it cost?", send: "fees" },
];

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

export function respond(query: string, index: GuideIndex): GuideReply {
  const q = normalise(query);
  if (!q) return fallback(index, query);

  const tokens = tokenise(query);
  const district = districtIn(query, index);
  const tradition = traditionIn(query, index);

  /*
   * A DESTINATION BY NAME, BEFORE ANYTHING ELSE.
   *
   * The corpus below is Sikkim's, but the launcher appears on all fifteen
   * destinations — so "tell me about Paris" used to reach the end of this
   * function and come back "I don't hold anything on that", from a product
   * whose Paris page holds thirteen catalogued places.
   *
   * Matched destinations are handed over rather than answered in prose. The
   * guide says what it can talk about in depth and points to the rest; it does
   * not improvise a description it has no records for.
   */
  /*
   * People type "New York", not "New York City".
   *
   * Matching on the registry name alone missed it — the one destination out of
   * fifteen whose common name is shorter than its registered one. So each
   * destination is matched on its name AND on that name minus a trailing
   * generic word, and the LONGEST matching key wins so a shorter alias can
   * never shadow a fuller name.
   */
  const destinationKeys = (index.destinations ?? []).flatMap((d) => {
    const full = normalise(d.name);
    const short = full.replace(/\s+(city|prefecture)$/, "");
    const keys = short !== full && short.length > 2 ? [full, short] : [full];
    return keys.map((key) => ({ key, destination: d }));
  });

  const named = destinationKeys
    .filter(({ key }) => key.length > 2 && q.includes(key))
    .sort((a, b) => b.key.length - a.key.length)[0]?.destination;

  /*
   * A NAMED DESTINATION IS NOW ANSWERED FROM ITS OWN RECORDS.
   *
   * The previous version recognised the destination and handed the reader a
   * link — better than "I don't hold anything on that", but it still meant
   * asking "what should I see in Kyoto" got a signpost rather than an answer,
   * from a product whose Kyoto page holds fifteen catalogued places.
   *
   * `index.records` carries every destination's places, stories and dated
   * events in one flat shape. The search below is the same deterministic
   * token scoring used for Sikkim's typed corpus — no model, no embedding —
   * and every line it returns is the archive's own summary of that record.
   */
  if (named && named.id !== "sikkim") {
    const mine = (index.records ?? []).filter((r) => r.destinationId === named.id);

    /* Words that are only the destination's name carry no topic. */
    const topicTokens = tokens.filter((t) => !normalise(named.name).includes(t));
    const ranked = mine
      .map((record) => ({
        record,
        score:
          nameScore(record.name, topicTokens) * 3 +
          score(`${record.blurb} ${record.themes.join(" ")}`, topicTokens),
      }))
      .filter((entry) => topicTokens.length === 0 || entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const shown = ranked.length > 0 ? ranked : mine.slice(0, 6).map((record) => ({ record, score: 0 }));

    return {
      blocks: [
        {
          kind: "text",
          text:
            topicTokens.length > 0 && ranked.length > 0
              ? `From ${named.name}'s catalogued records, these match closest. Every line is the archive's own summary, with its source on the record's page.`
              : `Here is what ${named.name} holds. Every line is the archive's own summary, with its source on the record's page.`,
        },
        {
          kind: "items",
          items: shown.map(({ record }) => ({
            kind: record.kind,
            title: record.name,
            meta: `${record.destinationName} · ${record.kind}`,
            blurb: record.blurb,
            href: record.href,
          })),
        },
        { kind: "link", href: named.href, label: `Open ${named.name}, ${named.country}` },
        {
          kind: "note",
          text: `I answer in depth from the Sikkim corpus — permits, fees, districts and traditions. For ${named.name} I search its catalogued places, stories and dated events, and I quote rather than describe.`,
        },
      ],
    };
  }

  /*
   * A LANDMARK BY NAME REACHES ITS OWN DESTINATION.
   *
   * "What is the ticket price for the Colosseum?" names no destination, so it
   * fell past the block above and was answered by the generic fee handler —
   * which returned Sikkim's statutory visitor fee. That fee is real and
   * correctly labelled, so nothing was fabricated; it was simply the wrong
   * place. A reader asking about Rome should be told about Rome.
   *
   * Only names of six characters or more are matched. "Fort", "Museum" and
   * "Palace" appear in dozens of records across the archive, and a short-name
   * match would send half the questions in the product to whichever
   * destination happened to sort first.
   */
  const namedRecord = (index.records ?? [])
    .map((record) => ({ record, key: normalise(record.name) }))
    .filter(({ key }) => key.length >= 6 && q.includes(key))
    .sort((a, b) => b.key.length - a.key.length)[0]?.record;

  if (namedRecord) {
    const siblings = (index.records ?? [])
      .filter((r) => r.destinationId === namedRecord.destinationId && r.name !== namedRecord.name)
      .slice(0, 4);

    return {
      blocks: [
        {
          kind: "text",
          text: `${namedRecord.name} is catalogued under ${namedRecord.destinationName}. ${namedRecord.blurb}`,
        },
        { kind: "link", href: namedRecord.href, label: `Open ${namedRecord.name}` },
        ...(siblings.length > 0
          ? [{
              kind: "items" as const,
              items: siblings.map((r) => ({
                kind: r.kind,
                title: r.name,
                meta: `${r.destinationName} · ${r.kind}`,
                blurb: r.blurb,
                href: r.href,
              })),
            }]
          : []),
        {
          kind: "note",
          text: "Quoted from the record's own summary. I hold no opening hours or ticket prices for any destination — the only price in this product is Sikkim's statutory visitor fee.",
        },
      ],
    };
  }

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
        { kind: "text", text: "Tashi delek. I'm the archive's guide — I answer from catalogued records, and I'll tell you when something isn't in here." },
        { kind: "chips", chips: STARTER_CHIPS },
      ],
    };
  }

  if (hasAny(q, HELP_WORDS)) {
    return {
      blocks: [
        {
          kind: "text",
          text: `I can find monasteries, places, stories and stays, explain permits and the state's visitor fee, and plan a day-by-day route with you.`,
        },
        {
          kind: "note",
          text: "Everything I say comes from a catalogued record — I compose nothing. That also means I can't tell you opening hours, room rates, festival dates for a given year, or the weather. Ask and I'll show you exactly why not.",
        },
        { kind: "chips", chips: STARTER_CHIPS },
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
          text: `Yes, for some places. ${gated.length} of the ${index.facts.placeCount} mapped places in this archive record a permit requirement — usually the Protected Area Permit for areas near the border, arranged through a registered operator.`,
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
          text: `Every catalogued monastery has a narrated guide in ${index.facts.audioLanguages.join(", ")}.`,
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
          { kind: "text", text: `Here's what the archive holds on that.` },
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
              : `${index.facts.stayCount} properties on the department's register.`,
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
          text: `${matches.length} catalogued ${matches.length === 1 ? "monastery" : "monasteries"}${filters.length ? " " + filters.join(", ") : ""}.`,
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
              : `${chosen.length} mapped ${chosen.length === 1 ? "place" : "places"} match.`,
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
            text: `${matches.length} ${matches.length === 1 ? "story" : "stories"} in the archive on that.`,
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
