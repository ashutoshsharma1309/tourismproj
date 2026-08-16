import { ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import discovered from "@/data/generated/monasteries.discovered.json";
import { monasteries } from "@/data/monasteries";

export const metadata: Metadata = {
  title: "Heritage review queue",
  description:
    "Monastery candidates found by the Heritage Discovery Agent, with the evidence behind each one, awaiting human review.",
};

interface Candidate {
  slug: string;
  name: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  establishedYear: number | null;
  tradition: string | null;
  historicalSummary: string;
  status: string;
  confidence: number;
  isNew: boolean;
  image: { url: string; license: string | null; author: string | null; descriptionUrl: string } | null;
  sources: { name: string; url: string; retrievedAt: string }[];
}

const TONE: Record<string, "success" | "warning" | "neutral"> = {
  VERIFIED: "success",
  PARTIALLY_VERIFIED: "warning",
  NEEDS_REVIEW: "neutral",
};

/**
 * The review queue (§16). The agent proposes; a person disposes. Nothing here
 * reaches the public catalogue until someone approves it, which is the
 * difference between an agentic pipeline and an automated rumour mill.
 */
export default function ReviewQueuePage() {
  const candidates = (discovered as Candidate[]).filter((c) => c.isNew);
  const published = new Set(monasteries.map((m) => m.slug));

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          Heritage review queue
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-h1 text-balance-heading">
          {candidates.length} candidates awaiting review
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted">
          The Heritage Discovery Agent found these sites by enumerating a
          curated encyclopedia category, then pulled each record&apos;s prose,
          coordinate and licensed image from the article itself. None of it is
          published until a person approves it — the agent has no write access
          to the public catalogue.
        </p>
        <p className="mt-4 text-small text-muted">
          Currently published: <strong>{published.size}</strong> sites ·
          Run again with <code className="font-mono text-caption">npm run agent:discover</code>
        </p>

        <ul className="mt-10 flex flex-col gap-5">
          {candidates.map((c) => (
            <li key={c.slug} className="rounded-xl border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-h3">{c.name}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-muted">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden />
                      {c.district ?? "District not stated"}
                    </span>
                    <span>
                      {c.latitude !== null
                        ? `${c.latitude.toFixed(4)}, ${c.longitude!.toFixed(4)}`
                        : "No coordinate"}
                    </span>
                    <span>{c.tradition ?? "Lineage not stated"}</span>
                    <span>{c.establishedYear ?? "Year not stated"}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Badge tone={TONE[c.status] ?? "neutral"}>{c.status.replace(/_/g, " ")}</Badge>
                  <Badge tone="neutral">confidence {c.confidence.toFixed(2)}</Badge>
                </div>
              </div>

              <p className="mt-3 text-small leading-relaxed text-muted">
                {c.historicalSummary.slice(0, 320)}
                {c.historicalSummary.length > 320 ? "…" : ""}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption">
                {c.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {s.name} <ExternalLink className="size-3" aria-hidden />
                  </a>
                ))}
                {c.image ? (
                  <a
                    href={c.image.descriptionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Image · {c.image.license ?? "licence unstated"}{" "}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  <span className="text-subtle">No licensed image found</span>
                )}
                <span className="text-subtle">360°: none found</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
