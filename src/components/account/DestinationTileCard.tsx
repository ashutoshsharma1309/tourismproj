import { ArrowRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { DestinationTile } from "@/lib/account/views";
import { cn } from "@/lib/cn";
import { focalClassFor } from "@/lib/media/focal";

/** An image-led destination card for account pages. The image is the destination's own credited photograph. */
export function DestinationTileCard({
  tile,
  meta,
  cta = "Continue exploring",
  children,
  size = "md",
}: {
  tile: DestinationTile;
  meta?: string;
  cta?: string;
  children?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <article className={cn("tile flex h-full flex-col overflow-hidden", size === "lg" && "sm:flex-row")}>
      <div className={cn("relative aspect-16/10 shrink-0 bg-surface-muted", size === "lg" && "sm:aspect-auto sm:w-1/2")}>
        {tile.image ? (
          <Image
            src={tile.image}
            alt={tile.imageAlt}
            fill
            sizes={size === "lg" ? "(min-width: 640px) 40vw, 92vw" : "(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 92vw"}
            className={`object-cover ${focalClassFor(tile.image)}`}
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className={cn("font-display", size === "lg" ? "text-h2" : "text-h4")}>
          <Link href={tile.href} prefetch={false} className="hover:text-primary">
            {tile.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-caption text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {tile.location}
        </p>
        {meta ? <p className="mt-2 text-small text-muted">{meta}</p> : null}
        {children}
        <Link
          href={tile.href}
          prefetch={false}
          className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-small font-medium text-primary hover:underline"
          aria-label={`${cta}: ${tile.name}`}
        >
          {cta}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
