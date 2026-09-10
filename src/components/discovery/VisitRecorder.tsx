"use client";

import { useEffect } from "react";

import { recordVisit } from "@/lib/visit-history";
import type { VisitLink } from "@/lib/visit-history";

/**
 * Records that this page was opened, along with the neighbours the server
 * already worked out for it.
 *
 * Renders nothing. It is a client component only because localStorage is a
 * browser API — the neighbours arrive as props from the server component that
 * computed them, so no data layer follows it into the bundle.
 */
export function VisitRecorder({
  kind,
  name,
  href,
  neighbours,
}: VisitLink & { neighbours: VisitLink[] }) {
  useEffect(() => {
    recordVisit({ kind, name, href, neighbours });
  }, [kind, name, href, neighbours]);

  return null;
}
