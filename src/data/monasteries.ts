import { getAudioGuides } from "@/data/audio";
import { img } from "@/data/images";
import { SOURCES } from "@/data/sources";
import type { Provenance } from "@/data/sources";
import type {
  MonasteryDetails,
  MonasteryTradition,
  SikkimDistrict,
  VisitingHours,
} from "@/types";

/**
 * Sikkim monasteries — verified records only (§0, §14, §15).
 *
 * Names, districts, lineages, founding years and historical background are
 * drawn from the English Wikipedia article cited on each record. Coordinates
 * come from that article's own coordinate data where it publishes one; where
 * it does not, the record is marked `unverified` and is NOT plotted on the
 * map rather than being given a guessed pin.
 *
 * Removed in the data-integrity pass: invented ratings and review counts,
 * reused stand-in 360 panoramas, archive items attributed to collections they
 * do not belong to, invented festival dates, and invented visitor timings,
 * phone numbers and email addresses.
 */

interface MonasterySeed {
  slug: string;
  name: string;
  district: SikkimDistrict;
  tradition: MonasteryTradition;
  establishedYear: number;
  description: string;
  history: string[];
  significance: string;
  architecture: string;
}

const SEEDS: MonasterySeed[] = [
  {
    slug: "rumtek",
    name: "Rumtek Monastery",
    district: "Gangtok",
    tradition: "Karma Kagyu",
    establishedYear: 1966,
    description:
      "Seat-in-exile of the Karmapa and the largest monastery in Sikkim, its golden stupa holding the relics of the 16th Karmapa.",
    history: [
      "A first Rumtek gompa was raised in the 1740s under the 12th Karmapa, but the seat that stands today was built after 1959, when the 16th Gyalwang Karmapa left Tibet with the treasures of Tsurphu and chose this ridge facing Gangtok for his seat-in-exile.",
      "Consecrated on Losar of 1966, the complex grew into the Dharma Chakra Centre — main temple, shedra college, retreat centre and the Golden Stupa where the 16th Karmapa's relics rest.",
    ],
    significance:
      "Head monastery of the Karma Kagyu lineage in exile and the largest monastic complex in Sikkim.",
    architecture:
      "Classic Tibetan monastic architecture — a four-storey main temple with gilded roof ornaments, vast prayer hall murals and a courtyard built for Cham dances.",
  },
  {
    slug: "pemayangtse",
    name: "Pemayangtse Monastery",
    district: "Gyalshing",
    tradition: "Nyingma",
    establishedYear: 1705,
    description:
      "The 'Perfect Sublime Lotus', head of all Nyingma monasteries in Sikkim, founded by Lhatsun Chenpo's lineage above Pelling.",
    history: [
      "Founded in 1705 by Lama Lhatsun Chenpo's successors, Pemayangtse was conceived as the premier monastery of the kingdom, its monks alone entitled to the title 'ta-tshang' — pure monks who anointed the Chogyals.",
      "The monastery's upper floor holds the Zangdok Palri, a seven-tiered carved wooden model of Guru Rinpoche's celestial palace, made single-handedly by Dungzin Rinpoche over five years.",
    ],
    significance:
      "Premier Nyingma monastery of Sikkim; its abbots crowned the Chogyals of the former kingdom.",
    architecture:
      "Three-storey stone and timber gompa with steep pitched roofs against west-district weather, famous for the carved Zangdok Palri model.",
  },
  {
    slug: "tashiding",
    name: "Tashiding Monastery",
    district: "Gyalshing",
    tradition: "Nyingma",
    establishedYear: 1717,
    description:
      "The holiest hill in Sikkim, ringed by mani walls, where one sight of the Thongwa Rangdol stupa is said to cleanse a lifetime of sin.",
    history: [
      "Built on a heart-shaped hill between the Rathong and Rangeet rivers — a site Guru Rinpoche is said to have blessed in the 8th century — Tashiding was founded in 1717 by Ngadak Sempa Chempo, one of the three lamas of the Yuksom coronation.",
      "Each spring the Bhumchu ceremony opens a sealed pot of holy water whose level is read as a prophecy for Sikkim's year ahead — a ritual that draws pilgrims from across the Himalaya.",
    ],
    significance:
      "Holiest site in Sikkim; centre of the Bhumchu water ceremony and the Thongwa Rangdol stupa.",
    architecture:
      "A hilltop complex of shrines, chortens and mani stone walls rather than one great hall — the whole ridge is the monument.",
  },
  {
    slug: "enchey",
    name: "Enchey Monastery",
    district: "Gangtok",
    tradition: "Nyingma",
    establishedYear: 1909,
    description:
      "Gangtok's own gompa on a ridge blessed by the flying lama Druptob Karpo, famous for its January Cham dances.",
    history: [
      "The site was blessed in the early 19th century when Druptob Karpo, a tantric master famed for the power of flight, built a small hermitage above what is now Gangtok.",
      "The present temple was raised in 1909 during the reign of Chogyal Sidkeong Tulku, and its two-day Cham festival before Losar remains the capital's great winter spectacle.",
    ],
    significance: "The capital's principal Nyingma gompa; its Detor Cham dances close Gangtok's year.",
    architecture:
      "A compact pagoda-style temple in the Chinese-influenced style of the early 1900s, ringed by tall prayer flags and old cypress.",
  },
  {
    slug: "lingdum",
    name: "Lingdum (Ranka) Monastery",
    district: "Gangtok",
    tradition: "Zurmang Kagyu",
    establishedYear: 1999,
    description:
      "A vast cinematic courtyard monastery east of Gangtok, the youngest major gompa in Sikkim and a favourite film location.",
    history: [
      "Completed in 1999 as the seat of the Zurmang Kagyu lineage in Sikkim under Zurmang Gharwang Rinpoche, Lingdum was built at full traditional scale — a rarity for a modern gompa.",
      "Its broad flagstone courtyard and gallery murals made it Bollywood's favourite monastery, but it remains a working shedra with a large community of young monks.",
    ],
    significance: "Seat of the Zurmang Kagyu tradition in Sikkim and its most-filmed monastery.",
    architecture:
      "Monumental modern-traditional complex — colonnaded courtyard, gilded roof and some of the freshest mural work in the state.",
  },
  {
    slug: "phodong",
    name: "Phodong Monastery",
    district: "Mangan",
    tradition: "Karma Kagyu",
    establishedYear: 1740,
    description:
      "One of the six great monasteries of Sikkim, rebuilt after earthquakes, with dawn prayers over the Teesta valley.",
    history: [
      "Founded around 1740 under Chogyal Gyurmed Namgyal, Phodong was one of the six 'great monasteries' of the kingdom and the principal Kagyu seat of the north road.",
      "Earthquakes levelled the old buildings; the rebuilt gompa preserves the early murals' iconography and its 260-year-old festival calendar.",
    ],
    significance: "Principal Karma Kagyu monastery of north Sikkim.",
    architecture: "Rebuilt two-storey hall on the old plan, its verandah murals repainted from the originals.",
  },
  {
    slug: "phensang",
    name: "Phensang Monastery",
    district: "Mangan",
    tradition: "Nyingma",
    establishedYear: 1721,
    description:
      "Ridge-top Nyingma seat with one of the largest monk communities in Sikkim; its festival opens the winter season.",
    history: [
      "Founded in 1721 during the time of Jigme Pawo, Phensang's ridge commands the slope from Kabi to Phodong on the old north road.",
      "Destroyed by fire in 1947 and rebuilt by its own community, it keeps one of the largest monastic populations in Sikkim.",
    ],
    significance: "Major Nyingma house of the north; its two-day festival precedes Losoong.",
    architecture: "Broad rebuilt prayer hall with a deep front verandah and famous ridge-line views.",
  },
  {
    slug: "lachen",
    name: "Lachen Monastery",
    district: "Mangan",
    tradition: "Nyingma",
    establishedYear: 1858,
    description:
      "The gompa of the Lachenpas above the village that guards the road to Gurudongmar.",
    history: [
      "Raised in 1858 as the Ngodub Choling of the Lachen valley, the gompa sits above the village whose herder council — the dzumsa — still governs local life.",
      "The line of Lachen Gomchens, hermit-teachers of this valley, made the monastery famous far beyond its size.",
    ],
    significance: "Spiritual centre of the Lachen valley and gateway to Gurudongmar.",
    architecture: "Small high-altitude gompa with a tin-shielded roof and butter-lamp-blackened interior beams.",
  },
  {
    slug: "lachung",
    name: "Lachung Monastery",
    district: "Mangan",
    tradition: "Nyingma",
    establishedYear: 1880,
    description:
      "Weathered valley monastery among apple orchards on the way to Yumthang, known for water-driven prayer wheels.",
    history: [
      "Built in 1880 on the slope above the Lachung chu, the gompa serves the twin villages of the valley on the Yumthang road.",
      "Its Losoong masked dances and stream-driven prayer wheels are the valley's best-loved traditions.",
    ],
    significance: "Religious heart of the Lachung valley.",
    architecture: "Two-storey timber gompa, weathered silver by altitude, ringed by orchards.",
  },
  {
    slug: "sanga-choeling",
    name: "Sanga Choeling Monastery",
    district: "Gyalshing",
    tradition: "Nyingma",
    establishedYear: 1697,
    description:
      "The second-oldest gompa in Sikkim, reached by a forest climb from Pelling; the great Chenrezig statue shares its ridge.",
    history: [
      "Founded in 1697 by Lama Lhatsun Chenpo himself, Sanga Choeling — 'place of secret spells' — is the second-oldest monastery in Sikkim.",
      "Fire took the original buildings more than once; the rebuilt gompa keeps its clay statues and its forty-minute pilgrim path through the forest.",
    ],
    significance: "Sikkim's second-oldest monastery, founded by the patron saint of the kingdom.",
    architecture: "Modest hilltop hall whose ridge now also carries the 41-metre Chenrezig statue and skywalk.",
  },
  {
    slug: "dubdi",
    name: "Dubdi Monastery",
    district: "Gyalshing",
    tradition: "Nyingma",
    establishedYear: 1701,
    description:
      "The oldest monastery in Sikkim — 'the Hermit's Cell' — above Yuksom where the first Chogyal was crowned.",
    history: [
      "Established in 1701 just above Yuksom, where four years earlier the three lamas had crowned Phuntsog Namgyal as the first Chogyal, Dubdi is held to be the oldest monastery in Sikkim.",
      "The stone path up through cardamom forest remains a pilgrimage in itself; the gompa is an Archaeological Survey of India protected monument.",
    ],
    significance: "Oldest monastery of Sikkim, tied to the kingdom's founding at Yuksom.",
    architecture: "Small stone gompa with a gilded pinnacle, reached only on foot.",
  },
  {
    slug: "ralang",
    name: "Ralang Monastery",
    district: "Namchi",
    tradition: "Kagyu",
    establishedYear: 1768,
    description:
      "Twin monasteries near Ravangla whose Pang Lhabsol dances honour Kanchenjunga itself.",
    history: [
      "The old Ralang gompa was founded in 1768 after the fourth Chogyal's pilgrimage to Tibet, on ground consecrated — tradition says — by rice thrown from Tsurphu by the Karmapa.",
      "In 1995 the vast new Palchen Choeling Monastic Institute rose beside it, making Ralang one of the largest Kagyu centres in India.",
    ],
    significance: "Great Kagyu centre of the south; its Pang Lhabsol venerates Kanchenjunga as guardian.",
    architecture: "Weathered 18th-century hall beside a monumental modern institute with a 40-foot Buddha.",
  },
  {
    slug: "kewzing",
    name: "Kewzing Monastery",
    district: "Namchi",
    tradition: "Kagyu",
    establishedYear: 1875,
    description:
      "A quiet village gompa in Sikkim's homestay country — monks here still farm, and visitors join morning puja.",
    history: [
      "A village foundation of the late 19th century, Kewzing's gompa grew with the Bon and Buddhist households of the ridge it serves.",
      "Today it anchors Sikkim's best-known homestay circuit, where monastic life and farm life share a calendar.",
    ],
    significance: "Living village monastery at the heart of south Sikkim's community-tourism belt.",
    architecture: "Single farmhouse-scale hall, brightly repainted by its own villagers.",
  },
  {
    slug: "rinchenpong",
    name: "Rinchenpong Monastery",
    district: "Soreng",
    tradition: "Nyingma",
    establishedYear: 1730,
    description:
      "Third-oldest in Sikkim, home to a rare Ati Buddha statue and a balcony view that empties the village at dawn.",
    history: [
      "Founded around 1730, Rinchenpong — 'hill of jewels' — holds a rare statue of the Ati Buddha in union pose, one of very few in the region.",
      "Below it lies 'poison lake', where villagers are said to have halted a colonial column in 1860 by poisoning the water — local history the monks still recount.",
    ],
    significance: "Third-oldest gompa of Sikkim with a rare Ati Buddha image.",
    architecture: "Hillside gompa whose balcony frames the full Kanchenjunga range.",
  },
  {
    slug: "tsuklakhang",
    name: "Tsuklakhang Palace Monastery",
    district: "Gangtok",
    tradition: "Nyingma",
    establishedYear: 1898,
    description:
      "The royal chapel of the Chogyals inside the palace compound — coronations and royal weddings happened under this roof.",
    history: [
      "Built in 1898 within the palace grounds of Chogyal Thutob Namgyal, the Tsuklakhang was the royal chapel where coronations, weddings and state rituals of the kingdom were performed.",
      "It remains the ceremonial heart of Buddhist Gangtok, opening to the public for the Kagyed and Pang Lhabsol dances.",
    ],
    significance: "Royal chapel of the former kingdom; venue of its great state ceremonies.",
    architecture: "Palace-compound temple with carved and painted woodwork by the finest court artisans.",
  },
];


/* ------------------------------------------------------------------------
   Verification layer
   ------------------------------------------------------------------------ */

const WIKI = "https://en.wikipedia.org/wiki/";

/**
 * Coordinates taken from each Wikipedia article's own coordinate data on
 * 2026-08-14. A slug absent from this table has no published coordinate and
 * is deliberately left unplotted (§16 — do not fabricate coordinates).
 */
const VERIFIED_COORDS: Record<string, { lat: number; lng: number }> = {
  rumtek: { lat: 27.2886, lng: 88.5614 },
  pemayangtse: { lat: 27.3044, lng: 88.2528 },
  tashiding: { lat: 27.3083, lng: 88.2981 },
  enchey: { lat: 27.3358, lng: 88.6192 },
  phodong: { lat: 27.4128, lng: 88.5839 },
  phensang: { lat: 27.4203, lng: 88.6103 },
  ralang: { lat: 27.3283, lng: 88.3347 },
  tsuklakhang: { lat: 27.326, lng: 88.615 },
};

/** Wikipedia article slugs, confirmed to exist on 2026-08-14. */
const WIKI_TITLES: Record<string, string> = {
  rumtek: "Rumtek_Monastery",
  pemayangtse: "Pemayangtse_Monastery",
  tashiding: "Tashiding_Monastery",
  enchey: "Enchey_Monastery",
  lingdum: "Lingdum_Monastery",
  phodong: "Phodong_Monastery",
  phensang: "Phensang_Monastery",
  lachen: "Lachen_Monastery",
  lachung: "Lachung_Monastery",
  "sanga-choeling": "Sanga_Choeling_Monastery",
  dubdi: "Dubdi_Monastery",
  ralang: "Ralang_Monastery",
  rinchenpong: "Rinchenpong_Monastery",
  tsuklakhang: "Tsuklakhang_Palace",
};

/**
 * Records whose coordinate is known to be contested. Dubdi sits above Yuksom
 * in West Sikkim, but the Wikipedia article carries a coordinate roughly 35 km
 * to the south-east. Rather than silently pick a side, the site ships without
 * a map pin and says so.
 */
const COORD_DISPUTED = new Set(["dubdi"]);

function provenanceFor(slug: string): Provenance {
  const title = WIKI_TITLES[slug];
  if (!title) {
    return {
      sourceId: "internal",
      verifiedAt: "2026-08-14",
      confidence: "unverified",
      caveat:
        "No authoritative article was found for this site. Retained as a research lead only — its details are not presented as verified.",
    };
  }
  return {
    sourceId: "wikipedia",
    sourceUrl: `${WIKI}${title}`,
    verifiedAt: "2026-08-14",
    confidence: "medium",
    ...(COORD_DISPUTED.has(slug)
      ? { caveat: "The cited article's coordinate conflicts with the site's known location; no map pin is shown." }
      : {}),
  };
}

/** Google Maps search link built from the site's own name — no API key, no invented place ID. */
export function googleMapsSearchUrl(name: string, district: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name}, ${district} District, Sikkim, India`,
  )}`;
}

/**
 * Visiting hours, researched 2026-08-14.
 *
 * The Government of Sikkim tourism portal publishes no opening times for any
 * monastery. Travel aggregators publish times that contradict each other, so
 * where they exist at all they are recorded as REPORTED, never official. Sites
 * absent from this table have no usable report and say so.
 */
const REPORTED_HOURS: Record<string, string> = {
  rumtek:
    "Commonly reported as roughly 8am–5pm, though published times range from 6am to 6pm and vary with rituals and season",
};

function visitingHoursFor(slug: string): VisitingHours {
  const summary = REPORTED_HOURS[slug];
  if (summary) {
    return {
      status: "reported",
      summary,
      provenance: {
        sourceId: "community-timing-reports",
        sourceUrl: SOURCES["community-timing-reports"]!.url,
        verifiedAt: "2026-08-14",
        confidence: "unverified",
        caveat:
          "Travel-aggregator reports only, and they disagree with one another. Confirm locally before travelling.",
      },
    };
  }
  return {
    status: "unpublished",
    provenance: {
      sourceId: "sikkim-tourism-portal",
      sourceUrl: SOURCES["sikkim-tourism-portal"]!.url,
      verifiedAt: "2026-08-14",
      confidence: "unverified",
      caveat:
        "The official tourism portal publishes no hours for this site, and no reliable secondary report was found.",
    },
  };
}

export const monasteries: MonasteryDetails[] = SEEDS.map((seed) => {
  const coords = COORD_DISPUTED.has(seed.slug) ? undefined : VERIFIED_COORDS[seed.slug];
  return {
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    district: seed.district,
    tradition: seed.tradition,
    establishedYear: seed.establishedYear,
    description: seed.description,
    image: img(`mon/${seed.slug}`),
    imageSource: SOURCES["wikimedia-commons"]!.url,
    history: seed.history,
    significance: seed.significance,
    architecture: seed.architecture,
    /** Present only when an authoritative coordinate exists. */
    coordinates: coords,
    googleMapsUrl: googleMapsSearchUrl(seed.name, seed.district),
    provenance: provenanceFor(seed.slug),
    /**
     * No verified 360 capture exists for any Sikkim monastery in the freely
     * licensed corpus, so every site reports none (§23, §63). The earlier
     * build reused two European panoramas across five sites.
     */
    visitingHours: visitingHoursFor(seed.slug),
    tour: { available: false as const },
    /**
     * Narration produced by the Heritage Audio Agent. Present only where the
     * cited sources contained enough material to say something true.
     */
    audio: (() => {
      const guides = getAudioGuides(seed.slug);
      return guides.length > 0
        ? { available: true as const, languages: guides.map((g) => g.label) }
        : { available: false as const };
    })(),
  };
});

export function getMonasteryBySlug(slug: string): MonasteryDetails | undefined {
  return monasteries.find((monastery) => monastery.slug === slug);
}

/** Sites with an authoritative coordinate — the only ones the map may plot. */
export const mappableMonasteries = monasteries.filter((m) => m.coordinates !== undefined);

export const MONASTERY_TRADITIONS: MonasteryTradition[] = [
  "Nyingma",
  "Kagyu",
  "Karma Kagyu",
  "Zurmang Kagyu",
];
