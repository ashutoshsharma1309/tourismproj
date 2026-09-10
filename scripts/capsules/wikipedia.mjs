/**
 * The Wikipedia and Commons fetchers, shared by every retrieval pass.
 *
 * These lived inside `retrieve.mjs` while there was only one thing to
 * retrieve. The culture and stays pass needs exactly the same summary, lead,
 * image, licence and Wikidata calls against exactly the same rate limit, and
 * the one thing worse than two retrieval scripts is two subtly different
 * copies of the code that talks to Wikimedia.
 *
 * Nothing here decides anything. It fetches, and it reports what came back.
 */

/* Wikimedia blocks anonymous and browser-spoofing agents, and rate-limits
   hard. Same contract the repo's other retrieval agents keep. */
export const UA =
  "TerraStory/1.0 (SIH 2026 tourism intelligence; https://github.com/ashutoshsharma1309/tourismproj) node-fetch";
export const PAUSE_MS = 1100;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getJson(url, attempt = 0) {
  try {
    const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return await response.json();
  } catch (error) {
    if (attempt >= 3) return { error: String(error.message ?? error) };
    await sleep(PAUSE_MS * 2 ** attempt);
    return getJson(url, attempt + 1);
  }
}

/** The REST summary: extract, coordinates, canonical page URL. */
export async function summary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  return getJson(url);
}

/**
 * The article's lead section as plain text.
 *
 * The REST summary is one or two sentences — enough for a place card, too
 * little to find the dated facts a capsule's history needs. The lead is
 * longer and still the part of an article that is most heavily edited and
 * cited, and it is retrieved verbatim: the sentences that end up on a page
 * are sentences this response contained.
 */
export async function lead(title) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=extracts&explaintext=1&exintro=1&redirects=1` +
    `&titles=${encodeURIComponent(title)}`;
  const data = await getJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  return typeof page?.extract === "string" ? page.extract : "";
}

/**
 * Files whose NAME says they are not a photograph.
 *
 * Wikipedia's lead image is not always a picture of the subject. The article
 * "Bosporus" leads with `Turkish_Strait_disambig.svg` — a green-and-blue
 * locator diagram — and it was published on Istanbul's page in a section
 * headed "What you would be standing in front of". The gallery agent has
 * carried a list like this for a while; this retrieval path never got one,
 * so the two disagreed about what counts as a photograph.
 *
 * Name-based, deliberately: it is the only signal available before the file
 * is fetched, and a false negative here costs one missing photograph, which
 * the page already states honestly.
 *
 * Tested against the name with underscores turned back into spaces. `\b`
 * does not fire between "_" and "d", so `\bdisambig` never matched
 * "Turkish_Strait_disambig.svg" — the exact file this guard exists for.
 */
const NOT_A_PHOTOGRAPH =
  /\b(disambig\w*|diagram|map|locator|chart|graph|logo|icon|coat of arms|flag of|seal of|dialects|schematic|blank|outline)\b/i;

/** A usable image URL at a sane width, plus the Commons file page. */
export async function image(title, width = 1280) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=${width}` +
    `&titles=${encodeURIComponent(title)}`;
  const data = await getJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const source = page?.thumbnail?.source ?? null;
  if (!source) return null;
  /* Strip the tracking parameter Wikimedia appends — it breaks the Commons
     File: lookup, a trap this repo has hit before. */
  const clean = source.split("?")[0];
  const decoded = decodeURIComponent(clean);
  const file =
    decoded.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//)?.[1] ??
    decoded.match(/\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)$/)?.[1] ??
    null;
  /* No photograph is better than a diagram of one. */
  if (file && NOT_A_PHOTOGRAPH.test(decodeURIComponent(file).replace(/_/g, " "))) return null;
  return {
    url: clean,
    commonsFilePage: file ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` : null,
    width: page?.thumbnail?.width ?? null,
    height: page?.thumbnail?.height ?? null,
  };
}

/** Licence and attribution, straight from Commons. No licence, no image. */
export async function licence(commonsFilePage) {
  if (!commonsFilePage) return null;
  const file = decodeURIComponent(commonsFilePage.split("File:")[1] ?? "");
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(`File:${file}`)}`;
  const data = await getJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const meta = page?.imageinfo?.[0]?.extmetadata;
  if (!meta) return null;
  const plain = (value) =>
    value ? String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : null;
  return {
    license: plain(meta.LicenseShortName?.value),
    licenseUrl: plain(meta.LicenseUrl?.value),
    attribution: plain(meta.Artist?.value),
  };
}

/* -------------------------------------------------------------------------
   Wikidata — structured statements
   ------------------------------------------------------------------------- */

/** Properties worth asking for, and what they mean in plain words. */
const WIKIDATA_TIME_PROPS = [
  ["P571", "inception"],
  ["P1619", "date of official opening"],
];

/**
 * Parse a Wikidata time value into a signed year.
 *
 * Precision matters more than the value: 9 means the year is known, 8 means
 * only the decade is, 7 only the century. Anything below 9 is discarded
 * rather than rounded, because rounding a century to a year is inventing a
 * date — the one thing the brief for every phase since 13 has forbidden.
 * Negative years are BCE and are kept signed.
 */
export function timeValue(snak) {
  const value = snak?.datavalue?.value;
  if (!value?.time || typeof value.precision !== "number") return null;
  if (value.precision < 9) return null;
  const match = String(value.time).match(/^([+-])(\d{4,})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[2]) * (match[1] === "-" ? -1 : 1);
  if (!Number.isFinite(year) || year === 0) return null;
  return { year, precision: value.precision, raw: value.time };
}

/**
 * Structured facts for one article, by its English Wikipedia title.
 *
 * Records whether each statement carries a reference of its own. An
 * unreferenced Wikidata statement is still a published statement, but it is
 * weaker evidence, and a pipeline that hides the difference is a pipeline
 * that will eventually publish something it should not have.
 */
export async function wikidata(title) {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*` +
    `&sites=enwiki&props=claims&titles=${encodeURIComponent(title)}`;
  const data = await getJson(url);
  const entity = Object.values(data?.entities ?? {})[0];
  if (!entity?.id || entity.missing !== undefined) return null;

  const claims = entity.claims ?? {};
  const dates = [];
  for (const [property, label] of WIKIDATA_TIME_PROPS) {
    for (const claim of claims[property] ?? []) {
      const parsed = timeValue(claim.mainsnak);
      if (!parsed) continue;
      dates.push({
        property,
        label,
        year: parsed.year,
        precision: parsed.precision,
        raw: parsed.raw,
        referenced: (claim.references ?? []).length > 0,
      });
    }
  }

  const point = claims.P625?.[0]?.mainsnak?.datavalue?.value;
  return {
    id: entity.id,
    url: `https://www.wikidata.org/wiki/${entity.id}`,
    dates,
    coordinates:
      point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
        ? { lat: point.latitude, lng: point.longitude }
        : null,
  };
}
