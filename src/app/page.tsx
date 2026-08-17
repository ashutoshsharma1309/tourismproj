import {
  Accessibility,
  Archive,
  ArrowRight,
  Camera,
  ChevronDown,
  Headphones,
  Landmark,
  MousePointerClick,
  Rotate3d,
  ScrollText,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeritageMapSection } from "@/components/home/HeritageMapSection";
import { StoryCard } from "@/components/stories/StoryCard";
import { stories } from "@/data/stories";
import { ParallaxHero } from "@/components/immersive/ParallaxHero";
import { ScrollReveal } from "@/components/immersive/ScrollReveal";
import { StatCounter } from "@/components/immersive/StatCounter";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { ARCHIVE_COVERAGE } from "@/data/archive";
import { HISTORY_COVERAGE } from "@/data/history";
import { img } from "@/data/images";
import { monasteries } from "@/data/monasteries";
import { SITE } from "@/lib/constants";
import { getTourismMetrics } from "@/lib/stats";

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
    title: "Virtual documentation",
    text: "360° captures of prayer halls and courtyards, scene by scene, hotspot by hotspot.",
  },
  {
    icon: ScrollText,
    title: "Cultural records",
    text: "Founding histories, festival calendars and living traditions written down while they are still told.",
  },
  {
    icon: Users,
    title: "Community knowledge",
    text: "Monastery admins curate their own scenes, stories and archives through the platform.",
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
  const mapped = monasteries.filter((m) => m.coordinates).length;

  return (
    <>
      <main>
        {/* ------------------------------------------------------- 1 · Hero */}
        <ParallaxHero
          background={{
            src: img("hero/buddha-park"),
            alt: "The great Buddha of Ravangla seated above forested Sikkim hills",
            className: "animate-kenburns origin-top object-[50%_30%] -translate-y-[13%] sm:translate-y-0",
          }}
        >
          <div className="flex flex-1 flex-col items-center justify-end px-6 pt-24 pb-20 text-center sm:pb-32">
            <p className="fade-in-up font-mono text-eyebrow tracking-[0.24em] text-foreground-inverse/80 uppercase">
              Sikkim · Himalayas — digital cultural heritage platform
            </p>
            <h1 className="fade-in-up mt-6 font-display text-display text-foreground-inverse text-glow [animation-delay:120ms]">
              {SITE.name}
            </h1>
            <p className="fade-in-up mt-3 font-display text-h3 text-accent text-glow-strong [animation-delay:200ms]">
              {SITE.tagline}
            </p>
            <p className="fade-in-up mt-4 max-w-xl text-body-lg leading-relaxed text-foreground-inverse/85 sm:mt-6 [animation-delay:300ms]">
              Explore centuries-old monasteries, stories, traditions and sacred
              spaces through a digital cultural experience.
            </p>

            <div className="fade-in-up mt-7 flex flex-col items-center gap-3 sm:mt-9 sm:flex-row [animation-delay:420ms]">
              <Link
                href="/monasteries"
                className="flex h-12 min-w-56 items-center justify-center gap-2 rounded-full bg-accent px-8 text-small font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover hover:shadow-lifted sm:min-w-0"
              >
                Explore Monasteries
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#discover"
                className="flex h-12 min-w-56 items-center justify-center rounded-full border border-foreground-inverse/40 px-8 text-small font-semibold text-foreground-inverse transition-colors hover:border-foreground-inverse hover:bg-foreground-inverse/10 sm:min-w-0"
              >
                Discover Heritage
              </a>
            </div>

            {/* Micro-information, in glass. */}
            <div className="fade-in-up mt-7 flex flex-wrap items-center justify-center gap-2 sm:mt-12 sm:gap-2.5 [animation-delay:540ms]">
              {[
                `${monasteries.length} monasteries digitised`,
                `${mapped} mapped locations`,
                "Every claim sourced",
              ].map((chip) => (
                <span
                  key={chip}
                  className="glass-dark rounded-full px-4 py-2 text-caption font-medium text-foreground-inverse/90"
                >
                  {chip}
                </span>
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
                For three centuries the monasteries of Sikkim have held the
                state&apos;s art, its festivals and its histories. {SITE.name}{" "}
                documents that living heritage — walkable in 360°, readable in
                its own words, and bookable when you&apos;re ready to stand
                there yourself.
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
                    alt="Butter lamps and offering bowls inside a Himalayan monastery"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-caption text-subtle">
                  Offering bowls and silk khata inside a Himalayan gompa.
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
                <article className="card-lift group relative overflow-hidden rounded-xl border bg-surface shadow-soft">
                  <div className="relative aspect-16/10 overflow-hidden bg-surface-muted">
                    <Image
                      src={monastery.image}
                      alt={`${monastery.name}, ${monastery.district}`}
                      fill
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
                <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
                  Virtual monastery experience
                </p>
                <h2 className="mt-3 font-display text-h1 text-foreground-inverse">
                  Enter the monastery
                </h2>
                <p className="mt-5 text-body-lg leading-relaxed text-foreground-inverse/80">
                  Stand in the courtyard, turn to the prayer hall, and tap the
                  murals to hear what they mean. Scene-by-scene 360° exploration
                  with information hotspots and an audio guide in five
                  languages.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2.5">
                  {[
                    { icon: Rotate3d, label: "Multi-scene 360°" },
                    { icon: MousePointerClick, label: "Story hotspots" },
                    { icon: Headphones, label: "Audio narration" },
                  ].map((item) => (
                    <li
                      key={item.label}
                      className="glass-dark flex items-center gap-2 rounded-full px-4 py-2 text-caption font-medium text-foreground-inverse/90"
                    >
                      <item.icon className="size-3.5 text-accent" aria-hidden />
                      {item.label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/monasteries/rumtek"
                  className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-small font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover hover:shadow-lifted"
                >
                  Enter Virtual Tour
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <p className="mt-3 text-caption text-foreground-inverse/60">
                  Current scenes are prototype captures; Sikkim photography
                  arrives with the capture programme.
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
                <StoryCard story={story} />
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
                  <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-small font-semibold text-accent-foreground">
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
                  <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-small font-semibold text-accent-foreground">
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
                className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-8 text-small font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary-hover hover:shadow-lifted"
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
