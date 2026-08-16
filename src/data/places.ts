import { img } from "@/data/images";
import { googleMapsSearchUrl } from "@/data/monasteries";
import type { Provenance } from "@/data/sources";
import type { Coordinates, SikkimDistrict } from "@/types";

/**
 * Heritage and natural sites beyond the monasteries (§29, §30).
 *
 * Every entry has a Wikipedia article and a coordinate published by that
 * article, both checked on 2026-08-14. Sites without one are not listed —
 * this file has no "coming soon" padding.
 */

export type PlaceCategory =
  | "Lake"
  | "Pass"
  | "Valley"
  | "Stupa"
  | "Museum"
  | "Heritage site";

export interface Place {
  slug: string;
  name: string;
  category: PlaceCategory;
  district: SikkimDistrict;
  coordinates: Coordinates;
  description: string;
  image: string;
  googleMapsUrl: string;
  wikipediaUrl: string;
  provenance: Provenance;
  /** Set when entry needs a permit — a documented fact, not an estimate. */
  permitNote?: string;
}

const WIKI = "https://en.wikipedia.org/wiki/";

function wikiProvenance(title: string): Provenance {
  return {
    sourceId: "wikipedia",
    sourceUrl: `${WIKI}${title}`,
    verifiedAt: "2026-08-14",
    confidence: "medium",
  };
}

interface Seed {
  slug: string;
  name: string;
  category: PlaceCategory;
  district: SikkimDistrict;
  lat: number;
  lng: number;
  wiki: string;
  imageKey: string;
  description: string;
  permitNote?: string;
}

const SEEDS: Seed[] = [
  {
    slug: "tsomgo-lake",
    name: "Tsomgo Lake",
    category: "Lake",
    district: "Gangtok",
    lat: 27.3753,
    lng: 88.7639,
    wiki: "Lake_Tsomgo",
    imageKey: "place/tsomgo",
    description:
      "A glacial lake on the Gangtok–Nathu La road, held sacred locally and frozen through the winter months.",
    permitNote: "Protected-area permit required; arranged through registered operators.",
  },
  {
    slug: "nathu-la",
    name: "Nathu La",
    category: "Pass",
    district: "Gangtok",
    lat: 27.3868,
    lng: 88.831,
    wiki: "Nathu_La",
    imageKey: "place/nathula",
    description:
      "A Himalayan pass on the India–China border, one of the historic trading routes into Tibet.",
    permitNote: "Permit required; Indian nationals only, and closed on some days of the week.",
  },
  {
    slug: "khecheopalri-lake",
    name: "Khecheopalri Lake",
    category: "Lake",
    district: "Gyalshing",
    lat: 27.35,
    lng: 88.1886,
    wiki: "Khecheopalri_Lake",
    imageKey: "place/khecheopalri",
    description:
      "A forest lake revered by both Buddhist and Lepcha communities, reached by a short walk through prayer-flag woods.",
  },
  {
    slug: "yumthang-valley",
    name: "Yumthang Valley",
    category: "Valley",
    district: "Mangan",
    lat: 27.8268,
    lng: 88.6959,
    wiki: "Yumthang_Valley_of_Flowers",
    imageKey: "hero/yumthang",
    description:
      "A high grazing valley north of Lachung, known for its rhododendron flowering and hot springs.",
    permitNote: "Protected-area permit required for North Sikkim.",
  },
  {
    slug: "gurudongmar-lake",
    name: "Gurudongmar Lake",
    category: "Lake",
    district: "Mangan",
    lat: 28.02,
    lng: 88.71,
    wiki: "Gurudongmar_Lake",
    imageKey: "hero/gurudongmar",
    description:
      "One of the highest lakes in the world, held sacred in Buddhist, Sikh and Hindu tradition.",
    permitNote: "Protected-area permit required; high altitude, acclimatisation advised.",
  },
  {
    slug: "do-drul-chorten",
    name: "Do-drul Chorten",
    category: "Stupa",
    district: "Gangtok",
    lat: 27.326,
    lng: 88.6108,
    wiki: "Do-drul_Chorten",
    imageKey: "arch/prayer-wheel",
    description:
      "A Gangtok stupa encircled by prayer wheels, built under the Nyingma master Trulshik Rinpoche.",
  },
  {
    slug: "namgyal-institute-of-tibetology",
    name: "Namgyal Institute of Tibetology",
    category: "Museum",
    district: "Gangtok",
    lat: 27.3159,
    lng: 88.6047,
    wiki: "Namgyal_Institute_of_Tibetology",
    imageKey: "arch/canon",
    description:
      "A research institute and museum holding one of the largest collections of Tibetan works outside Tibet.",
  },
  {
    slug: "rabdentse",
    name: "Rabdentse ruins",
    category: "Heritage site",
    district: "Gyalshing",
    lat: 27.3011,
    lng: 88.2539,
    wiki: "Rabdentse",
    imageKey: "mon/pemayangtse",
    description:
      "The second capital of the kingdom of Sikkim, now a ruin on a forested ridge below Pemayangtse.",
  },
  {
    slug: "buddha-park-ravangla",
    name: "Buddha Park, Ravangla",
    category: "Heritage site",
    district: "Namchi",
    lat: 27.3136,
    lng: 88.3636,
    wiki: "Buddha_Park_of_Ravangla",
    imageKey: "hero/buddha-park",
    description:
      "A park built around a large seated Buddha figure, opened to mark the 2550th birth anniversary of the Buddha.",
  },
];

export const places: Place[] = SEEDS.map((seed) => ({
  slug: seed.slug,
  name: seed.name,
  category: seed.category,
  district: seed.district,
  coordinates: { lat: seed.lat, lng: seed.lng },
  description: seed.description,
  image: img(seed.imageKey),
  googleMapsUrl: googleMapsSearchUrl(seed.name, seed.district),
  wikipediaUrl: `${WIKI}${seed.wiki}`,
  provenance: wikiProvenance(seed.wiki),
  ...(seed.permitNote ? { permitNote: seed.permitNote } : {}),
}));

export const PLACE_CATEGORIES: PlaceCategory[] = [
  "Lake",
  "Pass",
  "Valley",
  "Stupa",
  "Museum",
  "Heritage site",
];
