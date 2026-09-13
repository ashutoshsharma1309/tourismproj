import { GlobalClose } from "@/components/home/GlobalClose";
import { GlobalEntry } from "@/components/home/GlobalEntry";
import { GlobalFood } from "@/components/home/GlobalFood";
import { GlobalHero } from "@/components/home/GlobalHero";
import { GlobalMapSection } from "@/components/home/GlobalMapSection";
import { GlobalStories } from "@/components/home/GlobalStories";
import { HowItWorks } from "@/components/home/HowItWorks";
import { JourneyTray } from "@/components/journey-select/JourneyTray";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, websiteSchema } from "@/components/seo/JsonLd";
import { getPlaces } from "@/lib/destinations/content";
import { listDestinations, listRegionNames } from "@/lib/destinations/registry";

/** Refresh live stats hourly; the page stays static between revalidations. */
export const revalidate = 3600;

export default async function HomePage() {
  /* Counted from the registry, which is identity only and costs nothing to
     read — no content module is touched to render the first viewport. */
  const registered = listDestinations();
  const destinationCount = registered.length;
  /*
   * States, not countries. Every destination is in India, so "1 country" is
   * a true figure that says nothing; the spread across states is the breadth
   * worth stating, and it is read from the same registry as the rest.
   */
  const stateCount = listRegionNames().length;
  /*
   * A platform figure, not Sikkim's. Counted across every destination at
   * build time; the page is static, so this costs nothing at request time.
   */
  const placeCount = (
    await Promise.all(registered.map((d) => getPlaces(d.id)))
  ).reduce((total, places) => total + places.length, 0);

  return (
    <>
      <JsonLd data={websiteSchema()} />
      <main id="main">
        {/*
          THE ORDER IS THE ORDER A NEWCOMER'S QUESTIONS ARRIVE IN.

            1. What is this?          — the hero, in plain words, naming India.
            2. How does it work?      — four steps, each a real route.
            3. Where can I go?        — every destination, then the journey
                                        tray directly under the cards.
            4. What do I want to see? — the interests.
            5. What is in it?         — stories, food, the map.
            6. Why believe it?        — provenance, Sikkim as the deepest
                                        example, the last call.

          A first-time-user audit measured the previous page at 14,000px on
          desktop with nothing telling the visitor where to start; the
          institutional sections that made up the back half are folded into
          `GlobalClose`.
        */}
        <GlobalHero
          destinationCount={destinationCount}
          stateCount={stateCount}
          placeCount={placeCount}
        />

        <HowItWorks />

        {/*
          The journey tray sits between the destinations and the interests,
          because that is where the choosing happens — and because a fixed bar
          would be the second thing pinned to the bottom of this page, behind
          the guide launcher.
        */}
        <GlobalEntry
          between={
            <JourneyTray
              names={Object.fromEntries(registered.map((d) => [d.id, d.name]))}
            />
          }
        />

        {/* Stories and the timeline, one record per destination. */}
        <GlobalStories />

        {/* Culture through what a place eats. One dish per destination. */}
        <GlobalFood />

        {/* The same markers and the same component as /destinations. */}
        <GlobalMapSection />

        {/* Provenance, Sikkim as the deepest example, the last call. */}
        <GlobalClose />
      </main>
      <Footer />
    </>
  );
}
