/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { MonasteriesExplorer } from "@/components/monasteries/MonasteriesExplorer";
import { monasteryGallery } from "@/data/galleries";
import { MONASTERY_TRADITIONS, monasteries } from "@/data/monasteries";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

const CAPABILITY = "sites" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "sites",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "Monasteries",
  /*
   * This promised "360° tours ... and festival calendars". No 360° tour
   * exists anywhere in the archive, and this page carries no calendar. A
   * meta description is the first thing a search result or a shared link
   * shows, which makes it the worst place to keep a claim the page cannot
   * honour.
   */
  description:
    "All 15 catalogued gompas of Sikkim — searchable by district and tradition, mapped where a source publishes a coordinate, with credited photography and narrated guides in twelve languages.",
};

export default async function MonasteriesPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  /* Counted here rather than inside the explorer: the explorer is a client
     component, and importing the gallery JSON there would ship every credit
     line for every photograph to the browser to render one number. */
  const photoCounts = Object.fromEntries(
    monasteries.map((m) => [m.slug, monasteryGallery(m.slug).length]),
  );

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Monasteries"
        />
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Living heritage
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Fifteen catalogued sites, one map
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          From Dubdi — the kingdom&apos;s first gompa — to the great courtyard at
          Lingdum. Fifteen catalogued sites, each record traced to a named
          source and mapped wherever an authoritative coordinate exists.
        </p>
        <h2 className="sr-only">Browse monasteries</h2>
        <div className="mt-10">
          <MonasteriesExplorer
            monasteries={monasteries}
            traditions={MONASTERY_TRADITIONS}
            photoCounts={photoCounts}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
