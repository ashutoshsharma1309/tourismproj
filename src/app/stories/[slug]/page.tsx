import { ArrowLeft, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { ClaimBadge } from "@/components/stories/StoryCard";
import { Badge } from "@/components/ui/Badge";
import { SourceNote } from "@/components/ui/Provenance";
import { getMonasteryBySlug } from "@/data/monasteries";
import { CLAIM_LABEL, getStoryBySlug, stories } from "@/data/stories";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) return {};
  return { title: story.title, description: story.summary };
}

export default async function StoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();

  const related = story.relatedMonasteries
    .map((s) => getMonasteryBySlug(s))
    .filter((m) => m !== undefined);

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-20 md:px-6">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All stories
        </Link>

        <div className="relative mt-5 h-64 overflow-hidden rounded-xl border bg-surface-muted md:h-96">
          <Image
            src={story.heroImage}
            alt={story.heroAlt}
            fill
            priority
            sizes="(min-width: 768px) 48rem, 100vw"
            className="object-cover"
          />
        </div>

        <p className="mt-6 font-mono text-eyebrow tracking-widest text-primary uppercase">
          {story.category}
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">{story.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ClaimBadge story={story} />
          <span className="flex items-center gap-1.5 text-caption text-subtle">
            <Clock3 className="size-3.5" aria-hidden />
            {story.readingMinutes} min read
          </span>
        </div>

        {story.claimType !== "documented history" ? (
          <p className="mt-5 rounded-lg border-l-4 border-warning bg-warning-soft p-4 text-small leading-relaxed">
            <strong>{CLAIM_LABEL[story.claimType]}.</strong> What follows is retold
            as the tradition tells it. It is recorded here as part of the cultural
            record, not as established historical fact.
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-5">
          {story.content.map((paragraph, i) => (
            <p key={i} className="text-body-lg leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-8">
          <SourceNote provenance={story.provenance} />
        </div>

        {related.length > 0 ? (
          <section className="mt-12" aria-label="Related monasteries">
            <h2 className="font-display text-h3">Places in this story</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/monasteries/${m.slug}`}
                    className="card-lift flex h-full flex-col gap-1.5 rounded-xl border bg-surface p-4"
                  >
                    <span className="text-body font-semibold">{m.name}</span>
                    <span className="font-mono text-caption text-subtle">
                      {m.district} district · {m.tradition}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone={m.audio.available ? "success" : "neutral"}>
                        {m.audio.available ? "Audio guide" : "No audio yet"}
                      </Badge>
                      <Badge tone="neutral">
                        {m.tour.available ? "360° available" : "No 360° yet"}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
