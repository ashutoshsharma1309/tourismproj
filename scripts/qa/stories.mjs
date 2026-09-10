/**
 * The Stories module, checked as data and as routes.
 *
 * The module went from 70 stories on one destination to 249 across fifteen,
 * and every one of the new ones is retrieved rather than written. That makes
 * the provenance checks below the important ones: a retrieved story that
 * loses its source, or gains a photograph belonging to another destination,
 * is worse than no story, because the whole claim of this product is that a
 * reader can check it.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const DIR = "src/data/generated/stories";
const CREDITS = JSON.parse(readFileSync("src/data/generated/image-credits.json", "utf8"));
const FOCAL = JSON.parse(readFileSync("src/data/generated/image-focal.json", "utf8"));
const creditPaths = new Set(CREDITS.filter((c) => c.localPath).map((c) => c.localPath));

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed++; return; }
  failures.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* `search.json` lives here too — a flat slice for the palette, not a
   destination's stories. Reading it as one crashed this suite on `content`. */
const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "search.json");
check("Editorial stories exist for the capsule destinations", files.length === 14, `${files.length} files`);

const destinations = new Set(files.map((f) => f.replace(/\.json$/, "")));
const allSlugs = new Set();
let total = 0;

for (const file of files) {
  const id = file.replace(/\.json$/, "");
  const stories = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  total += stories.length;

  check(`${id}: has stories`, stories.length > 0, `${stories.length}`);

  const slugs = new Set();
  const titles = new Set();
  for (const story of stories) {
    const where = `${id}/${story.slug}`;

    check(`${where}: names its destination`, story.destinationId === id, story.destinationId);
    check(`${where}: has body prose`, Array.isArray(story.content) && story.content.length > 0);
    check(
      `${where}: the body is long enough to be a story`,
      story.content.join(" ").split(/\s+/).length >= 150,
      `${story.content.join(" ").split(/\s+/).length} words`,
    );

    /* Evidence. A retrieved narrative with no source is an unsourced claim. */
    check(`${where}: cites at least one source`, Array.isArray(story.sources) && story.sources.length > 0);
    for (const source of story.sources ?? []) {
      check(`${where}: its source has an https URL`, /^https:\/\//.test(source.url ?? ""), source.url);
      check(`${where}: its source names a retrieval date`, /^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt ?? ""), source.retrievedAt);
      /* Reusing an author's TEXT needs the licence named, not just a link. */
      check(`${where}: its source states the licence its text is reused under`,
        /CC BY/i.test(source.covers ?? ""), source.covers?.slice(0, 40));
    }

    /* Uniqueness — within a destination, and globally by slug. */
    check(`${where}: its slug is unique here`, !slugs.has(story.slug));
    slugs.add(story.slug);
    check(`${where}: its title is not repeated here`, !titles.has(story.title), story.title);
    titles.add(story.title);
    check(`${where}: its slug is unique across destinations`, !allSlugs.has(`${id}/${story.slug}`));
    allSlugs.add(`${id}/${story.slug}`);

    /* Photography. A story may have none — it may not have a wrong one. */
    if (story.heroImage) {
      check(`${where}: its photograph is on disk`, existsSync(join("public", story.heroImage.slice(1))), story.heroImage);
      check(`${where}: its photograph belongs to this destination`,
        story.heroImage.startsWith(`/images/capsule/${id}/`), story.heroImage);
      check(`${where}: its photograph carries provenance`, creditPaths.has(story.heroImage), story.heroImage);
      check(`${where}: its photograph has measured dimensions`, Boolean(FOCAL[story.heroImage]), story.heroImage);
      const entry = FOCAL[story.heroImage];
      if (entry) {
        check(`${where}: its photograph is large enough to publish`, entry.w >= 640, `${entry.w}x${entry.h}`);
      }
      check(`${where}: its photograph is described for a screen reader`,
        typeof story.heroAlt === "string" && story.heroAlt.length > 0);
    }

    /* Related links must resolve, and must not reach another destination. */
    for (const slug of story.relatedStories ?? []) {
      check(`${where}: related story "${slug}" is in this destination`,
        stories.some((other) => other.slug === slug), slug);
    }
    for (const place of story.relatedPlaces ?? []) {
      const capsule = readFileSync(join("src/data/destinations/capsules", `${id}.ts`), "utf8");
      check(`${where}: related place "${place}" exists here`, capsule.includes(`id: "${place}"`), place);
    }

    /* Destination isolation — the defect this repository has hit repeatedly. */
    for (const other of destinations) {
      if (other === id) continue;
      check(`${where}: its photograph is not ${other}'s`,
        !(story.heroImage ?? "").includes(`/capsule/${other}/`), story.heroImage);
    }

    /* No fabricated apparatus. */
    check(`${where}: claims no author`, !("author" in story), "author present");
    check(`${where}: claims no publication date`, !("publicationDate" in story), "publicationDate present");
    check(`${where}: states when it was last verified`, /^\d{4}-\d{2}-\d{2}$/.test(story.lastVerified ?? ""));
    check(`${where}: declares a claim type`, typeof story.claimType === "string" && story.claimType.length > 0);
    check(`${where}: is shelved in a category`, typeof story.category === "string" && story.category.length > 0);
    check(`${where}: states a reading time`, Number.isFinite(story.readingMinutes) && story.readingMinutes >= 2);

    /* Sikkim's vocabulary must not leak outward. */
    check(`${where}: carries no Sikkim community tag`,
      Array.isArray(story.communities) && story.communities.length === 0);
    check(`${where}: is linked to no monastery`,
      Array.isArray(story.relatedMonasteries) && story.relatedMonasteries.length === 0);
  }
}

check("The module carries a substantial corpus", total >= 150, `${total} editorial stories`);

/* Routes. A sample per destination, because 249 requests is a slow suite. */
if (!process.argv.includes("--no-server")) {
  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const stories = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    const index = await fetch(`${BASE}/destinations/${id}/stories`, { redirect: "manual" });
    check(`${id}: its story index serves`, index.status === 200, `HTTP ${index.status}`);
    /*
     * WHOSE PAGE IS IT. This suite asserted only that the index served 200,
     * and the index served Sikkim's page at every destination's URL — "The
     * Story of Sikkim" under New York City — for a full build cycle before
     * anyone looked at it. A 200 is not evidence of the right content.
     */
    if (index.status === 200) {
      const html = await index.text();
      const own = stories.slice(0, 3).map((r) => r.slug);
      check(`${id}: its index lists its own records`, own.some((slug) => html.includes(`/destinations/${id}/stories/${slug}`) || html.includes(`#${slug}`)), own.join(", "));
      check(`${id}: its index carries none of Sikkim's`, !/the-throne-of-stone|Stories of Sikkim|Lepcha|Bhutia/.test(html), "Sikkim content found");
    }
    for (const story of stories.slice(0, 2)) {
      const res = await fetch(`${BASE}/destinations/${id}/stories/${story.slug}`, { redirect: "manual" });
      check(`${id}/${story.slug}: its page serves`, res.status === 200, `HTTP ${res.status}`);
      if (res.status === 200) {
        const html = await res.text();
        check(`${id}/${story.slug}: the page renders its title`, html.includes(story.title), story.title);
        check(`${id}/${story.slug}: the page renders its source`, /wikipedia\.org/i.test(html));
      }
    }
  }
}

for (const line of failures.slice(0, 25)) console.log(line);
if (failures.length > 25) console.log(`… and ${failures.length - 25} more`);
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
