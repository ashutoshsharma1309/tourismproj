import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { PartnerApplyForm } from "@/components/partners/PartnerApplyForm";
import { hasDatabase } from "@/db";
import { listDestinations } from "@/lib/destinations/registry";

export const metadata: Metadata = {
  title: "List your property",
  description: "Apply to have a hotel, homestay or heritage property verified and shown on its TerraStory destination page.",
  robots: { index: false, follow: true },
};

export default function PartnerApplyPage() {
  const destinations = listDestinations().map((d) => ({
    id: d.id,
    name: d.name,
    region: d.region?.name ?? d.country.name,
  }));

  return (
    <>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          <Link href="/partner" className="hover:underline">Partner with TerraStory</Link> · Apply
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">List your property</h1>
        <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">
          Tell us about the property and how guests reach you. A reviewer verifies every request
          before anything is shown to travellers.
        </p>

        <div className="mt-10">
          {hasDatabase ? (
            <PartnerApplyForm destinations={destinations} />
          ) : (
            <p className="rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
              Partnership requests are not being accepted on this deployment yet. Write to the team
              through the contact on the About page, and we will open the form here.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
