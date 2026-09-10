import { ArrowRight } from "lucide-react";
import { focalClassFor } from "@/lib/media/focal";
import Image from "next/image";
import Link from "next/link";

import { InterestProvenance } from "@/components/discovery/InterestProvenance";
import { whyThisPlace } from "@/lib/discovery";
import type { Experience, JourneyInterest } from "@/lib/planner/types";

/**
 * One discoverable experience.
 *
 * WHAT IS ON IT, AND WHY
 * ----------------------
 * A traveller who has never heard of the place needs four things: what it is,
 * why it is worth their day, whether they can trust that, and what to do
 * next. So: the record's own photograph and sourced sentence, countable
 * reasons ("Connected to 5 dated historical events"), the interests it
 * carries WITH the evidence for each, and two actions — read the record, or
 * add it to the trip.
 *
 * IMAGERY. The photograph comes from the record itself, so it can only ever
 * be a picture of this subject in this destination, and its alt text is the
 * record's own. Where the archive has no verified photograph the card shows a
 * neutral panel naming the record type — never a stand-in from somewhere
 * else, which is how a heritage site ends up illustrated by a different
 * heritage site.
 */
/**
 * What this record's link opens, named for what the reader will find.
 *
 * A generic "Explore" on every card told the reader nothing about whether the
 * next page was a place, a dish or a festival. These labels are §38's own
 * vocabulary, chosen by the record's kind rather than written per card.
 */
function exploreLabel(experience: Experience): string {
  if (experience.kind === "culture") return "View record";
  return "View place";
}

export function ExperienceCard({
  experience,
  highlightInterests,
  compact = false,
}: {
  experience: Experience;
  /** When a filter is active, show that interest's provenance first. */
  highlightInterests?: JourneyInterest[];
  compact?: boolean;
}) {
  /*
   * PHASE 18 — the card is the record, for a compact destination.
   *
   * A capsule place has no long-form page: its `href` points back here, to
   * this card's anchor. Deep-format records keep their own pages and the
   * anchor is simply unused.
   */
  const anchorId = `place-${experience.id.split(":")[1] ?? experience.id}`;
  const why = whyThisPlace(experience).slice(0, compact ? 2 : 3);

  /*
   * Does this card's link go anywhere other than this card?
   *
   * A capsule place is anchored at its own card — `capsulePlaces()` sets
   * `detailHref` to `…/discover#place-<id>`, which is the element we are
   * rendering right now. The button therefore scrolled the reader to the
   * card they clicked from, which is indistinguishable from a broken link
   * and was reported as one. There is no page to send them to, so the honest
   * thing is to not offer the button: the card already IS the record, and
   * everything the capsule holds about it is on the card.
   */
  const selfAnchored = experience.href.endsWith(`#${anchorId}`);

  return (
    <article
      id={anchorId}
      className="flex min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="relative aspect-16/10 w-full bg-surface-muted">
        {experience.image ? (
          <Image
            src={experience.image}
            alt={experience.imageAlt}
            fill
            sizes="(min-width: 768px) 384px, 100vw"
            className={`object-cover ${focalClassFor(experience.image)}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <span className="text-caption text-subtle">
              No verified photograph of this{" "}
              {experience.typeLabel.toLowerCase()} is published
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          {experience.typeLabel}
          {experience.area ? ` · ${experience.area}` : ""}
        </p>
        <h3 className="mt-2 font-display text-h4 text-balance-heading">
          <Link
            href={experience.href}
            prefetch={false}
            className="hover:text-primary"
          >
            {experience.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-body text-muted">
          {experience.summary}
        </p>

        <ul className="mt-3 space-y-1">
          {why.map((line) => (
            <li key={line} className="flex gap-2 text-caption leading-relaxed">
              <span aria-hidden className="text-primary">
                ·
              </span>
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>

        {!compact ? (
          <InterestProvenance
            experience={experience}
            interests={highlightInterests}
          />
        ) : null}

        {/*
          ONE ACTION PER CARD.

          "Add to trip" was the filled, primary-coloured button on every card
          in discovery, which made COLLECTING the dominant gesture of a product
          whose subject is why a place matters. Phase 21 demoted it to a quiet
          secondary; it is now gone entirely, and nothing has replaced it —
          a second button that says Save or Bookmark would be the same mistake
          with a different label.

          What remains is the action that leads somewhere: whatever this
          record's own format calls "more", labelled for what it actually
          opens. The planner still accepts a pinned record by URL; it simply no
          longer recruits every card in discovery into pinning one.
        */}
        {selfAnchored ? null : (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
            <Link
              href={experience.href}
              prefetch={false}
              className="focus-visible:ring-primary inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-caption font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
            >
              {exploreLabel(experience)}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
