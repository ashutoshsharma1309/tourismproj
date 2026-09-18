"use client";

import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { useEffect, useState } from "react";

import type { PublicAdvisory } from "@/app/api/advisories/route";
import { cn } from "@/lib/cn";

/**
 * Official advisories for a destination, as a traveller sees them.
 *
 * Nothing appears unless a tourism department has published something that is
 * in force today, and every item names the authority that issued it. The
 * section is fetched after load because the destination page is prerendered
 * and an advisory is published at runtime (app/api/advisories/route.ts).
 */
const ICON = { INFO: Info, WARNING: AlertTriangle, CRITICAL: OctagonAlert } as const;
const TONE = {
  INFO: "border-info/40 bg-info-soft/40",
  WARNING: "border-warning/50 bg-warning-soft/50",
  CRITICAL: "border-error/50 bg-error-soft/50",
} as const;

export function DestinationAdvisories({
  destinationId,
  labels,
}: {
  destinationId: string;
  labels: { title: string; issuedBy: string; until: string; kinds: Record<string, string> };
}) {
  const [advisories, setAdvisories] = useState<PublicAdvisory[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/advisories?destination=${encodeURIComponent(destinationId)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { advisories: [] }))
      .then((body: { advisories?: PublicAdvisory[] }) => setAdvisories(Array.isArray(body.advisories) ? body.advisories : []))
      .catch(() => {
        /* Aborted or offline: the section simply does not appear. */
      });
    return () => controller.abort();
  }, [destinationId]);

  if (advisories.length === 0) return null;

  return (
    <section id="advisories" className="mt-10 scroll-mt-20" aria-labelledby="advisories-heading">
      <h2 id="advisories-heading" className="font-display text-h3">{labels.title}</h2>
      <ul className="mt-4 space-y-3">
        {advisories.map((advisory) => {
          const Icon = ICON[advisory.severity as keyof typeof ICON] ?? Info;
          const tone = TONE[advisory.severity as keyof typeof TONE] ?? TONE.INFO;
          return (
            <li key={advisory.id} className={cn("rounded-xl border p-4", tone)} data-advisory-severity={advisory.severity}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{advisory.title}</p>
                  <p className="text-caption text-subtle">
                    {labels.kinds[advisory.kind] ?? advisory.kind}
                    {advisory.authority ? ` · ${labels.issuedBy.replace("{authority}", advisory.authority)}` : ""}
                    {advisory.endsAt ? ` · ${labels.until.replace("{date}", advisory.endsAt.slice(0, 10))}` : ""}
                  </p>
                  {advisory.body ? <p className="mt-2 max-w-prose text-small leading-relaxed whitespace-pre-line">{advisory.body}</p> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
