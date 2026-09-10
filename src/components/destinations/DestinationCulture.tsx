import Image from "next/image";
import { focalClassFor } from "@/lib/media/focal";

import { getCapsuleCulture } from "@/lib/destinations/content";
import { translator, type LanguageCode } from "@/lib/i18n";
import type { CapsuleCultureKind } from "@/types/capsule";

/**
 * What a destination eats, celebrates and makes.
 *
 * WHY THIS IS THREE SECTIONS AND NOT ONE
 * --------------------------------------
 * Food, festivals and crafts answer three different questions and a visitor
 * arrives with one of them, not all three. Merged into a single "Culture"
 * grid they compete; separated, each is a short readable list and a
 * destination that has festivals but no documented crafts simply shows two
 * sections instead of three.
 *
 * A section with nothing in it does not render. That is the same rule the
 * rest of the product follows: capability is derived from content being
 * present, never declared, so there is no such thing here as an empty
 * "Arts & crafts" heading with a "coming soon" under it.
 *
 * EVERY SENTENCE IS QUOTED
 * ------------------------
 * The summaries are verbatim spans from the cited article, exactly as the
 * places are. Nothing here describes a dish from memory.
 */
const ORDER: {
  kind: CapsuleCultureKind;
  key: "section.food" | "section.festivals" | "section.crafts";
}[] = [
  { kind: "food", key: "section.food" },
  { kind: "festival", key: "section.festivals" },
  { kind: "craft", key: "section.crafts" },
];

export async function DestinationCulture({
  destinationId,
  destinationName,
  language,
}: {
  destinationId: string;
  destinationName: string;
  language: LanguageCode;
}) {
  const culture = await getCapsuleCulture(destinationId);
  if (culture.length === 0) return null;

  const t = translator(language);

  return (
    <>
      {ORDER.map(({ kind, key }) => {
        const entries = culture.filter((entry) => entry.kind === kind);
        if (entries.length === 0) return null;

        return (
          <section key={kind} id={kind} className="mt-14 scroll-mt-20">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="font-display text-h3">{t(key)}</h2>
              <p className="text-caption text-subtle" data-numeric>
                {entries.length}
              </p>
            </div>
            <p className="mt-2 max-w-2xl text-body text-muted">
              Each description is quoted from the source cited beneath it.
            </p>

            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                /* Anchored per entry: a discovery card for a single dish or
                   festival links straight to that record, not to the top of
                   the shelf it sits on. */
                <li
                  key={entry.id}
                  id={`culture-${entry.id}`}
                  className="tile flex scroll-mt-24 flex-col overflow-hidden"
                >
                  {entry.image ? (
                    <div className="relative aspect-16/10 bg-surface-muted">
                      <Image
                        src={entry.image}
                        alt={
                          entry.imageAlt ?? `${entry.name}, ${destinationName}`
                        }
                        fill
                        sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"
                        className={`object-cover ${focalClassFor(entry.image)}`}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-h4">{entry.name}</h3>
                    {entry.season ? (
                      <p className="mt-1 font-mono text-eyebrow tracking-widest text-primary uppercase">
                        {t("label.season")}: {entry.season}
                      </p>
                    ) : null}
                    <p className="mt-2 text-body leading-relaxed text-muted">
                      {entry.summary}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
