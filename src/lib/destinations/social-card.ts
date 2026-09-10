import { SITE } from "@/lib/constants";
import { getPlaces } from "@/lib/destinations/content";
import type { Destination } from "@/types/destination";

/**
 * The social card for a destination-owned page.
 *
 * WHY THIS IS A HELPER AND NOT A LINE IN EACH PAGE
 * ------------------------------------------------
 * Because it regressed the moment a new destination page was added. Phase 12
 * gave the destination hub its own `openGraph` block so `/destinations/paris`
 * would stop being shared as a photograph of Rumtek Monastery. The very next
 * page written under `[destinationId]` — the journey planner — declared no
 * block, inherited the root layout's Sikkim card again, and
 * `/destinations/jaipur/plan` shipped with `og:image` pointing at Rumtek.
 * `qa:planner` caught it; the fix is to make the correct thing the easy thing.
 *
 * WHY IT NOW DERIVES A CARD INSTEAD OF EMITTING NONE
 * --------------------------------------------------
 * Only Sikkim declares a `socialCard` in the registry, so for a long time the
 * other fourteen emitted `images: []` — correct, because the alternative was
 * borrowing Sikkim's, but it meant fourteen destinations shared to Slack or
 * WhatsApp as a bare grey link.
 *
 * That trade-off no longer exists. Every destination now carries its own
 * vendored, licensed photographs, so a card can be built from the
 * destination's OWN first catalogued image — never another's. The registry
 * card still wins where one is declared; a destination with no photographs at
 * all still emits no image, because a borrowed one would misrepresent it.
 */
export async function destinationOpenGraph(
  destination: Destination,
  { title, description, url }: { title: string; description: string; url: string },
) {
  const card = destination.socialCard;

  /*
   * A declared card is authoritative — it is sized and cropped for sharing.
   * Otherwise the destination's own first illustrated record stands in.
   */
  let images: { url: string; width?: number; height?: number; alt: string }[] = [];
  if (card) {
    images = [{ url: card.url, width: card.width, height: card.height, alt: card.alt }];
  } else {
    const places = await getPlaces(destination.id);
    const hero = places.find((place) => place.image);
    if (hero?.image) {
      images = [
        {
          url: hero.image,
          alt: hero.imageAlt ?? `${hero.name}, ${destination.name}`,
        },
      ];
    }
  }

  return {
    siteName: SITE.name,
    title,
    description,
    type: "website" as const,
    url,
    images,
  };
}
