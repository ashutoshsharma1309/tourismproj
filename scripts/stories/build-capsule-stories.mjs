/**
 * Shape retrieved narrative into the Story contract the engine already renders.
 *
 * The point of this step is that NOTHING downstream changes. `stories/[slug]`
 * generates params for any story carrying `content`; `resolveCapabilities`
 * turns on `storyPages` from the same field; StoryHero, StorySources,
 * ClaimBadge and the related-story rails all read the shape Sikkim's 70
 * stories already use. So a capsule story that arrives in that shape gets a
 * detail page, a nav entry and an index for free — no route, no component and
 * no capability rule is added for it.
 *
 * Two links are made here rather than retrieved, and both are derived from
 * the text rather than asserted:
 *
 *   relatedPlaces  — places of this destination whose name appears in this
 *                    story's own prose. A story about Gion Matsuri that names
 *                    Yasaka Shrine links to it; one that does not, does not.
 *   relatedStories — other stories on the same shelf in the same destination.
 *
 * Neither can reach another destination: both are built from one capsule at a
 * time, which is the isolation the QA suite asserts.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = ".data/stories";
/*
 * One file per destination, not one file for all of them. A single 200-story
 * bundle would be loaded in full to render one page; the capsules already
 * solved this with a map of lazy importers, and this follows that shape so a
 * destination pays only for its own stories.
 */
const OUT_DIR = "src/data/generated/stories";
const CREDITS = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const uncredited = [];
const creditByPath = new Map(CREDITS.filter((c) => c.localPath).map((c) => [c.localPath, c]));

const MAX_RELATED_PLACES = 4;

/**
 * The names a destination is known by in prose.
 *
 * Used to ORDER stories, never to discard them. A story about Mughlai cuisine
 * belongs to Agra whether or not its article happens to print the word
 * "Agra"; but a story that does name the place says more about it, and those
 * should be the ones a reader meets first and the one the page features.
 */
const ALSO_KNOWN_AS = {
  varanasi: ["Banaras", "Benares", "Kashi"],
  kochi: ["Cochin", "Kerala", "Malabar"],
  kolkata: ["Calcutta", "Bengal", "Bengali"],
  jaipur: ["Rajasthan", "Rajasthani"],
  mumbai: ["Bombay", "Maharashtra"],
  "new-york-city": ["New York", "Manhattan", "Brooklyn"],
  istanbul: ["Constantinople", "Ottoman", "Turkish"],
  kyoto: ["Kansai", "Japanese"],
  delhi: ["Mughal", "Punjabi"],
  hyderabad: ["Deccan", "Telangana", "Nizam"],
  agra: ["Mughal"],
  paris: ["French", "Parisian"],
  rome: ["Roman", "Italian"],
  goa: ["Goan", "Konkan"],
};

/** A paragraph that begins mid-sentence is a fragment, not prose. */
function readableParagraphs(paragraphs) {
  return paragraphs.filter((p) => {
    const first = p.trimStart();
    /* The extract API breaks a lead containing inline language glosses across
       lines, leaving orphans like `Korean: 두부; RR: dubu) or bean curd is …`
       — which rendered as a story's opening sentence. */
    if (/^[)\]}]/.test(first)) return false;
    if (/^[a-z]/.test(first)) return false;
    /* A gloss line: "Korean: …; RR: …" with no real sentence in front. */
    if (/^[A-Z][a-z]+:\s/.test(first) && first.includes(";")) return false;
    return true;
  });
}
const MAX_RELATED_STORIES = 3;

/** ~200 words a minute, floored at two — the same rule defineStory() uses. */
const readingMinutes = (words) => Math.max(2, Math.round(words / 200));

/** Place names for a destination, from the capsule the site actually reads. */
function placesOf(destinationId) {
  const source = readFileSync(
    join("src/data/destinations/capsules", `${destinationId}.ts`),
    "utf8",
  );
  const block = source.slice(source.indexOf("places: ["));
  const places = [];
  for (const m of block.matchAll(/id:\s*"([^"]+)",\s*\n\s*name:\s*"([^"]+)"/g)) {
    places.push({ slug: m[1], name: m[2] });
  }
  return places;
}

mkdirSync(OUT_DIR, { recursive: true });
const all = [];
const written = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const store = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  const { destinationId } = store;
  const places = placesOf(destinationId);
  /* The culture record is what the site reads; retrieval only checked that a
     file existed on disk. When a record is un-imaged in the capsule module
     (a "Sari from Varanasi" filed as Agra zari; Iranian minakari under Delhi
     and Jaipur), the story it sourced must lose the same picture. */
  const { capsule } = await import(`../../src/data/destinations/capsules/${destinationId}.ts`);
  const recordImage = new Map((capsule.culture ?? []).map((r) => [r.id, r.image ?? null]));

  const nameParts = [
    destinationId.replace(/-/g, " "),
    ...(ALSO_KNOWN_AS[destinationId] ?? []),
  ];

  const stories = store.stories.map((story) => {
    const content = readableParagraphs(story.content);
    const body = content.join(" ");
    /* Does this story actually speak about this place? */
    const local = nameParts.some((n) =>
      new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        `${body} ${story.title}`,
      ),
    );
    /* Word-boundary match so "Bath" does not match "Baths of Caracalla"
       backwards, and so a place named inside a longer name is not double
       counted. */
    const related = places
      .filter((place) => {
        const escaped = place.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`).test(body);
      })
      .slice(0, MAX_RELATED_PLACES)
      .map((place) => place.slug);

    const credit = story.heroImage ? creditByPath.get(story.heroImage) : undefined;
    /* No credit row, no image. Three CC BY-SA files reached the built site
       with no author named on Commons; the licence cannot be honoured, so
       the story keeps its text and loses its picture. Retrieval output is
       left as found — this is the rule, applied here, not a hand edit. */
    if (story.heroImage && !credit) {
      uncredited.push(`${destinationId}/${story.id} <- ${story.heroImage} (no credit row)`);
      story = { ...story, heroImage: undefined, heroAlt: undefined };
    } else if (story.heroImage && recordImage.has(story.id) && recordImage.get(story.id) !== story.heroImage) {
      uncredited.push(
        `${destinationId}/${story.id} <- ${story.heroImage} (culture record carries ${recordImage.get(story.id) ?? "no image"})`,
      );
      story = { ...story, heroImage: undefined, heroAlt: undefined };
    }

    return {
      slug: story.id,
      destinationId,
      title: story.title,
      dek: story.dek,
      category: story.category,
      claimType: story.claimType,
      communities: [],
      summary: story.summary,
      content,
      keyFacts: story.keyFacts,
      local,
      heroImage: story.heroImage,
      heroAlt: story.heroAlt,
      /*
       * The ImageCredit shape the story components already read — `file`,
       * `descriptionUrl`, `attribution`. An earlier pass invented `creator`
       * and `sourceUrl`, which typechecked (the field is structurally loose)
       * and rendered a credit line reading " · CC0 · Wikimedia Commons": the
       * photographer's name was in the data and no component was looking for
       * it under that name.
       */
      imageCredit: credit
        ? {
            file: decodeURIComponent(
              (credit.commonsFilePage ?? "").split("/wiki/")[1] ?? "",
            ),
            url: story.heroImage,
            descriptionUrl: credit.commonsFilePage ?? credit.sourceUrl ?? "",
            license: credit.license ?? "",
            attribution: credit.attribution ?? "",
          }
        : undefined,
      relatedMonasteries: [],
      relatedPlaces: related,
      relatedStories: [],
      sources: [
        {
          name: story.source.name,
          url: story.source.url,
          type: story.source.type,
          retrievedAt: story.source.retrievedAt,
          /* Text reuse, not merely a citation — the licence has to travel. */
          covers: `The narrative on this page, quoted under ${story.source.licence}.`,
        },
      ],
      verificationStatus: "verified",
      lastVerified: story.source.retrievedAt,
      readingMinutes: readingMinutes(content.join(" ").split(/\s+/).length),
      tags: [story.subject, story.category.toLowerCase()],
    };
  });

  /*
   * Local stories first, illustrated before unillustrated, longest first.
   * The hub features the head of this list, so a destination leads with a
   * story that names it wherever one exists.
   */
  stories.sort(
    (a, b) =>
      Number(b.local) - Number(a.local) ||
      Number(Boolean(b.heroImage)) - Number(Boolean(a.heroImage)) ||
      b.content.join(" ").length - a.content.join(" ").length,
  );

  /* Same shelf, same destination — completed after every story exists. */
  for (const story of stories) {
    story.relatedStories = stories
      .filter((other) => other.slug !== story.slug && other.category === story.category)
      .slice(0, MAX_RELATED_STORIES)
      .map((other) => other.slug);
  }

  writeFileSync(join(OUT_DIR, `${destinationId}.json`), `${JSON.stringify(stories, null, 2)}\n`);
  all.push(...stories);
  written.push(destinationId);
  const withImage = stories.filter((s) => s.heroImage).length;
  const withPlaces = stories.filter((s) => s.relatedPlaces.length > 0).length;
  console.log(
    `${destinationId.padEnd(15)} ${String(stories.length).padStart(3)} stories  ` +
      `${String(withImage).padStart(3)} illustrated  ${String(withPlaces).padStart(3)} place-linked  ` +
      `${String(stories.filter((s) => s.local).length).padStart(3)} name it`,
  );
}

/*
 * A flat, tiny slice for search.
 *
 * The palette's corpus is built synchronously and the story files are loaded
 * lazily, so search cannot await them. This carries only what a result row
 * renders — roughly 100 bytes a story against the 600-word body it points at
 * — which is what keeps the full narratives out of the index.
 */
writeFileSync(
  join(OUT_DIR, "search.json"),
  `${JSON.stringify(
    all.map((story) => ({
      destinationId: story.destinationId,
      slug: story.slug,
      title: story.title,
      category: story.category,
    })),
    null,
    2,
  )}\n`,
);

/* A static map, so the bundler can see every target and split each one. */
const index =
  `/* GENERATED by scripts/stories/build-capsule-stories.mjs — do not edit. */\n` +
  `import type { Story } from "@/data/stories/types";\n\n` +
  `const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {\n` +
  written.map((id) => `  "${id}": () => import("./${id}.json"),`).join("\n") +
  `\n};\n\n` +
  `export function hasEditorialStories(destinationId: string): boolean {\n` +
  `  return destinationId in LOADERS;\n}\n\n` +
  `export async function editorialStories(destinationId: string): Promise<Story[]> {\n` +
  `  const load = LOADERS[destinationId];\n` +
  `  if (!load) return [];\n` +
  `  return (await load()).default as Story[];\n}\n`;
writeFileSync(join(OUT_DIR, "index.ts"), index);
console.log(`\n${all.length} stories -> ${OUT_DIR} (${written.length} destinations)`);
if (uncredited.length) console.log(`dropped ${uncredited.length} image(s) the rules refuse:\n  ${uncredited.join("\n  ")}`);
