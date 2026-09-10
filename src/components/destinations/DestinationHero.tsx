import Image from "next/image";
import Link from "next/link";

import { DepthBadge } from "@/components/ui/DepthBadge";
import { getPlaces } from "@/lib/destinations/content";
import { destinationIdentity } from "@/lib/destinations/identity";
import { buildDestinationKeywords } from "@/lib/destinations/keywords";
import { allCoverage } from "@/lib/global/coverage";
import { objectPositionFor, suitsWideFrame } from "@/lib/media/focal";
import { DATA_DEPTH_SUMMARY, DIVISION_KIND_LABEL } from "@/types/destination";
import type { DataDepth, Destination } from "@/types/destination";

/**
 * A destination's opening image.
 *
 * WHY THIS EXISTS
 * ---------------
 * Not one of the fifteen destination pages had a hero image. Every one opened
 * on a breadcrumb, a name, a badge and a paragraph — a catalogue entry, not a
 * place. Sikkim's landing page had a full-bleed photograph from the beginning
 * and it is most of why that experience read as richer than the global one;
 * the architecture simply never carried the idea across.
 *
 * THE PHOTOGRAPH IS THE DESTINATION'S OWN
 * ---------------------------------------
 * It is the first catalogued place that has one, taken from the same records
 * the page goes on to list. That matters more than it sounds: it means a hero
 * can never be a stock image, can never be another destination's, and can
 * never exist for a destination that has no photographs — those keep the text
 * hero they had, which is the honest result rather than a grey rectangle.
 *
 * Its credit travels with it. The caption names the place and links to the
 * record, so a reader can check what they are looking at.
 */
export async function DestinationHero({
  destination,
  depth,
}: {
  destination: Destination;
  depth: DataDepth;
}) {
  const places = await getPlaces(destination.id);
  /*
   * Prominence order first, shape as the filter — so the hero is the most
   * important record whose photograph actually fits a wide frame, not merely
   * the first record that has one. Paris moves from a decapitated Eiffel
   * Tower to the Arc de Triomphe; a destination whose photographs are all
   * portrait keeps the first one and is cropped as well as it can be.
   */
  const withImage = places.filter((place) => place.image);
  const hero = withImage.find((place) => suitsWideFrame(place.image)) ?? withImage[0];

  /*
   * The identity slot used to render DATA_DEPTH_SUMMARY, which describes the
   * tier rather than the place — so twelve destinations opened with the same
   * sentence. This says what the destination IS; the tier sentence keeps its
   * job below, as the coverage note it always was.
   */
  const keywords = buildDestinationKeywords(await allCoverage()).get(
    destination.id,
  );
  const identityLine = destinationIdentity({
    keywords,
    placeTitles: places.map((place) => place.name),
    placeCount: places.length,
  });

  const identity = (
    <>
      <p className="font-mono text-eyebrow tracking-widest uppercase">
        <Link
          href="/destinations"
          className={
            hero
              ? "text-accent hover:underline"
              : "text-primary hover:underline"
          }
        >
          Destinations
        </Link>{" "}
        <span className={hero ? "text-foreground-inverse/70" : "text-subtle"}>
          · {destination.country.name}
        </span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-h1 text-balance-heading">
          {destination.name}
        </h1>
        <DepthBadge depth={depth} />
      </div>

      {identityLine ? (
        <p
          className={
            hero
              ? "mt-3 max-w-prose text-body-lg leading-relaxed text-foreground-inverse"
              : "mt-3 max-w-prose text-body-lg leading-relaxed text-foreground"
          }
        >
          {identityLine}
        </p>
      ) : null}

      {/* The tier note. Demoted, not deleted — a visitor arriving at a capsule
          after Sikkim still needs to know why it is shorter. */}
      <p
        className={
          hero
            ? "mt-2 max-w-prose text-caption text-muted-inverse"
            : "mt-2 max-w-prose text-caption text-subtle"
        }
      >
        {DATA_DEPTH_SUMMARY[depth]}
      </p>

      {/*
        A destination that IS its own division ("Sikkim", a state) printed
        "State: Sikkim" directly beneath the title "Sikkim". The division is
        still worth naming when it adds something; when it only repeats the
        heading, the country is the useful fact instead.
      */}
      <p
        className={
          hero
            ? "mt-2 text-body text-muted-inverse"
            : "mt-2 text-body text-muted"
        }
      >
        {destination.region &&
        destination.region.name.trim().toLowerCase() !==
          destination.name.trim().toLowerCase()
          ? `${DIVISION_KIND_LABEL[destination.region.kind]}: ${destination.region.name}, ${destination.country.name}`
          : destination.country.name}
      </p>
    </>
  );

  /* No photograph, no hero. The page opens on type, as it always did. */
  if (!hero?.image) return <div>{identity}</div>;

  return (
    <figure className="relative -mx-4 mb-8 overflow-hidden md:-mx-6 md:rounded-xl">
      {/*
        21:9 decapitated anything tall — the Eiffel Tower opened on its own
        midsection. A destination's first photograph is whatever its first
        record happens to be, so the box has to suit towers and skylines
        alike; 16:9 is the widest that reliably does.
      */}
      <div className="relative aspect-4/5 sm:aspect-3/2 lg:aspect-16/9">
        <Image
          src={hero.image}
          alt={hero.imageAlt ?? `${hero.name}, ${destination.name}`}
          fill
          /* The one image on the page worth fetching immediately. */
          priority
          sizes="(min-width: 1024px) 56rem, 100vw"
          className="object-cover"
          /*
            Centre-cropping is what decapitated the Eiffel Tower: a portrait
            source in a 16:9 box loses its top and bottom thirds. The origin
            comes from the photograph's own shape.
          */
          style={{ objectPosition: objectPositionFor(hero.image) }}
        />
        {/* Enough scrim for text at AA on any photograph, no more. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/55 to-secondary/20"
        />
        <figcaption className="absolute inset-x-0 bottom-0 p-5 text-foreground-inverse md:p-8">
          {identity}
        </figcaption>
      </div>
      {/* The credit, outside the image so it is readable and selectable. */}
      {/*
        The figure is pulled full-bleed with -mx-4/-mx-6, so the credit has to
        pad back by the same amount or it hangs outside the column the rest of
        the page is aligned to.
      */}
      <p className="px-4 pt-3 text-caption text-subtle md:px-6">
        <Link
          href={
            (hero as { detailHref?: string }).detailHref ??
            `/destinations/${destination.id}/places/${hero.slug}`
          }
          className="hover:text-primary hover:underline"
        >
          {hero.name}
        </Link>
        {" — one of "}
        {places.length} catalogued records for {destination.name}.
      </p>
    </figure>
  );
}
