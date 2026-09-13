/**
 * Agents 2 and 3 — source discovery and retrieval.
 *
 * DISCOVERY proposes candidate sources for a destination. It never states a
 * fact about the destination; its entire output is URLs, publishers and
 * authority tiers.
 *
 * RETRIEVAL fetches approved candidates, normalises them, and records what
 * happened. A failure is recorded as a failure — there is no path here that
 * substitutes remembered or generated content for a document that did not
 * arrive.
 *
 * SECURITY
 * --------
 * Retrieval is allowlisted by host. A URL that is not on the list is not
 * fetched, no matter who proposed it — which matters because in a later phase
 * a model may propose candidate URLs, and a model that can cause an arbitrary
 * fetch is an SSRF surface. The allowlist is the boundary, not the prompt.
 *
 * Only public pages are retrieved. Nothing here bypasses robots.txt,
 * authentication or access controls, and no private or paywalled content is
 * fetched. Wikimedia's published API is used as documented, with a descriptive
 * User-Agent and the ~1.1s spacing this project already established after
 * being rate-limited during earlier agent work.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { htmlToProse, htmlToText, normaliseText, sha256, stableId } from "./core.mjs";
import { TIER_RANK, officialSourcesFor } from "./source-registry.mjs";

const UA = "TerraStory-Research/1.0 (SIH heritage project; sourced-archive research agent)";

/* Spacing between calls to one host. Established in this project's earlier
   agents after Wikimedia rate-limited a burst; kept rather than rediscovered. */
const RATE_LIMIT_MS = 1100;

const CACHE_DIR = join(process.cwd(), ".data", "research", "cache");

/* =========================================================================
   HOST ALLOWLIST — the SSRF boundary
   =========================================================================
   Exact hosts and suffixes. A candidate whose host is absent is refused
   before any network call. Adding a host is a deliberate edit to this file,
   reviewed like any other change.
   ========================================================================= */
const ALLOWED_HOSTS = new Set([
  "en.wikipedia.org",
  "en.wikivoyage.org",
  "commons.wikimedia.org",
  "whc.unesco.org",
  /* Phase 4: official destination organisations, each verified by hand
     before being added here and in scripts/research/source-registry.mjs. */
]);

/**
 * Government and academic domains, allowed by suffix.
 *
 * `.lg.jp` is Japanese local government and `.pref.*.jp` prefectural; both are
 * added by suffix rather than opening `.jp`, which would allow anything.
 */
const ALLOWED_SUFFIXES = [
  ".gov.in", ".nic.in", ".go.jp", ".lg.jp",
  ".gouv.fr", ".gov.it", ".gov.tr", ".edu", ".ac.uk", ".ac.jp",
];

export function isAllowedUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  /* Scheme check first: file:, data: and gopher: are not sources. */
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_SUFFIXES.some((s) => host.endsWith(s));
}

/* =========================================================================
   AGENT 2 — DISCOVERY
   ========================================================================= */

/**
 * Propose candidate sources for a destination.
 *
 * Deterministic and conservative. It proposes the public reference works that
 * are already registered as global sources in src/data/sources.ts, addressed
 * to this destination. It does NOT invent official portal URLs: guessing that
 * a city has a tourism site at a plausible address produces either a 404 or,
 * worse, someone else's site presented as authoritative.
 *
 * A destination that declares an official portal in the source registry would
 * have it proposed at the top tier. Sikkim does; the planned destinations do
 * not, and discovery says so rather than filling the gap.
 */
/**
 * Propose candidate sources for a destination, best authority first.
 *
 * PHASE 4 CHANGE. Phase 3 proposed only Wikipedia and Wikivoyage, so every
 * claim it produced landed at encyclopedia tier — accurate, but thin, and it
 * meant the archive's most authoritative claims came from its least
 * authoritative sources.
 *
 * Discovery now walks the tiers in order:
 *
 *   1. official government / official tourism / institutional
 *   2. academic / museum / university
 *   3. reputable publications
 *   4. encyclopedia and general public references — LAST, and explicitly to
 *      supplement what the higher tiers did not cover
 *
 * Encyclopedia sources are still proposed, because rejecting them outright
 * would lose real coverage; they simply no longer come first, and the tier
 * travels with every claim so a reviewer can see what backed it.
 *
 * Official URLs come from a hand-verified registry, never from a pattern or a
 * model. The alternative — guessing that a city has a portal at a plausible
 * address — returns a 404 or somebody else\u2019s site presented as authoritative.
 */
export function discoverSources(destination) {
  const title = encodeURIComponent(destination.name.replace(/\s+/g, "_"));

  /*
   * The MediaWiki action API with `explaintext` rather than the REST HTML
   * endpoint: it returns clean plain text, so nothing depends on the quality
   * of an HTML stripper before a span is verified.
   */
  const wikiApi = (host, pageTitle) =>
    `https://${host}/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&formatversion=2&titles=${pageTitle}`;

  /* Tiers 1-3: hand-verified official and institutional sources. */
  const official = officialSourcesFor(destination.id).map((entry) => ({
    ...entry,
    retrievalMethod: "agent-api",
  }));

  /* Tier 4: encyclopedia, always available, always last. */
  const encyclopedic = [
    {
      url: wikiApi("en.wikipedia.org", title),
      title: `${destination.name} \u2014 Wikipedia`,
      publisher: "Wikimedia Foundation",
      tier: "encyclopedia",
      type: "encyclopedia",
      retrievalMethod: "agent-api",
      rationale: "Registered global reference work; tertiary source, medium confidence.",
      sourceRegistryId: "wikipedia",
      format: "mediawiki-extract",
    },
    {
      url: wikiApi("en.wikivoyage.org", title),
      title: `${destination.name} \u2014 Wikivoyage`,
      publisher: "Wikimedia Foundation",
      tier: "other-public",
      type: "encyclopedia",
      retrievalMethod: "agent-api",
      rationale: "Registered global reference work; traveller-written, lowest tier.",
      sourceRegistryId: "wikivoyage",
      format: "mediawiki-extract",
    },
  ];

  return [...official, ...encyclopedic]
    .filter((c) => isAllowedUrl(c.url))
    .sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9));
}

/**
 * Report the authority profile of what discovery found.
 *
 * Used by the planner to state an honest gap: a destination whose only
 * readable sources are encyclopedia-tier should say so rather than let a
 * reviewer infer authority the claims do not have.
 */
export function coverageProfile(destination) {
  const candidates = discoverSources(destination);
  const byTier = {};
  for (const c of candidates) byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;
  const readableHigherTier = candidates.filter(
    (c) => (TIER_RANK[c.tier] ?? 9) <= 2 && c.rendersServerSide !== false,
  ).length;
  const blocked = candidates.filter((c) => c.rendersServerSide === false);
  return { byTier, readableHigherTier, blocked, total: candidates.length };
}

/* =========================================================================
   AGENT 3 — RETRIEVAL
   ========================================================================= */

let lastFetchAt = 0;

async function paced(fn) {
  const wait = Math.max(0, RATE_LIMIT_MS - (Date.now() - lastFetchAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();
  return fn();
}

function cachePath(url) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  return join(CACHE_DIR, `${sha256(url).slice(0, 32)}.json`);
}

/**
 * Fetch one candidate.
 *
 * Cached on disk by URL. Re-running a job over unchanged sources costs no
 * network calls and, because claim ids are derived from content, produces
 * identical claims — which is what makes job reuse and deduplication work
 * without a database.
 */
export async function retrieveSource(candidate, destination, { force = false } = {}) {
  if (!isAllowedUrl(candidate.url)) {
    return { ok: false, failure: { url: candidate.url, reason: "host-not-allowlisted", attemptedAt: new Date().toISOString() } };
  }

  const path = cachePath(candidate.url);
  if (!force && existsSync(path)) {
    try {
      const cached = JSON.parse(readFileSync(path, "utf8"));
      return { ok: true, document: cached, cached: true };
    } catch {
      /* A corrupt cache entry is re-fetched rather than trusted. */
    }
  }

  /*
   * Exponential backoff on 429. Wikimedia rate-limits bursts hard — this
   * project learned that during earlier agent work and the lesson is encoded
   * here rather than rediscovered. A run that exhausts its retries records a
   * failure; it never proceeds without the document.
   */
  let res = null;
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS * 2 ** attempt));
    }
    try {
      res = await paced(() =>
        fetch(candidate.url, {
          headers: { "User-Agent": UA, Accept: "application/json,text/html" },
          signal: AbortSignal.timeout(30_000),
        }),
      );
    } catch (err) {
      lastError = err.name === "TimeoutError" ? "timeout" : err.message;
      res = null;
      continue;
    }
    if (res.status !== 429) break;
    lastError = "rate-limited (429)";
  }

  if (!res) {
    return { ok: false, failure: { url: candidate.url, reason: `network: ${lastError}`, attemptedAt: new Date().toISOString() } };
  }
  if (res.status === 429) {
    return { ok: false, failure: { url: candidate.url, reason: "rate-limited (429) after retries", attemptedAt: new Date().toISOString() } };
  }
  if (!res.ok) {
    return { ok: false, failure: { url: candidate.url, reason: `http ${res.status}`, attemptedAt: new Date().toISOString() } };
  }

  const raw = await res.text();
  let text;
  if (candidate.format === "mediawiki-extract") {
    /* Parse the documented API envelope. A malformed or empty envelope is a
       retrieval failure, not an empty source. */
    try {
      const page = JSON.parse(raw)?.query?.pages?.[0];
      if (!page || page.missing || typeof page.extract !== "string") {
        return { ok: false, failure: { url: candidate.url, reason: "no article for this title", attemptedAt: new Date().toISOString() } };
      }
      text = normaliseText(page.extract);
    } catch {
      return { ok: false, failure: { url: candidate.url, reason: "malformed API response", attemptedAt: new Date().toISOString() } };
    }
  } else if (candidate.format === "html") {
    /* Prose only. A government portal's page is mostly navigation, and
       taking every string makes a source look rich while reading as noise. */
    text = htmlToProse(raw);
    /* Fall back to full-text extraction for pages with no paragraph markup,
       rather than reporting a reachable source as empty. */
    if (text.length < 500) text = htmlToText(raw);
  } else {
    text = normaliseText(raw);
  }

  /* An empty or near-empty document is a failure, not a source with no
     claims in it. Recording the difference matters to a reviewer. */
  if (text.length < 500) {
    return { ok: false, failure: { url: candidate.url, reason: `document too short (${text.length} chars)`, attemptedAt: new Date().toISOString() } };
  }

  const document = {
    sourceId: candidate.sourceRegistryId ?? stableId("src", candidate.url),
    url: candidate.url,
    title: candidate.title,
    publisher: candidate.publisher,
    tier: candidate.tier,
    type: candidate.type,
    retrievalMethod: candidate.retrievalMethod,
    retrievedAt: new Date().toISOString(),
    text,
    contentHash: sha256(text),
    destinationId: destination.id,
  };

  writeFileSync(path, `${JSON.stringify(document)}\n`, "utf8");
  return { ok: true, document, cached: false };
}

/**
 * Retrieve every candidate, deduplicating by content hash.
 *
 * Two URLs that return the same bytes are one source. Without this, a
 * redirect or a mirror would let the same sentence support a claim twice and
 * look like corroboration.
 */
export async function retrieveAll(candidates, destination, opts) {
  const documents = [];
  const failures = [];
  const seenHashes = new Set();

  for (const candidate of candidates) {
    const result = await retrieveSource(candidate, destination, opts);
    if (!result.ok) {
      failures.push(result.failure);
      continue;
    }
    if (seenHashes.has(result.document.contentHash)) continue;
    seenHashes.add(result.document.contentHash);
    documents.push(result.document);
  }
  return { documents, failures };
}
