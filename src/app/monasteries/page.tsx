import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { MonasteriesExplorer } from "@/components/monasteries/MonasteriesExplorer";
import { MONASTERY_TRADITIONS, monasteries } from "@/data/monasteries";

export const metadata: Metadata = {
  title: "Monasteries",
  description:
    "Explore Sikkim's living monasteries — 360° tours, audio guides, digital archives and festival calendars.",
};

export default function MonasteriesPage() {
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Living heritage
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Fifteen catalogued sites, one map
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          From Dubdi — the kingdom&apos;s first gompa — to the great courtyard at
          Lingdum. Fifteen catalogued sites, each record traced to a named
          source and mapped wherever an authoritative coordinate exists.
        </p>
        <h2 className="sr-only">Browse monasteries</h2>
        <div className="mt-10">
          <MonasteriesExplorer
            monasteries={monasteries}
            traditions={MONASTERY_TRADITIONS}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
