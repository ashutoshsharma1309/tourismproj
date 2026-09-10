import {
  getCapsuleCulture,
  getCapsuleStays,
  getHistory,
  getPlaces,
  getStories,
} from "@/lib/destinations/content";
import { coverageDimensions } from "@/lib/destinations/earned-depth";

/**
 * What this destination actually holds, counted.
 *
 * WHY EVERY NUMBER HERE IS COUNTED AND NONE IS TYPED
 * --------------------------------------------------
 * A coverage bar is the most tempting place in a tourism product to round up.
 * Every figure below is read from the same accessors the sections underneath
 * render from, at build time, so the bar and the page can never disagree —
 * and a destination that holds nine places says nine.
 *
 * A DIMENSION WITH NOTHING IN IT IS OMITTED, NOT ZEROED
 * -----------------------------------------------------
 * "0 festivals" and "festivals not yet researched" mean different things, and
 * a grid of zeroes reads as a broken product rather than an honest one. A
 * dimension only appears once it has something to report; what is missing is
 * named in one line underneath, in words.
 */
const LABELS: Record<string, [string, string]> = {
  places: ["place", "places"],
  stories: ["story", "stories"],
  history: ["dated event", "dated events"],
  food: ["dish", "dishes"],
  festivals: ["festival", "festivals"],
  crafts: ["craft", "crafts"],
  stays: ["documented stay", "documented stays"],
  claims: ["reviewer-approved claim", "reviewer-approved claims"],
};

export async function DestinationCoverage({ destinationId }: { destinationId: string }) {
  const [places, stories, history, culture, stays, dimensions] = await Promise.all([
    getPlaces(destinationId),
    getStories(destinationId),
    getHistory(destinationId),
    getCapsuleCulture(destinationId),
    getCapsuleStays(destinationId),
    coverageDimensions(destinationId),
  ]);

  const counts: Record<string, number> = {
    places: places.length,
    stories: stories.length,
    history: history.length,
    food: culture.filter((entry) => entry.kind === "food").length,
    festivals: culture.filter((entry) => entry.kind === "festival").length,
    crafts: culture.filter((entry) => entry.kind === "craft").length,
    stays: stays.length,
    claims: dimensions.approvedClaims,
  };

  const present = Object.entries(counts).filter(([, value]) => value > 0);
  const absent = Object.entries(counts).filter(([, value]) => value === 0);

  if (present.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-border bg-surface-muted/40 p-4 text-body text-muted">
        Verified information for this destination is not yet available. More is
        being added.
      </p>
    );
  }

  return (
    <section aria-label="What this destination holds" className="mt-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-5 sm:grid-cols-4">
        {present.map(([key, value]) => (
          <div key={key}>
            <dd className="font-mono text-2xl font-medium" data-numeric>
              {value}
            </dd>
            <dt className="mt-0.5 text-caption text-subtle">
              {LABELS[key]![value === 1 ? 0 : 1]}
            </dt>
          </div>
        ))}
      </dl>

      {absent.length > 0 ? (
        <p className="mt-3 text-caption text-subtle">
          Not yet researched here:{" "}
          {absent.map(([key]) => LABELS[key]![1]).join(", ")}. More verified
          knowledge is being added.
        </p>
      ) : null}
    </section>
  );
}
