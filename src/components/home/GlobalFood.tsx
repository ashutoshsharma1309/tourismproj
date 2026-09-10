import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { allCulture } from "@/lib/global-index";

/**
 * Food, as a way into a culture rather than a listings section.
 *
 * ONE DISH PER DESTINATION, NOT THE FIRST TWELVE
 * ----------------------------------------------
 * Taking the first twelve records would have produced eight dishes from Delhi
 * and none from Kyoto, because the destinations hold different amounts. One
 * per destination, in registry order, is both the wider picture and a rule a
 * reader can see — the same selection rule the stories and timeline sections
 * already use.
 *
 * Every description is quoted from the source cited on the destination's own
 * page. Nothing here recommends a restaurant, prices a meal or rates a dish:
 * none of that is in the archive, and none of it would be true if it were.
 */
const SLOTS = 8;

export async function GlobalFood() {
  const all = await allCulture("food");
  if (all.length === 0) return null;

  /*
   * A NAMED DISH BEATS A CUISINE CATEGORY.
   *
   * Taking each destination's first food record surfaced "Bengali cuisine",
   * "Kerala cuisine", "Mughlai cuisine" — survey articles whose lead images
   * are montages, maps or nothing at all. A specific dish is both the better
   * photograph and the more interesting card, so records whose name is a
   * cuisine category sort last and are used only when a destination has
   * nothing else.
   */
  const isCategory = (name: string) => /\bcuisine\b/i.test(name);

  const seen = new Set<string>();
  const picked = [...all]
    .sort((a, b) => {
      const byKind = Number(isCategory(a.record.name)) - Number(isCategory(b.record.name));
      if (byKind !== 0) return byKind;
      return Number(Boolean(b.record.image)) - Number(Boolean(a.record.image));
    })
    .filter(({ destination }) => {
      if (seen.has(destination.id)) return false;
      seen.add(destination.id);
      return true;
    })
    .slice(0, SLOTS);

  return (
    <section
      aria-labelledby="global-food"
      className="border-y border-border bg-surface-muted/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Taste the place
        </p>
        <h2 id="global-food" className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          See the culture through its food
        </h2>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted">
          One dish from each of {picked.length} destinations, each described in
          the words of the source it is quoted from. Nothing here is priced,
          rated or recommended.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {picked.map(({ destination, record }) => (
            <li key={`${destination.id}-${record.id}`}>
              <Link
                href={`/destinations/${destination.id}#food`}
                className="tile group flex h-full flex-col overflow-hidden hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {record.image ? (
                  <span className="relative block aspect-4/3 overflow-hidden bg-surface-muted">
                    <Image
                      src={record.image}
                      alt={record.imageAlt ?? `${record.name}, ${destination.name}`}
                      fill
                      sizes="(min-width: 1024px) 16rem, (min-width: 640px) 45vw, 92vw"
                      className="media-zoom object-cover group-hover:scale-[1.04]"
                    />
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col p-4">
                  <span className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                    {destination.name}
                  </span>
                  <span className="mt-1.5 font-display text-h4">{record.name}</span>
                  <span className="mt-2 line-clamp-4 text-caption leading-relaxed text-muted">
                    {record.summary}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:underline"
          >
            Every destination&apos;s food, festivals and crafts
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  );
}
