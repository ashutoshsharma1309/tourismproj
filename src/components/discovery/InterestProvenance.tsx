import { INTEREST_LABEL } from "@/lib/planner/types";
import type { Experience, InterestBasis, JourneyInterest } from "@/lib/planner/types";

/**
 * The interests a record carries, each with the evidence that earned it.
 *
 * PHASE 14, OBJECTIVE 3. A chip reading "Nature" on a monastery is a claim,
 * and until this component existed the reader had no way to check it. Now
 * every chip is followed by the sentence that produced it — "3 stories
 * shelved under Sacred Landscapes name it" — taken from the same
 * `interestBasis` list the interest itself is derived from.
 *
 * Rendered as a definition list because that is what it is: a term and the
 * evidence for it. Screen readers get that structure for free.
 */
export function InterestProvenance({
  experience,
  interests,
}: {
  experience: Experience;
  /** Restrict to particular interests — used when a filter is active. */
  interests?: JourneyInterest[];
}) {
  const shown = interests ?? experience.interests;
  const grouped = shown
    .map((interest) => ({
      interest,
      basis: experience.interestBasis.filter((entry) => entry.interest === interest),
    }))
    .filter((entry) => entry.basis.length > 0);

  if (grouped.length === 0) return null;

  return (
    <dl className="mt-3 space-y-2">
      {grouped.map(({ interest, basis }) => (
        <div key={interest} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <dt className="rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-medium text-primary">
            {INTEREST_LABEL[interest]}
          </dt>
          <dd className="min-w-0 flex-1 text-caption leading-relaxed text-muted">
            {basis.map((entry) => entry.detail).join("; ")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The strongest basis for one interest — used where space allows one line. */
export function strongestBasis(
  experience: Experience,
  interest: JourneyInterest,
): InterestBasis | undefined {
  return experience.interestBasis
    .filter((entry) => entry.interest === interest)
    .sort((a, b) => b.refs.length - a.refs.length)[0];
}
