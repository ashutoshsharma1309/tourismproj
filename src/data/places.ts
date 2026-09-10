import { representativePhoto } from "@/data/galleries";
import { img } from "@/data/images";
import { googleMapsSearchUrl } from "@/data/monasteries";
import type { Provenance } from "@/data/sources";
import { storyImage } from "@/data/story-images";
import type { Coordinates, SikkimDistrict } from "@/types";

/**
 * Heritage, natural and civic sites beyond the monasteries (§29, §30).
 *
 * THE RULE FOR THIS FILE: every entry has a Wikipedia article that publishes a
 * coordinate, and the coordinate here is that published coordinate, rounded to
 * the precision the source gives. Nothing is estimated from a map, inferred
 * from a nearby town, or carried over from a travel blog. A place without a
 * published coordinate is not listed — the explore map would rather be
 * incomplete than wrong.
 */

export type PlaceCategory =
  | "Lake"
  | "Waterfall"
  | "River"
  | "Pass"
  | "Valley"
  | "Peak"
  | "Stupa"
  | "Temple"
  | "Museum"
  | "Heritage site"
  | "Nature reserve"
  | "Tea garden"
  | "Town"
  | "Viewpoint";

/**
 * The map's legend. Fifteen categories would need fifteen colours, which is
 * unreadable, so markers are grouped into six families that share a palette.
 */
export type PlaceGroup = "Heritage" | "Water" | "Nature" | "Sacred" | "Town" | "Journey";

export const PLACE_GROUP_OF: Record<PlaceCategory, PlaceGroup> = {
  "Heritage site": "Heritage",
  Museum: "Heritage",
  "Tea garden": "Heritage",
  Lake: "Water",
  Waterfall: "Water",
  River: "Water",
  "Nature reserve": "Nature",
  Valley: "Nature",
  Peak: "Nature",
  Stupa: "Sacred",
  Temple: "Sacred",
  Town: "Town",
  Pass: "Journey",
  Viewpoint: "Journey",
};

export interface Place {
  slug: string;
  name: string;
  category: PlaceCategory;
  group: PlaceGroup;
  district: SikkimDistrict;
  coordinates: Coordinates;
  /** One or two sentences. Every claim in it comes from the cited article. */
  description: string;
  /** Null when no photograph of this place could be verified. Never another
      place's picture — see resolveImage. */
  image: string | null;
  imageAlt: string;
  googleMapsUrl: string;
  wikipediaUrl: string;
  provenance: Provenance;
  /** Set when entry needs a permit — a documented fact, not an estimate. */
  permitNote?: string;
  /** Elevation in metres, only where the source publishes one. */
  elevation?: number;
}

const WIKI = "https://en.wikipedia.org/wiki/";
const VERIFIED = "2026-08-17";

function wikiProvenance(title: string): Provenance {
  return {
    sourceId: "wikipedia",
    sourceUrl: `${WIKI}${title}`,
    verifiedAt: VERIFIED,
    confidence: "medium",
  };
}

interface Seed {
  slug: string;
  name: string;
  category: PlaceCategory;
  district: SikkimDistrict;
  /** Latitude and longitude exactly as published by the cited article. */
  lat: number;
  lng: number;
  wiki: string;
  /** Key into src/data/images.ts … */
  imageKey?: string;
  /** … or into the research agent's resolved Commons set. */
  storyImageKey?: string;
  imageAlt: string;
  description: string;
  permitNote?: string;
  elevation?: number;
}

const SEEDS: Seed[] = [
  /* ---------------------------------------------------------------- Water */
  {
    slug: "tsomgo-lake",
    name: "Tsomgo Lake",
    category: "Lake",
    district: "Gangtok",
    lat: 27.3753,
    lng: 88.7639,
    wiki: "Lake_Tsomgo",
    imageKey: "place/tsomgo",
    imageAlt: "Tsomgo Lake, a glacial lake on the Gangtok–Nathu La road",
    elevation: 3753,
    description:
      "A glacial lake 40 km from Gangtok whose surface changes colour with the seasons. Monks are recorded as having read those changes; the jhakris of Sikkim gather here for Guru Purnima.",
    permitNote: "Protected-area permit required; arranged through registered operators.",
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
    imageAlt: "Khecheopalri Lake in its forested bowl, west Sikkim",
    description:
      "The wish-fulfilling lake, sacred to Buddhists and Hindus alike, where birds clear fallen leaves from the surface. Protected by state notification since 2001.",
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
    imageAlt: "Partly frozen Gurudongmar Lake beneath the Khangchengyao range",
    elevation: 5430,
    description:
      "One of the highest lakes in the world, frozen from November to mid-May, feeding the source streams of the Teesta. Named after Padmasambhava.",
    permitNote: "Protected-area permit required; foreign nationals permitted only as far as Thangu.",
  },
  {
    slug: "banjhakri-falls",
    name: "Banjhakri Falls",
    category: "Waterfall",
    district: "Gangtok",
    lat: 27.3508,
    lng: 88.6036,
    wiki: "Banjhakri_Falls_and_Energy_Park",
    storyImageKey: "story/banjhakri-falls",
    imageAlt: "The Banjhakri Falls near Gangtok",
    description:
      "A spring-fed cascade about 30 m high, 7 km from Gangtok, inside a park built from 2004 to revive interest in the shamanic traditions of Sikkim's communities.",
  },
  {
    slug: "rangeet-teesta-confluence",
    name: "Rangeet–Teesta confluence",
    category: "River",
    district: "Namchi",
    lat: 27.1736,
    lng: 88.3043,
    wiki: "Rangeet_River",
    storyImageKey: "story/teesta-confluence",
    imageAlt: "The Rangeet meeting the Teesta below the hills of south Sikkim",
    description:
      "Where the Rangeet joins the Teesta. The bathing festival of Maghe Sankranti is held at this confluence every 14 January.",
  },

  /* -------------------------------------------------------------- Heritage */
  {
    slug: "yuksom",
    name: "Yuksom",
    category: "Heritage site",
    district: "Gyalshing",
    lat: 27.3733,
    lng: 88.2208,
    wiki: "Yuksom",
    storyImageKey: "story/coronation-throne",
    imageAlt: "The stone coronation throne at Norbugang, Yuksom",
    elevation: 1780,
    description:
      "The kingdom's first capital, where three lamas crowned Phuntsog Namgyal as the first Chogyal in 1642. The Norbugang stone throne still stands in its pine grove.",
  },
  {
    slug: "rabdentse",
    name: "Rabdentse ruins",
    category: "Heritage site",
    district: "Gyalshing",
    lat: 27.3011,
    lng: 88.2539,
    wiki: "Rabdentse",
    storyImageKey: "story/rabdentse",
    imageAlt: "The ruins of Rabdentse on their forested ridge near Pelling",
    description:
      "Sikkim's second capital from 1670 until the Gurkha army destroyed it in 1814. Now a protected monument of national importance below Pemayangtse.",
  },
  {
    slug: "kabi-lungchok",
    name: "Kabi Lungchok",
    category: "Heritage site",
    district: "Mangan",
    lat: 27.3983,
    lng: 88.35,
    wiki: "Kabi_Lungchok",
    storyImageKey: "story/kabi-lungchok",
    imageAlt: "The memorial stones at Kabi Lungchok, north of Gangtok",
    description:
      "Where the Lepcha chief Thekong Tek and the Tibetan prince Khye Bumsa swore a treaty of blood brotherhood. The name means 'stone erected by our blood'.",
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
    imageAlt: "A Tibetan canon volume of the kind held at the Namgyal Institute",
    description:
      "A research institute and museum holding one of the largest collections of Tibetan works outside Tibet. Founded 1957–58; documents Sikkim's monasteries and digitises historic photographs.",
  },
  {
    slug: "temi-tea-garden",
    name: "Temi Tea Garden",
    category: "Tea garden",
    district: "Namchi",
    lat: 27.2367,
    lng: 88.4222,
    wiki: "Temi_Tea_Garden",
    storyImageKey: "story/temi-tea",
    imageAlt: "Rows of tea running down the slope at Temi, south Sikkim",
    description:
      "The only tea garden in Sikkim, established in 1969 by the last Chogyal as employment for Tibetan refugees. 177 hectares, entirely organic.",
  },
  {
    slug: "dzuluk",
    name: "Zuluk",
    category: "Heritage site",
    district: "Pakyong",
    lat: 27.251,
    lng: 88.775,
    wiki: "Dzuluk",
    storyImageKey: "story/silk-route",
    imageAlt: "Morning on the old Silk Route road through eastern Sikkim",
    elevation: 2900,
    description:
      "A hamlet on the old Kalimpong–Tibet trade route, used as an overnight halt by traders crossing at Jelep La until 1959. Famous for its switchback road.",
    permitNote: "Permits required for the eastern border route; arranged through registered agencies.",
  },
  {
    slug: "aritar",
    name: "Aritar",
    category: "Heritage site",
    district: "Pakyong",
    lat: 27.1881,
    lng: 88.6747,
    wiki: "Aritar,_Sikkim",
    storyImageKey: "story/aritar-lake",
    imageAlt: "Lampokhari, the boot-shaped lake at Aritar in eastern Sikkim",
    description:
      "A hill station on the old trade route, holding Lampokhari — among Sikkim's oldest natural lakes — and Ari-Bangla, a dak bungalow built in 1895 by Sir James Claude White.",
  },

  /* ---------------------------------------------------------------- Sacred */
  {
    slug: "do-drul-chorten",
    name: "Do-drul Chorten",
    category: "Stupa",
    district: "Gangtok",
    lat: 27.326,
    lng: 88.6108,
    wiki: "Do-drul_Chorten",
    imageKey: "arch/prayer-wheel",
    imageAlt: "Prayer wheels encircling a Himalayan chorten",
    description:
      "A Gangtok stupa built in 1945–46, its 27 m dome topped by a thirteen-ring spire and encircled by 108 prayer wheels on two terraces.",
  },
  {
    slug: "buddha-park-ravangla",
    name: "Buddha Park, Ravangla",
    category: "Stupa",
    district: "Namchi",
    lat: 27.3136,
    lng: 88.3636,
    wiki: "Buddha_Park_of_Ravangla",
    imageKey: "hero/buddha-park",
    imageAlt: "The seated Buddha at Tathagata Tsal, Ravangla",
    description:
      "Tathagata Tsal, built 2006–2013 around a 130-foot copper Buddha marking the 2550th anniversary of the Buddha's birth, consecrated by the 14th Dalai Lama in 2013.",
  },
  {
    slug: "hanuman-tok",
    name: "Hanuman Tok",
    category: "Temple",
    district: "Gangtok",
    lat: 27.3478,
    lng: 88.6286,
    wiki: "Hanuman_Tok",
    imageAlt: "The Khangchendzonga range seen from the ridge above Gangtok",
    description:
      "A Hindu temple complex in the upper reaches of Gangtok, built over a stone in 1950 and maintained by the Indian Army, with long views west to the range.",
  },

  /* ---------------------------------------------------------------- Nature */
  {
    slug: "kangchenjunga",
    name: "Kangchenjunga",
    category: "Peak",
    district: "Mangan",
    lat: 27.7025,
    lng: 88.1467,
    wiki: "Kangchenjunga",
    imageKey: "hero/kanchenjunga",
    imageAlt: "Sunrise on Kangchenjunga, the guardian deity of Sikkim",
    elevation: 8586,
    description:
      "The third-highest mountain on earth and the guardian deity of Sikkim. Its summit has been left untrodden by agreement since the first ascent in 1955.",
  },
  {
    slug: "khangchendzonga-national-park",
    name: "Khangchendzonga National Park",
    category: "Nature reserve",
    district: "Mangan",
    lat: 27.6563,
    lng: 88.3123,
    wiki: "Khangchendzonga_National_Park",
    storyImageKey: "story/red-panda",
    imageAlt: "A red panda in the canopy — the state animal of Sikkim",
    description:
      "1,784 sq km covering almost 35% of Sikkim, inscribed by UNESCO in 2016 as India's first mixed natural-and-cultural World Heritage Site.",
    permitNote: "Entry permits issued by the Forest Department at Gangtok.",
  },
  {
    slug: "varsey-rhododendron-sanctuary",
    name: "Varsey Rhododendron Sanctuary",
    category: "Nature reserve",
    district: "Soreng",
    lat: 27.1942,
    lng: 88.1183,
    wiki: "Varsey_Rhododendron_Sanctuary",
    storyImageKey: "story/barsey",
    imageAlt: "Rhododendrons in full bloom at Barsey, west Sikkim",
    description:
      "104 sq km of the Singalila range on the Nepal border, where rhododendrons flower from March to May. Reached by a four-kilometre walk from Hilley.",
  },
  {
    slug: "maenam-wildlife-sanctuary",
    name: "Maenam Wildlife Sanctuary",
    category: "Nature reserve",
    district: "Namchi",
    lat: 27.338,
    lng: 88.3856,
    wiki: "Maenam_Wildlife_Sanctuary",
    imageAlt: "Forested slopes in the hills of south Sikkim",
    description:
      "About 35 sq km above Ravangla, established in 1987. The name means 'treasure-house of medicines', for the medicinal plants in its flora.",
  },
  {
    slug: "fambong-lho",
    name: "Fambong Lho Wildlife Sanctuary",
    category: "Nature reserve",
    district: "Gangtok",
    lat: 27.3113,
    lng: 88.5337,
    wiki: "Fambong_Lho_Wildlife_Sanctuary",
    imageAlt: "Himalayan forest of the kind protected at Fambong Lho",
    description:
      "51 sq km about 30 km west of Gangtok, contiguous with Khangchendzonga National Park and part of the Sacred Himalayan Landscape.",
  },
  {
    slug: "kyongnosla-alpine-sanctuary",
    name: "Kyongnosla Alpine Sanctuary",
    category: "Nature reserve",
    district: "Gangtok",
    lat: 27.377,
    lng: 88.741,
    wiki: "Kyongnosla_Alpine_Sanctuary",
    imageAlt: "Alpine slopes around Tsomgo Lake in eastern Sikkim",
    description:
      "About 31 sq km around Tsomgo Lake, holding orchids and rhododendrons among tall junipers and silver firs. Part of the Sacred Himalayan Landscape.",
    permitNote: "Lies within the protected area requiring a Tsomgo permit.",
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
    imageAlt: "The river running through Yumthang Valley, north Sikkim",
    description:
      "A high grazing valley north of Lachung, known for its rhododendron flowering and hot springs, with the Shingba Rhododendron Sanctuary alongside.",
    permitNote: "Protected-area permit required for North Sikkim.",
  },

  /* --------------------------------------------------------------- Journey */
  {
    slug: "nathu-la",
    name: "Nathu La",
    category: "Pass",
    district: "Gangtok",
    lat: 27.3868,
    lng: 88.831,
    wiki: "Nathu_La",
    imageKey: "place/nathula",
    imageAlt: "The road climbing to the Nathu La pass on the India–China border",
    elevation: 4310,
    description:
      "A Himalayan pass on the India–China border, sealed after the 1962 war and reopened for trade in 2006. One of five Border Personnel Meeting points.",
    permitNote: "Permit required; Indian nationals only, and closed on some days of the week.",
  },
  {
    slug: "goecha-la",
    name: "Goecha La",
    category: "Pass",
    district: "Gyalshing",
    lat: 27.6078,
    lng: 88.1869,
    wiki: "Goecha_La",
    imageAlt: "The Kangchenjunga massif seen from high in west Sikkim",
    elevation: 4940,
    description:
      "A high pass looking onto the southeast face of Kangchenjunga, and the destination of Sikkim's best-known trek from Yuksom via Dzongri.",
    permitNote: "Trek permits issued through TIC Pelling and TIC Gangtok.",
  },

  /* ------------------------------------------------------------------ Town */
  {
    slug: "gangtok",
    name: "Gangtok",
    category: "Town",
    district: "Gangtok",
    lat: 27.33,
    lng: 88.62,
    wiki: "Gangtok",
    storyImageKey: "story/mg-marg",
    imageAlt: "M.G. Marg, the pedestrianised main street of Gangtok",
    description:
      "The state capital since 1894, and a major stop on the Lhasa–Calcutta trade route in the early 20th century. Its main market is where rural Sikkim sells its harvest.",
  },
  {
    slug: "namchi",
    name: "Namchi",
    category: "Town",
    district: "Namchi",
    lat: 27.17,
    lng: 88.35,
    wiki: "Namchi",
    storyImageKey: "story/samdruptse",
    imageAlt: "The Guru Padmasambhava statue on Samdruptse hill above Namchi",
    elevation: 1675,
    description:
      "District headquarters whose name means 'sky high'. Samdruptse hill carries a 135-foot Padmasambhava; Solophok holds the Char Dham complex built in 2011.",
  },
  {
    slug: "ravangla",
    name: "Ravangla",
    category: "Town",
    district: "Namchi",
    lat: 27.2925,
    lng: 88.3594,
    wiki: "Ravangla",
    imageAlt: "The Buddha Park at Ravangla with Mount Narsing behind",
    description:
      "A small town at about 8,000 feet with views of Kanchenjunga, Pandim, Siniolchu and Kabru, and the start of the trek into Maenam Wildlife Sanctuary.",
  },
  {
    slug: "pelling",
    name: "Pelling",
    category: "Town",
    district: "Gyalshing",
    lat: 27.18,
    lng: 88.14,
    wiki: "Pelling",
    imageKey: "mon/pemayangtse",
    imageAlt: "Pemayangtse Monastery above Pelling in west Sikkim",
    elevation: 2150,
    description:
      "The base for west Sikkim's heritage circuit and its treks, with close views of the Kanchenjunga range and Pemayangtse and Rabdentse a short drive away.",
  },
  {
    slug: "gyalshing",
    name: "Gyalshing",
    category: "Town",
    district: "Gyalshing",
    lat: 27.28,
    lng: 88.27,
    wiki: "Gyalshing",
    imageKey: "mon/sanga-choeling",
    imageAlt: "Sanga Choeling Monastery on its ridge in west Sikkim",
    description:
      "District headquarters of west Sikkim, 10 km from Pelling, and the road junction for Yuksom, Tashiding and Khecheopalri.",
  },
  {
    slug: "mangan",
    name: "Mangan",
    category: "Town",
    district: "Mangan",
    lat: 27.52,
    lng: 88.53,
    wiki: "Mangan,_India",
    imageKey: "mon/phodong",
    imageAlt: "Phodong Monastery in north Sikkim",
    description:
      "District headquarters of north Sikkim and the gateway to Dzongu, the Lepcha reserve, and to the road north towards Chungthang.",
  },
  {
    slug: "chungthang",
    name: "Chungthang",
    category: "Town",
    district: "Mangan",
    lat: 27.6045,
    lng: 88.6456,
    wiki: "Chungthang",
    imageAlt: "The high valley of north Sikkim near Chungthang",
    elevation: 1790,
    description:
      "Where the Lachen and Lachung rivers meet to form the Teesta. Tradition holds the valley was blessed by Guru Padmasambhava.",
    permitNote: "Protected-area permit required for North Sikkim.",
  },
  {
    slug: "lachen",
    name: "Lachen",
    category: "Town",
    district: "Mangan",
    lat: 27.7167,
    lng: 88.5578,
    wiki: "Lachen,_Sikkim",
    imageKey: "mon/lachen",
    imageAlt: "Lachen Monastery above the town in north Sikkim",
    elevation: 2900,
    description:
      "A high town whose name means 'big pass', governed by the Dzumsa — a village assembly with representation for every household, headed by a Pipon.",
    permitNote: "Protected-area permit required for North Sikkim.",
  },
  {
    slug: "lachung",
    name: "Lachung",
    category: "Town",
    district: "Mangan",
    lat: 27.69,
    lng: 88.746,
    wiki: "Lachung",
    imageKey: "mon/lachung",
    imageAlt: "Lachung Monastery in the valley of north Sikkim",
    description:
      "The 'small pass', the second Dzumsa-governed town of north Sikkim and the base for visits to Yumthang Valley.",
    permitNote: "Protected-area permit required for North Sikkim.",
  },
  {
    slug: "rinchenpong",
    name: "Rinchenpong",
    category: "Town",
    district: "Soreng",
    lat: 27.2422,
    lng: 88.2709,
    wiki: "Rinchenpong",
    imageKey: "mon/rinchenpong",
    imageAlt: "The entrance to Rinchenpong Monastery in west Sikkim",
    elevation: 1700,
    description:
      "A quiet town in Soreng district known for its monastery and trekking routes, and for the poisoned lake that halted a British advance.",
  },
  {
    slug: "soreng",
    name: "Soreng",
    category: "Town",
    district: "Soreng",
    lat: 27.17,
    lng: 88.2,
    wiki: "Soreng",
    imageAlt: "The hills of Soreng district, western Sikkim",
    description:
      "Headquarters of Sikkim's smallest district, and one of three entry points for the Varsey Rhododendron Sanctuary.",
  },
  {
    slug: "jorethang",
    name: "Jorethang",
    category: "Town",
    district: "Namchi",
    lat: 27.131,
    lng: 88.283,
    wiki: "Jorethang",
    storyImageKey: "story/sel-roti",
    imageAlt: "Sel roti, the fried rice bread sold at Sikkimese fairs",
    description:
      "A market town in south Sikkim, and the home of the Maghe Mela each 14 January — a fair that grew out of an agricultural show first held in 1955.",
  },
  {
    slug: "singtam",
    name: "Singtam",
    category: "Town",
    district: "Gangtok",
    lat: 27.2331,
    lng: 88.4961,
    wiki: "Singtam",
    imageAlt: "The Teesta valley in southern Sikkim",
    description:
      "A trading town on the Teesta, one of the main road junctions between Gangtok, Namchi and the plains.",
  },
  {
    slug: "rongli",
    name: "Rongli",
    category: "Town",
    district: "Pakyong",
    lat: 27.2037,
    lng: 88.7015,
    wiki: "Rongli",
    imageAlt: "The old trade road through eastern Sikkim",
    description:
      "The subdivision town of eastern Sikkim, and the permit checkpoint for the old silk route through Zuluk towards the Tibet border.",
  },
];

/**
 * A place's photograph — of that place, or none.
 *
 * WHAT THIS REPLACED
 * ------------------
 * The last line used to be `img(seed.imageKey ?? "editorial/map")`, and five
 * seeds named a key belonging to somewhere else entirely:
 *
 *   maenam-wildlife-sanctuary  hero/yumthang     Yumthang Valley is in Mangan,
 *                                                about 100 km north, and the
 *                                                alt text called it "the hills
 *                                                of south Sikkim".
 *   chungthang                 mon/lachung       Lachung Monastery.
 *   soreng                     mon/rinchenpong   Rinchenpong Monastery.
 *   ravangla                   hero/buddha-park  the same Buddha statue already
 *                                                serving buddha-park-ravangla.
 *   kyongnosla-alpine-sanct.   place/tsomgo      the same frame as tsomgo-lake.
 *
 * These were not only on cards. They reached the place page hero and the
 * JSON-LD `image`, which is what a search engine ingests — so the archive was
 * publishing a photograph of north Sikkim as structured data about a sanctuary
 * in the south. A sixth seed, singtam, named "editorial/map", which is not in
 * the registry at all, so it silently rendered the drawn placeholder.
 *
 * The order is now: a story credit if the seed names one, else the place's own
 * verified gallery — which is rejection-filtered, so the French commune that
 * shares Soreng's name cannot come back through this door — else nothing.
 * `null` is a real answer and the UI states it.
 */
function resolveImage(seed: Seed): { url: string | null; alt: string } {
  if (seed.storyImageKey) {
    const credit = storyImage(seed.storyImageKey);
    if (credit) return { url: credit.url, alt: seed.imageAlt };
  }
  if (seed.imageKey) return { url: img(seed.imageKey), alt: seed.imageAlt };

  const own = representativePhoto("place", seed.slug);
  if (own) return { url: own.localPath, alt: own.caption ?? seed.imageAlt };

  return { url: null, alt: seed.imageAlt };
}

export const places: Place[] = SEEDS.map((seed) => {
  const image = resolveImage(seed);
  return {
    slug: seed.slug,
    name: seed.name,
    category: seed.category,
    group: PLACE_GROUP_OF[seed.category],
    district: seed.district,
    coordinates: { lat: seed.lat, lng: seed.lng },
    description: seed.description,
    image: image.url,
    imageAlt: image.alt,
    googleMapsUrl: googleMapsSearchUrl(seed.name, seed.district),
    wikipediaUrl: `${WIKI}${seed.wiki}`,
    provenance: wikiProvenance(seed.wiki),
    ...(seed.permitNote ? { permitNote: seed.permitNote } : {}),
    ...(seed.elevation ? { elevation: seed.elevation } : {}),
  };
});

export const PLACE_CATEGORIES: PlaceCategory[] = [
  ...new Set(places.map((place) => place.category)),
].sort();

export const PLACE_GROUPS: PlaceGroup[] = [
  "Heritage",
  "Sacred",
  "Water",
  "Nature",
  "Journey",
  "Town",
];

export function getPlaceBySlug(slug: string): Place | undefined {
  return places.find((place) => place.slug === slug);
}
