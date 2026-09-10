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
import { destinationPath } from "@/lib/destinations/resolve";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { discoveryGroups, experiencesFor } from "@/lib/discovery";
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
   * The discovery summary: what a visitor can explore here, with counts
   * measured from the records themselves. A group appears only where records
   * carry it, so this section cannot advertise a way in that opens onto
   * nothing.
   */
  const experiences = capabilities.experiences ? await experiencesFor(destinationId) : [];
  const groups = discoveryGroups(experiences).slice(0, 6);
  const historyEdges = experiences.reduce((total, e) => total + e.historyRefs.length, 0);
  const storyEdges = experiences.reduce((total, e) => total + e.storyRefs.length, 0);
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
          The planner's entry point. It sits above the section list because
          planning a journey is what a visitor came to do, and it appears only
          where the `experiences` capability resolved — so it can never lead to
          a planner with nothing to plan.
        */}
        {capabilities.experiences ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={destinationPath(destinationId, "discover")}
              className="focus-visible:ring-primary inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("dest.discover")} {destination.name}
            </Link>
            <Link
              href={destinationPath(destinationId, "plan")}
              className="focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-small font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("dest.planJourney")}
            </Link>
          </div>
        ) : null}

        {/*
          WHAT THIS DESTINATION HOLDS, COUNTED.
          Placed above the section list because "is there anything here?" is
          the question a visitor asks before "what sections are there?" —
          and because a destination with nine places should say nine before it
          offers nine links.
        */}
        <DestinationCoverage destinationId={destinationId} />

        {groups.length > 0 ? (
          <section className="mt-12" aria-labelledby="discover-through">
            <h2 id="discover-through" className="font-display text-h3">
              Explore this destination through
            </h2>
            <p className="mt-2 max-w-prose text-body text-muted">
              {experiences.length} catalogued {experiences.length === 1 ? "record" : "records"} you
              can visit, carrying {historyEdges} links to dated historical events and {storyEdges}{" "}
              links to archive stories. Every number here is counted from the
              records, not estimated.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {groups.map((group) => (
                <li key={group.interest}>
                  <Link
                    href={`${destinationPath(destinationId, "discover")}?interest=${group.interest}`}
                    className="focus-visible:ring-primary inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-small font-medium transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {group.label}
                    <span className="text-caption text-subtle">{group.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasContent ? (
          <section className="mt-10">
            <h2 className="font-display text-h3">Explore</h2>
            <p className="mt-2 text-body text-muted">
              Only sections with content are listed. Nothing here links to an
              empty page.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {available.map((capability) => {
                const href = capabilitySectionPath(destinationId, capability);
                if (!href) return null;
                return (
                  <li key={capability}>
                    <Link
                      href={href}
                      className="focus-visible:ring-primary block rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {CAPABILITY_LABEL[capability]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : knowledge ? null : (
          <section className="mt-10 rounded-xl border border-border bg-surface-muted p-6">
            <h2 className="font-display text-h3">Not yet available</h2>
            <p className="mt-2 max-w-prose text-body text-muted">
              {destination.name} is registered in the destination architecture,
              but no content has been researched for it. Rather than fill this
              page with generated descriptions or placeholder listings, it says
              nothing — the same rule that governs every other claim in this
              archive: if it is not sourced, it does not ship.
            </p>
            <p className="mt-3 max-w-prose text-body text-muted">
              Sikkim is the reference implementation and shows what a completed
              destination looks like.
            </p>
            <Link
              href="/destinations/sikkim"
              className="mt-4 inline-block font-medium text-primary hover:underline"
            >
              See Sikkim
            </Link>
          </section>
        )}

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

        {knowledge ? <PublishedKnowledge knowledge={knowledge} /> : null}
        {knowledge ? <DestinationTimeline entries={knowledge.timeline} /> : null}
        {knowledge ? <StoryConnections connections={knowledge.connections} /> : null}

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
