/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import { ArrowRight, ExternalLink, FileCheck2, Mountain } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VisitRecorder } from "@/components/discovery/VisitRecorder";
import { Footer } from "@/components/layout/Footer";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { JsonLd, breadcrumbSchema, placeSchema } from "@/components/seo/JsonLd";
import { ExperienceIntelligence } from "@/components/discovery/ExperienceIntelligence";
import { SourceNote } from "@/components/ui/Provenance";
import { buttonClasses } from "@/components/ui/Button";
import { placeGallery } from "@/data/galleries";
import { mappableMonasteries } from "@/data/monasteries";
import { PERMIT_PROVENANCE, permitForPlace } from "@/data/permits";
import { getPlaceBySlug } from "@/data/places";
import { getStoriesForPlace } from "@/data/stories";
import { distanceKm, formatDistanceKm } from "@/lib/geo";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { getPlaces } from "@/lib/destinations/content";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

/**
 * A place.
 *
 * These 38 records were the archive's largest dead end. Each one carried a
 * sourced description, a coordinate, an elevation, a permit note, a Wikipedia
 * reference and a gallery — and none of it had anywhere to render. A place
 * existed only as a pin on /explore, so the map could show you where something
 * was and never what it was.
 *
 * The page is built to close the graph rather than to display a record: what is
 * nearby, which stories are set here, what permit the state requires to reach
 * it, and the photography. Nothing here is new data — it is the data the
 * archive already held, finally joined up.
 */

const CAPABILITY = "places" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    CAPABILITY,
    listDestinations().map((d) => d.id),
  );
  /*
   * PHASE 18 — each destination's OWN places.
   *
   * This crossed every capability-holding destination with Sikkim's static
   * place list, which was invisible while Sikkim was the only destination
   * with places and became a content leak the moment eight capsules arrived:
   * the build produced /destinations/agra/places/aritar, rendering Sikkim's
   * record under Agra's URL. Ask the content layer per destination instead —
   * it is the same accessor discovery and the planner already use.
   */
  const perDestination = await Promise.all(
    ids.map(async (destinationId) => {
      const own = await getPlaces(destinationId);
      /*
       * Only records that carry the DEEP shape get a page here. This page
       * renders provenance blocks, a photo gallery, nearby monasteries and a
       * permit note — a capsule place has none of those, and a page that
       * renders a name and one sentence is a worse answer than the discovery
       * card the visitor came from. Capsule places are anchored on their
       * destination's discovery page instead; `capsulePlaces()` sets the link.
       */
      return own
        .filter((place) => "provenance" in place)
        .map((place) => ({ destinationId, slug: place.slug }));
    }),
  );
  return perDestination.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destinationId: string; slug: string }>;
}): Promise<Metadata> {
  const { destinationId, slug } = await params;
  const place = getPlaceBySlug(slug);
  if (!place) return {};
  return {
    title: place.name,
    description: place.description,
    alternates: { canonical: `/destinations/${destinationId}/places/${place.slug}` },
    openGraph: {
      title: place.name,
      description: place.description,
      type: "article",
      /* Omitted where no verified photograph exists. An Open Graph card is
         better with no image than with a picture of a different place. */
      ...(place.image ? { images: [{ url: place.image, alt: place.imageAlt }] } : {}),
    },
  };
}

/** Monasteries with a published coordinate, nearest first. */
function nearbyMonasteries(place: ReturnType<typeof getPlaceBySlug>) {
  if (!place) return [];
  return mappableMonasteries
    .map((monastery) => ({
      monastery,
      km: distanceKm(place.coordinates, monastery.coordinates!),
    }))
    .filter((entry) => entry.km <= 40)
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ destinationId: string; slug: string }>;
}) {
  const { destinationId, slug } = await params;
  /* The destination is resolved from the route, not assumed. Static params
     are already capability-gated, so this cannot fail in a built page — it
     is what stops the page rendering this content for a destination that
     does not have the capability. */
  const { destination } = await requireCapability(destinationId, CAPABILITY);
  const place = getPlaceBySlug(slug);
  if (!place) notFound();

  const photos = placeGallery(place.slug);
  const stories = getStoriesForPlace(place.slug);
  const nearby = nearbyMonasteries(place);
  const permit = permitForPlace(place.name);

  return (
    <>
      <JsonLd
        data={[
          placeSchema({
            name: place.name,
            description: place.description,
            url: `/destinations/${destinationId}/places/${place.slug}`,
            latitude: place.coordinates.lat,
            longitude: place.coordinates.lng,
            /* Structured data is what a search engine ingests, so a borrowed
               photograph here is the most durable kind of false claim. */
            image: place.image ?? undefined,
            elevation: place.elevation,
          }),
          breadcrumbSchema([
            { name: "Explore", url: `/destinations/${destinationId}/explore` },
            { name: place.name, url: `/destinations/${destinationId}/places/${place.slug}` },
          ]),
        ]}
      />
      {/* The neighbours are already computed above for rendering; handing the
          same list to the recorder is what lets discovery work without the
          graph ever reaching the client. */}
      <VisitRecorder
        kind="place"
        name={place.name}
        href={`/destinations/${destinationId}/places/${place.slug}`}
        neighbours={[
          ...nearby.map((entry) => ({
            kind: "monastery" as const,
            name: entry.monastery.name,
            href: `/destinations/${destinationId}/monasteries/${entry.monastery.slug}`,
          })),
          ...stories.slice(0, 3).map((story) => ({
            kind: "story" as const,
            name: story.title,
            href: `/destinations/${destinationId}/stories/${story.slug}`,
          })),
        ]}
      />
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Places"
          current={place.name}
        />

        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          {place.category} · {place.district} district
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">{place.name}</h1>

        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          {place.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-caption text-subtle">
          {place.elevation ? (
            <span className="flex items-center gap-1.5">
              <Mountain className="size-3.5" aria-hidden />
              {place.elevation.toLocaleString()} m
            </span>
          ) : null}
          <a
            href={place.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open in Google Maps
            <ExternalLink className="size-3" aria-hidden />
          </a>
          <a
            href={place.wikipediaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Wikipedia
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>

        {/* ---------------------------------------------------------- permit */}
        {permit ? (
          <section
            className="mt-8 rounded-xl border-l-4 border-warning bg-warning-soft p-5"
            aria-labelledby="permit"
          >
            <h2 id="permit" className="flex items-center gap-2 font-display text-h4">
              <FileCheck2 className="size-4 shrink-0" aria-hidden />
              You need a permit to come here
            </h2>
            <p className="mt-2 text-small leading-relaxed">{permit.authority}</p>
            <Link
              href={`/destinations/${destinationId}/permits`}
              className="mt-3 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
            >
              What to carry, and who issues it
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </section>
        ) : place.permitNote ? (
          <p className="mt-8 rounded-xl border-l-4 border-warning bg-warning-soft p-5 text-small leading-relaxed">
            <strong>Permit note.</strong> {place.permitNote}
          </p>
        ) : null}

        {/* --------------------------------------------------------- gallery */}
        {photos.length > 0 ? (
          <section className="mt-12" aria-labelledby="photographs">
            <h2 id="photographs" className="font-display text-h2">
              Photographs
            </h2>
            <div className="mt-5">
              <PhotoGallery photos={photos} subject={place.name} />
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------------- nearby */}
        {nearby.length > 0 ? (
          <section className="mt-14" aria-labelledby="nearby">
            <h2 id="nearby" className="font-display text-h2">
              Monasteries nearby
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {nearby.map(({ monastery, km }) => (
                <li key={monastery.slug}>
                  <Link
                    href={`/destinations/${destinationId}/monasteries/${monastery.slug}`}
                    className="card-lift flex items-center justify-between gap-4 rounded-xl border bg-surface p-4"
                  >
                    <span>
                      <span className="block text-body font-semibold">{monastery.name}</span>
                      <span className="mt-0.5 block font-mono text-caption text-subtle">
                        {monastery.tradition} · {monastery.district}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-caption text-subtle">
                      {formatDistanceKm(km)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* -------------------------------------------------------- stories */}
        {stories.length > 0 ? (
          <section className="mt-14" aria-labelledby="stories">
            <h2 id="stories" className="font-display text-h2">
              Stories set here
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {stories.map((story) => (
                <li key={story.slug}>
                  <Link
                    href={`/destinations/${destinationId}/stories/${story.slug}`}
                    className="card-lift flex flex-col gap-1 rounded-xl border bg-surface p-4"
                  >
                    <span className="text-body font-semibold">{story.title}</span>
                    <span className="text-small leading-relaxed text-muted">
                      {story.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <SourceNote provenance={place.provenance} />
        </div>
        {permit ? (
          <div className="mt-3">
            <SourceNote provenance={PERMIT_PROVENANCE} />
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={`/destinations/${destinationId}/explore`} className={buttonClasses({ variant: "outline" })}>
            See it on the map
          </Link>
          <Link href={`/destinations/${destinationId}/responsible`} className={buttonClasses({ variant: "ghost" })}>
            How to visit responsibly
          </Link>
        </div>

        {/* PHASE 14 — discovery lens: why this place, its interest provenance,
            the events and records connected to it, and add-to-trip. */}
        <ExperienceIntelligence destinationId={destinationId} kind="place" slug={place.slug} />

      </main>
      <Footer />
    </>
  );
}
