import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { VerificationChip } from "@/components/ui/VerificationChip";
import type { ArchiveItem } from "@/data/archive";

/**
 * An archive object as it appears in a grid.
 *
 * The licence and the verification state are on the card, not buried in the
 * detail page, because those are the two facts that decide how much weight a
 * visitor should give the object.
 */
export function ArchiveCard({
  item,
  priority = false,
}: {
  item: ArchiveItem;
  priority?: boolean;
}) {
  return (
    <article className="card-lift group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-soft">
      <div className="relative aspect-4/3 overflow-hidden bg-surface-muted">
        <Image
          src={item.mediaUrl}
          alt={item.title}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="media-zoom object-cover group-hover:scale-[1.04]"
        />
        {!item.sikkimSubject ? (
          <span className="glass-dark absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-caption font-medium text-foreground-inverse">
            Photographed outside Sikkim
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-mono text-caption tracking-wider text-accent-ink uppercase">
          {item.category}
        </p>
        <h3 className="font-display text-h4 text-balance-heading">
          <Link href={`/archive/${item.id}`} className="focus-visible:outline-none">
            <span className="absolute inset-0 z-10" aria-hidden />
            {item.title}
          </Link>
        </h3>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-caption text-subtle">
          {item.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              {item.location}
            </span>
          ) : null}
          {item.period ? <span>{item.period}</span> : null}
        </p>

        {item.summary ? (
          <p className="text-small leading-relaxed text-muted">{item.summary}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <VerificationChip status={item.verification} />
          {item.community ? <Badge tone="neutral">{item.community}</Badge> : null}
          <span className="ml-auto font-mono text-caption text-subtle">{item.license}</span>
        </div>
      </div>
    </article>
  );
}
