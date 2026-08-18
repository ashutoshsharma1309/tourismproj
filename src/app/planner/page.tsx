import type { Metadata } from "next";
import Image from "next/image";

import { Footer } from "@/components/layout/Footer";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { img } from "@/data/images";

export const metadata: Metadata = {
  title: "Trip Planner",
  description:
    "Tell Ney Heritage your interests, budget and pace — get a day-by-day Sikkim heritage journey with real hotels and transparent costs.",
};

export default function PlannerPage() {
  return (
    <>
      <main id="main" className="pb-20">
        {/* Hero */}
        <div className="relative flex min-h-105 items-end overflow-hidden bg-surface-inverse">
          <Image
            src={img("place/tsomgo")}
            alt="Tsomgo Lake ringed by snow, East Sikkim"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="gradient-overlay absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-40 pb-10 md:px-6">
            <p className="font-mono text-eyebrow tracking-widest text-accent uppercase">
              Trip planner
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-h1 text-foreground-inverse text-glow">
              Plan your perfect Sikkim trip
            </h1>
            <p className="mt-3 max-w-xl text-body-lg text-foreground-inverse/85">
              Tell us your preferences — we&apos;ll craft the itinerary, pick the
              hotels, and show every rupee including TSD.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="-mt-6 md:-mt-8">
            <PlannerForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
