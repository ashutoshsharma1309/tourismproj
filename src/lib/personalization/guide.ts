import type { GuideBlock } from "@/lib/guide-respond";

/**
 * The guide's "what should I explore next?" answer for a signed-in traveller.
 *
 * FACTS STILL COME FROM RECORDS
 * -----------------------------
 * The traveller's context only CHOOSES which destinations or places to name;
 * every name, link and reason comes from /api/account/recommendations, which
 * builds them from TerraStory's own records and the traveller's stored
 * signals. The guide adds no sentence about the traveller that a stored
 * signal does not support, and the question text is never sent anywhere.
 */

/*
 * Deliberately narrow. "What should I see in Jaipur?" is a question about
 * Jaipur's records and the ordinary guide answers it; only questions about
 * what comes NEXT for this traveller, or asking for something FOR ME, are
 * personal.
 */
const NEXT_INTENT = [
  /\b(explore|visit|see|go|travel|do) next\b/,
  /\bwhat('s| is)? next\b/,
  /\bwhere (should|could) i (go|travel|head)( next)?\s*\??$/,
  /\b(recommend|suggest)\w*\b.*\bfor me\b/,
  /\bfor me\b.*\b(recommend|suggest)\w*\b/,
  /\bbased on my (interests|history|travels?)\b/,
];

export function isNextIntent(query: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();
  return NEXT_INTENT.some((pattern) => pattern.test(q));
}

interface DestinationRec {
  destinationId: string;
  name: string;
  reasons: string[];
}
interface PlaceRec {
  experience: { id: string; title: string; href: string; typeLabel: string };
  reason: string;
}
export interface RecommendationsBody {
  hasSignal: boolean;
  destinations?: DestinationRec[];
  places?: PlaceRec[];
}

export function personalBlocks(body: RecommendationsBody, destinationName: string | null): GuideBlock[] {
  if (!body.hasSignal) {
    return [
      { kind: "text", text: "I don't know your interests yet, so I won't guess." },
      { kind: "link", href: "/account/interests", label: "Choose your interests" },
    ];
  }
  const places = body.places ?? [];
  const destinations = body.destinations ?? [];
  if (destinationName && places.length > 0) {
    return [
      { kind: "text", text: `In ${destinationName}, not yet seen and matching your interests:` },
      {
        kind: "items",
        items: places.map((place) => ({ kind: "place", title: place.experience.title, meta: place.experience.typeLabel, blurb: place.reason, href: place.experience.href })),
      },
      { kind: "link", href: "/account", label: "More recommendations in your account" },
    ];
  }
  if (destinations.length === 0) {
    return [
      { kind: "text", text: "Nothing new matches what you've told me yet — you may have explored every destination that fits." },
      { kind: "link", href: "/account/interests", label: "Add an interest" },
    ];
  }
  return [
    { kind: "text", text: "Based on your interests and what you've explored:" },
    {
      kind: "items",
      items: destinations.map((recommendation) => ({
        kind: "destination",
        title: recommendation.name,
        meta: "Destination",
        blurb: recommendation.reasons.join(" "),
        href: `/destinations/${recommendation.destinationId}`,
      })),
    },
  ];
}
