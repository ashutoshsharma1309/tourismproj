import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AskGuideButton } from "@/components/layout/AskGuideButton";

/**
 * The product in four steps, directly under the hero.
 *
 * WHY IT SITS HERE AND WHY IT IS SHORT
 * ------------------------------------
 * The homepage was fourteen thousand pixels tall and nothing on it said
 * where to start. A "four stages" block existed, but three screens down,
 * after the destinations and the interests it was meant to introduce. This
 * is the same idea moved to the one place a newcomer reads it — before they
 * choose anything — and cut to a strip: a number, a verb, one sentence, and
 * the real route each step lives at. No tutorial, no popup.
 *
 * Step 3 is a button, not a link. The guide is a panel on every page, so
 * "ask it" is an action here, not a destination.
 */
const STEPS = [
  {
    title: "Choose what interests you",
    body: "Pick the themes you care about and we match destinations to them.",
    action: { href: "/discover", label: "Find destinations for me" },
  },
  {
    title: "Explore a destination",
    body: "Open its places, stories, food and history, each traced to a source.",
    action: { href: "/destinations", label: "Explore India" },
  },
  {
    title: "Ask the guide whenever you need context",
    body: "It answers from the records on the page, and says when it has nothing.",
    action: null,
  },
  {
    title: "Build your journey and compare",
    body: "Keep the destinations you want, then see them side by side.",
    action: { href: "/journey", label: "View my journey" },
  },
] as const;

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="border-b border-border bg-surface"
    >
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <h2 id="how-heading" className="font-display text-h3 text-balance-heading">
          How TerraStory works
        </h2>

        <ol className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-caption font-medium text-primary"
                aria-hidden
                data-numeric
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-body font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-small leading-relaxed text-muted">{step.body}</p>
                {step.action ? (
                  <Link
                    href={step.action.href}
                    prefetch={false}
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-small font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none md:min-h-6"
                  >
                    {step.action.label}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ) : (
                  <AskGuideButton className="mt-2 min-h-11 text-small font-medium text-primary hover:underline focus-visible:ring-primary md:min-h-6" />
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
