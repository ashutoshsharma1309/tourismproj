import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  getCapsuleCulture,
  getCapsuleStays,
  getHistory,
  getPlaces,
  getSites,
  getStories,
} from "@/lib/destinations/content";
import { destinationPath } from "@/lib/destinations/resolve";
import { capabilitySectionPath } from "@/lib/destinations/sections";
import type { CapabilitySet } from "@/types/destination";

/**
 * What a visitor can explore here, in four tiers.
 *
 * WHY THIS REPLACES THREE THINGS
 * ------------------------------
 * The hub used to answer "what is in this place?" three times over: a row of
 * eleven identical chips (Places · Open the map · Audio · Stories · History ·
 * Food · Festivals · Arts & crafts · Places to stay · Evidence · Culture), a
 * pair of buttons reading "Discover Jaipur" / "Plan a journey" — on the page
 * that IS Jaipur — and an "Explore" grid of capability names. A first-time
 * visitor saw three lists of the same words with no hierarchy: the fourteen
 * places they came for weighed the same as "Evidence".
 *
 * This is one block with a shape. Level 1 is the places, large, because that
 * is what a traveller means by "explore". Level 2 gives depth — history,
 * stories, culture — as three cards that say in one line what each holds.
 * Level 3 is the culture detail and the archive as compact links, and Level 4
 * is the support layer: where to stay, planning, permits, preservation. The
 * words are the same ones the sections below use, so a link here lands on a
 * heading that repeats it.
 *
 * EVERY ENTRY IS GATED ON THE DATA ITS TARGET RENDERS FROM
 * --------------------------------------------------------
 * A tier item appears only where the destination holds records of that kind,
 * read through the same accessors the sections use — so nothing here links
 * to an empty section, and the counts are counted, not typed.
 */

interface Tier1 {
  href: string;
  count: number;
  noun: string;
}
interface Card {
  href: string;
  label: string;
  line: string;
}
interface Chip {
  href: string;
  label: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export async function DestinationExploreTiers({
  destinationId,
  destinationName,
  capabilities,
  hasKnowledge,
  audioLanguages,
}: {
  destinationId: string;
  destinationName: string;
  capabilities: CapabilitySet;
  /** Reviewed research rendered below, which owns the "Sources" anchor. */
  hasKnowledge: boolean;
  audioLanguages: number;
}) {
  const [places, sites, stories, history, culture, stays] = await Promise.all([
    getPlaces(destinationId),
    getSites(destinationId),
    getStories(destinationId),
    getHistory(destinationId),
    getCapsuleCulture(destinationId),
    getCapsuleStays(destinationId),
  ]);

  const food = culture.filter((entry) => entry.kind === "food").length;
  const festivals = culture.filter((entry) => entry.kind === "festival").length;
  const crafts = culture.filter((entry) => entry.kind === "craft").length;
  const section = (capability: keyof CapabilitySet) =>
    capabilities[capability] ? capabilitySectionPath(destinationId, capability) : null;

  /* ---- Level 1: the places --------------------------------------------- */
  const level1: Tier1[] = [];
  if (places.length > 0) {
    level1.push({
      /* A capsule's places live on its discovery page; Sikkim's have pages of
         their own but the discovery route lists them too. Either way this is
         where "the places" are. */
      href: section("experiences") ?? "#featured-places",
      count: places.length,
      noun: plural(places.length, "place", "places"),
    });
  }
  if (sites.length > 0) {
    const href = section("sites");
    if (href) level1.push({ href, count: sites.length, noun: plural(sites.length, "monastery", "monasteries") });
  }

  /* ---- Level 2: depth ---------------------------------------------------- */
  const level2: Card[] = [];
  if (history.length > 0) {
    level2.push({
      href: section("historyPages") ?? "#historical-snapshot",
      label: "History",
      line: `What happened here, in order — ${history.length} dated ${plural(history.length, "event", "events")}.`,
    });
  }
  if (stories.length > 0) {
    level2.push({
      href: section("storyPages") ?? "#destination-stories",
      label: "Stories",
      line: `${stories.length} ${plural(stories.length, "narrative", "narratives")} that explain the place, each labelled by the kind of claim it makes.`,
    });
  }
  if (food + festivals + crafts > 0 || capabilities.culture) {
    const parts = [
      food > 0 ? `${food} ${plural(food, "dish", "dishes")}` : null,
      festivals > 0 ? `${festivals} ${plural(festivals, "festival", "festivals")}` : null,
      crafts > 0 ? `${crafts} ${plural(crafts, "craft", "crafts")}` : null,
    ].filter(Boolean);
    level2.push({
      href: section("culture") ?? (food > 0 ? "#food" : festivals > 0 ? "#festival" : "#craft"),
      label: "Culture",
      line: parts.length > 0 ? `Food, festivals and crafts — ${parts.join(", ")}.` : "Food, festivals, crafts and the films that record them.",
    });
  }

  /* ---- Level 3: the detail ---------------------------------------------- */
  const level3: Chip[] = [];
  if (food > 0) level3.push({ href: "#food", label: `Food · ${food}` });
  if (festivals > 0) level3.push({ href: "#festival", label: `Festivals · ${festivals}` });
  if (crafts > 0) level3.push({ href: "#craft", label: `Crafts · ${crafts}` });
  const archive = section("archive");
  if (archive) level3.push({ href: archive, label: "Museums & archive" });
  if (capabilities.experiences) {
    level3.push({ href: `${destinationPath(destinationId, "discover")}#experience-intelligence`, label: "Local suggestions" });
  }
  const map = section("map");
  if (map || places.some((place) => place.coordinates)) level3.push({ href: map ?? "#map", label: "On the map" });
  if (audioLanguages > 0) level3.push({ href: "#audio", label: `Audio guides · ${audioLanguages} languages` });
  if (hasKnowledge) level3.push({ href: "#evidence", label: "Sources" });

  /* ---- Level 4: support -------------------------------------------------- */
  const level4: Chip[] = [];
  const hotels = section("stays");
  if (hotels) level4.push({ href: hotels, label: "Places to stay" });
  else if (stays.length > 0) level4.push({ href: "#stays", label: `Places to stay · ${stays.length}` });
  if (capabilities.experiences) level4.push({ href: destinationPath(destinationId, "plan"), label: "Plan a journey" });
  const planner = section("tripPlanner");
  if (planner) level4.push({ href: planner, label: "Day-by-day planner" });
  const permits = section("permits");
  if (permits) level4.push({ href: permits, label: "Permits" });
  const responsible = section("responsible");
  if (responsible) level4.push({ href: responsible, label: "Responsible travel" });
  const preservation = section("preservation");
  if (preservation) level4.push({ href: preservation, label: "Preservation" });
  const trade = section("trade");
  if (trade) level4.push({ href: trade, label: "Registered operators" });

  if (level1.length + level2.length + level3.length + level4.length === 0) return null;

  const chip =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-small font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";

  return (
    <section className="mt-8" aria-labelledby="explore-here">
      <h2 id="explore-here" className="font-display text-h3">
        What you can explore here
      </h2>
      <p className="mt-1 text-body text-muted">
        Start with the places. Go deeper through history, stories and culture. Everything
        below is counted from {destinationName}&rsquo;s own records.
      </p>

      {level1.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {level1.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-4 rounded-xl bg-primary px-5 py-5 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span>
                <span className="block font-display text-h3 leading-tight">
                  Explore {item.count} {item.noun}
                </span>
                <span className="mt-1 block text-small opacity-80">
                  The {item.noun} you can actually visit in {destinationName}.
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      ) : null}

      {level2.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {level2.map((card) => (
            <li key={card.label}>
              <Link
                href={card.href}
                className="block h-full rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <span className="block font-display text-h4">{card.label}</span>
                <span className="mt-1 block text-caption leading-snug text-muted">{card.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {level3.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="More to explore">
          {level3.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={chip}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {level4.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-caption text-subtle">For your trip</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2" aria-label="Trip support">
            {level4.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-small font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
