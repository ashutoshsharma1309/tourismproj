"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { clearSignedInHint, hasSignedInHint } from "@/lib/account/hint";

interface PlaceRec {
  experience: { id: string; title: string; href: string; typeLabel: string; area: string | null };
  reason: string;
}

/**
 * "Recommended for you in <destination>": places of THIS destination only,
 * not yet viewed, matching the signed-in traveller's interests — each with
 * the reason. Nothing for visitors or for a traveller with no signal, so the
 * prerendered page is unchanged for them.
 */
export function PersonalPlaces({ destinationId, destinationName }: { destinationId: string; destinationName: string }) {
  const [places, setPlaces] = useState<PlaceRec[]>([]);

  useEffect(() => {
    if (!hasSignedInHint()) return;
    let cancelled = false;
    fetch(`/api/account/recommendations?destination=${encodeURIComponent(destinationId)}`, { credentials: "same-origin" })
      .then((response) => {
        if (response.status === 401) clearSignedInHint();
        return response.ok ? (response.json() as Promise<{ destinationId?: string; places?: PlaceRec[] }>) : null;
      })
      .then((body) => {
        /* Belt and braces: never render another destination's list. */
        if (!cancelled && body?.destinationId === destinationId) setPlaces(body.places ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  if (places.length === 0) return null;

  return (
    <section id="for-you" className="mt-10 scroll-mt-20 rounded-xl border border-border bg-surface p-5" aria-labelledby="for-you-heading">
      <h2 id="for-you-heading" className="flex items-center gap-2 font-display text-h3">
        <Sparkles className="size-5 text-primary" aria-hidden />
        Recommended for you in {destinationName}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {places.map((place) => (
          <li key={place.experience.id} className="rounded-lg border border-border/70 p-3">
            <Link href={place.experience.href} prefetch={false} className="inline-flex items-center gap-1 font-medium hover:text-primary">
              {place.experience.title}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            {/* Type only: for capsule destinations `area` holds the destination's
                scope line, not a neighbourhood, and repeated it on every card. */}
            <p className="text-caption text-subtle">{place.experience.typeLabel}</p>
            <p className="mt-1 text-small text-muted">{place.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
