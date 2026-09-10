import generated from "@/data/generated/monastery-videos.json";

/**
 * Monastery video records, produced by `npm run agent:video`.
 *
 * These stand in where no verified panoramic capture exists — which, after the
 * 360° search returned almost entirely negative, is nearly everywhere. A video
 * is not a 360° experience and the UI never says it is.
 *
 * Every record here cleared the same gate: YouTube's own oEmbed endpoint
 * confirmed the video is public and returned its real title and channel; the
 * thumbnail CDN confirmed the upload is HD; and the title names the monastery
 * *as a monastery*, not merely the village that shares its name. That last rule
 * is what stops a road-trip vlog about the Lachung valley being presented as
 * footage of Lachung Monastery.
 *
 * Playback happens in YouTube's own embedded player on youtube-nocookie.com.
 * Nothing is downloaded, re-encoded or re-hosted, the rights holder keeps their
 * analytics, and the visitor is never sent away to watch it.
 */

export interface MonasteryVideo {
  videoId: string;
  provider: "youtube";
  title: string;
  channel: string;
  channelUrl: string;
  thumbnail: string;
  sourceUrl: string;
  embedUrl: string;
  /** Coarse upload quality, inferred from which thumbnail renditions exist. */
  quality: string;
  score: number;
  usageNote: string;
  verifiedAt: string;
}

const videos = generated as Record<string, MonasteryVideo>;

export function getVideo(monasterySlug: string): MonasteryVideo | undefined {
  return videos[monasterySlug];
}

export const videoCount = Object.keys(videos).length;

/**
 * One video standing in for unrelated monasteries would be the video equivalent
 * of the reused-panorama failure. The data-quality agent checks this.
 */
export function duplicateVideos(): { videoId: string; monasteries: string[] }[] {
  const byId = new Map<string, string[]>();
  for (const [slug, video] of Object.entries(videos)) {
    byId.set(video.videoId, [...(byId.get(video.videoId) ?? []), slug]);
  }
  return [...byId.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([videoId, monasteries]) => ({ videoId, monasteries }));
}
