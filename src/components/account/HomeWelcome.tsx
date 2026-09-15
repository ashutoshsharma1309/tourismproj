"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { clearSignedInHint, hasSignedInHint } from "@/lib/account/hint";

interface Me {
  name: string | null;
  recent: { destinationId: string; name: string }[];
}

/**
 * The homepage's one personal line, for a signed-in traveller only:
 * continue the destination they last explored, or open their account.
 * Renders nothing for visitors, so the prerendered homepage is unchanged for
 * everyone who has not signed in.
 */
export function HomeWelcome() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!hasSignedInHint()) return;
    let cancelled = false;
    fetch("/api/account/me", { credentials: "same-origin" })
      .then((response) => {
        if (response.status === 401) clearSignedInHint();
        return response.ok ? (response.json() as Promise<Me>) : null;
      })
      .then((body) => {
        if (!cancelled && body) setMe(body);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!me) return null;
  const first = me.name?.split(" ")[0];
  const latest = me.recent[0];

  return (
    <section aria-label="Your TerraStory" className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
        <p className="font-display text-h4">
          {latest ? `Welcome back${first ? `, ${first}` : ""}.` : `Welcome${first ? `, ${first}` : ""}.`}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-small font-medium">
          {latest ? (
            <Link href={`/destinations/${latest.destinationId}`} prefetch={false} className="inline-flex min-h-11 items-center gap-1.5 text-primary hover:underline">
              Continue exploring {latest.name}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
          <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center text-primary hover:underline">
            Your TerraStory
          </Link>
        </div>
      </div>
    </section>
  );
}
