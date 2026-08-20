import { ExternalLink } from "lucide-react";

import { SOURCES } from "@/data/sources";
import { TSD_EXEMPT_UNDER_AGE, TSD_FEE_PER_PERSON } from "@/lib/booking";
import { formatPrice } from "@/lib/format";

/**
 * The Tourism Sustainability Development levy, stated as the rules actually
 * define it: a flat ₹50 per person collected at check-in, valid one month.
 */
export function TSDBreakdown({ travellers }: { travellers: number }) {
  const chargeable = Math.max(0, travellers);
  const source = SOURCES["sikkim-tourist-trade-rules-2025"]!;

  return (
    <div className="rounded-xl border bg-surface p-5">
      {/* h2, not h3. This panel sits directly under the page h1 with nothing
          between, so an h3 skipped a level — the one moderate axe violation
          left on /hotels. Its size is set by the class, not the tag. */}
      <h2 className="text-h4 font-semibold">Tourism Sustainability Development levy</h2>
      <dl className="mt-4 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-small text-muted">
            Entry fee
            <span className="ml-2 font-mono text-caption text-subtle">
              {formatPrice(TSD_FEE_PER_PERSON)} × {chargeable}{" "}
              {chargeable === 1 ? "person" : "people"}
            </span>
          </dt>
          <dd data-numeric className="text-small font-medium">
            {formatPrice(TSD_FEE_PER_PERSON * chargeable)}
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-3">
          <dt className="text-body font-semibold">Payable at check-in</dt>
          <dd data-numeric className="font-display text-price text-primary">
            {formatPrice(TSD_FEE_PER_PERSON * chargeable)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-primary-soft p-3 text-caption leading-relaxed text-primary">
        Collected once by your hotel at check-in and deposited into the state
        TSD Fund. Valid one month — leaving Sikkim and re-entering within the
        month means paying again. Children under {TSD_EXEMPT_UNDER_AGE} and
        government-work visitors are exempt.
      </p>
      <p className="mt-2 text-caption text-subtle">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Sikkim Registration of Tourist Trade Rules, 2025
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </p>
    </div>
  );
}
