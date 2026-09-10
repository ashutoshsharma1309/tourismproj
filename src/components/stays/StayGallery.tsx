"use client";

import { Expand } from "lucide-react";
import { useState } from "react";

import { ImageViewer } from "@/components/media/ImageViewer";
import type { StayImage } from "@/data/stay-images";

/**
 * A property's own photographs.
 *
 * Served from the property, not from here. These are the operators'
 * copyrighted promotional images and no licence was granted for them, so the
 * visitor's browser fetches each one from the hotel's own site and this
 * project keeps no copy — the same posture the culture films take with
 * YouTube. `next/image` is deliberately not used: its optimiser would fetch
 * and cache a copy on our server, which is exactly the copying being avoided.
 *
 * Because the files live on someone else's server, any of them can disappear
 * without notice. One that fails to load removes itself rather than leaving a
 * broken frame, and if they all fail the component renders nothing at all
 * instead of an empty gallery.
 */
export function StayGallery({
  images,
  propertyName,
}: {
  images: StayImage[];
  propertyName: string;
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);

  const live = images.filter((image) => !broken.has(image.id));
  if (live.length === 0) return null;

  const [lead, ...rest] = live;
  if (!lead) return null;

  const describe = (image: StayImage) =>
    image.alt?.trim() ? `${propertyName} — ${image.alt}` : `${propertyName}, photographed for ${image.source}`;

  const fail = (id: string) => setBroken((current) => new Set(current).add(id));

  return (
    <figure className="min-w-0">
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setOpen(0)}
          aria-label={`Open the ${live.length} photographs of ${propertyName}`}
          className="group relative col-span-full aspect-16/10 overflow-hidden rounded-xl border bg-surface-muted sm:col-span-2 sm:aspect-4/3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.url}
            alt={describe(lead)}
            onError={() => fail(lead.id)}
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <span className="glass-dark absolute right-3 bottom-3 flex h-9 items-center gap-2 rounded-full px-3 text-caption font-medium text-foreground-inverse">
            <Expand className="size-3.5" aria-hidden />
            {live.length} {live.length === 1 ? "photograph" : "photographs"}
          </span>
        </button>

        {rest.length > 0 ? (
          <ul className="col-span-full grid grid-cols-3 gap-2 sm:col-span-1 sm:grid-cols-1">
            {rest.slice(0, 3).map((image, index) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setOpen(index + 1)}
                  aria-label={
                    index === 2 && rest.length > 3
                      ? `View all ${live.length} photographs of ${propertyName}`
                      : `View photograph ${index + 2} of ${live.length} of ${propertyName}`
                  }
                  className="group relative block aspect-4/3 w-full overflow-hidden rounded-lg border bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={describe(image)}
                    loading="lazy"
                    onError={() => fail(image.id)}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  {index === 2 && rest.length > 3 ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-display text-h4 text-foreground-inverse">
                      +{rest.length - 3}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* The licence position, stated rather than implied. */}
      <figcaption className="mt-2.5 text-caption leading-relaxed text-subtle">
        {lead.license
          ? `Photograph © ${lead.attribution} · ${lead.license}`
          : `Photographs published by ${lead.attribution} on `}
        {lead.license ? null : (
          <a
            href={lead.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:no-underline"
          >
            their own website
          </a>
        )}
        {lead.license ? null : ", and shown from it. No copy is held by this archive."}
        {lead.archivedFrom
          ? ` This property's site is no longer online; these photographs are
             as it published them, recovered from the Internet Archive's
             capture of ${lead.archivedFrom}.`
          : null}
      </figcaption>

      {open !== null ? (
        <ImageViewer
          images={live.map((image) => ({
            src: image.url,
            alt: describe(image),
            width: image.width ?? undefined,
            height: image.height ?? undefined,
            caption: image.license
              ? `© ${image.attribution} · ${image.license} · ${image.source}`
              : `Published by ${image.attribution}${
                  image.archivedFrom
                    ? `, from the Internet Archive's capture of ${image.archivedFrom}`
                    : ` on ${new URL(image.sourceUrl).hostname}`
                }. Shown from source; no copy is held by this archive.`,
          }))}
          index={open}
          onIndexChange={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </figure>
  );
}
