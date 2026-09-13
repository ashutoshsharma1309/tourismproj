import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DarshanNav } from "@/components/destinations/DarshanNav";
import { DestinationComplete } from "@/components/journey-select/DestinationComplete";
import { JourneyProgress } from "@/components/journey-select/JourneyProgress";
import { listDestinations } from "@/lib/destinations/registry";
import { coverageDimensions } from "@/lib/destinations/earned-depth";
import { DestinationHero } from "@/components/destinations/DestinationHero";
import { translator, type LanguageCode } from "@/lib/i18n";
import { DestinationAudio } from "@/components/destinations/DestinationAudio";
import { DestinationCoverage } from "@/components/destinations/DestinationCoverage";
import { DestinationExploreTiers } from "@/components/destinations/DestinationExploreTiers";
import { DestinationCulture } from "@/components/destinations/DestinationCulture";
import { DestinationGallery } from "@/components/destinations/DestinationGallery";
import { DestinationMapSection } from "@/components/destinations/DestinationMapSection";
import { DestinationHighlights } from "@/components/destinations/DestinationHighlights";
import { DestinationStays } from "@/components/destinations/DestinationStays";
import { DestinationTimeline } from "@/components/destinations/DestinationTimeline";
import { PublishedKnowledge } from "@/components/destinations/PublishedKnowledge";
import { StoryConnections } from "@/components/destinations/StoryConnections";
import { Footer } from "@/components/layout/Footer";
import { RelatedDestinations } from "@/components/global/RelatedDestinations";
import { availableCapabilities, getDestinationSummary } from "@/lib/destinations";
import { getCapsuleStays, getPlaces } from "@/lib/destinations/content";
import { capabilitySectionPath } from "@/lib/destinations/sections";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { CAPABILITY_LABEL, DIVISION_KIND_LABEL } from "@/types/destination";

/**
 * One destination hub, rendered for any of the twelve interface languages.
 *
 * WHY THIS IS A COMPONENT AND NOT JUST THE PAGE
 * ---------------------------------------------
 * A static page is one HTML file per path, so twelve languages means twelve
 * paths — there is no third option: any per-request variation (a search
 * parameter, a cookie, a header) makes the route render on demand, and
 * measured, that cost this page 2ms TTFB against 78ms.
 *
 * More than speed, it would have cost an invariant. `qa:destination` asserts
 * that all fifteen destinations exist as prerendered HTML, which is how a
 * destination that silently stops resolving gets caught. A dynamic route has
 * no prerendered file, so the check would have had to be rewritten to
 * accommodate the change — and rewriting a check to accommodate your own
 * change is how a suite stops being evidence.
 *
 * So English keeps the canonical URL and its prerendered file, the eleven
 * translations are generated statically under /l/<lang>/, and both routes
 * render this.
 */
export async function DestinationHubPage({
  destinationId,
  language,
}: {
  destinationId: string;
  language: LanguageCode;
}) {

  const t = translator(language);
  /* Resolved here so the client components never import the registry. */
  const destinationNames = Object.fromEntries(
    listDestinations().map((entry) => [entry.id, entry.name]),
  );
  const dimensions = await coverageDimensions(destinationId);
  /* Real counts of what this destination HOLDS. Never engagement. */
  const completionCounts = [
    { label: "catalogued places", value: dimensions.places },
    { label: "stories", value: dimensions.stories },
    { label: "dated events", value: dimensions.history },
  ].filter((entry) => entry.value > 0);

  const summary = await getDestinationSummary(destinationId);
  if (!summary) notFound();

  const { destination, capabilities, hasContent } = summary;
  const available = availableCapabilities(capabilities);
  /* Divisions name themselves — "Districts" for Sikkim, "Wards" for Kyoto —
     so the heading is taken from the first one rather than hard-coded. */
  /*
   * Map markers, built from the destination's OWN places and only where the
   * source publishes a coordinate. A place without one is absent from the map
   * rather than pinned to a city centroid.
   */
  const allPlaces = await getPlaces(destinationId);
  const mapMarkers = allPlaces
    .filter((place) => place.coordinates)
    .map((place) => ({
      id: place.slug,
      position: place.coordinates!,
      title: place.name,
      subtitle: place.category,
      href:
        (place as { detailHref?: string }).detailHref ??
        `/destinations/${destinationId}/places/${place.slug}`,
    }));

  /*
   * Documented stays on the same map, as differently coloured pins. A stay is
   * plotted only at the coordinate its source publishes — the same rule as a
   * place — and its popup says what it is and links to its own page, so a
   * reader cannot mistake a hotel pin for a monument.
   */
  const STAY_PIN = "#a8622b";
  const stayMarkers = (await getCapsuleStays(destinationId))
    .filter((stay) => stay.coordinates)
    .slice(0, 12)
    .map((stay) => ({
      id: `stay-${stay.id}`,
      position: stay.coordinates!,
      title: stay.name,
      subtitle: `Stay · ${stay.category}`,
      href: `/destinations/${destinationId}/stays/${stay.id}`,
      color: STAY_PIN,
    }));
  const [firstDivision] = destination.divisions;
  /* Reviewer-approved research. Never raw research — see
     src/data/published-knowledge.ts. */
  const knowledge = getPublishedKnowledge(destinationId);

  /*
   * The badge shows EARNED depth once research has been reviewed and
   * published, not the static value in the registry record. Otherwise a
   * destination could say "35 approved facts across 4 topics" beneath a badge
   * reading "Not yet available" — which is what it did before this line.
   *
   * The earned value is capped at `curated` by the depth model, so this can
   * never promote a researched destination to `deep`.
   */
  const effectiveDepth = knowledge?.depth.depth ?? destination.depth;

  return (
    <>
      <main id="main" className="mx-auto max-w-4xl px-4 pt-28 pb-20 md:px-6">
        {/* The destination opens on its own photograph where it has one. */}
        <DestinationHero destination={destination} depth={effectiveDepth} />

        {/* One line, only for a visitor mid-journey with more than one
            destination chosen. The destination stays the hero. */}
        <JourneyProgress destinationId={destinationId} names={destinationNames} />

        {/*
          THE DARSHAN'S OWN NAVIGATION.
          The global bar answers "where do you want to go"; this answers "what
          is in this place". Every entry is gated on the same accessor its
          section is gated on, so a destination with no stays gets no stays
          link — no per-destination code, and no link to a section that never
          rendered.
        */}
        <DarshanNav
          destinationId={destinationId}
          language={language}
          hasKnowledge={Boolean(knowledge)}
          sections={available
            .map((capability) => ({
              href: capabilitySectionPath(destinationId, capability) ?? "",
              label: CAPABILITY_LABEL[capability],
            }))
            .filter((entry) => entry.href !== "")}
        />

        {/*
          THE SWITCHER MOVED TO THE HEADER.
          It lived here while the hubs were the only translated pages, so the
          control had to sit where the translations were. It is now in the
          global navigation — which is where a reader looks for it — and the
          navbar hides it on pages that have no translated variant, so it
          still never offers a language that would 404.

          The notice stays: it explains, in the reader's own language, why the
          archive text below is not in it.
        */}
        {language !== "en" ? (
          <p className="mt-4 max-w-prose text-caption text-subtle">
            {t("notice.sourceLanguage")}
          </p>
        ) : null}

        {/*
          WHAT YOU CAN EXPLORE HERE — the hub's one navigation block.
          It replaced a "Discover Jaipur" button on Jaipur's own page, a
          "through" chip row and an "Explore" grid of capability names: three
          lists of the same words with no hierarchy. See the component.
        */}
        <DestinationExploreTiers
          destinationId={destinationId}
          destinationName={destination.name}
          capabilities={capabilities}
          hasKnowledge={Boolean(knowledge)}
          audioLanguages={destination.languages.length}
        />

        {/*
          WHAT THIS DESTINATION HOLDS, COUNTED.
          Placed above the section list because "is there anything here?" is
          the question a visitor asks before "what sections are there?" —
          and because a destination with nine places should say nine before it
          offers nine links.
        */}
        <DestinationCoverage destinationId={destinationId} />

        {!hasContent && !knowledge ? (
          <section className="mt-10 rounded-xl border border-border bg-surface-muted p-6">
            <h2 className="font-display text-h3">We are still cataloguing {destination.name}</h2>
            <p className="mt-2 max-w-prose text-body text-muted">
              Nothing is shown here until it has a source — no generated
              descriptions, no placeholder listings. Places, stories and culture
              appear as they are verified.
            </p>
            <Link
              href="/destinations"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Explore other destinations
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        ) : null}

        {/*
          The experience, in the order a visitor discovers a place: told about
          it, walked through its history, offered threads to follow, and only
          then shown the underlying evidence.
        */}
        {/*
          PHASE C — the destination's own records, on its own page.

          Placed BEFORE the published-knowledge blocks deliberately: a visitor
          asks "what is there?" before "what is the evidence?". Phase B gave
          every destination nine to thirteen catalogued places, twelve dated
          events and up to seven stories, and none of it appeared here — it was
          all one click away on /discover, which made a rich destination look
          like a stub.
        */}
        <DestinationHighlights destinationId={destinationId} />

        {/*
          What the place eats, celebrates, makes — and where a visitor can
          stay. Each renders only where records exist, so a destination with
          no documented crafts shows no crafts heading rather than an empty
          one, and the three destinations with no documented hotels show no
          stays section at all.
        */}
        <DestinationCulture
          destinationId={destinationId}
          destinationName={destination.name}
          language={language}
        />
        <DestinationStays
          destinationId={destinationId}
          destinationName={destination.name}
          language={language}
        />

        {/* The archive shown the other way round: photographs first. */}
        <DestinationGallery
          destinationId={destinationId}
          destinationName={destination.name}
        />

        {/* Only places whose own source published a coordinate are plotted. */}
        <DestinationMapSection
          markers={[...mapMarkers, ...stayMarkers]}
          destinationName={destination.name}
          plotted={mapMarkers.length}
          total={allPlaces.length}
          staysPlotted={stayMarkers.length}
        />

        {/* Guides where they exist; a sentence where they do not. */}
        <DestinationAudio
          destinationId={destinationId}
          destinationName={destination.name}
          language={language}
        />

        {/*
          THE EVIDENCE LAYER, FOLDED.
          Reviewed knowledge, the verified-fact table, the timeline and the
          thread of connections ran to five and a half thousand pixels on
          Jaipur's hub. They are the archive's proof and they stay on the
          page — behind one disclosure a visitor opens when they want the
          sources, rather than scrolls past when they want a place to go.
        */}
        {knowledge ? (
          <details id="evidence" className="group mt-14 scroll-mt-20 rounded-xl border border-border bg-surface-muted/40 p-5">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="block font-display text-h3">Researched knowledge and sources</span>
              <span className="mt-1 block text-body text-muted">
                Every reviewed fact about {destination.name}, its dated timeline and the
                threads that connect them — with the source each came from.{" "}
                <span className="font-medium text-primary group-open:hidden">Open</span>
                <span className="hidden font-medium text-primary group-open:inline">Close</span>
              </span>
            </summary>
            <PublishedKnowledge knowledge={knowledge} />
            <DestinationTimeline entries={knowledge.timeline} />
            <StoryConnections connections={knowledge.connections} />
          </details>
        ) : null}

        {firstDivision ? (
          <section className="mt-10">
            <h2 className="font-display text-h3">
              {DIVISION_KIND_LABEL[firstDivision.kind]}s
            </h2>
            <p className="mt-3 text-body text-muted">
              {destination.divisions.map((d) => d.name).join(" · ")}
            </p>
          </section>
        ) : null}

        {/* PHASE 15 — the way out of a single destination. */}
        {/* The end of this destination, and the way into the next. Renders
            only for somebody whose journey includes it. */}
        <DestinationComplete
          destinationId={destinationId}
          destinationName={destination.name}
          names={destinationNames}
          counts={completionCounts}
        />

        <RelatedDestinations destinationId={destinationId} />

        {destination.languages.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-h3">Audio guide languages</h2>
            <p className="mt-3 text-body text-muted">
              {destination.languages.length} languages, each script composed
              natively rather than translated at playback.
            </p>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
