import { TSD_FEE_PER_PERSON } from "@/lib/booking";
import { listDestinations } from "@/lib/destinations/registry";
import { hotels, REGISTER_STATS } from "@/data/hotels";
import { mappableMonasteries, monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { stories } from "@/data/stories";
import { audioGuides, BLOCKED_AUDIO_LANGUAGES } from "@/data/audio";

/**
 * The trip guide's knowledge base, built on the server.
 *
 * This follows the same rule as `search-index.ts`, for the same reason: the
 * guide is a client component mounted in the root layout, so anything it
 * imports statically rides along in the JavaScript of every route. It needs a
 * handful of short fields per record, not the 70-story prose corpus, so the
 * corpora stay here and only the fields cross.
 *
 * THE HARDER RULE THIS FILE EXISTS TO KEEP
 *
 * The guide answers in sentences, which makes it the easiest place in the
 * product to start inventing things. It does not compose any. Every string it
 * can say is either typed here against a record, or assembled by counting
 * records — and a count is a fact about the archive rather than a claim about
 * Sikkim. There is no model in the loop and no free text anywhere in the
 * response path.
 *
 * The consequence is that the guide is often unable to answer, and it says so
 * plainly. `openQuestions` below lists the things visitors will reasonably ask
 * that this archive genuinely cannot answer — opening hours, festival dates
 * for a given year, room rates, weather. Each one carries the reason. A guide
 * that says "I don't hold that, and here is why" is worth more than one that
 * guesses, and it is the only kind this project is allowed to ship.
 */

export interface GuideMonastery {
  slug: string;
  name: string;
  district: string;
  tradition: string;
  year: number;
  blurb: string;
  href: string;
  mapped: boolean;
  audioLanguages: number;
}

export interface GuidePlace {
  slug: string;
  name: string;
  district: string;
  category: string;
  group: string;
  blurb: string;
  href: string;
  permitNote: string | null;
  elevation: number | null;
}

export interface GuideStory {
  slug: string;
  title: string;
  category: string;
  communities: string[];
  claim: string;
  blurb: string;
  href: string;
}

export interface GuideStay {
  slug: string;
  name: string;
  district: string;
  /** Star category, only where the department records one. Null is normal. */
  category: string | null;
  address: string | null;
  href: string;
}

/** Something the archive genuinely cannot answer, and the reason why. */
export interface GuideGap {
  /** Words that signal the visitor is asking this. */
  triggers: string[];
  question: string;
  reason: string;
}

/**
 * A registered destination, for the guide's benefit.
 *
 * WHY THIS IS HERE
 * ----------------
 * The guide's corpus is Sikkim's — monasteries, places, stories, the stay
 * register — because that is the destination with an archive deep enough to
 * answer questions in prose. Meanwhile the floating "Ask the guide" launcher
 * appears on all fifteen, so asking it about Paris produced "I don't hold
 * anything on that" from a product whose Paris page holds thirteen catalogued
 * places.
 *
 * Carrying the registry lets the guide recognise any destination by name and
 * hand the reader to it. It does NOT pretend to answer in depth for the other
 * fourteen: it says which destination it can talk about, and points to the
 * rest rather than inventing an answer.
 */
export interface GuideDestination {
  id: string;
  name: string;
  country: string;
  href: string;
}

/**
 * A record from ANY destination, in the one shape the guide searches.
 *
 * WHY THIS EXISTS
 * ---------------
 * The typed sets below — monasteries, places, stories, stays — are Sikkim's,
 * and they carry Sikkim's fields: district, tradition, permit notes, licence
 * grades. That richness is why the guide can answer "monasteries in Pelling"
 * properly, and it is not reproducible for fourteen destinations that have no
 * districts or traditions catalogued.
 *
 * So every other destination gets this: a flat record with the four things any
 * answer needs — what it is, which destination owns it, one sentence about it,
 * and where to read more. It is enough to answer "what should I see in Jaipur
 * for architecture" from real catalogued records instead of routing the reader
 * away, and it cannot drift from the archive because it is built from the same
 * accessors the pages render from.
 */
export type GuideRecordKind =
  | "place"
  | "story"
  | "history"
  | "stay"
  | "food"
  | "festival"
  | "craft"
  | "experience";

export interface GuideRecord {
  destinationId: string;
  destinationName: string;
  /*
   * Food, festivals, crafts and experiences joined the original four kinds
   * when the guide learned to answer in a destination's own scope. Without
   * them "what do people eat in Kolkata" could only be answered by a story
   * that happened to mention food; with them it is answered by the dish
   * records the culture page renders from.
   */
  kind: GuideRecordKind;
  name: string;
  blurb: string;
  href: string;
  /** Interest themes, where the record carries them. */
  themes: string[];
  /** The record's own classification — "Temple", "Historic hotel", "legend". */
  category?: string;
  /** A season a source states for a festival, never a date. */
  season?: string;
}

export interface GuideIndex {
  destinations: GuideDestination[];
  /** Every destination's records, flat. Sikkim's included, for cross-search. */
  records: GuideRecord[];
  monasteries: GuideMonastery[];
  places: GuidePlace[];
  stories: GuideStory[];
  stays: GuideStay[];
  districts: string[];
  traditions: string[];
  storyCategories: string[];
  openQuestions: GuideGap[];
  facts: {
    tsdFee: number;
    audioLanguages: string[];
    blockedAudioLanguages: { label: string; blocker: string }[];
    monasteryCount: number;
    mappedMonasteryCount: number;
    placeCount: number;
    storyCount: number;
    stayCount: number;
    stayReportedTotal: number | null;
    stayWithCategory: number;
    staySourceUrl: string;
    permitPlaceCount: number;
  };
}

/**
 * Questions a visitor will ask that this archive does not hold.
 *
 * Each reason is the real one, not a shrug. "I don't know" invites the visitor
 * to assume the guide is broken; "no licensed feed publishes this, so nothing
 * here would be better than a guess" tells them something true about the
 * archive and points them somewhere useful.
 */
const OPEN_QUESTIONS: GuideGap[] = [
  {
    triggers: ["open", "opening", "hours", "timing", "timings", "close", "closing", "what time"],
    question: "opening hours",
    reason:
      "No monastery in this archive has sourced visiting hours. Gompas are working religious houses rather than ticketed sites, and their hours move with the ritual calendar — so the archive records none rather than publishing a guess. Ask locally, or check the monastery's own notice board on the day.",
  },
  {
    triggers: ["price", "prices", "rate", "rates", "tariff", "how much is the hotel", "room rate", "cost of hotel"],
    question: "room rates",
    reason:
      "Stays here are a directory, not a booking surface. There is no licensed rates feed behind this project, so no price, rating or review is shown for any property — only the name, the district and a map link.",
  },
  {
    triggers: ["weather", "temperature", "forecast", "rain", "snow", "climate", "how cold"],
    question: "weather and forecasts",
    reason:
      "This is a heritage archive, not a weather service. Nothing here is a live feed, so there is no forecast to give you.",
  },
  {
    triggers: ["date of", "when is losar", "when is saga", "what date", "this year", "2026", "2027", "exact date"],
    question: "a festival's date in a given year",
    reason:
      "Sikkim's festivals follow the Tibetan lunar calendar and move every year. The stories give each festival's lunar position and its usual Gregorian window, and deliberately name no date for a specific year — invented ones were removed from this project.",
  },
  {
    triggers: ["book", "booking", "reserve", "reservation", "ticket", "tickets", "buy"],
    question: "bookings",
    reason:
      "Nothing here is bookable. There is no booking integration and no payment path — the stays directory resolves each property to Google Maps so you can contact it yourself.",
  },
  {
    triggers: ["flight", "flights", "train", "airport", "railway", "how do i get to sikkim", "bagdogra", "njp"],
    question: "flights and trains",
    reason:
      "Transport schedules are not in this archive, and no licensed feed supplies them. The planner routes over real geography and keeps drive times sane, but it books nothing and quotes no fares.",
  },
];

export function buildGuideIndex(): Omit<GuideIndex, "records"> {
  const mapped = new Set(mappableMonasteries.map((m) => m.slug));
  const audioBySlug = new Map<string, number>();
  for (const guide of audioGuides) {
    audioBySlug.set(guide.monasterySlug, (audioBySlug.get(guide.monasterySlug) ?? 0) + 1);
  }

  /* The registry, so any destination name is recognisable. Four short fields. */
  const guideDestinations: GuideDestination[] = listDestinations().map((d) => ({
    id: d.id,
    name: d.name,
    country: d.country.name,
    href: `/destinations/${d.id}`,
  }));

  const guideMonasteries: GuideMonastery[] = monasteries.map((m) => ({
    slug: m.slug,
    name: m.name,
    district: m.district,
    tradition: m.tradition,
    year: m.establishedYear,
    blurb: m.description,
    href: `/destinations/sikkim/monasteries/${m.slug}`,
    mapped: mapped.has(m.slug),
    audioLanguages: audioBySlug.get(m.slug) ?? 0,
  }));

  const guidePlaces: GuidePlace[] = places.map((p) => ({
    slug: p.slug,
    name: p.name,
    district: p.district,
    category: p.category,
    group: p.group,
    blurb: p.description,
    href: `/destinations/sikkim/places/${p.slug}`,
    permitNote: p.permitNote ?? null,
    elevation: p.elevation ?? null,
  }));

  const guideStories: GuideStory[] = stories.map((s) => ({
    slug: s.slug,
    title: s.title,
    category: s.category,
    communities: [...s.communities],
    claim: s.claimType,
    blurb: s.summary,
    href: `/destinations/sikkim/stories/${s.slug}`,
  }));

  /*
   * The register is 905 published entries. The guide carries all of them
   * because "where can I stay in X district" is one of the questions it most
   * needs to answer, and four short fields per row cost far less than the
   * story corpus this file already keeps on the server.
   */
  const guideStays: GuideStay[] = hotels.map((h) => ({
    slug: h.slug,
    name: h.name,
    district: h.district,
    category: h.category,
    address: h.address,
    href: h.googleMapsUrl,
  }));

  /*
   * Language names come off the guide records themselves, never a map kept in
   * this file. A hand-written code→name table here claimed "Nepali, Bengali"
   * after the audio set had already moved to German, French and Spanish, and
   * printed raw codes for the ones it had never heard of — the guide told a
   * visitor it narrated in "English, Hindi, de, fr, es". The record carries
   * its own label; use it, and the next language added is right for free.
   */
  const languages: string[] = [];
  const seenLanguage = new Set<string>();
  for (const guide of audioGuides) {
    if (seenLanguage.has(guide.language)) continue;
    seenLanguage.add(guide.language);
    languages.push(guide.label);
  }

  return {
    destinations: guideDestinations,
    monasteries: guideMonasteries,
    places: guidePlaces,
    stories: guideStories,
    stays: guideStays,
    districts: [...new Set(guideMonasteries.map((m) => m.district))].sort(),
    traditions: [...new Set(guideMonasteries.map((m) => m.tradition))].sort(),
    storyCategories: [...new Set(guideStories.map((s) => s.category))],
    openQuestions: OPEN_QUESTIONS,
    facts: {
      tsdFee: TSD_FEE_PER_PERSON,
      audioLanguages: languages,
      blockedAudioLanguages: BLOCKED_AUDIO_LANGUAGES.map((l) => ({
        label: l.label,
        blocker: l.blocker,
      })),
      monasteryCount: guideMonasteries.length,
      mappedMonasteryCount: guideMonasteries.filter((m) => m.mapped).length,
      placeCount: guidePlaces.length,
      storyCount: guideStories.length,
      stayCount: guideStays.length,
      stayReportedTotal: REGISTER_STATS.reportedTotal,
      stayWithCategory: REGISTER_STATS.withCategory,
      staySourceUrl: REGISTER_STATS.sourceUrl,
      permitPlaceCount: guidePlaces.filter((p) => p.permitNote).length,
    },
  };
}
