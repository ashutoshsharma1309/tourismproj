import { INTEREST_LABEL, PACE_CAPACITY, PACE_LABEL, PACE_NOTE } from "@/lib/planner/types";
import type { JourneyInput, JourneyInterest, JourneyPace } from "@/lib/planner/types";
import { MAX_DAYS, MIN_DAYS } from "@/lib/planner/state";

/**
 * The planner's controls — a plain GET form.
 *
 * NO CLIENT JAVASCRIPT. Submitting navigates to the same route with a new
 * query string, the server rebuilds the plan, and the URL is once again the
 * whole state. That gives keyboard and screen-reader behaviour for free
 * (real fieldsets, real radios, real checkboxes, native focus order), makes
 * the planner work before hydration, and makes every interaction testable
 * with a single HTTP request.
 *
 * Removals travel as a hidden field so a rebuild does not resurrect
 * something the traveller took out.
 */
export function JourneyForm({
  action,
  state,
  offeredInterests,
}: {
  action: string;
  state: JourneyInput;
  offeredInterests: JourneyInterest[];
}) {
  const days = Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, index) => MIN_DAYS + index);

  return (
    <form
      method="get"
      action={action}
      className="rounded-xl border border-border bg-surface p-5 md:p-6"
      aria-labelledby="journey-form-heading"
    >
      <h2 id="journey-form-heading" className="font-display text-h3">
        Shape the journey
      </h2>
      <p className="mt-2 max-w-prose text-body text-muted">
        Everything below changes the plan by changing the ranking, not by
        shuffling it. The same choices always produce the same itinerary.
      </p>

      <fieldset className="mt-6 min-w-0">
        <legend className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          How many days
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {days.map((day) => (
            <label
              key={day}
              className="focus-within:ring-primary flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-small font-medium transition-colors hover:border-primary focus-within:ring-2"
            >
              <input
                type="radio"
                name="days"
                value={day}
                defaultChecked={state.days === day}
                className="accent-primary size-4"
              />
              {day} {day === 1 ? "day" : "days"}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <legend className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Pace
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(Object.keys(PACE_CAPACITY) as JourneyPace[]).map((pace) => (
            <label
              key={pace}
              className="focus-within:ring-primary flex cursor-pointer gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary focus-within:ring-2"
            >
              <input
                type="radio"
                name="pace"
                value={pace}
                defaultChecked={state.pace === pace}
                className="accent-primary mt-1 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-small font-medium">{PACE_LABEL[pace]}</span>
                <span className="mt-1 block text-caption text-muted">{PACE_NOTE[pace]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {offeredInterests.length > 0 ? (
        <fieldset className="mt-6 min-w-0">
          <legend className="font-mono text-eyebrow tracking-widest text-primary uppercase">
            Interests
          </legend>
          <p className="mt-2 text-caption text-muted">
            Only interests this destination can actually satisfy are listed —
            each one is carried by at least one catalogued record.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {offeredInterests.map((interest) => (
              <label
                key={interest}
                className="focus-within:ring-primary flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-small font-medium transition-colors hover:border-primary focus-within:ring-2"
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={interest}
                  defaultChecked={state.interests.includes(interest)}
                  className="accent-primary size-4"
                />
                {INTEREST_LABEL[interest]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state.removed.length > 0 ? (
        <input type="hidden" name="remove" value={[...state.removed].sort().join(",")} />
      ) : null}
      {/* Anything added from discovery survives a rebuild. */}
      {state.pinned.length > 0 ? (
        <input type="hidden" name="pin" value={[...state.pinned].sort().join(",")} />
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="focus-visible:ring-primary rounded-full bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
        >
          Rebuild the plan
        </button>
        <a
          href={action}
          className="focus-visible:ring-primary rounded-full px-3 py-2 text-small font-medium text-muted hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
