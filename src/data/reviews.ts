import generated from "@/data/generated/monastery-reviews.json";

/**
 * Visitor voices, produced by `npm run agent:reviews`.
 *
 * The brief this feature was built to asked for fifteen to twenty-five sourced
 * review snippets per monastery. That target cannot be met honestly here, and
 * the shortfall is stated rather than padded:
 *
 *   - Google Maps, TripAdvisor and the Indian OTA sites hold thousands of real
 *     reviews of these monasteries. Their terms forbid automated collection and
 *     the text is the reviewers' copyright. Taking it anyway would be the exact
 *     failure this archive exists to avoid.
 *   - The Google Places API is the sanctioned route to that data. It needs a
 *     key, which this build does not have. The agent's Places branch is written
 *     and tested; set GOOGLE_PLACES_API_KEY and real rated reviews appear.
 *   - What is available is Wikivoyage: traveller-written guide notes, licensed
 *     CC BY-SA 4.0 and quotable with attribution. Fourteen usable observations
 *     survived across six monasteries.
 *
 * So this file publishes what exists and says plainly what does not. No author
 * is invented, because Wikivoyage listings are unsigned. No rating is invented,
 * because no source here carries one. No sentiment percentage is invented,
 * because fourteen sentences cannot support one.
 */

export interface VisitorVoice {
  id: string;
  monasteryId: string;
  source: string;
  sourceLabel: string;
  sourceUrl: string;
  /** Null for every current source: Wikivoyage listings carry no byline. */
  authorName: string | null;
  /** Null unless a rated source (Places API) supplied one. */
  rating: number | null;
  reviewDate: string | null;
  excerpt: string;
  licence: string;
  retrievedAt: string;
}

/** A theme counted from the snippets actually collected — never estimated. */
export interface VoiceTheme {
  id: string;
  label: string;
  mentions: number;
}

export interface MonasteryVoices {
  voices: VisitorVoice[];
  themes: VoiceTheme[];
  /** Only ever non-null when a rated source supplied it. */
  averageRating: number | null;
  ratingCount: number | null;
}

const reviews = generated as Record<string, MonasteryVoices>;

export function getVoices(monasterySlug: string): MonasteryVoices | undefined {
  const entry = reviews[monasterySlug];
  return entry && entry.voices.length > 0 ? entry : undefined;
}

export const voicedMonasteryCount = Object.keys(reviews).length;

export const totalVoiceCount = Object.values(reviews).reduce((n, r) => n + r.voices.length, 0);
