import { img } from "@/data/images";
import { SOURCES } from "@/data/sources";
import type { Provenance } from "@/data/sources";

/**
 * Stories of Sikkim — the cultural archive.
 *
 * Every story separates what is documented from what is transmitted. A story
 * whose `claimType` is "legend" or "oral tradition" says so on the card, in
 * the header and beside the text, because presenting a monastery's own legend
 * as settled history is the failure mode this archive exists to avoid.
 *
 * Content is written from the cited article for each story. Where a story
 * concerns a monastery already in the catalogue, the same source backs both.
 */

export type StoryCategory =
  | "Monastery Stories"
  | "Legends & Oral Traditions"
  | "Architecture"
  | "Festivals"
  | "Buddhist Heritage"
  | "Sikkim History"
  | "Sacred Landscapes"
  | "Art & Craft"
  | "Heritage Preservation";

/** How a claim should be read. Rendered next to the text, never hidden. */
export type ClaimType = "documented history" | "oral tradition" | "legend";

export interface Story {
  slug: string;
  title: string;
  category: StoryCategory;
  claimType: ClaimType;
  /** One sentence for the card. */
  summary: string;
  /** Body paragraphs. */
  content: string[];
  heroImage: string;
  heroAlt: string;
  relatedMonasteries: string[];
  provenance: Provenance;
  readingMinutes: number;
}

const WIKI = "https://en.wikipedia.org/wiki/";

function wiki(title: string, claim: ClaimType = "documented history"): Provenance {
  return {
    sourceId: "wikipedia",
    sourceUrl: `${WIKI}${title}`,
    verifiedAt: "2026-08-14",
    confidence: claim === "documented history" ? "medium" : "unverified",
    ...(claim !== "documented history"
      ? { caveat: `Recorded as ${claim}. Retold here as the tradition tells it, not as established fact.` }
      : {}),
  };
}

export const stories: Story[] = [
  {
    slug: "the-crowning-at-yuksom",
    title: "The crowning at Yuksom",
    category: "Sikkim History",
    claimType: "documented history",
    summary:
      "Three lamas met in a forest clearing in West Sikkim and crowned the first Chogyal — the moment a Himalayan kingdom began.",
    content: [
      "Yuksom sits about forty kilometres north of Gyalshing, in what is now Sikkim's Gyalshing district. Its name is usually read as 'the meeting place of the three lamas', and it was the first capital of the Kingdom of Sikkim.",
      "There, Phuntsog Namgyal was consecrated as the first Chogyal. The Chogyals — the title translates as 'Dharma King' — ruled Sikkim as the Namgyal dynasty, and the office bound the monarchy to Buddhist teaching rather than setting the two apart.",
      "That founding is why the west district carries so much of Sikkim's oldest religious architecture. Dubdi Monastery, established above Yuksom and generally held to be the oldest monastery in Sikkim, stands a walk uphill from the coronation site. The kingdom and its monasteries grew from the same ground.",
      "The dynasty lasted until 1975, when Sikkim became a state of India. The monasteries outlasted the throne, and much of what the kingdom commissioned — halls, murals, libraries, festival calendars — is still in daily use.",
    ],
    heroImage: img("mon/dubdi"),
    heroAlt: "Dubdi Monastery above Yuksom, West Sikkim",
    relatedMonasteries: ["dubdi", "pemayangtse", "tashiding"],
    provenance: wiki("Yuksom"),
    readingMinutes: 3,
  },
  {
    slug: "the-lama-who-could-fly",
    title: "The lama who could fly",
    category: "Legends & Oral Traditions",
    claimType: "legend",
    summary:
      "Enchey Monastery stands on ground chosen by a tantric master remembered for the power of flight.",
    content: [
      "Above Gangtok, on a ridge of old cypress, stands Enchey Monastery. The site was blessed in the early nineteenth century by Druptob Karpo, a tantric master who is remembered in Sikkim for the power of flight, and who is said to have built a hermitage here.",
      "This is how the story is told locally. It is a legend, and it is recorded as one — the point of retelling it is not to argue that a man flew over the Himalaya, but that a community chose this ridge for a reason it still repeats.",
      "The temple standing today was raised in 1909, during the reign of Chogyal Sidkeong Tulku. Its two-day Cham festival before Losar remains the capital's great winter gathering.",
    ],
    heroImage: img("mon/enchey"),
    heroAlt: "Enchey Monastery, Gangtok",
    relatedMonasteries: ["enchey", "tsuklakhang"],
    provenance: wiki("Enchey_Monastery", "legend"),
    readingMinutes: 2,
  },
  {
    slug: "a-prophecy-read-in-water",
    title: "A prophecy read in water",
    category: "Festivals",
    claimType: "oral tradition",
    summary:
      "Each spring at Tashiding a sealed pot is opened, and the level of the water inside is read as an omen for the year.",
    content: [
      "Tashiding Monastery stands on a hill between the Rathong and Rangeet rivers, ground held to have been blessed by Guru Rinpoche. It is often described as the holiest site in Sikkim.",
      "Its best-known ceremony is the Bhumchu. A pot of holy water, sealed since the previous year, is opened before the community, and the level of the water inside is read as a sign of what the coming year holds for Sikkim. Pilgrims travel from across the Himalaya to be present.",
      "The reading is a tradition, not a forecast, and this archive records it as one. What is documented is the ceremony itself: its place in the calendar, its continuity, and the number of people it still draws.",
    ],
    heroImage: img("mon/tashiding"),
    heroAlt: "Mani stone walls outside Tashiding Monastery",
    relatedMonasteries: ["tashiding"],
    provenance: wiki("Tashiding_Monastery", "oral tradition"),
    readingMinutes: 2,
  },
  {
    slug: "a-heaven-carved-by-one-man",
    title: "A heaven carved by one man",
    category: "Architecture",
    claimType: "documented history",
    summary:
      "On Pemayangtse's upper floor stands a seven-tiered wooden model of Guru Rinpoche's celestial palace, carved single-handedly.",
    content: [
      "Pemayangtse means 'perfect sublime lotus'. Founded in the early eighteenth century, it was conceived as the premier monastery of the kingdom, and its monks alone held the standing to anoint the Chogyals.",
      "Its most extraordinary object is upstairs: the Zangdok Palri, a seven-tiered wooden model of Guru Rinpoche's celestial palace, carved by a single lama over five years. It is a piece of devotional architecture built at the scale of furniture, and it repays a long look.",
      "The building itself is a three-storey stone and timber gompa with steep pitched roofs — a response to west-district weather as much as to monastic convention.",
    ],
    heroImage: img("mon/pemayangtse"),
    heroAlt: "Pemayangtse Monastery, West Sikkim",
    relatedMonasteries: ["pemayangtse", "sanga-choeling"],
    provenance: wiki("Pemayangtse_Monastery"),
    readingMinutes: 2,
  },
  {
    slug: "the-relics-that-crossed-the-mountains",
    title: "The relics that crossed the mountains",
    category: "Monastery Stories",
    claimType: "documented history",
    summary:
      "When the 16th Karmapa left Tibet in 1959, the treasures of Tsurphu came with him — and a ridge facing Gangtok became a lineage's seat.",
    content: [
      "Rumtek Monastery, also called the Dharma Chakra Centre, sits on a ridge near Gangtok. It is the seat in exile of the Gyalwang Karmapa, and it was inaugurated in 1966 by the 16th Karmapa.",
      "An earlier Rumtek gompa had stood here since the eighteenth century. What made the present seat was 1959: the 16th Karmapa left Tibet carrying the treasures of Tsurphu, the lineage's monastery there, and chose this ridge to rebuild.",
      "The complex grew into a working institution rather than a monument — main temple, shedra college, retreat centre, and the Golden Stupa where the 16th Karmapa's relics rest. It is also a focal point of the sectarian dispute within the Karma Kagyu school known as the 17th Karmapa controversy, which this archive notes without taking a side.",
    ],
    heroImage: img("mon/rumtek"),
    heroAlt: "Rumtek Monastery near Gangtok",
    relatedMonasteries: ["rumtek", "lingdum"],
    provenance: wiki("Rumtek_Monastery"),
    readingMinutes: 3,
  },
  {
    slug: "the-year-in-masks",
    title: "The year in masks",
    category: "Festivals",
    claimType: "documented history",
    summary:
      "Cham is a masked, costumed dance performed to Tibetan horns and drums — the day a monastery turns outward to everyone.",
    content: [
      "Cham is a lively masked and costumed dance associated with several schools of Tibetan Buddhism, performed at Buddhist festivals and accompanied by monks playing traditional Tibetan instruments.",
      "In Sikkim it is the moment a monastery becomes a public building. Courtyards that are quiet for most of the year fill with villagers; the dances run for hours; brocade and carved masks come out of storage where they have waited since the last festival.",
      "Enchey's Cham before Losar draws the capital uphill in winter. Phensang holds a two-day festival before Losoong. These are calendar events, not performances laid on for visitors, and they are worth planning a trip around rather than dropping in on.",
    ],
    heroImage: img("fest/cham"),
    heroAlt: "A masked Cham dancer mid-turn",
    relatedMonasteries: ["enchey", "phensang", "ralang"],
    provenance: wiki("Cham_dance"),
    readingMinutes: 2,
  },
  {
    slug: "losar-the-turning-year",
    title: "Losar, the turning year",
    category: "Festivals",
    claimType: "documented history",
    summary:
      "The Tibetan new year, kept on dates that shift by region — and the hinge the monastic calendar turns on.",
    content: [
      "Losar is the Tibetan new year, celebrated across Tibetan Buddhism. Its date varies by tradition and region — Tibet, Bhutan, Nepal and the Indian Himalaya do not always keep it together.",
      "In Sikkim it anchors the winter. Protector rituals run in the days before; houses are cleaned and repainted; monasteries hold the dances that close the old year.",
      "Rumtek's present seat was consecrated on Losar of 1966, which is a small illustration of how the calendar and the institutions are wound together here.",
    ],
    heroImage: img("fest/hemis"),
    heroAlt: "Himalayan monastery festival gathering",
    relatedMonasteries: ["rumtek", "enchey"],
    provenance: wiki("Losar"),
    readingMinutes: 2,
  },
  {
    slug: "painting-on-cotton-and-silk",
    title: "Painting on cotton and silk",
    category: "Art & Craft",
    claimType: "documented history",
    summary:
      "A thangka is a Tibetan Buddhist painting on cotton or silk appliqué, usually showing a deity, a scene, or a mandala.",
    content: [
      "A thangka is a Tibetan Buddhist painting made on cotton or as silk appliqué, usually depicting a deity, a narrative scene, or a mandala. They are traditionally kept unframed and rolled when not on display, which is why so many survive.",
      "In a Sikkimese gompa they are working objects, not decoration. A thangka is a teaching aid, a focus for practice, and a record of iconography that has to be reproduced accurately — which is what makes the painters' training so long.",
      "Because they are portable and rollable, thangkas are also among the most at-risk objects in any monastery collection, and among the most worth photographing properly before they degrade.",
    ],
    heroImage: img("arch/thangka"),
    heroAlt: "A thangka painting in progress",
    relatedMonasteries: ["pemayangtse", "phodong"],
    provenance: wiki("Thangka"),
    readingMinutes: 2,
  },
  {
    slug: "the-dharma-kings",
    title: "The Dharma Kings",
    category: "Sikkim History",
    claimType: "documented history",
    summary:
      "Sikkim's monarchs held a title that made religious teaching part of the job description.",
    content: [
      "The Chogyals were the monarchs of the former Kingdom of Sikkim, of the Namgyal dynasty. The title translates as 'Dharma King'.",
      "That is not ornamental. It placed the monarchy inside Buddhist teaching rather than beside it, and it explains why the royal chapel — the Tsuklakhang, inside the palace compound in Gangtok — was where coronations, royal weddings and state rituals were performed.",
      "It also explains Pemayangtse's unusual standing: its monks alone held the right to anoint the Chogyals. When the kingdom ended in 1975, that particular relationship ended with it, but the buildings and the calendar it produced did not.",
    ],
    heroImage: img("mon/tsuklakhang"),
    heroAlt: "Tsuklakhang, the royal chapel in Gangtok",
    relatedMonasteries: ["tsuklakhang", "pemayangtse"],
    provenance: wiki("Chogyal"),
    readingMinutes: 2,
  },
  {
    slug: "a-mountain-that-is-not-only-a-mountain",
    title: "A mountain that is not only a mountain",
    category: "Sacred Landscapes",
    claimType: "oral tradition",
    summary:
      "Kanchenjunga is treated in Sikkim as a guardian, and the monastic calendar makes room for it.",
    content: [
      "Kanchenjunga stands over the whole of Sikkim, and in Sikkimese tradition it is not treated merely as terrain. It is regarded as a guardian of the land, and that relationship is expressed through ritual rather than through scenery.",
      "Ralang's dances are held in that spirit, honouring the mountain as protector. This archive records the practice as tradition — what is documented is that the observance exists and is kept, not a claim about the mountain itself.",
      "Practically, it also shapes travel here. Ridge-top monasteries at Rinchenpong, Pelling and Ravangla were sited where the range is visible, and their balconies still empty the surrounding villages on a clear dawn.",
    ],
    heroImage: img("hero/kanchenjunga"),
    heroAlt: "Sunrise on Kangchenjunga",
    relatedMonasteries: ["ralang", "rinchenpong", "pemayangtse"],
    provenance: wiki("Ralang_Monastery", "oral tradition"),
    readingMinutes: 2,
  },
  {
    slug: "what-a-gompa-actually-is",
    title: "What a gompa actually is",
    category: "Buddhist Heritage",
    claimType: "documented history",
    summary:
      "Behind the painted doors: a prayer hall, a library of block-printed texts, and quarters where the work of the year is done.",
    content: [
      "It is easy to read a monastery as a monument. In Sikkim it is closer to a working institution: an assembly hall, a library of block-printed texts, quarters where monks study and debate, and a courtyard sized for the festival calendar.",
      "The architecture follows Tibetan monastic convention — thick walls carrying a bright painted façade, a pillared assembly hall, a roofline finished in gilded ornament. The style is consistent enough that you can read an unfamiliar building quickly once you know it.",
      "Several Sikkimese monasteries also run a shedra, a college of higher study. Rumtek's sits behind the main temple. This is the part visitors rarely see, and the part that makes the difference between a preserved building and a living one.",
    ],
    heroImage: img("int/thiksey"),
    heroAlt: "Offering bowls inside a Himalayan monastery",
    relatedMonasteries: ["rumtek", "lingdum", "phodong"],
    provenance: wiki("Rumtek_Monastery"),
    readingMinutes: 2,
  },
  {
    slug: "why-any-of-this-needs-documenting",
    title: "Why any of this needs documenting",
    category: "Heritage Preservation",
    claimType: "documented history",
    summary:
      "Most of Sikkim's monasteries have no published hours, no 360° capture, and no photographic record beyond a handful of images.",
    content: [
      "This archive can state plainly what it does not have. Of the monasteries catalogued here, none has a verified 360° capture in any openly licensed collection. The Government of Sikkim tourism portal publishes no visiting hours for any of them. Several have no coordinate published by any authoritative source.",
      "That is not an argument that the information does not exist — it is an argument that it exists only locally, in the monasteries themselves and in the memories of the people who keep them. Earthquake, fire and time have already taken buildings here more than once; Phodong was levelled and rebuilt, Sanga Choeling burned more than once, Phensang burned in 1947.",
      "Documentation is the cheapest insurance available against that. A photograph with a licence, a coordinate with a source, a recording of a festival date — none of it is glamorous, and all of it survives a fire.",
      "The corresponding discipline is refusing to fill the gaps with invention. An archive that guesses is worse than an archive with holes in it, because you can no longer tell which parts to trust.",
    ],
    heroImage: img("arch/manuscript"),
    heroAlt: "A Tibetan manuscript leaf",
    relatedMonasteries: ["phodong", "phensang", "sanga-choeling"],
    provenance: {
      sourceId: "internal",
      verifiedAt: "2026-08-14",
      confidence: "high",
      caveat:
        "Coverage figures are computed from this archive's own records and are reproduced on the preservation page.",
    },
    readingMinutes: 3,
  },
];

export const STORY_CATEGORIES: StoryCategory[] = [
  ...new Set(stories.map((s) => s.category)),
].sort() as StoryCategory[];

export function getStoryBySlug(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}

export function getStoriesForMonastery(monasterySlug: string): Story[] {
  return stories.filter((s) => s.relatedMonasteries.includes(monasterySlug));
}

export const CLAIM_LABEL: Record<ClaimType, string> = {
  "documented history": "Documented history",
  "oral tradition": "Oral tradition",
  legend: "Legend",
};

export { SOURCES };
