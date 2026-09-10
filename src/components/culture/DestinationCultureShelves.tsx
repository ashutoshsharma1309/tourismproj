import Image from "next/image";
import Link from "next/link";

import { focalClassFor } from "@/lib/media/focal";
import type { CultureShelf } from "@/lib/destinations/culture";

/**
 * A destination's culture, shelf by shelf.
 *
 * NOT THE FILM SHELVES. Sikkim's Culture page plays 50 verified films and is
 * built around a player; these fourteen destinations have no films and will
 * not be given unverified ones, so this is the other thing the same page can
 * be: an index of what a place eats, celebrates and makes, each entry leading
 * to the article written about it.
 *
 * WHAT EACH CARD PROMISES
 * -----------------------
 * A photograph that is of the subject, a summary that is a verbatim span from
 * the cited article, and — where one exists — a link to the full narrative.
 * A record with no article says nothing about having one; a record with no
 * photograph gets type instead of a grey rectangle.
 */
export function DestinationCultureShelves({
  shelves,
  destinationName,
}: {
  shelves: CultureShelf[];
  destinationName: string;
}) {
  return (
    <div className="mt-10 flex flex-col gap-16">
      {shelves.map((shelf) => (
        <section key={shelf.kind} id={shelf.kind} aria-labelledby={`shelf-${shelf.kind}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={`shelf-${shelf.kind}`} className="font-display text-h2">
              {shelf.label}
            </h2>
            {/* Counted, never adjectival — a thin shelf says how thin. */}
            <p className="font-mono text-caption text-subtle" data-numeric>
              {shelf.coverage}
            </p>
          </div>

          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shelf.entries.map((entry) => {
              const body = (
                <>
                  {entry.image ? (
                    <span className="relative block aspect-16/10 overflow-hidden bg-surface-muted">
                      <Image
                        src={entry.image}
                        alt={entry.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
                        className={`media-zoom object-cover group-hover:scale-[1.04] ${focalClassFor(entry.image)}`}
                      />
                    </span>
                  ) : null}
                  <span className="flex flex-1 flex-col p-4">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-h4">{entry.title}</span>
                      {entry.season ? (
                        <span className="shrink-0 text-caption text-subtle">{entry.season}</span>
                      ) : null}
                    </span>
                    <span className="mt-2 line-clamp-4 text-small leading-relaxed text-muted">
                      {entry.summary}
                    </span>
                    {entry.storyHref ? (
                      <span className="mt-3 text-small font-medium text-primary">Read the story</span>
                    ) : null}
                  </span>
                </>
              );

              return (
                <li key={entry.id} className="h-full">
                  {entry.storyHref ? (
                    <Link
                      href={entry.storyHref}
                      className="tile group flex h-full flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {body}
                    </Link>
                  ) : (
                    /* No article yet. The record is still worth showing, and
                       a link to nowhere is worse than no link. */
                    <div className="tile group flex h-full flex-col overflow-hidden">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="max-w-2xl text-small leading-relaxed text-muted">
        Every summary on this page is a verbatim span from the source cited on
        that subject&rsquo;s own page. Nothing here describes {destinationName}
        &rsquo;s food, festivals or crafts from memory.
      </p>
    </div>
  );
}
