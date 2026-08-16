import { BookOpen, Camera, Check, Clock3, Headphones, Languages, MapPin, Minus, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { monasteries } from "@/data/monasteries";
import { STORY_CATEGORIES, stories } from "@/data/stories";
import { SOURCES } from "@/data/sources";
import { getTourismMetrics } from "@/lib/stats";
import { formatStatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Digital preservation",
  description:
    "What Ney Heritage has documented, what it has not, and where every claim comes from.",
};

/**
 * The preservation dashboard.
 *
 * It reports facts about our own archive — coverage, gaps and provenance —
 * which are things we can count exactly. It replaces the operator dashboards,
 * whose revenue, occupancy and remittance figures were invented.
 */
export default function PreservationPage() {
  const total = monasteries.length;
  const sourced = monasteries.filter((m) => m.provenance.confidence !== "unverified").length;
  const mapped = monasteries.filter((m) => m.coordinates).length;
  const toured = monasteries.filter((m) => m.tour.available).length;
  const narrated = monasteries.filter((m) => m.audio.available).length;
  const withHours = monasteries.filter((m) => m.visitingHours.status !== "unpublished").length;
  const withStory = monasteries.filter(
    (m) => stories.some((s) => s.relatedMonasteries.includes(m.slug)),
  ).length;
  const documented = stories.filter((s) => s.claimType === "documented history").length;

  const coverage = [
    { label: "Records with a cited source", done: sourced, icon: ShieldCheck },
    { label: "Sites with an authoritative coordinate", done: mapped, icon: MapPin },
    { label: "Sites with a verified 360° capture", done: toured, icon: Camera },
    { label: "Sites with a published audio guide", done: narrated, icon: Headphones },
    { label: "Sites with any reported visiting hours", done: withHours, icon: Clock3 },
    { label: "Sites appearing in a written story", done: withStory, icon: BookOpen },
  ];

  const metrics = getTourismMetrics();

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Digital preservation
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          What we have documented — and what we have not
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          A heritage archive is only as good as its provenance. This page reports
          the state of ours: what is sourced, what is mapped, what is still
          missing. The gaps are published on purpose.
        </p>

        {/* Coverage */}
        <section className="mt-12" aria-label="Archive coverage">
          <h2 className="font-display text-h2">Archive coverage</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {coverage.map((row) => {
              const pct = Math.round((row.done / total) * 100);
              return (
                <li key={row.label} className="rounded-xl border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-small font-medium">
                      <row.icon className="size-4 shrink-0 text-primary" aria-hidden />
                      {row.label}
                    </span>
                    <span data-numeric className="font-mono text-small text-subtle">
                      {row.done}/{total}
                    </span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="img"
                    aria-label={`${pct}% complete`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-caption text-subtle">
                    {row.done === 0
                      ? "Not started — nothing is shown in its place."
                      : `${pct}% of catalogued sites`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Capability vs. content — a built viewer is not a captured site. */}
        <section className="mt-14" aria-label="Capability versus content">
          <h2 className="font-display text-h2">Capability is not coverage</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            Having built a viewer is not the same as having something true to
            show in it. These are tracked separately on purpose.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                capability: "360° viewer",
                built: true,
                content: `${toured} of ${total} sites have a verified capture`,
                note: "No licensed 360° panorama of any Sikkim monastery was found, so the viewer ships unused rather than filled with a stand-in.",
              },
              {
                capability: "Story archive",
                built: true,
                content: `${stories.length} stories across ${STORY_CATEGORIES.length} categories`,
                note: `${documented} are documented history; the rest are labelled oral tradition or legend on the card and in the article, never presented as settled fact.`,
              },
              {
                capability: "Audio guide player",
                built: true,
                content: `${narrated} of ${total} sites have narration`,
                note: "Scripts are composed per language from verified facts; English, Hindi and Bengali have voices. Nepali, Assamese and Dzongkha do not.",
              },
            ].map((row) => (
              <li key={row.capability} className="rounded-xl border bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 text-small font-medium">
                    <Languages className="size-4 shrink-0 text-primary" aria-hidden />
                    {row.capability}
                  </span>
                  <Badge tone="success">built</Badge>
                </div>
                <p className="mt-2 text-small text-muted">{row.content}</p>
                <p className="mt-1.5 text-caption leading-relaxed text-subtle">{row.note}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Per-site register */}
        <section className="mt-14" aria-label="Site register">
          <h2 className="font-display text-h2">Site register</h2>
          <p className="mt-2 text-body text-muted">
            Every catalogued site and the state of its record.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-160 text-small">
              <thead>
                <tr className="border-b text-left text-caption text-muted">
                  <th scope="col" className="px-3 py-2.5 font-medium">Monastery</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">District</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Record</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Mapped</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">360°</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Audio</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {monasteries.map((m) => (
                  <tr key={m.slug} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/monasteries/${m.slug}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{m.district}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        tone={m.provenance.confidence === "unverified" ? "warning" : "success"}
                      >
                        {m.provenance.confidence === "unverified" ? "Unverified" : "Sourced"}
                      </Badge>
                    </td>
                    {[
                      Boolean(m.coordinates),
                      m.tour.available,
                      m.audio.available,
                      m.visitingHours.status !== "unpublished",
                    ].map(
                      (yes, i) => (
                        <td key={i} className="px-3 py-2.5">
                          {yes ? (
                            <Check className="size-4 text-success" aria-label="Yes" />
                          ) : (
                            <Minus className="size-4 text-subtle" aria-label="No" />
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verified statistics */}
        <section className="mt-14" aria-label="Verified statistics">
          <h2 className="font-display text-h2">Verified statistics</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <li key={metric.id} className="rounded-xl border bg-surface p-5">
                <p className="text-caption text-subtle">
                  {metric.label} · {metric.period}
                </p>
                <p data-numeric className="mt-2 font-display text-price">
                  {metric.value === null ? (
                    <span className="text-h4 text-muted">Data not available</span>
                  ) : (
                    formatStatNumber(metric.value)
                  )}
                </p>
                {metric.previousValue ? (
                  <p data-numeric className="mt-1 text-caption text-subtle">
                    {metric.previousPeriod}: {formatStatNumber(metric.previousValue)}
                  </p>
                ) : null}
                <p className="mt-3 text-caption leading-relaxed text-subtle">
                  {metric.provenance.caveat}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Sources */}
        <section className="mt-14" aria-label="Review queue">
          <h2 className="font-display text-h2">Discovery pipeline</h2>
          <p className="mt-2 max-w-2xl text-body text-muted">
            The Heritage Discovery Agent enumerates monastery articles, extracts
            each record with its source, and scores it on evidence. Candidates
            wait for a person before they reach the catalogue.
          </p>
          <Link
            href="/preservation/review"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Open the review queue
          </Link>
        </section>

        <section className="mt-14" aria-label="Source registry">
          <h2 className="font-display text-h2">Source registry</h2>
          <p className="mt-2 text-body text-muted">
            Every source this archive draws on, and exactly what may be cited from it.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {Object.values(SOURCES).map((source) => (
              <li key={source.id} className="rounded-xl border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-small font-medium text-primary hover:underline"
                  >
                    {source.name}
                  </a>
                  <Badge tone="neutral">{source.type}</Badge>
                </div>
                <p className="mt-1.5 text-caption leading-relaxed text-muted">{source.covers}</p>
                {source.notes ? (
                  <p className="mt-1 text-caption text-warning">{source.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
