import { Check, ExternalLink, X } from "lucide-react";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/components/seo/JsonLd";
import { GUIDELINE_STATS, guidelineSections } from "@/data/responsible-tourism";

export const metadata: Metadata = {
  title: "Responsible travel in Sikkim",
  description:
    "How to visit Sikkim's monasteries, forests and communities without damaging them — 64 guidelines issued by the Tourism & Civil Aviation Department, Government of Sikkim.",
  alternates: { canonical: "/responsible" },
  openGraph: {
    title: "Responsible travel in Sikkim",
    description:
      "64 guidelines from the Tourism & Civil Aviation Department on visiting Sikkim's monasteries, forests and communities.",
    type: "article",
  },
};

/**
 * Responsible travel.
 *
 * The archive documented what to see and said nothing about how to be there,
 * which is a strange omission for a project whose argument is preservation —
 * visitor conduct is the mechanism by which a living monastery either survives
 * being visited or does not.
 */
export default function ResponsibleTravelPage() {
  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: "Responsible travel in Sikkim",
            description:
              "Guidance from the Tourism & Civil Aviation Department on visiting Sikkim's monasteries, forests and communities.",
            url: "/responsible",
            section: "Responsible tourism",
          }),
          breadcrumbSchema([{ name: "Responsible travel", url: "/responsible" }]),
        ]}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Discover · Experience · Preserve
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          How to be a guest in Sikkim
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          A monastery is a working religious community before it is a
          destination, and a cloud forest does not recover from being walked
          through carelessly. These are the {GUIDELINE_STATS.total} guidelines
          the state itself issues to visitors.
        </p>
        <p className="mt-4 max-w-2xl rounded-lg border border-dashed bg-surface-muted/50 p-4 text-caption leading-relaxed text-muted">
          Every line below is published by the{" "}
          <a
            href={GUIDELINE_STATS.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {GUIDELINE_STATS.sourceName}
            <ExternalLink className="size-3" aria-hidden />
          </a>
          , read on {GUIDELINE_STATS.retrievedAt}. Nothing here is Sikkim
          Darshan&apos;s own advice, and the tick or cross on each line is the
          department&apos;s, not ours.
        </p>

        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {guidelineSections.map((section) => (
            <section key={section.slug} aria-labelledby={section.slug}>
              <h2 id={section.slug} className="font-display text-h3 text-balance-heading">
                {section.heading}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {section.items.map((item) => {
                  const avoid = item.polarity === "avoid";
                  return (
                    <li key={item.text} className="flex items-start gap-2.5">
                      <span
                        className={
                          avoid
                            ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-error-soft text-error"
                            : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
                        }
                      >
                        {avoid ? (
                          <X className="size-3" aria-hidden />
                        ) : (
                          <Check className="size-3" aria-hidden />
                        )}
                      </span>
                      <span className="text-small leading-relaxed">
                        <span className="sr-only">{avoid ? "Do not: " : "Do: "}</span>
                        {item.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
