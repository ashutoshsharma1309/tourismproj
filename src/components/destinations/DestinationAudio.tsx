import { Headphones } from "lucide-react";
import Link from "next/link";

import { getAudioGuides } from "@/lib/destinations/content";
import { LANGUAGES, translator, type LanguageCode } from "@/lib/i18n";

/**
 * Narrated guides, where they exist — and an honest empty state where they do
 * not.
 *
 * THE POINT OF THIS COMPONENT IS THE STATE IT SHOWS MOST OFTEN
 * ------------------------------------------------------------
 * Sikkim has 181 narrated files across twelve languages. The other fourteen
 * destinations have none. The tempting build is a player on every hub that
 * silently does nothing on fourteen of them; the brief's rule — never leave a
 * dead control — is the right one, and it is also the honest one.
 *
 * So a destination with guides gets a link into them, and a destination
 * without gets a sentence saying so. Neither gets a play button that cannot
 * play anything.
 *
 * TWENTY INTERFACE LANGUAGES ARE NOT TWENTY AUDIO LANGUAGES
 * ---------------------------------------------------------
 * The interface is offered in twenty; the recordings exist in twelve. A
 * reader who has switched the interface to Tamil must not infer a Tamil
 * narration from it, so the count of narration languages is stated
 * separately and never derived from the interface set.
 */
export async function DestinationAudio({
  destinationId,
  destinationName,
  language,
}: {
  destinationId: string;
  destinationName: string;
  language: LanguageCode;
}) {
  const guides = await getAudioGuides(destinationId);
  const t = translator(language);

  const spokenIn = new Set(guides.map((guide) => guide.language));
  const named = LANGUAGES.filter((entry) => spokenIn.has(entry.code));

  return (
    <section id="audio" className="mt-14 scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-h3">Listen to {destinationName}</h2>
        {guides.length > 0 ? (
          <p className="text-caption text-subtle" data-numeric>
            {guides.length}
          </p>
        ) : null}
      </div>

      {guides.length > 0 ? (
        <>
          <p className="mt-2 max-w-2xl text-body text-muted">
            {guides.length} narrated guides in {named.length} languages, each
            with a full transcript and the voice that recorded it named.
            Narration is machine-generated and labelled as such on every guide.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {named.map((entry) => (
              <li
                key={entry.code}
                lang={entry.code}
                dir={entry.dir}
                className="rounded-full border border-border px-3 py-1 text-caption text-muted"
              >
                {entry.endonym}
              </li>
            ))}
          </ul>
          <p className="mt-5">
            <Link
              href={`/destinations/${destinationId}/monasteries`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Headphones className="size-4" aria-hidden />
              Open the audio guides
            </Link>
          </p>
        </>
      ) : (
        /*
         * No player, no disabled button, no "coming soon" badge on a control
         * that looks operable. One sentence that says what is true.
         */
        <div className="mt-3 rounded-xl border border-border bg-surface-muted/40 p-5">
          <p className="text-body text-muted">
            <span className="font-medium text-foreground">
              Audio guides are not yet available for {destinationName}.
            </span>{" "}
            Narrated guides exist so far only for the deep archive, where a
            reviewed transcript exists to narrate. The interface here is
            available in {LANGUAGES.length} languages — {t("lang.label")} is in
            the header — but a translated interface is not a narration, and
            this page will not imply one.
          </p>
        </div>
      )}
    </section>
  );
}
