import { ArrowRight, Clock3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { CLAIM_LABEL } from "@/data/stories";
import type { Story } from "@/data/stories";

/** How a claim should be read is part of the card, not buried in the article. */
export function ClaimBadge({ story }: { story: Story }) {
  const tone =
    story.claimType === "documented history"
      ? "success"
      : story.claimType === "oral tradition"
        ? "info"
        : "warning";
  return <Badge tone={tone}>{CLAIM_LABEL[story.claimType]}</Badge>;
}

export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="card-lift group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-soft">
      <div className="relative aspect-16/10 overflow-hidden bg-surface-muted">
        <Image
          src={story.heroImage}
          alt={story.heroAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="media-zoom object-cover group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-mono text-caption tracking-wider text-accent-ink uppercase">
          {story.category}
        </p>
        <h3 className="font-display text-h4">
          <Link href={`/stories/${story.slug}`} className="focus-visible:outline-none">
            <span className="absolute inset-0 z-10" aria-hidden />
            {story.title}
          </Link>
        </h3>
        <p className="text-small leading-relaxed text-muted">{story.summary}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <ClaimBadge story={story} />
          <span className="flex items-center gap-1.5 text-caption text-subtle">
            <Clock3 className="size-3.5" aria-hidden />
            {story.readingMinutes} min read
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-small font-medium text-primary">
          Read story
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </article>
  );
}
