"use client";

import { ArrowRight, Clock3, Loader2 } from "lucide-react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";

import { Badge } from "@/components/ui/Badge";
import { CLAIM_LABEL } from "@/data/stories";
import type { ClaimType, Story } from "@/data/stories";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * How a claim should be read is part of the card, not buried in the article.
 * The tone carries meaning: green for documented, blue for a community's own
 * transmission, amber for a legend, neutral for a travel account.
 */
export function ClaimBadge({ claimType }: { claimType: ClaimType }) {
  const tone =
    claimType === "documented history"
      ? "success"
      : claimType === "oral tradition"
        ? "info"
        : claimType === "legend"
          ? "warning"
          : "neutral";
  return <Badge tone={tone}>{CLAIM_LABEL[claimType]}</Badge>;
}

/**
 * The call to action, which knows whether its own navigation is in flight.
 *
 * Story pages are statically generated, so most clicks resolve immediately —
 * but on a cold cache or a slow connection the old card gave no feedback at
 * all, which is what made people click twice and doubt where they had landed.
 * `useLinkStatus` only reports for the Link it is rendered inside, which is
 * why the whole card is one Link rather than a card with an overlay.
 */
function ReadStoryCta() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        /* Was a bespoke h-10/px-4 pill — a fifth button geometry for the same
           "open this thing" job. The outline variant at sm is the same shape the
           rest of the product already uses for a card-level action. */
        buttonClasses({ variant: "outline", size: "sm" }),
        "mt-4 self-start font-semibold transition-colors",
        pending
          ? "border-primary bg-primary text-primary-foreground"
          : "text-primary group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Opening…
        </>
      ) : (
        <>
          Read story
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden
          />
        </>
      )}
    </span>
  );
}

export function StoryCard({
  story,
  priority = false,
  eager = false,
}: {
  story: Story;
  /** Preload AND load immediately. Only for a card in the first viewport. */
  priority?: boolean;
  /**
   * Load immediately without preloading.
   *
   * The distinction matters. A card sitting 5,600px down the home page is
   * reached quickly enough that lazy loading is visibly late — measured, six of
   * them were still undecoded when a reader arrived on a throttled connection —
   * but preloading it would put it in the same queue as the hero and delay the
   * largest paint. Eager without priority loads it early and quietly.
   */
  eager?: boolean;
}) {
  return (
    <Link
      href={`/stories/${story.slug}`}
      aria-label={`Read the story: ${story.title}`}
      className={cn(
        "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-soft",
        /* Lift on hover, settle on press — the card behaves like a button. */
        "transition-[transform,box-shadow,border-color] duration-300 ease-out-soft",
        "hover:-translate-y-1.5 hover:border-accent hover:shadow-lifted",
        "active:translate-y-0 active:shadow-card",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
      )}
    >
      <div className="relative aspect-16/10 overflow-hidden bg-surface-muted">
        <Image
          src={story.heroImage}
          alt={story.heroAlt}
          fill
          priority={priority}
          loading={eager && !priority ? "eager" : undefined}
          sizes="(min-width: 1280px) 24rem, (min-width: 640px) 45vw, 92vw"
          className="media-zoom object-cover group-hover:scale-[1.05]"
        />
        <span className="absolute top-3 left-3">
          <ClaimBadge claimType={story.claimType} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-caption tracking-wider text-accent-ink uppercase">
          {story.category}
        </p>

        <h3 className="mt-1.5 font-display text-h4 transition-colors group-hover:text-primary">
          {story.title}
        </h3>

        <p className="mt-2 line-clamp-3 text-small leading-relaxed text-muted">{story.summary}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-subtle">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden />
            {story.readingMinutes} min read
          </span>
          {story.communities.length > 0 ? (
            <span className="min-w-0 truncate">{story.communities.slice(0, 3).join(" · ")}</span>
          ) : null}
        </div>

        <div className="mt-auto">
          <ReadStoryCta />
        </div>
      </div>
    </Link>
  );
}
