
import { GlobalClose } from "@/components/home/GlobalClose";
import { GlobalFood } from "@/components/home/GlobalFood";
import { GlobalHero } from "@/components/home/GlobalHero";
import { GlobalIntelligence } from "@/components/home/GlobalIntelligence";
import { GlobalPreservation } from "@/components/home/GlobalPreservation";
import { GlobalMapSection } from "@/components/home/GlobalMapSection";
import { GlobalEntry } from "@/components/home/GlobalEntry";
import { JourneyTray } from "@/components/journey-select/JourneyTray";
import { GlobalStories } from "@/components/home/GlobalStories";
import { getPlaces } from "@/lib/destinations/content";
import { listDestinations } from "@/lib/destinations/registry";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, websiteSchema } from "@/components/seo/JsonLd";

/** Refresh live stats hourly; the page stays static between revalidations. */
export const revalidate = 3600;


export default async function HomePage() {
  /* Counted from the registry, which is identity only and costs nothing to
     read — no content module is touched to render the first viewport. */
  const registered = listDestinations();
  const destinationCount = registered.length;
  const countryCount = new Set(registered.map((d) => d.country.code)).size;
  /*
   * A platform figure, not Sikkim's. The middle hero chip read "Sikkim: 15
   * monasteries, 46 mapped sites" — the first viewport of a fifteen-destination
   * product, naming one of them. Counted across every destination at build
   * time; the page is static, so this costs nothing at request time.
   */
  const placeCount = (
    await Promise.all(registered.map((d) => getPlaces(d.id)))
  ).reduce((total, places) => total + places.length, 0);


  return (
    <>
      <JsonLd data={websiteSchema()} />
      <main id="main">
        {/* ------------------------------------------------------- 1 · Hero */}
        {/*
          THE FIRST VIEWPORT NOW SHOWS THE PRODUCT.
          It was one photograph of Rumtek Monastery — correct when Sikkim was
          the product, and still there three phases after it stopped being.
          Six photographs from six countries, taken from the registry, say
          "fifteen destinations" before a word is read. Every figure below
          them is counted at build time.
        */}
        <GlobalHero
          destinationCount={destinationCount}
          countryCount={countryCount}
          placeCount={placeCount}
        />

        {/* ------------------------------- 2 · The global entry (Phase A)

            All fifteen destinations, then interests, then the four stages —
            placed between the hero and Sikkim's archive because that is the
            order the questions arrive in. Everything below this block is the
            Sikkim deep archive, and the section that follows says so. */}
        <GlobalEntry />

        {/* ------------------------------------------- Your journey

            Directly under the destinations it summarises, because that is
            where the choosing happens — and because a fixed bar would be the
            fourth thing pinned to the bottom of this page, behind two controls
            that already had to shrink for covering a primary CTA. */}
        <JourneyTray
          names={Object.fromEntries(listDestinations().map((d) => [d.id, d.name]))}
        />

        {/* ------------------------------- 3 · Stories and the timeline

            Both drawn from every destination that has them. This replaced nine
            consecutive Sikkim sections which, measured, were 71% of the page's
            text and 25 of its 30 destination links. Nothing was deleted from
            the product — every one of those sections is still on Sikkim's own
            pages, and its hub now shows what it holds. */}
        <GlobalStories />

        {/* ------------------------------------------------- 4 · Food

            Culture through what a place eats. One dish per destination, in
            registry order, so eight records from Delhi cannot crowd out the
            one from Kyoto. */}
        <GlobalFood />

        {/* -------------------------------------------------- 5 · The map

            "Six countries" was a number a reader had to take on trust. The
            same markers and the same component as /destinations, built from
            the canonical registry. */}
        <GlobalMapSection />

        {/* --------------------------------------- 6 · The intelligence layer

            What the archive holds, and how it holds it. The provenance chain
            is the one thing here a tourism department cannot get from a travel
            blog, and it was documented in three places and visible in none. */}
        <GlobalIntelligence />

        {/* ----------------------------------------- 7 · Why an archive

            The reference product ends on preservation, and it is the right
            place to end: everything above is what a visitor can DO, and this
            is why the doing is worth anything. All four artefacts existed
            already — the archive, the source registry, the coverage
            comparison, the reviewed submission route — on Sikkim sub-pages
            nobody arriving at the homepage would ever meet. */}
        <GlobalPreservation />

        {/* --- 8 · Planner, provenance, Sikkim as the deepest example, CTA */}
        <GlobalClose />
      </main>
      <Footer />
    </>
  );
}
