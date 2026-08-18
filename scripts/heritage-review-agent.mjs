#!/usr/bin/env node
/**
 * Heritage Review Agent — Sikkim Darshan
 *
 * Collects visitor-perspective material about each monastery from sources that
 * may legitimately be reused, and refuses to invent the rest.
 *
 * What this agent will not do
 * ---------------------------
 * It does not scrape review sites. Google Maps, TripAdvisor, MakeMyTrip and the
 * rest publish visitor reviews behind terms that forbid automated collection,
 * and their review text is the authors' copyright. There is no way to obtain
 * "20 Google reviews per monastery" here that is both legal and honest, so this
 * agent does not pretend to. It never fabricates an author, a rating, a date or
 * a sentence of review text.
 *
 * What it does do
 * ---------------
 * 1. Wikivoyage. Traveller-written guide listings, licensed CC BY-SA 4.0 and
 *    therefore quotable with attribution. These are not star-rated reviews, and
 *    the UI labels them for what they are: notes left by travellers who went.
 *    Only sentences carrying a visitor observation are kept — opening a listing
 *    with "Founded in 1705" is history, not experience, and is dropped.
 *
 * 2. Google Places, when GOOGLE_PLACES_API_KEY is set. The Places API is the
 *    sanctioned route to Google review data and returns up to five reviews per
 *    place with author, rating and time. Unset, this branch records an explicit
 *    "not configured" result rather than a guess.
 *
 * Usage: node scripts/heritage-review-agent.mjs
 * Writes: reports/monastery-review-discovery.json
 *         src/data/generated/monastery-reviews.json
 */

import { mkdirSync, writeFileSync } from "node:fs";

const VOYAGE = "https://en.wikivoyage.org/w/api.php";
const UA = "Ney-Heritage-Research/1.0 (SIH cultural heritage project)";
const RETRIEVED_AT = process.env.RETRIEVED_AT ?? new Date().toISOString().slice(0, 10);
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wikivoyage articles that carry listings for each site, and the site's aliases. */
const SITES = {
  rumtek: { names: ["Rumtek Monastery", "Rumtek"], articles: ["Gangtok", "Sikkim"] },
  pemayangtse: { names: ["Pemayangtse Monastery", "Pemayangtse"], articles: ["Pelling", "Sikkim", "Yuksom"] },
  tashiding: { names: ["Tashiding Monastery", "Tashiding"], articles: ["Ravangla", "Sikkim", "Pelling"] },
  enchey: { names: ["Enchey Monastery", "Enchey"], articles: ["Gangtok", "Sikkim"] },
  lingdum: { names: ["Pal Zurmang Kagyud Monastery", "Lingdum", "Ranka Monastery"], articles: ["Gangtok", "Sikkim"] },
  phodong: { names: ["Karma Kagyu Monastery, Phodong", "Phodong Monastery", "Phodang Monastery"], articles: ["Sikkim", "Lachen"] },
  phensang: { names: ["Phensang Monastery", "Phensang"], articles: ["Sikkim"] },
  lachen: { names: ["Lachen Monastery"], articles: ["Sikkim", "Lachen"] },
  lachung: { names: ["Lachung Monastery"], articles: ["Sikkim", "Lachung"] },
  "sanga-choeling": { names: ["Sanga Choeling Monastery", "Sanga Choeling", "Sangachoeling"], articles: ["Pelling", "Sikkim", "Yuksom"] },
  dubdi: { names: ["Dubdi Monastery", "Dubdi"], articles: ["Yuksom", "Sikkim"] },
  ralang: { names: ["Ralang Monastery", "Ralang monastery", "Ralong"], articles: ["Ravangla", "Sikkim"] },
  rinchenpong: { names: ["Rinchenpong Monastery", "Resum Monastery"], articles: ["Sikkim"] },
  tsuklakhang: { names: ["Tsuklakhang Palace", "Tsuklakhang"], articles: ["Gangtok", "Sikkim"] },
  kewzing: { names: ["Kewzing Monastery"], articles: ["Ravangla", "Sikkim"] },
};

/**
 * Sentences a traveller's guide entry carries that are not visitor perspective.
 * Whitelisting "experience words" turned out to throw away most of what these
 * entries are actually for — what is inside, what the climb is like, when the
 * dances happen — so the filter keeps the entry's prose and drops only the
 * chronology, etymology and timetables that belong to other parts of the page.
 */
const NOT_VISITOR_PERSPECTIVE = [
  /^(?:it\s+)?(?:was\s+)?(?:built|erected|founded|established|constructed)\b/i,
  /\b(?:literally means|name is derived|is derived from|means\s+["'])/i,
  /\b(?:departing|departs|railway station|airport|helicopter|flight|bus stand|SNT|S\.N\.T)\b/i,
  /\b(?:hotel|homestay|lodge|guest ?house|restaurant|cafe|café|momos|book(?:ed|ing)? (?:through|at))\b/i,
  /^\W*(?:tel|phone|mobile|email|₹)\b/i,
];

/** Reject anything shorter than this — a fragment is not a sentence. */
const MIN_WORDS = 8;

async function voyageExtract(title) {
  const url = new URL(VOYAGE);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    action: "query",
    prop: "extracts",
    explaintext: "1",
    titles: title,
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
  const text = await res.text();
  if (text.startsWith("You are making")) throw new Error("rate limited");
  const data = JSON.parse(text);
  return data.query?.pages?.[0]?.extract ?? "";
}

/**
 * Every other place a Wikivoyage article might name. A listing's text ends where
 * the next listing begins, and without this the guidance for one monastery
 * silently absorbs the trek notes, bus timetables and ruins of its neighbours —
 * which would be misattribution, the precise failure this project exists to
 * avoid.
 */
const OTHER_PLACES = [
  "Rabdentse", "Rabdanse", "Rabdantse", "Khecheopalri", "Khechepalri", "Kechapalari", "Goecha", "Dzongri",
  "Yumthang", "Gurudongmar", "Tsomgo", "Nathu La", "Siliguri", "Jorethang", "Geyzing", "Gyalshing",
  "Namgyal Institute", "Do-Drul", "Do Drul", "Dodrul", "Ganesh Tok", "Hanuman Tok", "Ropeway",
  "Temi Tea", "Buddha Park", "Tendong", "Maenam", "Borong", "Ravangla Cha-chu", "Labrang", "Tumlong",
  "Chenrezig", "Skywalk", "Norbugang", "Kathok", "Dubdi Monastery", "Tashiding Monastery",
  "Pemayangtse Monastery", "Rumtek Monastery", "Enchey Monastery", "Sanga Choeling Monastery",
  "Ralang", "Phensang", "Phodong", "Kewzing Monastery", "Lachen Monastery", "Lachung Monastery",
  "Simik Monastery", "Chawang Ani", "Dalling Monastery", "Khechepalri Monastery", "Sinon", "Karthok",
  "Tsuklakhang Palace", "Pal Zurmang", "Kanchenjunga Tourist Complex", "Flower show", "Guru Lhakhang",
];

/**
 * A Wikivoyage listing opens with its own name followed immediately by an
 * address, a distance in brackets or a full stop. "Rumtek" inside the phrase
 * "Rumtek - Ranka - Gangtok road" is a direction, not a listing, and must not
 * drag the article's road-safety paragraph in with it.
 */
function listingStarts(extract, name) {
  const starts = [];
  let cursor = 0;
  for (;;) {
    const at = extract.indexOf(name, cursor);
    if (at === -1) break;
    cursor = at + name.length;
    /* A listing opens after its marker number, a sentence end or a line break.
       Mid-sentence mentions — "overlooking the famous Pemayangtse Monastery"
       inside Sanga Choeling's entry — are not listings, and treating them as
       one hands one monastery another monastery's text. */
    const before = extract.slice(Math.max(0, at - 16), at);
    if (!/(?:^|\n\s*|[.!?]\s+|\d\s+)$/.test(before)) continue;
    const after = extract.slice(cursor, cursor + 2);
    if (/^[,.;]/.test(after) || /^\s\(/.test(after)) starts.push(cursor);
  }
  return starts;
}

/** Splits an article into sentences and keeps the ones inside a site's listing. */
function snippetsFor(article, extract, names, ownNames) {
  const found = [];
  const foreign = OTHER_PLACES.filter((p) => !ownNames.some((n) => n.includes(p) || p.includes(n)));

  for (const name of names) {
    for (const from of listingStarts(extract, name)) {
      /* The listing runs until the next listing, the next heading, or the
         "(updated …)" stamp that closes it — whichever comes first. */
      let end = Math.min(from + 620, extract.length);
      for (const marker of ["\n", "==", "(updated", ...foreign]) {
        const at = extract.indexOf(marker, from);
        if (at !== -1 && at < end) end = at;
      }
      const block = extract.slice(from, end).replace(/\s+/g, " ");
      for (const raw of block.split(/(?<=[.!?])\s+/)) {
        const s = raw
          /* Drop a leading bracket left over from the listing's own address. */
          .replace(/^\([^)]*\)/, "")
          .replace(/^[),.;\s]+/, "")
          .trim();
        /* A sentence cut off by a boundary is a fragment, and a fragment
           misrepresents what the traveller actually wrote. */
        if (!/[.!?]$/.test(s)) continue;
        /* Must open like a sentence. A leading dash, bracket or lower-case word
           means the boundary cut into the middle of one. */
        if (!/^[A-Z]/.test(s)) continue;
        /* "Lingdum (on the Rumtek – Ranka road, 45 min from Gangtok)." is the
           listing's address, not a traveller's note about the place. */
        if (/^[A-Z][A-Za-z' -]{0,22}\(/.test(s)) continue;
        if (s.length < 45 || s.length > 240) continue;
        if (s.split(/\s+/).length < MIN_WORDS) continue;
        if (/^\d/.test(s)) continue;
        if (NOT_VISITOR_PERSPECTIVE.some((re) => re.test(s))) continue;
        /* Belt and braces: a sentence naming somewhere else is about somewhere else. */
        if (foreign.some((p) => s.includes(p))) continue;
        found.push({ text: s, article });
      }
    }
  }
  return found;
}

/** Recurring themes, counted from the snippets actually collected — never guessed. */
const THEMES = [
  { id: "walk-in", label: "the walk or climb up to it", re: /\b(walk|trek|hike|climb|steep|slope|uphill|trail|path|on foot)\b/i },
  { id: "views", label: "the views from the site", re: /\b(view|views|overlook|scenic|panoram|kanchenjunga|kangchenjunga|valley)\b/i },
  { id: "quiet", label: "how quiet or peaceful it is", re: /\b(peaceful|quiet|serene|calm|tranquil|solitude)\b/i },
  { id: "art", label: "the murals, thangkas and carvings inside", re: /\b(mural|wall painting|thangka|thanka|sculpt|carv|painted|statue|model)\b/i },
  { id: "access", label: "getting there and opening times", re: /\b(closed|open|opening|hours|entry|entrance|fee|₹|permit|taxi|jeep|drive|road|km from)\b/i },
  { id: "festival", label: "the festivals and masked dances", re: /\b(cham|festival|dance|bhumchu|bumchu|losoong|losar|pang lhabsol)\b/i },
];

async function googlePlaces(name) {
  if (!PLACES_KEY) {
    return {
      checked: false,
      status: "NOT_CONFIGURED",
      reason:
        "GOOGLE_PLACES_API_KEY is unset. The Places API is the only sanctioned route to Google review data; scraping the Maps site instead would breach its terms, so no Google reviews are collected.",
      reviews: [],
    };
  }
  const search = new URL("https://places.googleapis.com/v1/places:searchText");
  const res = await fetch(search, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.reviews",
    },
    body: JSON.stringify({ textQuery: `${name}, Sikkim, India`, maxResultCount: 1 }),
  });
  if (!res.ok) return { checked: true, status: "ERROR", reason: `places ${res.status}`, reviews: [] };
  const data = await res.json();
  const place = data.places?.[0];
  if (!place) return { checked: true, status: "NO_MATCH", reviews: [] };
  return {
    checked: true,
    status: "OK",
    placeId: place.id,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    reviews: (place.reviews ?? []).map((r) => ({
      source: "google-places",
      authorName: r.authorAttribution?.displayName ?? null,
      rating: r.rating ?? null,
      reviewDate: r.publishTime ? r.publishTime.slice(0, 10) : null,
      excerpt: (r.text?.text ?? "").slice(0, 220),
      sourceUrl: r.googleMapsUri ?? null,
    })),
  };
}

async function main() {
  console.log("Heritage Review Agent\n");

  /* One fetch per article, shared across the sites that appear in it. */
  const articles = [...new Set(Object.values(SITES).flatMap((s) => s.articles))];
  const extracts = {};
  for (const a of articles) {
    await sleep(1200);
    try {
      extracts[a] = await voyageExtract(a);
    } catch (e) {
      extracts[a] = "";
      console.error(`  ! ${a}: ${e.message}`);
    }
  }

  const results = [];
  for (const [slug, site] of Object.entries(SITES)) {
    const raw = site.articles.flatMap((a) => snippetsFor(a, extracts[a] ?? "", site.names, site.names));

    /* De-duplicate: the Sikkim overview repeats what the town articles say. */
    const seen = new Set();
    const voices = [];
    for (const s of raw) {
      const key = s.text.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      voices.push({
        id: `${slug}-wikivoyage-${voices.length + 1}`,
        monasteryId: slug,
        source: "wikivoyage",
        sourceLabel: "Wikivoyage traveller guide",
        sourceUrl: `https://en.wikivoyage.org/wiki/${encodeURIComponent(s.article)}`,
        /* Wikivoyage listings are written collaboratively and unsigned. There is
           no author to name, and inventing one would be the exact failure this
           project exists to avoid. */
        authorName: null,
        rating: null,
        reviewDate: null,
        excerpt: s.text,
        licence: "CC BY-SA 4.0",
        retrievedAt: RETRIEVED_AT,
      });
    }

    const themes = THEMES.filter((t) => voices.some((v) => t.re.test(v.excerpt))).map((t) => ({
      id: t.id,
      label: t.label,
      mentions: voices.filter((v) => t.re.test(v.excerpt)).length,
    }));

    const places = await googlePlaces(site.names[0]);

    results.push({
      slug,
      wikivoyage: { articlesSearched: site.articles, snippets: voices.length },
      googlePlaces: { status: places.status, reason: places.reason ?? null, reviews: places.reviews.length },
      voices: [...voices, ...places.reviews],
      themes,
      /* No aggregate rating is published: Wikivoyage carries no ratings, and
         without the Places API there is nothing legitimate to average. */
      averageRating: places.status === "OK" ? (places.rating ?? null) : null,
      ratingCount: places.status === "OK" ? (places.userRatingCount ?? null) : null,
      outcome: voices.length + places.reviews.length > 0 ? "SOURCED" : "NONE_AVAILABLE",
    });

    console.log(`  ${voices.length > 0 ? "+" : "·"} ${slug} — wikivoyage:${voices.length} google:${places.reviews.length} themes:${themes.length}`);
  }

  const report = {
    generatedAt: RETRIEVED_AT,
    agent: "Heritage Review Agent",
    method: {
      wikivoyage:
        "Article extracts via the MediaWiki API, sliced to each site's listing, then filtered to sentences carrying a visitor observation. CC BY-SA 4.0, quoted short and attributed.",
      googlePlaces: PLACES_KEY
        ? "Places API searchText with a reviews field mask — up to five reviews per place, with the author and rating Google itself returns."
        : "Not run — GOOGLE_PLACES_API_KEY unset. Recorded as an explicit negative, never simulated.",
      refused:
        "No scraping of Google Maps, TripAdvisor, MakeMyTrip, Holidify or any other review platform. No invented authors, ratings, dates or review text.",
      ratings:
        "No aggregate rating is shown unless the Places API supplied one. Star counts are never synthesised from prose.",
    },
    totals: {
      sitesChecked: results.length,
      sitesWithVoices: results.filter((r) => r.outcome === "SOURCED").length,
      sitesWithNone: results.filter((r) => r.outcome === "NONE_AVAILABLE").length,
      totalSnippets: results.reduce((n, r) => n + r.voices.length, 0),
      googleReviewsCollected: results.reduce((n, r) => n + r.googlePlaces.reviews, 0),
    },
    results,
  };

  mkdirSync("reports", { recursive: true });
  mkdirSync("src/data/generated", { recursive: true });
  writeFileSync("reports/monastery-review-discovery.json", JSON.stringify(report, null, 2) + "\n");

  const published = Object.fromEntries(
    results
      .filter((r) => r.voices.length > 0)
      .map((r) => [r.slug, { voices: r.voices, themes: r.themes, averageRating: r.averageRating, ratingCount: r.ratingCount }]),
  );
  writeFileSync("src/data/generated/monastery-reviews.json", JSON.stringify(published, null, 2) + "\n");

  console.log("\n" + JSON.stringify(report.totals, null, 2));
}

main().catch((e) => {
  console.error("review agent failed:", e.message);
  process.exit(1);
});
