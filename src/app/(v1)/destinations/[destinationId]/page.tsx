import { DestinationHubPage } from "@/components/destinations/DestinationHubPage";
import type { Metadata } from "next";

import { getDestination, listDestinations } from "@/lib/destinations";
import { destinationPath } from "@/lib/destinations/resolve";
import { getPublishedKnowledge } from "@/data/published-knowledge";
import { destinationOpenGraph } from "@/lib/destinations/social-card";

/**
 * One destination shell, for every destination.
 *
 * THIS FILE IS THE ARCHITECTURE TEST. There is no SikkimPage, no KyotoPage,
 * no ParisPage — one route renders all fifteen, and `npm run build`
 * prerendering fifteen pages from it is the proof that the destination model
 * holds without duplicating the application. If a destination could not be
 * represented by the shared abstraction, this build would fail.
 *
 * For Sikkim it links out to the deep content at its original top-level
 * routes, which Phase 2 does not move. For a planned destination it renders
 * an explicit "not yet available" and links to nothing — capabilities are
 * derived from real content, so there is nothing here that can promise a
 * section that turns out to be empty.
 */

export function generateStaticParams() {
  return listDestinations().map((d) => ({ destinationId: d.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}): Promise<Metadata> {
  const { destinationId } = await params;
  const destination = getDestination(destinationId);
  if (!destination) return { title: "Destination not found" };

  /*
   * No invented blurb. For a destination with nothing behind it the
   * description states exactly that, because a meta description is the first
   * thing a shared link shows and is the worst place to imply content that
   * does not exist.
   */
  const description =
    destination.depth === "planned" && !getPublishedKnowledge(destinationId)
      ? `${destination.name}, ${destination.country.name} — registered in TerraStory. No researched content yet.`
      : `${destination.name}, ${destination.country.name} — heritage, stories and travel information, every claim traced to a named source.`;

  /*
   * The card is declared here, not inherited. Without an `openGraph` block on
   * this page the root layout's block wins, and the root layout's block is
   * Sikkim's — so sharing /destinations/paris posted a photograph of Rumtek
   * Monastery captioned as Sikkim. Page metadata REPLACES the parent's
   * `openGraph` object rather than merging into it, which is exactly what is
   * wanted: a destination with no photograph of its own emits no card image
   * at all instead of borrowing one.
   */
  const canonical = destinationPath(destinationId);

  return {
    title: destination.name,
    description,
    alternates: { canonical },
    openGraph: await destinationOpenGraph(destination, {
      title: `${destination.name}, ${destination.country.name}`,
      description,
      url: canonical,
    }),
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  /*
   * English, on the canonical URL, prerendered — unchanged since Phase 2.
   * The eleven translations live under /l/<lang>/destinations/<id> and are
   * generated just as statically; see DestinationHubPage for why the language
   * is in the path rather than in a query parameter.
   */
  return <DestinationHubPage destinationId={destinationId} language="en" />;
}
