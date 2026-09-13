import { capsule as agra } from "@/data/destinations/capsules/agra";
import { capsule as amritsar } from "@/data/destinations/capsules/amritsar";
import { capsule as ahmedabad } from "@/data/destinations/capsules/ahmedabad";
import { capsule as lucknow } from "@/data/destinations/capsules/lucknow";
import { capsule as pune } from "@/data/destinations/capsules/pune";
import { capsule as mysuru } from "@/data/destinations/capsules/mysuru";
import { capsule as madurai } from "@/data/destinations/capsules/madurai";
import { capsule as bhubaneswar } from "@/data/destinations/capsules/bhubaneswar";
import { capsule as srinagar } from "@/data/destinations/capsules/srinagar";
import storySearch from "@/data/generated/stories/search.json";
import { capsule as delhi } from "@/data/destinations/capsules/delhi";
import { capsule as goa } from "@/data/destinations/capsules/goa";
import { capsule as hyderabad } from "@/data/destinations/capsules/hyderabad";
import { capsule as jaipur } from "@/data/destinations/capsules/jaipur";
import { capsule as kochi } from "@/data/destinations/capsules/kochi";
import { capsule as kolkata } from "@/data/destinations/capsules/kolkata";
import { capsule as mumbai } from "@/data/destinations/capsules/mumbai";
import { capsule as varanasi } from "@/data/destinations/capsules/varanasi";
import { getDestination } from "@/lib/destinations/registry";
import type { DestinationCapsule } from "@/types/capsule";

/**
 * Capsule destinations, in the ⌘K index.
 *
 * WHY A SEPARATE MODULE
 * ---------------------
 * These are static imports — the search index is built once and cannot await
 * fourteen lazy importers — and this file keeps them out of `search-index.ts`,
 * which every page's layout reaches for the navigation seed. The bytes land
 * in the server bundle and in `/api/search-index`, which is fetched once on
 * first search, and nowhere else.
 *
 * OWNERSHIP IS THE POINT
 * ----------------------
 * Each capsule becomes its own group with its own `destinationId`, so
 * `itemsInScope` treats Delhi's places exactly as it treats Sikkim's: visible
 * when exploring Delhi, visible in global search with Delhi's name against
 * them, and never presented as another destination's.
 *
 * It is also what makes "Charminar" resolve to Hyderabad and "Hawa Mahal"
 * to Jaipur without a line of code that knows either name.
 */
const CAPSULES: DestinationCapsule[] = [
  agra, ahmedabad, amritsar, bhubaneswar, delhi, goa, hyderabad, jaipur, kochi,
  kolkata, lucknow, madurai, mumbai, mysuru, pune, srinagar, varanasi,
];

export interface CapsuleSearchGroup {
  destinationId: string;
  destinationName: string;
  /* A capsule group carries two kinds of row now: its places, and its
     stories. The union is stated rather than widened to string so a third
     kind cannot be added here without the palette's icon map being told. */
  items: {
    label: string;
    sublabel: string;
    href: string;
    group: "Places" | "Stories" | "Stays";
    icon: "compass" | "book" | "bed";
  }[];
}

export function capsuleSearchGroups(): CapsuleSearchGroup[] {
  return CAPSULES.map((capsule) => {
    const destination = getDestination(capsule.destinationId);
    const name = destination?.name ?? capsule.destinationId;
    return {
      destinationId: capsule.destinationId,
      destinationName: name,
      items: [
        ...capsule.places.map((place) => ({
          label: place.name,
          /* The record's own classification and its destination — never a
             description this file wrote. */
          sublabel: `${place.category} · ${name}`,
          href: `/destinations/${capsule.destinationId}/discover#place-${place.id}`,
          group: "Places" as const,
          icon: "compass" as const,
        })),
        /*
         * Stories were absent from every capsule group, so searching
         * "Kintsugi" or "Fête de la Musique" returned nothing while the
         * article sat one route away. Sikkim's stories have been indexed
         * since the palette was built; these are the other fourteen's.
         */
        /* Stays: name, type and destination — the three things a reader
           searching "ryokan" or a hotel's name needs to see. The row links to
           the stay's own page. */
        ...capsule.stays.map((stay) => ({
          label: stay.name,
          sublabel: `${stay.category} · ${name}`,
          href: `/destinations/${capsule.destinationId}/stays/${stay.id}`,
          group: "Stays" as const,
          icon: "bed" as const,
        })),
        ...storySearch
          .filter((story) => story.destinationId === capsule.destinationId)
          .map((story) => ({
            label: story.title,
            sublabel: `${story.category} · ${name}`,
            href: `/destinations/${story.destinationId}/stories/${story.slug}`,
            group: "Stories" as const,
            icon: "book" as const,
          })),
      ],
    };
  }).filter((group) => group.items.length > 0);
}
