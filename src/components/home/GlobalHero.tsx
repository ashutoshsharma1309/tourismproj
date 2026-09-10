import { getPlaces } from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";
import { suitsWideFrame } from "@/lib/media/focal";

import { HeroRotator, type HeroSlide } from "./HeroRotator";

/**
 * The first viewport: fifteen destinations, one at a time.
 *
 * WHAT CHANGED, AND WHY
 * ---------------------
 * This was a split frame — copy on solid ground, one photograph beside it —
 * which fixed a real problem (a six-image collage where nothing was legible
 * as a place) but left another: the hero showed ONE destination for the life
 * of the build, so a fifteen-destination product opened on a single city and
 * a rail of five names. The remaining nine existed only as a number.
 *
 * It is now full-bleed and rotating. Breadth is demonstrated rather than
 * asserted, and every destination the archive holds reaches the first
 * viewport within one rotation.
 *
 * THE SEQUENCE IS DETERMINISTIC, AND DOES NOT OPEN ON SIKKIM
 * ----------------------------------------------------------
 * Registry order, rotated so the archive's origin is not the first frame.
 * Deterministic because a hero that shuffles on every render gives two
 * visitors two different products and makes a screenshot test meaningless.
 * Not-Sikkim-first because Sikkim is the deepest corpus by a wide margin and
 * opening on it re-centres the product on the one destination several phases
 * were spent decentring — the same rule the featured-destination version
 * kept. Sikkim still appears; it simply does not lead.
 *
 * A DESTINATION WITHOUT A PHOTOGRAPH IS NOT A SLIDE
 * -------------------------------------------------
 * Each slide's image is that destination's own first catalogued place with a
 * photograph. A destination holding none is skipped rather than shown behind
 * a placeholder or, worse, another destination's picture.
 */

const ARCHIVE_ORIGIN = "sikkim";

async function heroSlides(): Promise<HeroSlide[]> {
  const destinations = listDestinations();

  const slides = await Promise.all(
    destinations.map(async (destination) => {
      const places = await getPlaces(destination.id);
      /*
       * A LANDSCAPE PHOTOGRAPH, NOT THE FIRST PHOTOGRAPH.
       *
       * The frame is full-bleed and wider than it is tall on every screen
       * that matters. `object-cover` then crops a portrait image to a band
       * through its middle — which is how the Statue of Liberty (1920×2942)
       * showed as robe and tablet with no head or torch, and Kinkaku-ji,
       * Charminar and the Eiffel Tower did the same. No focal point fixes
       * that: a 3:2 window cannot contain a 2:3 subject. So the slide takes
       * the destination's first catalogued place whose photograph suits a
       * wide frame (`suitsWideFrame`: ratio ≥ 1.2, from the focal manifest),
       * and falls back to the first photograph only where none does. Every
       * destination currently has at least one.
       */
      const withImage = places.filter((place) => place.image);
      const hero = withImage.find((place) => suitsWideFrame(place.image)) ?? withImage[0];
      if (!hero?.image) return null;
      return {
        destinationId: destination.id,
        destinationName: destination.name,
        countryName: destination.country.name,
        placeName: hero.name,
        image: hero.image,
        imageAlt:
          hero.imageAlt ?? `${hero.name}, ${destination.name}`,
      } satisfies HeroSlide;
    }),
  );

  const present = slides.filter((slide): slide is HeroSlide => slide !== null);

  /* Rotate past the origin rather than filtering it out — it belongs in the
     sequence, just not at the front. */
  const first = present.findIndex((slide) => slide.destinationId !== ARCHIVE_ORIGIN);
  if (first <= 0) return present;
  return [...present.slice(first), ...present.slice(0, first)];
}

export async function GlobalHero({
  destinationCount,
  countryCount,
  placeCount,
}: {
  destinationCount: number;
  countryCount: number;
  placeCount: number;
}) {
  const slides = await heroSlides();

  return (
    <HeroRotator
      slides={slides}
      destinationCount={destinationCount}
      countryCount={countryCount}
      placeCount={placeCount}
    />
  );
}
