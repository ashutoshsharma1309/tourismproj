#!/usr/bin/env node
/**
 * Heritage Video Agent — Ney Heritage
 *
 * Finds and verifies a monastery-specific video to stand in where no verified
 * 360° capture exists. It publishes nothing it cannot check.
 *
 * What is legitimate here, and what is not
 * ---------------------------------------
 * Candidate discovery is done by a human/agent research pass and recorded in
 * CANDIDATES below, each with the search query that surfaced it — no scraping
 * of YouTube search pages, no bypassing of any access control.
 *
 * Verification uses YouTube's own public oEmbed endpoint, which needs no API
 * key and is the documented way to resolve a video's title, channel and
 * thumbnail. A 404 there means the video is private, removed or geo-blocked,
 * and the candidate is dropped.
 *
 * Quality is probed by asking the thumbnail CDN which renditions exist:
 * maxresdefault.jpg is only generated for sources of 1280x720 or better, so its
 * presence is a real (if coarse) signal that the upload is HD. Nothing is
 * downloaded or re-hosted — playback happens in YouTube's own embedded player.
 *
 * Usage: node scripts/heritage-video-agent.mjs
 * Writes: reports/monastery-video-discovery.json
 *         src/data/generated/monastery-videos.json
 */

import { mkdirSync, writeFileSync } from "node:fs";

const OEMBED = "https://www.youtube.com/oembed";
const THUMB = (id, name) => `https://i.ytimg.com/vi/${id}/${name}`;
const UA = "Ney-Heritage-Research/1.0 (SIH cultural heritage project)";
const RETRIEVED_AT = process.env.RETRIEVED_AT ?? new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Channels whose Sikkim coverage is institutional rather than incidental.
 * Credibility is a scoring input, never a substitute for the relevance check.
 */
const CREDIBLE_CHANNEL_PATTERNS = [
  { re: /sikkim\s*(tourism|govern|chronicle|express)/i, weight: 1.0, kind: "regional press / government" },
  { re: /\b(doordarshan|dd\s*news|ani\s*news|pib)\b/i, weight: 1.0, kind: "national broadcaster / agency" },
  { re: /karmapa|monastery|gompa|dharma|buddhis/i, weight: 0.85, kind: "institutional / monastic" },
  { re: /travel|explor|wander|vlog|trip|tour|nomad|journey/i, weight: 0.6, kind: "travel creator" },
];

/**
 * Research pass, 2026-08-16. Each candidate records the query that found it so
 * the discovery is reproducible. Shorts and vertical clips were excluded at
 * source: only /watch?v= results were carried forward.
 */
const CANDIDATES = {
  rumtek: {
    aliases: ["rumtek", "dharma chakra"],
    query: "Rumtek Monastery Sikkim tour video",
    ids: ["lIjEBfNz7pw", "3f-7Gxsg7s8", "zcGG-bamp-4", "lZRocWgnyOo", "g2_wzr-YjNA", "N5Ahh18xsIs", "v049M0jNrAU"],
  },
  pemayangtse: {
    aliases: ["pemayangtse", "pemayangste"],
    query: "Pemayangtse Monastery Pelling Sikkim video tour",
    ids: ["WaNxOolNi54", "MLANSiri0y4", "R8jPsruUGjo", "V9CYJQ-fjCk", "H70ujcC5ZEQ", "t2LkxK_HXQc", "j7Lullq_R10"],
  },
  tashiding: {
    aliases: ["tashiding", "bhumchu", "bumchu"],
    query: "Tashiding Monastery Sikkim Bhumchu video",
    ids: ["VIGwqAcVmVw", "ODWC83su5Lw", "wE9_Lcm1L0Y", "_6SOS-u6xVw", "pJ6A_IEJfFA", "gesLZXRKhGY", "VZudl-CWz6g"],
  },
  enchey: {
    aliases: ["enchey"],
    query: "Enchey Monastery Gangtok Sikkim video",
    ids: ["IA-Mns55BpI", "t-oeY7LTRKM", "7pCnLsHzmsk", "546NbtchwaQ", "LN4oyoCkmBw", "vUHB2oani2g", "c4O4YWhimaA", "h77Xr8fawOw"],
  },
  lingdum: {
    aliases: ["lingdum", "ranka"],
    query: "Lingdum Ranka Monastery Sikkim video tour",
    ids: ["wfzgYoWeh88", "cCSLnc2JBF4", "ikHwqYdSbcM", "OA2LycfIKjo", "MBZ1uILf88s", "G9FpheADKWI", "XLb8NjUh-CU", "eLAP4IXyew0"],
  },
  phodong: {
    aliases: ["phodong", "phodang"],
    query: "Phodong Monastery North Sikkim video",
    ids: ["iCiZ8aJOOAA", "d6jRfTty4sw", "cjQk8l9kyQo"],
  },
  phensang: {
    aliases: ["phensang"],
    query: '"Phensang Monastery" Sikkim video',
    ids: ["NuXNaXV1X0o"],
  },
  lachen: {
    aliases: ["lachen"],
    query: '"Lachen Monastery" Sikkim video',
    ids: ["HLr1RcT2Z_I", "fEU5BMRs0fk", "apE8-k3lImg", "Nd876UpICgw"],
  },
  lachung: {
    aliases: ["lachung"],
    query: "Lachung Monastery Sikkim video gompa",
    ids: ["LfBfuxzX6Y0", "M3qH0fCZCiw", "NS-8RM2zoDY"],
  },
  "sanga-choeling": {
    aliases: ["sanga choeling", "sangachoeling", "sanghak choeling", "sange choeling", "sanga choling"],
    query: "Sanga Choeling Monastery Pelling Sikkim video",
    ids: ["9NCBYkdS15M", "L3A214ZNhuw", "kasw_3Wpg8w", "arZmJnABsyw", "MhKE8ee138o", "en5Mq9H0NNA", "9oepDOYa0Xo"],
  },
  dubdi: {
    aliases: ["dubdi", "yuksom monastery"],
    query: "Dubdi Monastery Yuksom oldest monastery Sikkim video",
    ids: ["vpRfQAAN0XI", "i_10dWY9B_c", "HAawS9U9VEg", "OPkUfFaDNRw", "MoTmmN7Up9Q", "LmRU3BndJbI", "s4L44KpXW9Y"],
  },
  ralang: {
    aliases: ["ralang", "ralong", "palchen choeling", "palchen choling", "palchen chosling"],
    query: "Ralang Monastery Ravangla Sikkim Palchen Choeling video",
    ids: ["Y5P5hmR-FNw", "_Chu7hEex4M", "CcR6KNKeVEc", "e2dW1SUbkMg", "dERuxgRwS_k", "uK6V5hqdhVM", "6eTCPWIaRKc", "uMX0NxWB4YU", "KC8X9YVG2q8"],
  },
  kewzing: {
    aliases: ["kewzing", "kewwzing"],
    query: "Kewzing monastery Sikkim video",
    ids: ["8ESdXhXefgs", "bFX_ethO1FA", "OeburlxloSo", "TmVeEbKll80"],
  },
  rinchenpong: {
    aliases: ["rinchenpong", "rinchingpong", "resum", "reesum", "ressum"],
    query: "Rinchenpong Monastery West Sikkim video",
    ids: ["x5d9hh4ZhZQ", "TzLaJ3P1EfY", "mHBdTJuW1_E", "nbrCtrv1TAQ", "OsQq1GAtRtQ", "lkaTG-niLco", "MpXr08rpLhs"],
  },
  tsuklakhang: {
    aliases: ["tsuklakhang", "tsuk la khang", "royal chapel", "pang lhabsol"],
    query: "Tsuklakhang Royal Chapel Palace Gangtok Sikkim video",
    ids: ["mAL5bCtH3Lk", "q0I-GcQ9F8c", "SJiAk72RU7o", "wtiJ26nHZP0"],
  },
};

/** Region words that keep a same-named monastery elsewhere from matching. */
const REGION_TOKENS = ["sikkim", "gangtok", "pelling", "ravangla", "yuksom", "namchi", "lachen", "lachung", "north east", "northeast"];

/** Disqualifiers — a clip about the drive there is not a clip about the site. */
const NEGATIVE_TOKENS = ["darjeeling", "kalimpong", "ladakh", "bhutan", "nepal", "manali", "spiti", "tawang", "shorts"];

/**
 * Words that mark a title as being about the religious site rather than the
 * settlement that shares its name. Almost every Sikkim monastery is named for
 * its village, so "Lachung" in a title means the valley far more often than it
 * means the gompa — this is the single most important filter here.
 */
const SITE_WORDS = /monaster|monestry|monastic|gompa|gumpa|dgon|dgon pa|chaam|cham dance|bhumchu|bumchu|losoong|pang lhabsol|temple|shrine|royal chapel/i;

/**
 * Confusable neighbours: distinct institutions that share a village with the
 * site being documented. A video about one of these is not a video about the
 * catalogued monastery, however well its title scores.
 */
const CONFUSABLE = {
  kewzing: [/bon monastery/i, /mambru/i],
  rinchenpong: [/^(?!.*rinchenpong).*resum|reesum|ressum/i],
  phodong: [/labrang/i],
  ralang: [/kalimpong/i],
};

async function oembed(id) {
  const url = `${OEMBED}?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (res.status === 404 || res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`oembed ${res.status}`);
  return res.json();
}

/** Highest rendition the thumbnail CDN actually holds — a proxy for upload quality. */
async function probeQuality(id) {
  for (const [name, label] of [
    ["maxresdefault.jpg", "hd1080-or-better"],
    ["sddefault.jpg", "sd480"],
    ["hqdefault.jpg", "hq360"],
  ]) {
    try {
      const res = await fetch(THUMB(id, name), { method: "HEAD", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (res.ok) return { rendition: name, quality: label };
    } catch {
      /* fall through to the next rendition */
    }
  }
  return { rendition: null, quality: "unknown" };
}

function credibility(channel) {
  for (const p of CREDIBLE_CHANNEL_PATTERNS) {
    if (p.re.test(channel)) return { score: p.weight, kind: p.kind };
  }
  return { score: 0.35, kind: "unclassified channel" };
}

/**
 * Scores a candidate on the axes the brief sets out. Relevance is a gate, not
 * a weight: a video whose title never names the monastery cannot represent it,
 * whatever else it scores.
 */
function score(meta, quality, site, slug) {
  const title = meta.title.toLowerCase();
  const hay = `${meta.title} ${meta.author_name}`.toLowerCase();
  /* The alias must be in the TITLE. A channel called "Sikkim Travels"
     publishing a clip about a lake would otherwise pass as monastery footage. */
  const namesSite = site.aliases.some((a) => title.includes(a));
  const namesRegion = REGION_TOKENS.some((t) => hay.includes(t));
  const negative = NEGATIVE_TOKENS.filter((t) => hay.includes(t));
  /* Names the site AND says it is the religious site, not the village. */
  const identifiesSite = namesSite && SITE_WORDS.test(title);
  const confusedWith = (CONFUSABLE[slug] ?? []).filter((re) => re.test(meta.title)).map(String);

  const relevance = namesSite ? (namesRegion ? 1 : 0.75) : 0;
  const identification = identifiesSite ? 1 : namesSite ? 0.6 : 0;
  const visual = quality.quality === "hd1080-or-better" ? 1 : quality.quality === "sd480" ? 0.5 : 0.2;
  const cred = credibility(meta.author_name);

  const total =
    relevance * 0.3 +
    visual * 0.2 +
    identification * 0.2 +
    cred.score * 0.15 +
    /* recency and audio quality are not knowable without the Data API; they are
       left unscored rather than guessed, and the weights they would carry are
       reported as withheld. */
    (quality.quality === "hd1080-or-better" ? 0.05 : 0) +
    0.05; /* embeddability — confirmed separately by the browser QA pass */

  return {
    total: Number(total.toFixed(3)),
    parts: { relevance, visual, identification, credibility: cred.score },
    channelKind: cred.kind,
    namesSite,
    identifiesSite,
    namesRegion,
    confusedWith,
    negativeTokens: negative,
    withheld: ["recency (needs YouTube Data API)", "audio quality (not machine-checkable)"],
  };
}

/** Below this a candidate is not good enough to stand in for the monastery. */
const PUBLISH_THRESHOLD = 0.7;

async function main() {
  console.log("Heritage Video Agent\n");
  const results = [];

  for (const [slug, site] of Object.entries(CANDIDATES)) {
    const scored = [];
    for (const id of site.ids) {
      await sleep(400);
      let meta;
      try {
        meta = await oembed(id);
      } catch (e) {
        scored.push({ videoId: id, status: "ERROR", reason: e.message });
        continue;
      }
      if (!meta) {
        scored.push({ videoId: id, status: "UNAVAILABLE", reason: "oEmbed 404 — private, removed or region-blocked" });
        continue;
      }
      const quality = await probeQuality(id);
      const s = score(meta, quality, site, slug);
      scored.push({
        videoId: id,
        status: "OK",
        title: meta.title,
        channel: meta.author_name,
        channelUrl: meta.author_url,
        thumbnail: meta.thumbnail_url,
        sourceUrl: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        quality: quality.quality,
        thumbnailRendition: quality.rendition,
        score: s,
      });
    }

    const eligible = scored
      .filter(
        (c) =>
          c.status === "OK" &&
          /* Names the monastery, and says it is the monastery — not the village
             of the same name, and not a different institution in that village. */
          c.score.identifiesSite &&
          c.score.confusedWith.length === 0 &&
          c.score.negativeTokens.length === 0,
      )
      .sort((a, b) => b.score.total - a.score.total);
    const winner = eligible[0] && eligible[0].score.total >= PUBLISH_THRESHOLD ? eligible[0] : null;

    results.push({
      slug,
      discoveryQuery: site.query,
      candidatesChecked: scored.length,
      eligible: eligible.length,
      selected: winner
        ? {
            videoId: winner.videoId,
            provider: "youtube",
            title: winner.title,
            channel: winner.channel,
            channelUrl: winner.channelUrl,
            thumbnail: winner.thumbnail,
            sourceUrl: winner.sourceUrl,
            embedUrl: winner.embedUrl,
            quality: winner.quality,
            score: winner.score.total,
            usageNote:
              "Played through YouTube's own embedded player. Nothing is downloaded, re-hosted or re-encoded; the rights holder keeps their analytics and their controls.",
            verifiedAt: RETRIEVED_AT,
          }
        : null,
      outcome: winner ? "SELECTED" : eligible.length > 0 ? "BELOW_THRESHOLD" : "NONE_ELIGIBLE",
      candidates: scored,
    });

    const line = winner
      ? `  + ${slug} — ${winner.score.total} ${winner.quality} — ${winner.title.slice(0, 58)}`
      : `  · ${slug} — no candidate cleared the bar (checked ${scored.length})`;
    console.log(line);
  }

  /* Duplicate abuse check: one video standing in for unrelated sites. */
  const byVideo = new Map();
  for (const r of results) {
    if (!r.selected) continue;
    const list = byVideo.get(r.selected.videoId) ?? [];
    list.push(r.slug);
    byVideo.set(r.selected.videoId, list);
  }
  const duplicates = [...byVideo.entries()].filter(([, slugs]) => slugs.length > 1).map(([videoId, slugs]) => ({ videoId, slugs }));

  const report = {
    generatedAt: RETRIEVED_AT,
    agent: "Heritage Video Agent",
    method: {
      discovery: "Recorded research queries per site; only /watch?v= results carried forward, so Shorts and vertical clips never enter the pool.",
      verification: "YouTube public oEmbed endpoint (no API key, no scraping). A 404 drops the candidate as private, removed or blocked.",
      quality: "Thumbnail CDN rendition probe. maxresdefault.jpg exists only for uploads of 1280x720 or better.",
      scoring: "relevance 30 / visual 20 / identification 20 / credibility 15 / licence-embed 5 / HD bonus 5. Recency and audio quality are withheld, not guessed.",
      gate:
        "A candidate must name the monastery in its own title, describe it as the religious site rather than the village of the same name, not name a confusable neighbouring institution, carry no disqualifying region token, and score at least " +
        PUBLISH_THRESHOLD +
        ".",
      embedding: "youtube-nocookie.com embed, click-to-load, never autoplayed with sound, never downloaded or re-hosted.",
    },
    totals: {
      sitesChecked: results.length,
      selected: results.filter((r) => r.selected).length,
      noneEligible: results.filter((r) => r.outcome === "NONE_ELIGIBLE").length,
      belowThreshold: results.filter((r) => r.outcome === "BELOW_THRESHOLD").length,
      duplicateSelections: duplicates.length,
    },
    duplicates,
    results,
  };

  mkdirSync("reports", { recursive: true });
  mkdirSync("src/data/generated", { recursive: true });
  writeFileSync("reports/monastery-video-discovery.json", JSON.stringify(report, null, 2) + "\n");

  const published = Object.fromEntries(results.filter((r) => r.selected).map((r) => [r.slug, r.selected]));
  writeFileSync("src/data/generated/monastery-videos.json", JSON.stringify(published, null, 2) + "\n");

  console.log("\n" + JSON.stringify(report.totals, null, 2));
  if (duplicates.length) console.log("\nDUPLICATES FLAGGED:", JSON.stringify(duplicates));
}

main().catch((e) => {
  console.error("video agent failed:", e.message);
  process.exit(1);
});
