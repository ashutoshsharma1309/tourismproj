/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import type { Metadata } from "next";
import Image from "next/image";

import { Footer } from "@/components/layout/Footer";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { img } from "@/data/images";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

const CAPABILITY = "tripPlanner" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "tripPlanner",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "Trip Planner",
  /*
   * This promised "real hotels and transparent costs". The planner places
   * neither: it has no licensed rates feed, so it names no property and its
   * cost panel carries exactly one line, the statutory ₹50 TSD fee. Saying
   * what it does quote is more transparent than the word "transparent".
   */
  description:
    "Tell TerraStory your interests, budget and pace — get a day-by-day Sikkim heritage journey routed over real geography, costed at the one fee the state actually publishes.",
};

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  return (
    <>
      <main id="main" className="pb-20">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Plan"
        />
        {/* Hero */}
        <div className="relative flex min-h-105 items-end overflow-hidden bg-surface-inverse">
          <Image
            src={img("place/tsomgo")}
            alt="Tsomgo Lake ringed by snow, East Sikkim"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="gradient-overlay absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-40 pb-10 md:px-6">
            <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
              Trip planner
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-h1 text-foreground-inverse text-glow">
              Plan your perfect Sikkim trip
            </h1>
            {/*
              This said "we'll craft the itinerary, pick the hotels, and show
              every rupee including TSD". It picks no hotels — there is no
              licensed rates feed, which is why /stays names no tariff either —
              and "every rupee" oversells a cost panel with one line in it. The
              hero was the last place on the route still making both claims.
            */}
            <p className="mt-3 max-w-xl text-body-lg text-foreground-inverse/85">
              Tell us how long you have and what you came for. You get a
              day-by-day route over real geography, the permits it needs, and
              the one fee the state actually publishes.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="-mt-6 md:-mt-8">
            <PlannerForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
