import "server-only";

import { getCuratedStay } from "@/data/curated-stays";
import type { JourneyRow, ViewedRow } from "@/db/queries/account";
import { publishedProperty } from "@/db/queries/partners";
import { getCapsuleStays, getHistory, getStories } from "@/lib/destinations/content";
import { destinationLocationLine } from "@/lib/destinations/location";
import { getDestination } from "@/lib/destinations/registry";
import { heroImages } from "@/lib/global-index";
import { isLanguageCode } from "@/lib/i18n/languages";
import { withLanguage } from "@/lib/i18n/paths";
import { knowledge } from "@/lib/personalization/knowledge";

/**
 * Turning stored ids into what an account page shows. Names, images and
 * links come from the current records; an id whose record no longer exists
 * is left out rather than shown under a guessed name.
 */

export interface DestinationTile {
  id: string;
  name: string;
  location: string;
  href: string;
  image: string | null;
  imageAlt: string;
}

let heroes: Promise<Awaited<ReturnType<typeof heroImages>>> | null = null;

export async function destinationTiles(ids: readonly string[], locale = "en"): Promise<DestinationTile[]> {
  heroes ??= heroImages();
  const images = await heroes;
  const language = isLanguageCode(locale) ? locale : "en";
  return ids.flatMap((id) => {
    const destination = getDestination(id);
    if (!destination) return [];
    const hero = images.get(id);
    return [
      {
        id,
        name: destination.name,
        location: destinationLocationLine(destination.name, destination.region?.name ?? null, destination.country.name),
        /* Destination pages exist in every interface language; open the
           traveller's preferred one. */
        href: withLanguage(`/destinations/${id}`, language),
        image: hero?.image ?? null,
        imageAlt: hero?.imageAlt ?? destination.name,
      },
    ];
  });
}

export interface ViewedItem {
  key: string;
  destinationId: string;
  destinationName: string;
  kindLabel: string;
  title: string;
  href: string;
  lastViewedAt: Date;
}

type Titled = { slug?: string; title?: string };

export async function describeViewed(rows: ViewedRow[]): Promise<ViewedItem[]> {
  const { coverage } = await knowledge();
  const out: ViewedItem[] = [];
  for (const row of rows) {
    const destination = getDestination(row.destinationId);
    if (!destination) continue;
    const separator = row.entityId.indexOf(":");
    const kind = row.entityId.slice(0, separator);
    const id = row.entityId.slice(separator + 1);
    const base = { key: `${row.destinationId}/${row.entityId}`, destinationId: row.destinationId, destinationName: destination.name, lastViewedAt: row.lastViewedAt };

    if (row.eventType === "PLACE_VIEWED") {
      const experience = coverage
        .find((entry) => entry.destination.id === row.destinationId)
        ?.experiences.find((candidate) => candidate.id === row.entityId);
      if (experience) out.push({ ...base, kindLabel: experience.typeLabel || "Place", title: experience.title, href: experience.href });
    } else if (row.eventType === "STORY_VIEWED") {
      const story = ((await getStories(row.destinationId)) as Titled[]).find((entry) => entry.slug === id);
      if (story?.title) out.push({ ...base, kindLabel: "Story", title: story.title, href: `/destinations/${row.destinationId}/stories/${id}` });
    } else if (row.eventType === "HISTORY_VIEWED") {
      const event = ((await getHistory(row.destinationId)) as Titled[]).find((entry) => entry.slug === id);
      if (event?.title) out.push({ ...base, kindLabel: "History", title: event.title, href: `/destinations/${row.destinationId}/history/${id}` });
    } else if (row.eventType === "STAY_VIEWED") {
      if (kind === "stay") {
        const name =
          row.destinationId === "sikkim"
            ? getCuratedStay(id)?.name
            : (await getCapsuleStays(row.destinationId)).find((stay) => stay.id === id)?.name;
        if (name) out.push({ ...base, kindLabel: "Stay", title: name, href: `/destinations/${row.destinationId}/stays/${id}` });
      } else if (kind === "partner-stay") {
        const property = await publishedProperty(row.destinationId, id);
        if (property) out.push({ ...base, kindLabel: "Partner stay", title: property.name, href: `/destinations/${row.destinationId}/partner-stays/${id}` });
      }
    }
  }
  return out;
}

export function journeyTitle(row: Pick<JourneyRow, "title" | "destinationIds">): string {
  if (row.title) return row.title;
  const names = row.destinationIds.map((id) => getDestination(id)?.name).filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(" → ") : "Journey";
}

export function destinationName(id: string): string | null {
  return getDestination(id)?.name ?? null;
}
