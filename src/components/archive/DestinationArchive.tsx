import Image from "next/image";
import Link from "next/link";

/**
 * A destination's catalogued objects, presented as an archive rather than a
 * gallery.
 *
 * WHAT MAKES THIS NOT A CARD GRID
 * -------------------------------
 * An archive's job is to show the object and state what is known about it.
 * So the media is large and uncropped-looking, the metadata sits under it as
 * a labelled record rather than a caption, and the licence is printed on the
 * face of every entry instead of hidden behind a hover. There are no filters
 * for their own sake: a destination with two object types does not need a
 * filter bar to choose between them, and the type headings do that work.
 *
 * WHAT IS NEVER SHOWN
 * -------------------
 * Dimensions, materials and a holding institution. Wikimedia Commons does not
 * publish them for these files, and an archive that invents "42 x 30 cm" has
 * stopped being an archive. The fields are absent, not blank-filled.
 */

export interface ArchiveObject {
  id: string;
  title: string;
  objectType: string;
  date: string | null;
  creator: string | null;
  description: string | null;
  rights: string;
  rightsUrl: string | null;
  originalUrl: string;
  mediaUrl: string;
  width: number;
  height: number;
  relatedPlaces: string[];
  relatedStories: string[];
  relatedHistory: string[];
  provenance: string;
}

function ObjectRecord({
  object,
  destinationId,
  featured = false,
}: {
  object: ArchiveObject;
  destinationId: string;
  featured?: boolean;
}) {
  return (
    <figure className={featured ? "" : "h-full"}>
      <div
        className={`relative overflow-hidden rounded-lg bg-surface-muted ${
          featured ? "aspect-3/2" : "aspect-4/3"
        }`}
      >
        <Image
          src={object.mediaUrl}
          alt={object.title}
          fill
          sizes={featured ? "(min-width: 1024px) 62rem, 100vw" : "(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"}
          /* `contain`, not `cover`. Cropping a catalogued object to fill a box
             is the one thing an archive must not do to it. */
          className="object-contain"
          priority={featured}
        />
      </div>

      <figcaption className="mt-4">
        <h3 className={featured ? "font-display text-h3" : "font-display text-h4"}>
          {object.title}
        </h3>

        {/* The record. Every line is a field Commons published. */}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
          <dt className="text-subtle">Type</dt>
          <dd className="text-muted">{object.objectType}</dd>
          {object.date ? (
            <>
              <dt className="text-subtle">Date</dt>
              <dd className="text-muted">{object.date}</dd>
            </>
          ) : null}
          {object.creator ? (
            <>
              <dt className="text-subtle">Maker</dt>
              <dd className="text-muted">{object.creator}</dd>
            </>
          ) : null}
          <dt className="text-subtle">Rights</dt>
          <dd className="text-muted">
            {object.rightsUrl ? (
              <a href={object.rightsUrl} className="hover:text-primary hover:underline" rel="noreferrer" target="_blank">
                {object.rights}
              </a>
            ) : (
              object.rights
            )}
          </dd>
          <dt className="text-subtle">Source</dt>
          <dd className="text-muted">
            <a
              href={object.originalUrl}
              className="hover:text-primary hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              Wikimedia Commons
            </a>
          </dd>
        </dl>

        {featured && object.description ? (
          <p className="mt-4 max-w-[68ch] text-small leading-relaxed text-muted">
            {object.description}
          </p>
        ) : null}

        {object.relatedPlaces.length > 0 ? (
          <p className="mt-3 text-caption text-subtle">
            Connected to{" "}
            {object.relatedPlaces.map((place, index) => (
              <span key={place}>
                {index > 0 ? ", " : ""}
                <Link
                  href={`/destinations/${destinationId}/discover#place-${place}`}
                  className="text-primary hover:underline"
                >
                  {place.replace(/-/g, " ")}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function DestinationArchive({
  objects,
  destinationId,
  destinationName,
}: {
  objects: ArchiveObject[];
  destinationId: string;
  destinationName: string;
}) {
  const [featured, ...rest] = objects;
  if (!featured) return null;

  /* Grouped by what the objects ARE, in the order the catalogue holds most of. */
  const byType = new Map<string, ArchiveObject[]>();
  for (const object of rest) {
    if (!byType.has(object.objectType)) byType.set(object.objectType, []);
    byType.get(object.objectType)!.push(object);
  }
  const groups = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="mt-12">
      <section aria-labelledby="featured-object">
        <h2 id="featured-object" className="sr-only">
          Featured object
        </h2>
        <ObjectRecord object={featured} destinationId={destinationId} featured />
      </section>

      {groups.map(([type, items]) => (
        <section key={type} className="mt-20" aria-labelledby={`type-${type.replace(/\s+/g, "-")}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-6">
            <h2 id={`type-${type.replace(/\s+/g, "-")}`} className="font-display text-h2">
              {type}
            </h2>
            <p className="font-mono text-caption text-subtle" data-numeric>
              {items.length} catalogued
            </p>
          </div>
          <ul className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((object) => (
              <li key={object.id}>
                <ObjectRecord object={object} destinationId={destinationId} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-20 max-w-[68ch] border-t border-border pt-6 text-small leading-relaxed text-muted">
        Every object above is catalogued from Wikimedia Commons, which publishes
        its licence and its maker as structured data. An object with no stated
        licence or no stated author was not admitted, however good the picture.
        Dimensions, materials and a holding institution are not shown for{" "}
        {destinationName} because no source in this catalogue states them.
      </p>
    </div>
  );
}
