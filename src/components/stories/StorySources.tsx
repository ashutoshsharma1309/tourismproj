import Link from "next/link";
import { ExternalLink, Landmark, Library, Newspaper, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { SourceType } from "@/data/sources";
import type { StorySource } from "@/data/stories";
import { formatDate } from "@/lib/format";

const SOURCE_ICON: Record<SourceType, typeof Landmark> = {
  government: Landmark,
  encyclopedia: Library,
  press: Newspaper,
  commons: Library,
  internal: ShieldCheck,
};

const SOURCE_LABEL: Record<SourceType, string> = {
  government: "Government",
  encyclopedia: "Reference",
  press: "Press",
  commons: "Wikimedia Commons",
  internal: "This archive",
};

/**
 * The sources block that closes every story.
 *
 * Not a "further reading" list. Each entry names the publication, links the
 * exact page, says what that page backs, and records the date it was read —
 * so a reader can check any sentence above it, and a curator can tell when a
 * claim last had eyes on it.
 */
export function StorySources({
  sources,
  lastVerified,
}: {
  sources: StorySource[];
  lastVerified: string;
}) {
  return (
    <section aria-labelledby="sources-heading" className="mt-12 rounded-xl border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sources-heading" className="font-display text-h3">
          Sources
        </h2>
        <span className="text-caption text-subtle">
          Last checked {formatDate(lastVerified)}
        </span>
      </div>

      <ul className="mt-5 flex flex-col divide-y">
        {sources.map((source) => {
          const Icon = SOURCE_ICON[source.type];
          return (
            <li key={`${source.url}-${source.name}`} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={source.type === "government" ? "success" : "neutral"}>
                  <Icon className="size-3" aria-hidden />
                  {SOURCE_LABEL[source.type]}
                </Badge>
                <span className="font-mono text-caption text-subtle">
                  read {formatDate(source.retrievedAt)}
                </span>
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-start gap-1.5 text-small font-medium text-primary hover:underline"
              >
                {source.name}
                <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              </a>

              {source.covers ? (
                <p className="mt-1.5 text-caption leading-relaxed text-muted">
                  <span className="font-medium text-subtle">Backs:</span> {source.covers}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 border-t pt-4 text-caption leading-relaxed text-subtle">
        Where a claim could not be traced to a source, this archive does not publish it. Where
        sources disagree, the story says so. If you can correct or extend anything here — a
        monastery&apos;s own record, a festival date, a photograph with a licence — the{" "}
        <Link href="/archive/contribute" className="text-primary hover:underline">
          contribution form
        </Link>{" "}
        is where it goes.
      </p>
    </section>
  );
}
