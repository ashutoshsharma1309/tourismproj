import { MapPin } from "lucide-react";

import { HeritagePanoramaViewer } from "@/components/immersive/HeritagePanoramaViewer";
import { YouTubeHeritagePlayer } from "@/components/immersive/YouTubeHeritagePlayer";
import { NotAvailable } from "@/components/ui/Provenance";
import { getPanorama } from "@/data/panoramas";
import { getVideo } from "@/data/videos";
import type { MonasteryDetails } from "@/types";

/**
 * The immersive experience for one monastery, and the honest ladder behind it.
 *
 *   1. A verified panoramic capture, if one exists and a person has looked at
 *      it and confirmed it shows this monastery.
 *   2. Otherwise a monastery-specific video, embedded here rather than linked
 *      away — and labelled as video, never dressed up as 360°.
 *   3. Otherwise a plain statement that neither exists, and a map link.
 *
 * Where a panorama exists the video is still offered underneath, because the
 * two show different things. Where it does not, the section says so in the
 * words the visitor needs rather than a "coming soon" badge.
 */
export function ExperienceSection({ monastery }: { monastery: MonasteryDetails }) {
  const panorama = getPanorama(monastery.slug);
  const video = getVideo(monastery.slug);

  const mapLink = (
    <a
      href={monastery.googleMapsUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border-strong px-6 text-small font-medium transition-colors hover:border-primary hover:text-primary"
    >
      <MapPin className="size-4" aria-hidden />
      View location on Google Maps
    </a>
  );

  return (
    <section aria-labelledby="experience-heading" className="mt-12 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="experience-heading" className="font-display text-h2">
          Experience {monastery.name}
        </h2>
        <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
          {panorama ? "Panorama + video" : video ? "Video" : "Not yet captured"}
        </p>
      </div>

      <div className="mt-5 grid min-w-0 gap-8">
        {panorama ? (
          <div className="min-w-0">
            <HeritagePanoramaViewer
              record={panorama}
              monasteryName={monastery.name}
              district={monastery.district}
              mapsUrl={monastery.googleMapsUrl}
            />
            {/* The distinction the rest of this project's honesty rests on. */}
            <p className="mt-3 rounded-lg border border-dashed bg-surface-muted/50 p-3 text-caption leading-relaxed text-muted">
              This is a wide panoramic photograph you can pan and zoom, not a full
              360° sphere. No 360° capture of any Sikkim monastery exists in the
              open-licensed record, and we would rather show you a real 180° than
              a fabricated 360°.
            </p>
          </div>
        ) : null}

        {video ? (
          <div className="min-w-0">
            {panorama ? (
              <h3 className="mb-3 font-display text-h3">Watch the monastery</h3>
            ) : null}
            <YouTubeHeritagePlayer
              video={video}
              monasteryName={monastery.name}
              label={panorama ? "Film" : "Immersive video"}
            />
            {panorama ? null : (
              <p className="mt-3 rounded-lg border border-dashed bg-surface-muted/50 p-3 text-caption leading-relaxed text-muted">
                No verified 360° or panoramic capture of {monastery.name} exists in
                the open-licensed record yet, so this is film rather than a
                panorama — and it is film shot at this monastery, not at a nearby
                one. The site stays on the digitisation roster.
              </p>
            )}
          </div>
        ) : null}

        {!panorama && !video ? (
          <NotAvailable
            title="Immersive experience not yet available"
            body={`No verified panoramic capture of ${monastery.name} exists in the open-licensed record, and no video was found that shows this monastery rather than the village that shares its name. Rather than show you somewhere else's prayer hall, this section stays empty until one does.`}
            action={mapLink}
          />
        ) : null}
      </div>
    </section>
  );
}
