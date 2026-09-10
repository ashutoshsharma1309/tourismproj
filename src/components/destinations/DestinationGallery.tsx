import Image from "next/image";
import { focalClassFor } from "@/lib/media/focal";
import Link from "next/link";

import {
  getCapsuleCulture,
  getCapsuleStays,
  getPlaces,
} from "@/lib/destinations/content";

/**
 * What you would actually be standing in front of.
 *
 * WHY A GALLERY AND NOT MORE CARDS
 * --------------------------------
 * The hub already lists places, food, festivals, crafts and stays as cards,
 * each with a photograph attached to a paragraph. What it never did was let
 * the photographs be the point — and a tourism product where the imagery is
 * always subordinate to a text block reads as a database with pictures.
 *
 * Every frame here is already on the page somewhere else. This is the same
 * archive, shown the other way round.
 *
 * THE SET IS DRAWN ACROSS KINDS, NOT DOWN ONE
 * -------------------------------------------
 * Taking the first twelve images would have produced twelve monuments.
 * Interleaving places, food, festivals, crafts and stays is what makes the
 * grid say "this is a destination" rather than "this is a list of buildings",
 * and it is a rule a reader can see rather than an edit somebody made.
 */
const SLOTS = 12;

export async function DestinationGallery({
  destinationId,
  destinationName,
}: {
  destinationId: string;
  destinationName: string;
}) {
  const [places, culture, stays] = await Promise.all([
    getPlaces(destinationId),
    getCapsuleCulture(destinationId),
    getCapsuleStays(destinationId),
  ]);

  type Frame = {
    key: string;
    image: string;
    alt: string;
    caption: string;
    kind: string;
  };

  const pools: Frame[][] = [
    places
      .filter((p) => p.image)
      .map((p) => ({
        key: `place-${p.slug}`,
        image: p.image!,
        alt: p.imageAlt ?? p.name,
        caption: p.name,
        kind: "Place",
      })),
    culture
      .filter((c) => c.image && c.kind === "food")
      .map((c) => ({
        key: c.id,
        image: c.image!,
        alt: c.imageAlt ?? c.name,
        caption: c.name,
        kind: "Food",
      })),
    culture
      .filter((c) => c.image && c.kind === "festival")
      .map((c) => ({
        key: c.id,
        image: c.image!,
        alt: c.imageAlt ?? c.name,
        caption: c.name,
        kind: "Festival",
      })),
    culture
      .filter((c) => c.image && c.kind === "craft")
      .map((c) => ({
        key: c.id,
        image: c.image!,
        alt: c.imageAlt ?? c.name,
        caption: c.name,
        kind: "Craft",
      })),
    stays
      .filter((s) => s.image)
      .map((s) => ({
        key: s.id,
        image: s.image!,
        alt: s.imageAlt ?? s.name,
        caption: s.name,
        kind: "Stay",
      })),
  ];

  /* Round-robin across the kinds until the grid is full or the pools run dry. */
  const frames: Frame[] = [];
  for (let round = 0; frames.length < SLOTS; round += 1) {
    const before = frames.length;
    for (const pool of pools) {
      const next = pool[round];
      if (next && frames.length < SLOTS) frames.push(next);
    }
    if (frames.length === before) break;
  }

  if (frames.length < 4) return null;

  return (
    <section id="gallery" className="mt-14 scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-h3">
          What you would be standing in front of
        </h2>
        <p className="text-caption text-subtle" data-numeric>
          {frames.length}
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Places, food, festivals and crafts from {destinationName}. Every
        photograph is a freely licensed file, credited where it is used.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {frames.map((frame) => (
          <li
            key={frame.key}
            className="group relative overflow-hidden rounded-lg"
          >
            <div className="relative aspect-square bg-surface-muted">
              <Image
                src={frame.image}
                alt={frame.alt}
                fill
                sizes="(min-width: 1024px) 14rem, (min-width: 640px) 30vw, 45vw"
                className={`media-zoom object-cover group-hover:scale-[1.05] ${focalClassFor(frame.image)}`}
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-secondary/85 to-transparent p-2 pt-8"
              >
                <p className="truncate text-caption font-medium text-foreground-inverse">
                  {frame.caption}
                </p>
                <p className="text-eyebrow font-mono tracking-widest text-accent uppercase">
                  {frame.kind}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-caption text-subtle">
        Image credits are recorded for every file in the archive.{" "}
        <Link
          href={`/destinations/${destinationId}/discover`}
          prefetch={false}
          className="text-primary hover:underline"
        >
          See each record and its source
        </Link>
        .
      </p>
    </section>
  );
}
