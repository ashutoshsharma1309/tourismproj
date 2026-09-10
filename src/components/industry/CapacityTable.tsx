import { Info } from "lucide-react";

import { CAPACITY_TOTALS, districtCapacity } from "@/lib/capacity";

/**
 * Heritage against registered supply, by district.
 *
 * A server component with no interactivity on purpose. This is the one figure
 * in the product that a department could act on, and every part of it —
 * numbers, bars, caveats — should be in the HTML of the page whether or not
 * any JavaScript runs.
 *
 * ON THE BARS
 * -----------
 * Two shares drawn on the same scale, so the comparison is the shape rather
 * than the arithmetic. They are scaled against the largest share in the table
 * rather than against 100%, because the largest accommodation share is 74.6%
 * and the largest heritage share is 26.4% — drawn against 100% the heritage
 * row would be a stub in every district and the point would be invisible.
 * The scale is stated below the table, since a bar chart whose axis is not
 * 0–100 has to say so.
 */

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const MAX_SHARE = Math.max(
  ...districtCapacity.flatMap((d) => [d.heritageShare, d.hotelShare]),
);

export function CapacityTable() {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-small">
          <caption className="sr-only">
            Share of catalogued heritage sites against share of registered
            hotels and travel agencies, by district.
          </caption>
          <thead>
            <tr className="border-b border-border-strong text-left">
              <th scope="col" className="pb-2 font-medium text-muted">
                District
              </th>
              <th scope="col" className="pb-2 font-medium text-muted">
                Catalogued heritage
              </th>
              <th scope="col" className="pb-2 font-medium text-muted">
                Registered hotels
              </th>
              <th scope="col" className="pb-2 text-right font-medium text-muted">
                Agencies
              </th>
              <th scope="col" className="pb-2 text-right font-medium text-muted">
                Index
              </th>
            </tr>
          </thead>
          <tbody>
            {districtCapacity.map((d) => (
              <tr key={d.district} className="border-b border-border align-middle">
                <th scope="row" className="py-3 pr-4 text-left font-semibold text-foreground">
                  {d.district}
                </th>

                <td className="py-3 pr-4">
                  <Bar
                    share={d.heritageShare}
                    tone="bg-primary"
                    label={`${d.heritageSites} sites`}
                    detail={pct(d.heritageShare)}
                  />
                </td>

                <td className="py-3 pr-4">
                  <Bar
                    share={d.hotelShare}
                    tone="bg-accent"
                    label={d.hotels.toLocaleString()}
                    detail={pct(d.hotelShare)}
                  />
                </td>

                <td className="py-3 pr-4 text-right font-mono text-caption text-muted">
                  {d.agents.toLocaleString()}
                  <span className="block text-subtle">{pct(d.agentShare)}</span>
                </td>

                <td className="py-3 text-right">
                  <span
                    className="font-mono text-small font-semibold text-foreground"
                    title="Share of registered hotels ÷ share of catalogued heritage"
                  >
                    {d.accommodationIndex === null
                      ? "—"
                      : d.accommodationIndex.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="pt-3 text-left font-medium text-muted">
                Total
              </th>
              <td className="pt-3 font-mono text-caption text-muted">
                {CAPACITY_TOTALS.heritageSites} sites
              </td>
              <td className="pt-3 font-mono text-caption text-muted">
                {CAPACITY_TOTALS.hotels.toLocaleString()}
              </td>
              <td className="pt-3 text-right font-mono text-caption text-muted">
                {CAPACITY_TOTALS.agents.toLocaleString()}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary" aria-hidden />
          Share of catalogued heritage
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-accent" aria-hidden />
          Share of registered hotels
        </span>
        <span className="text-subtle">
          Bars are drawn to {pct(MAX_SHARE)}, the largest share in the table —
          not to 100%.
        </span>
      </div>

      <p className="mt-5 flex gap-2 rounded-xl border border-dashed border-border-strong p-4 text-caption leading-relaxed text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <span>
          <strong className="font-semibold text-foreground">
            The index is a ratio of two shares, not a score.
          </strong>{" "}
          1.00 means a district holds the same share of the state&apos;s
          registered hotels as it does of the heritage catalogued here. It does
          not rank districts, rate them, or recommend anything.{" "}
          {CAPACITY_TOTALS.heritageCaveat} {CAPACITY_TOTALS.accessCaveat}
        </span>
      </p>
    </div>
  );
}

function Bar({
  share,
  tone,
  label,
  detail,
}: {
  share: number;
  tone: string;
  label: string;
  detail: string;
}) {
  const width = MAX_SHARE === 0 ? 0 : (share / MAX_SHARE) * 100;

  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-surface-muted"
        aria-hidden
      >
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </span>
      <span className="w-24 shrink-0 font-mono text-caption text-muted">
        {label}
        <span className="block text-subtle">{detail}</span>
      </span>
    </span>
  );
}
