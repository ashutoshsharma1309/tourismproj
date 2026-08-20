import {
  Accessibility,
  Archive,
  ArrowRight,
  Camera,
  ChevronDown,
  Headphones,
  Landmark,
  Rotate3d,
  ScrollText,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeritageMapSection } from "@/components/home/HeritageMapSection";
import { PhotoShowcase } from "@/components/media/PhotoGallery";
import { StoryCard } from "@/components/stories/StoryCard";
import { ContinueExploring } from "@/components/discovery/ContinueExploring";
import { GALLERY_PHOTO_COUNT, showcasePhotos } from "@/data/galleries";
import { MAP_STATS } from "@/data/map-sites";
import { stories } from "@/data/stories";
import { ParallaxHero } from "@/components/immersive/ParallaxHero";
import { ScrollReveal } from "@/components/immersive/ScrollReveal";
import { StatCounter } from "@/components/immersive/StatCounter";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ARCHIVE_COVERAGE } from "@/data/archive";
import { HISTORY_COVERAGE } from "@/data/history";
import { img } from "@/data/images";
import { monasteries } from "@/data/monasteries";
import { SITE } from "@/lib/constants";
import { getTourismMetrics } from "@/lib/stats";
import { JsonLd, websiteSchema } from "@/components/seo/JsonLd";

/** Refresh live stats hourly; the page stays static between revalidations. */
export const revalidate = 3600;

const PRESERVATION_PILLARS = [
  {
    icon: Archive,
    title: "Digital archives",
    text: "Manuscripts, murals and photographs catalogued with era, language and provenance.",
  },
  {
    icon: Camera,
    /*
      This promised "360° captures of prayer halls and courtyards, scene by
      scene, hotspot by hotspot". None of it exists. The sweep for a licensed
      360° sphere of a Sikkim monastery covered 35 sites and returned nothing;
      what survived inspection is one wide stitched photograph of Rumtek's
      courtyard, published as the flat panorama it is. There are no scenes and
      no hotspots to step between. The pillar now names the photography the
      archive actually holds.
    */
    title: "Visual documentation",
    text: "Evidenced Commons photography for every site a licensed source could supply, and one verified panorama of Rumtek's courtyard.",
  },
  {
    icon: ScrollText,
    title: "Cultural records",
    text: "Founding histories, festival calendars and living traditions written down while they are still told.",
  },
  {
    icon: Users,
    /*
      This claimed monastery admins "curate their own scenes, stories and
      archives through the platform". There is no such role: the operator
      dashboards were removed along with the fabricated data they displayed.
      What the platform does offer is /archive/contribute, where a submission
      is created pending-review and no code path in the application can
      publish it.
    */
    title: "Community knowledge",
    text: "Anyone can contribute an object to the archive. Nothing publishes until a curator has reviewed it.",
  },
  {
    icon: Accessibility,
    title: "Access for everyone",
    text: "The mountains ask a lot of a body. The archive asks only a screen.",
  },
] as const;

export default async function HomePage() {
  const metrics = getTourismMetrics();
  const featured = ["rumtek", "pemayangtse", "tashiding", "dubdi"]
    .map((slug) => monasteries.find((m) => m.slug === slug))
    .filter((m) => m !== undefined);
  /* One frame per subject, best-assessed first, so the rail reads as Sikkim
     rather than as one photographer's afternoon at one monastery. */
  const showcase = showcasePhotos(18).map((photo) => ({
    ...photo,
    href:
      photo.scope === "monastery"
        ? `/monasteries/${photo.slug}`
        : `/explore?place=${photo.slug}`,
  }));

  return (
    <>
      <JsonLd data={websiteSchema()} />
      <main id="main">
        {/* ------------------------------------------------------- 1 · Hero */}
        {/*
          The photograph was being zoomed three times over: the parallax layer
          is 140% tall, the class added `-translate-y-[13%]` on top of an
          already-tight `object-[50%_30%]`, and `animate-kenburns` scaled it
          1 → 1.08 on a 36-second loop that never stopped. The compounded result
          put the statue's face and hands dead centre — precisely where the
          headline and the sub-line sit — and the copy had no ground under it.

          Now the subject is framed into the right of the frame and the copy
          takes the left, which is what the directional scrim is for. Ken Burns
          is gone: it bought nothing at that speed and cost a permanently
          composited layer behind the largest text on the site.
        */}
        <ParallaxHero
          scrimClassName="gradient-overlay-hero md:gradient-overlay-left"
          background={{
            src: img("mon/rumtek"),
            alt:
              "The main temple at Rumtek Monastery, its courtyard wet with rain, " +
              "monks crossing beneath the gilded roof frieze",
            /* 1920×1280 landscape, so the desktop hero box crops ~60px of height
               rather than upscaling a portrait file by 1.9×, which is what the
               Buddha Park photograph (1362×2048) was doing at 2560. Mobile pulls
               the crop onto the temple facade itself. */
            className: "object-[46%_42%] md:object-[50%_46%]",
          }}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-end px-6 pt-24 pb-20 text-center sm:pb-28 md:items-start md:justify-center md:pb-24 md:text-left">
            {/*
              Four stacked text blocks in three font families used to sit here
              before the reader reached a button: a mono eyebrow, the serif
              wordmark, the tagline set again in serif and gold, and then a
              sans paragraph restating the tagline in more words. Nothing was
              subordinate to anything, and the gold serif line — the third
              treatment in 200px of vertical space — measured poorly against the
              pale sky it sat on.

              One name, one line beneath it, then the action. The eyebrow keeps
              its place because "Sikkim" is the single word the first viewport
              most needs to deliver.
            */}
            {/*
              The 76px headline used to read "Sikkim Darshan" — a brand name a
              first-time visitor has never heard, stated at the largest size on
              the page, while what the product actually does sat beneath it at
              17px. The proposition is now the headline and the wordmark has
              stepped back into the eyebrow, where it still reads and where it
              is anyway repeated by the navbar.
            */}
            <p className="fade-in-up font-mono text-eyebrow tracking-[0.24em] text-muted-inverse text-glow uppercase">
              {/* The wordmark is already in the navbar 40px above this line, and
                  at 390px the full string wrapped onto two lines across the
                  statue's face. Dropped on small screens; the place stays. */}
              <span className="hidden sm:inline">{SITE.name} · </span>
              Sikkim, Eastern Himalaya
            </p>
            <h1 className="fade-in-up mt-5 max-w-xl font-display text-display text-balance-heading text-foreground-inverse text-glow [animation-delay:120ms]">
              {SITE.tagline}
            </h1>
            <p className="fade-in-up mt-5 max-w-xl text-body-lg leading-relaxed text-muted-inverse [animation-delay:220ms]">
              Fifteen monasteries catalogued, narrated in four languages, and
              every claim traced to a named source — or marked as missing.
            </p>

            <div className="fade-in-up mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row [animation-delay:420ms]">
              <Link
                href="/monasteries"
                className={cn(buttonClasses({ variant: "accent", size: "lg" }), "min-w-56 hover:shadow-lifted sm:min-w-0")}
              >
                Explore Monasteries
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#discover"
                className={cn(buttonClasses({ variant: "ghost-inverse", size: "lg" }), "min-w-56 sm:min-w-0")}
              >
                Discover Heritage
              </a>
            </div>

            {/* Micro-information, in glass. */}
            <div className="fade-in-up mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 md:justify-start [animation-delay:540ms]">
              {/*
                "8 mapped locations" sat here, which is the count of catalogued
                monasteries carrying a coordinate. Two sections further down the
                same page the map is captioned "46 sites with a published
                coordinate", and /monasteries says fifteen catalogued sites — so
                the first viewport opened with the smallest and least flattering
                of three true numbers, and looked like it contradicted itself.

                The last chip is a link: "every claim sourced" is the whole
                argument of this project, and /preservation — where the gaps are
                published — was reachable only from the eighth item in the nav.
              */}
              {[
                { label: `${monasteries.length} monasteries catalogued`, href: "/monasteries" },
                { label: `${MAP_STATS.sites} sites on the heritage map`, href: "#map" },
                { label: "Every claim sourced — see the gaps", href: "/preservation" },
              ].map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="glass-dark rounded-full px-4 py-2 text-caption font-medium text-foreground-inverse/90 transition-colors hover:text-foreground-inverse hover:bg-foreground-inverse/15"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>

          <a
            href="#discover"
            aria-label="Scroll to explore"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-foreground-inverse/70 transition-colors hover:text-foreground-inverse sm:flex"
          >
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
              Scroll to explore
            </span>
            <ChevronDown className="size-5 animate-bounce-soft" aria-hidden />
          </a>
        </ParallaxHero>

        {/* -------------------------------------------------- 2 · Discover */}
        <section id="discover" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <ScrollReveal>
              <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                Discover Sikkim&apos;s heritage
              </p>
              <h2 className="mt-3 font-display text-h1 text-balance-heading">
                A kingdom&apos;s memory, kept in wood, stone and story
              </h2>
              <p className="mt-5 text-body-lg leading-relaxed text-muted">
                {/*
                  This read "walkable in 360°, readable in its own words, and
                  bookable when you're ready to stand there yourself". Two of
                  those three were untrue: nothing here is walkable in 360°,
                  and nothing is bookable — /hotels is a directory that
                  resolves to Google Maps precisely because no licensed
                  booking feed exists. Both claims had already been struck
                  from the site's meta description; this paragraph was where
                  they survived.
                */}
                For three centuries the monasteries of Sikkim have held the
                state&apos;s art, its festivals and its histories. {SITE.name}{" "}
                documents that living heritage — traced to named sources,
                readable in its own words, and narrated in four languages.
              </p>
              <p className="mt-4 font-mono text-small tracking-widest text-accent uppercase">
                {SITE.motto}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <figure>
                <div className="relative aspect-4/3 overflow-hidden rounded-xl border shadow-card">
                  <Image
                    src={img("int/thiksey")}
                    alt="Butter lamps and offering bowls inside the prayer hall at Thiksey Monastery, Ladakh"
                    fill
                    /* First image below the hero; a reader reaches it within a
                       scroll or two, which is sooner than lazy loading starts. */
                    loading="eager"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                {/* Not Sikkim. The archive warns wherever an object was
                    photographed elsewhere in the Himalaya, and this figure was
                    the one place on the home page still leaving that unsaid. */}
                <figcaption className="mt-2 text-caption text-subtle">
                  Offering bowls and silk khata inside a Himalayan gompa —
                  photographed at Thiksey, Ladakh, not in Sikkim.
                </figcaption>
              </figure>
            </ScrollReveal>
          </div>

          {/* Live counters */}
          <div className="mt-16 rounded-xl bg-surface-inverse px-6 py-12">
            <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-3">
              {metrics
                .filter((m) => m.value !== null)
                .map((metric) => (
                  <StatCounter
                    key={metric.id}
                    value={metric.value!}
                    label={`${metric.label} (${metric.period})`}
                    icon={<Landmark className="size-5" aria-hidden />}
                  />
                ))}
            </div>
            <p className="mt-8 text-center text-caption text-foreground-inverse/75">
              Government-reported arrivals for 2025.{" "}
              <a
                href={metrics[0]?.provenance.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Source
              </a>{" "}
              · TSD Fund collection totals are not published, so no figure is shown.
            </p>
          </div>
        </section>

        {/*
          Renders nothing at all on a first visit — see ContinueExploring. It
          sits after the introduction rather than above it so the page still
          leads with what this project is, and picks up the visitor's own thread
          second.
        */}
        <ContinueExploring className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-20 md:pb-28" />

        {/* ---------------------------------------- 3 · Featured monasteries */}
        <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
          <ScrollReveal>
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              Featured monasteries
            </p>
            <h2 className="mt-3 max-w-xl font-display text-h2 text-balance-heading">
              Start with the great houses
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {featured.map((monastery, index) => (
              <ScrollReveal key={monastery.slug} delay={(index % 2) * 0.12}>
                <article className="card-focus card-lift group relative overflow-hidden rounded-xl border bg-surface shadow-soft">
                  <div className="relative aspect-16/10 overflow-hidden bg-surface-muted">
                    <Image
                      src={monastery.image}
                      alt={`${monastery.name}, ${monastery.district}`}
                      fill
                      /* Measured: scrolling at reading pace on a throttled
                         connection reached these six cards before they had
                         decoded. They are the first grid under the hero, so
                         they load eagerly rather than on approach. `priority`
                         would be wrong — that also preloads, and would compete
                         with the hero for the largest paint. */
                      loading="eager"
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="media-zoom object-cover group-hover:scale-[1.04]"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge tone="jade">{monastery.tradition}</Badge>
                      <Badge tone="inverse">est. {monastery.establishedYear}</Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-h3">
                      <Link
                        href={`/monasteries/${monastery.slug}`}
                        className="focus-visible:outline-none"
                      >
                        <span className="absolute inset-0 z-10" aria-hidden />
                        {monastery.name}
                      </Link>
                    </h3>
                    <p className="mt-1 font-mono text-caption text-subtle">
                      {monastery.district} district
                    </p>
                    <p className="mt-3 text-small leading-relaxed text-muted">
                      {monastery.significance}
                    </p>
                    <span className="mt-4 flex items-center gap-1.5 text-small font-medium text-primary">
                      Explore
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* -------------------------------------------- 3b · Photograph rail */}
        {showcase.length > 0 ? (
          <section
            className="border-y bg-surface-muted/60 py-16 md:py-20"
            aria-labelledby="photographs"
          >
            <div className="mx-auto max-w-6xl px-6">
              <ScrollReveal>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                      Sikkim, photographed
                    </p>
                    <h2
                      id="photographs"
                      className="mt-3 max-w-xl font-display text-h2 text-balance-heading"
                    >
                      What you would actually be standing in front of
                    </h2>
                  </div>
                  <Link
                    href="/explore"
                    className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
                  >
                    Find them on the map
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            {/* Full-bleed rail: the strip runs past the edge of the page, which
                is what tells a reader there is more to drag towards. */}
            <div className="mt-8 pl-6 md:pl-[max(1.5rem,calc((100vw-72rem)/2))]">
              <PhotoShowcase photos={showcase} />
            </div>

            <div className="mx-auto max-w-6xl px-6">
              <p className="text-caption text-subtle">
                {GALLERY_PHOTO_COUNT} freely licensed photographs across the
                archive. Every frame names its photographer and its licence, and
                none is used to stand in for a place it was not taken at.
              </p>
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------- 4 · Heritage map */}
        <section id="map" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-20 md:pb-28">
          <ScrollReveal>
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              Interactive heritage map
            </p>
            <h2 className="mt-3 max-w-xl font-display text-h2 text-balance-heading">
              The sacred landscape, on one map
            </h2>
          </ScrollReveal>
          <div className="mt-8">
            <HeritageMapSection />
          </div>
        </section>

        {/* ------------------------------------------------ 5 · Virtual tour */}
        <section id="virtual" className="relative scroll-mt-20 overflow-hidden bg-surface-inverse">
          <Image
            src={img("mon/lingdum")}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-surface-inverse via-surface-inverse/70 to-transparent"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="max-w-xl">
              <ScrollReveal>
                {/*
                  This section used to promise "scene-by-scene 360° exploration
                  with information hotspots and an audio guide in five
                  languages", over a CTA reading "Enter Virtual Tour". None of
                  that existed: there is one panorama in the archive, it is a
                  flat stitched photograph rather than a sphere, there are no
                  hotspots, and the audio is in four languages. It also carried
                  a disclaimer about "prototype captures" that contradicted the
                  rest of the site, where every photograph is Commons-sourced
                  and credited. It was the last of the pre-integrity-pass
                  marketing copy, and the easiest claim on the site to disprove
                  by clicking the button underneath it.
                */}
                <p className="font-mono text-eyebrow tracking-widest text-accent-soft uppercase">
                  Inside the monasteries
                </p>
                <h2 className="mt-3 font-display text-h1 text-foreground-inverse">
                  See it, and hear it explained
                </h2>
                <p className="mt-5 text-body-lg leading-relaxed text-foreground-inverse/80">
                  Every catalogued gompa opens with credited photography and a
                  narrated guide you can read along with — recorded in English,
                  Hindi, Nepali and Bengali, because the visitor and the
                  heritage do not always share a language.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2.5">
                  {[
                    { icon: Camera, label: `${GALLERY_PHOTO_COUNT} credited photographs` },
                    { icon: Headphones, label: "Audio guides in 4 languages" },
                    { icon: Rotate3d, label: "Rumtek courtyard panorama" },
                  ].map((item) => (
                    <li
                      key={item.label}
                      className="glass-dark flex items-center gap-2 rounded-full px-4 py-2 text-caption font-medium text-foreground-inverse/90"
                    >
                      <item.icon className="size-3.5 text-accent-soft" aria-hidden />
                      {item.label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/monasteries/rumtek"
                  className={cn(buttonClasses({ variant: "accent", size: "lg" }), "mt-8 hover:shadow-lifted")}
                >
                  Open Rumtek Monastery
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <p className="mt-3 max-w-md text-caption leading-relaxed text-foreground-inverse/60">
                  No 360° sphere of any Sikkim monastery exists in an openly
                  licensed collection — we swept 35 sites to establish that. The
                  gap is published on{" "}
                  <Link href="/preservation" className="underline underline-offset-2 hover:text-foreground-inverse">
                    Preservation
                  </Link>{" "}
                  rather than papered over.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>
        {/* ---------------------------------------------------- 6 · Stories */}
        <section id="stories" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 md:py-28">
          <ScrollReveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                  Stories of Sikkim
                </p>
                <h2 className="mt-3 max-w-xl font-display text-h2 text-balance-heading">
                  The archive behind the buildings
                </h2>
              </div>
              <Link
                href="/stories"
                className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
              >
                All {stories.length} stories
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </ScrollReveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stories.slice(0, 6).map((story, index) => (
              <ScrollReveal key={story.slug} delay={(index % 3) * 0.1}>
                {/* First row only — see the eager prop on StoryCard. */}
                <StoryCard story={story} eager={index < 3} />
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ------------------------------- 7 · History & archive entry points */}
        <section
          className="mx-auto max-w-6xl px-6 pb-20 md:pb-28"
          aria-label="History and archive"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <ScrollReveal>
              <Link
                href="/history"
                className="card-lift group relative flex h-full flex-col justify-end overflow-hidden rounded-xl border bg-surface-inverse p-7 md:p-9"
              >
                <Image
                  src={img("hero/kanchenjunga")}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="media-zoom object-cover opacity-45 group-hover:scale-[1.04]"
                />
                <div aria-hidden className="gradient-overlay absolute inset-0" />
                <div className="relative">
                  <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
                    Interactive timeline
                  </p>
                  <h2 className="mt-3 font-display text-h2 text-foreground-inverse text-glow">
                    Discover Sikkim&apos;s history
                  </h2>
                  <p className="mt-3 max-w-md text-body leading-relaxed text-foreground-inverse/85">
                    {HISTORY_COVERAGE.total} documented events across{" "}
                    {HISTORY_COVERAGE.eras} eras — from the crowning at Yuksom in
                    1642 to the referendum that ended the kingdom. Every one of
                    them sourced.
                  </p>
                  <span className={cn(buttonClasses({ variant: "accent", size: "md" }), "mt-6 font-semibold")}>
                    Explore history
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={0.12}>
              <Link
                href="/archive"
                className="card-lift group relative flex h-full flex-col justify-end overflow-hidden rounded-xl border bg-surface-inverse p-7 md:p-9"
              >
                <Image
                  src={img("arch/manuscript")}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="media-zoom object-cover opacity-45 group-hover:scale-[1.04]"
                />
                <div aria-hidden className="gradient-overlay absolute inset-0" />
                <div className="relative">
                  <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
                    Digital heritage archive
                  </p>
                  <h2 className="mt-3 font-display text-h2 text-foreground-inverse text-glow">
                    Preserve Sikkim&apos;s heritage
                  </h2>
                  <p className="mt-3 max-w-md text-body leading-relaxed text-foreground-inverse/85">
                    {ARCHIVE_COVERAGE.total} catalogued objects across{" "}
                    {ARCHIVE_COVERAGE.categories} categories — every one with its
                    creator, its licence and its source. Contribute what the
                    record is missing.
                  </p>
                  <span className={cn(buttonClasses({ variant: "accent", size: "md" }), "mt-6 font-semibold")}>
                    Enter the archive
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* ------------------------------------------------ 8 · Plan journey */}
        <section className="bg-primary-soft/60">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <ScrollReveal>
                <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                  Plan your heritage journey
                </p>
                <h2 className="mt-3 max-w-lg font-display text-h2 text-balance-heading">
                  From this screen to the courtyard itself
                </h2>
                <p className="mt-4 max-w-lg text-body-lg text-muted">
                  Choose your days, interests and pace — the planner builds a
                  monastery-first itinerary with real stays, transparent TSD
                  pricing and a route you can hold in one hand.
                </p>
              </ScrollReveal>
              <Link
                href="/planner"
                className={cn(buttonClasses({ variant: "primary", size: "lg" }), "shrink-0 shadow-card hover:shadow-lifted")}
              >
                Plan Your Journey
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- 9 · Digital preservation */}
        <section id="preservation" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 md:py-28">
          <ScrollReveal>
            <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
              Digital preservation
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-h2 text-balance-heading">
              Tourism funds the visit. Preservation keeps what it visits.
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PRESERVATION_PILLARS.map((pillar, index) => (
              <ScrollReveal key={pillar.title} delay={index * 0.08}>
                <div className="h-full rounded-xl border bg-surface p-5">
                  <pillar.icon className="size-5 text-accent-ink" aria-hidden />
                  <h3 className="mt-3 text-body font-semibold">{pillar.title}</h3>
                  <p className="mt-1.5 text-small leading-relaxed text-muted">{pillar.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
