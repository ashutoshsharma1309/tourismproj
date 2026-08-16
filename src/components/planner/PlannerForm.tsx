"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatPriceCompact } from "@/lib/format";
import type { PlannerInterest, PlannerStyle } from "@/types";

const INTERESTS: PlannerInterest[] = [
  "Monasteries",
  "Trekking",
  "Lakes",
  "Culture",
  "Food",
  "Adventure",
];

const STYLES: PlannerStyle[] = ["Solo", "Couple", "Family", "Group", "Luxury", "Budget"];

const BUDGET = { min: 10_000, max: 2_00_000, step: 5_000 };

export function PlannerForm() {
  const router = useRouter();
  const [interests, setInterests] = useState<Set<PlannerInterest>>(
    new Set(["Monasteries", "Lakes"]),
  );
  const [budget, setBudget] = useState(35_000);
  const [duration, setDuration] = useState(7);
  const [style, setStyle] = useState<PlannerStyle>("Couple");
  const [startDate, setStartDate] = useState("");
  const [requests, setRequests] = useState("");
  const [crafting, setCrafting] = useState(false);

  const generate = () => {
    setCrafting(true);
    const params = new URLSearchParams({
      interests: [...interests].join(","),
      budget: String(budget),
      duration: String(duration),
      style,
    });
    if (startDate) params.set("start", startDate);
    // A short beat sells the "crafting" moment without wasting the user's time.
    window.setTimeout(() => {
      router.push(`/planner/result?${params.toString()}`);
    }, 1600);
  };

  return (
    <div className="rounded-xl border bg-surface p-6 md:p-8">
      <fieldset>
        <legend className="text-label font-medium">What pulls you to Sikkim?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const active = interests.has(interest);
            return (
              <label
                key={interest}
                className={cn(
                  "flex h-11 cursor-pointer items-center rounded-full border px-5 text-small font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong text-muted hover:border-primary hover:text-primary",
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    setInterests((current) => {
                      const next = new Set(current);
                      if (next.has(interest)) next.delete(interest);
                      else next.add(interest);
                      return next;
                    })
                  }
                  className="sr-only"
                />
                {interest}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-7 md:grid-cols-2">
        <label className="block">
          <span className="text-label font-medium">
            Budget per person{" "}
            <span data-numeric className="ml-1 font-mono text-small text-primary">
              {formatPriceCompact(budget)}
            </span>
          </span>
          <input
            type="range"
            min={BUDGET.min}
            max={BUDGET.max}
            step={BUDGET.step}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
            aria-label="Budget per person for the whole trip"
          />
          <span className="flex justify-between text-caption text-subtle">
            <span>{formatPriceCompact(BUDGET.min)}</span>
            <span>{formatPriceCompact(BUDGET.max)}</span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">Days in Sikkim</span>
          <input
            type="number"
            min={3}
            max={14}
            value={duration}
            onChange={(e) =>
              setDuration(Math.min(14, Math.max(3, Number(e.target.value) || 3)))
            }
            className="h-12 w-28 rounded-lg border border-border-strong px-3 text-center font-mono text-body"
          />
          <span className="text-caption text-subtle">3–14 days</span>
        </label>
      </div>

      <fieldset className="mt-7">
        <legend className="text-label font-medium">Travel style</legend>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
          {STYLES.map((candidate) => (
            <label
              key={candidate}
              className={cn(
                "flex h-11 cursor-pointer items-center rounded-full border px-5 text-small font-medium transition-colors",
                style === candidate
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border-strong text-muted hover:border-primary hover:text-primary",
              )}
            >
              <input
                type="radio"
                name="travel-style"
                checked={style === candidate}
                onChange={() => setStyle(candidate)}
                className="sr-only"
              />
              {candidate}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">
            Start date <span className="font-normal text-subtle">(optional)</span>
          </span>
          <input
            type="date"
            value={startDate}
            min="2026-08-15"
            onChange={(e) => setStartDate(e.target.value)}
            className="h-12 rounded-lg border border-border-strong px-3 text-small"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">
            Special requests <span className="font-normal text-subtle">(optional)</span>
          </span>
          <textarea
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
            rows={2}
            placeholder="Dietary needs, accessibility, festivals you want to catch…"
            className="rounded-lg border border-border-strong p-3 text-small"
          />
        </label>
      </div>

      <Button
        onClick={generate}
        loading={crafting}
        disabled={interests.size === 0}
        size="lg"
        variant="accent"
        className="mt-8 w-full md:w-auto"
      >
        <Sparkles className="size-4" aria-hidden />
        {crafting ? "Crafting your perfect trip…" : "Generate itinerary"}
      </Button>
      {interests.size === 0 ? (
        <p className="mt-2 text-small text-error">Pick at least one interest.</p>
      ) : null}
    </div>
  );
}
