"use client";

import { CalendarRange, FileCheck2, Info, Route, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { permitsMentionedIn } from "@/data/permits";
import { TSD_EXEMPT_UNDER_AGE, TSD_FEE_PER_PERSON } from "@/lib/booking";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { generateItinerary } from "@/lib/generate-itinerary";
import type { PlannerInterest, PlannerStyle } from "@/types";

/**
 * The trip planner form.
 *
 * WHAT CHANGED, AND WHY IT MATTERS MORE THAN THE LAYOUT
 * ----------------------------------------------------
 * Three of this form's six controls did nothing.
 *
 *   - The budget slider (₹10K–₹2L) was collected, put in the URL and printed
 *     back on the result page as "₹35K budget/person". `generateItinerary` has
 *     never read it. No route, no day, no figure changed when it moved. There
 *     is no licensed rates feed behind this project, so a budget cannot select
 *     anything — and a control that visibly does nothing is worse than an
 *     absent one, because the visitor assumes their answer was used.
 *   - "Special requests" was never even put in the URL. Every word typed into
 *     it was discarded at submit.
 *   - The start date was put in the URL and never read by the result page.
 *
 * The first two are gone. The third is now real: the itinerary dates its days
 * from it. What replaces them is the thing a planner should show — the route
 * itself, updating as you choose, computed by the same function that generates
 * the final itinerary, so the preview cannot disagree with the result.
 *
 * Party size is now counted rather than inferred from "Solo / Couple / Family /
 * Group". The TSD fee is statutory and printed to the rupee; multiplying it by
 * a guessed headcount made an exact number wrong.
 */

const INTERESTS: { id: PlannerInterest; hint: string }[] = [
  { id: "Monasteries", hint: "Rumtek, Pemayangtse, Ralang" },
  { id: "Trekking", hint: "Ridge walks and forest paths" },
  { id: "Lakes", hint: "Tsomgo, Khecheopalri" },
  { id: "Culture", hint: "Festivals, museums, bazaars" },
  { id: "Food", hint: "Markets, momos, tongba" },
  { id: "Adventure", hint: "High passes and altitude" },
];

/**
 * Party presets. They set the headcount; they do not replace it.
 *
 * "Family" fills in 4 because that is a common shape, not because it is a fact
 * about anyone's family — the number field beside it is the answer that counts,
 * and it is what the fee is calculated from.
 */
const PARTIES: { style: PlannerStyle; travellers: number }[] = [
  { style: "Solo", travellers: 1 },
  { style: "Couple", travellers: 2 },
  { style: "Family", travellers: 4 },
  { style: "Group", travellers: 6 },
];

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function PlannerForm() {
  const router = useRouter();
  const [interests, setInterests] = useState<Set<PlannerInterest>>(
    new Set(["Monasteries", "Lakes"]),
  );
  const [duration, setDuration] = useState(7);
  const [style, setStyle] = useState<PlannerStyle>("Couple");
  const [travellers, setTravellers] = useState(2);
  const [children, setChildren] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => todayIso(), []);

  /*
   * The preview runs the real generator. Not an approximation of it, not a
   * second set of rules that could drift from it — the same pure function the
   * result page calls, so what is shown here is what will be produced.
   */
  const preview = useMemo(
    () =>
      generateItinerary({
        interests: [...interests],
        duration,
        travelStyle: style,
        travellers,
        childrenUnderFive: children,
        startDate: startDate || undefined,
      }),
    [interests, duration, style, travellers, children, startDate],
  );

  const permits = useMemo(
    () =>
      permitsMentionedIn(
        preview.dayPlans.flatMap((day) => [day.title, day.morning, day.afternoon, day.evening]),
      ),
    [preview],
  );

  const valid = interests.size > 0;

  const submit = () => {
    if (!valid) return;
    setSubmitting(true);
    const params = new URLSearchParams({
      interests: [...interests].join(","),
      duration: String(duration),
      style,
      travellers: String(travellers),
    });
    if (children > 0) params.set("children", String(children));
    if (startDate) params.set("start", startDate);
    /*
     * Straight to the result. There was a deliberate 1.6-second pause here
     * "to sell the crafting moment" — a loading state for work that takes under
     * a millisecond. Manufacturing latency to imply computation is the same
     * class of thing as a fabricated rating.
     */
    router.push(`/planner/result?${params.toString()}`);
  };

  const chip = (active: boolean) =>
    cn(
      "flex cursor-pointer items-center rounded-full border px-5 text-small font-medium transition-colors",
      /* The inputs are sr-only, so without this a keyboard user sees no focus
         at all as they move through the chips. */
      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border-strong text-muted hover:border-primary hover:text-primary",
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="rounded-xl border bg-surface p-6 md:p-8">
        <fieldset>
          <legend className="text-label font-medium">What pulls you to Sikkim?</legend>
          <p className="mt-1 text-caption text-subtle">
            Pick at least one. These choose which days the route spends where.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const active = interests.has(interest.id);
              return (
                <label key={interest.id} className={cn(chip(active), "h-11")} title={interest.hint}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      setInterests((current) => {
                        const next = new Set(current);
                        if (next.has(interest.id)) next.delete(interest.id);
                        else next.add(interest.id);
                        return next;
                      })
                    }
                    className="sr-only"
                  />
                  {interest.id}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-label font-medium">Who is going?</legend>
          <p className="mt-1 text-caption text-subtle">
            The preset fills the count in; the number is what the entry fee is
            calculated from.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PARTIES.map((party) => (
              <label key={party.style} className={cn(chip(style === party.style), "h-11")}>
                <input
                  type="radio"
                  name="party"
                  checked={style === party.style}
                  onChange={() => {
                    setStyle(party.style);
                    setTravellers(party.travellers);
                    setChildren(0);
                  }}
                  className="sr-only"
                />
                {party.style}
              </label>
            ))}
          </div>

          {/*
            Hints sit outside the label and are attached with aria-describedby.
            Inside it they become part of the accessible name, so the field
            announced as "Travellers 1 to 20" instead of "Travellers, 1 to 20"
            as a separate description — the same words, but one is the label.
          */}
          <div className="mt-5 flex flex-wrap gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="planner-travellers" className="text-label font-medium">
                Travellers
              </label>
              <input
                id="planner-travellers"
                aria-describedby="planner-travellers-hint"
                type="number"
                min={1}
                max={20}
                value={travellers}
                onChange={(e) => {
                  const next = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                  setTravellers(next);
                  setChildren((c) => Math.min(c, next));
                }}
                className="h-12 w-24 rounded-lg border border-border-strong px-3 text-center font-mono text-body"
              />
              <p id="planner-travellers-hint" className="text-caption text-subtle">
                1–20
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="planner-children" className="text-label font-medium">
                Of those, under {TSD_EXEMPT_UNDER_AGE}
              </label>
              <input
                id="planner-children"
                aria-describedby="planner-children-hint"
                type="number"
                min={0}
                max={travellers}
                value={children}
                onChange={(e) =>
                  setChildren(Math.min(travellers, Math.max(0, Number(e.target.value) || 0)))
                }
                className="h-12 w-24 rounded-lg border border-border-strong px-3 text-center font-mono text-body"
              />
              <p id="planner-children-hint" className="text-caption text-subtle">
                Exempt from the fee
              </p>
            </div>
          </div>
        </fieldset>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="planner-days" className="text-label font-medium">
              Days in Sikkim
            </label>
            <input
              id="planner-days"
              aria-describedby="planner-days-hint"
              type="number"
              min={3}
              max={14}
              value={duration}
              onChange={(e) =>
                setDuration(Math.min(14, Math.max(3, Number(e.target.value) || 3)))
              }
              className="h-12 w-24 rounded-lg border border-border-strong px-3 text-center font-mono text-body"
            />
            <p id="planner-days-hint" className="text-caption text-subtle">
              3–14. Under 5 days the route stays in the east.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="planner-start" className="text-label font-medium">
              Start date <span className="font-normal text-subtle">(optional)</span>
            </label>
            <input
              id="planner-start"
              aria-describedby="planner-start-hint"
              type="date"
              value={startDate}
              min={minDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 rounded-lg border border-border-strong px-3 text-small"
            />
            <p id="planner-start-hint" className="text-caption text-subtle">
              Dates each day of the plan. It does not change the route.
            </p>
          </div>
        </div>
      </div>

      {/*
        The preview. `aria-live="polite"` because it changes under the user
        without them navigating: a screen-reader user changing the day count
        should hear the route change, not discover it after submitting.
      */}
      <aside
        aria-live="polite"
        className="rounded-xl border bg-surface p-6 lg:sticky lg:top-24"
      >
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Your route so far
        </p>

        <p className="mt-3 flex items-start gap-2 text-body font-semibold">
          <Route className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{preview.stops.map((stop) => stop.location).join(" → ")}</span>
        </p>

        <ul className="mt-3 flex flex-col gap-1.5 text-small text-muted">
          {preview.stops.map((stop) => (
            <li key={stop.location} className="flex items-baseline justify-between gap-3">
              <span>{stop.location}</span>
              <span data-numeric className="font-mono text-caption text-subtle">
                {stop.days} {stop.days === 1 ? "day" : "days"}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 flex flex-col gap-2 border-t pt-4 text-small">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <CalendarRange className="size-3.5 text-subtle" aria-hidden />
              Length
            </dt>
            <dd data-numeric className="font-mono">
              {preview.days} days, {preview.nights} nights
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <Users className="size-3.5 text-subtle" aria-hidden />
              Travellers
            </dt>
            <dd data-numeric className="font-mono">
              {preview.travellers}
              {preview.cost.exempt > 0 ? ` (${preview.cost.exempt} exempt)` : ""}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <Wallet className="size-3.5 text-subtle" aria-hidden />
              TSD entry fee
            </dt>
            <dd data-numeric className="font-mono">
              {formatPrice(preview.cost.tsd)}
            </dd>
          </div>
        </dl>

        <p className="mt-2 text-caption leading-relaxed text-subtle">
          {formatPrice(TSD_FEE_PER_PERSON)} × {preview.cost.chargeable} traveller
          {preview.cost.chargeable === 1 ? "" : "s"}, collected once at check-in.
          Nothing else here is priced: this project holds no licensed rates feed,
          so accommodation and transport are not estimated.
        </p>

        {permits.length > 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border-l-4 border-warning bg-warning-soft p-3 text-caption leading-relaxed">
            <FileCheck2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This route needs a Protected Area Permit for{" "}
              {permits.map((permit) => permit.name.split(/[–—-]/)[0]?.trim()).join(", ")} —
              arranged before departure.
            </span>
          </p>
        ) : null}

        <Button
          onClick={submit}
          loading={submitting}
          disabled={!valid}
          size="lg"
          variant="accent"
          className="mt-5 w-full"
        >
          Build the day-by-day plan
        </Button>

        {!valid ? (
          <p role="alert" className="mt-2 text-caption text-error">
            Pick at least one interest first.
          </p>
        ) : null}

        <p className="mt-4 flex items-start gap-2 text-caption leading-relaxed text-subtle">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            The route comes from fixed rules over real geography — four bases and
            the day trips that are actually drivable from them. It is not a
            model, and it does not book anything.
          </span>
        </p>
      </aside>
    </div>
  );
}
