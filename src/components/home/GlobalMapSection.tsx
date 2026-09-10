import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { WorldMap } from "@/components/destinations/WorldMap";
import { destinationMarkers } from "@/lib/destinations/markers";
import { allCoverage } from "@/lib/global/coverage";

/**
 * Where the fifteen actually are.
 *
 * The homepage listed destinations, grouped them by country and named their
 * countries, and never once showed them on a map — so "six countries" was a
 * number a reader had to take on trust rather than something they could see.
 *
 * This is the SAME component and the SAME markers as /destinations, built
 * from the canonical registry: coordinates come from the registry and nowhere
 * else, which is why no destination can appear here at a position no source
 * published.
 *
 * The markers arrive already resolved from the destinations layer, because
 * reviewer-approved knowledge is read there and not on a home surface.
 */
export async function GlobalMapSection() {
  const markers = destinationMarkers();
  /* The same count /destinations states, read from the same coverage source,
     so the two surfaces can never disagree about how much exists. */
  const documentedCount = (await allCoverage()).filter((entry) => !entry.empty).length;

  return (
    <section aria-labelledby="global-map" className="mx-auto max-w-6xl px-6 py-20 md:py-24">
      <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
        The whole archive, in one view
      </p>
      <h2 id="global-map" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
        Explore the map
      </h2>
      <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
        Every destination at the coordinate its own records publish. Marker
        colour shows how much has been verified, not how good a place is.
      </p>

      <WorldMap destinations={markers} documentedCount={documentedCount} />

      <p className="mt-8">
        <Link
          href="/destinations"
          className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:underline"
        >
          Open the full destination map
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </p>
    </section>
  );
}
