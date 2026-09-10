import { SOURCES } from "@/data/sources";
import type { SourceType } from "@/data/sources";

/**
 * The Story of Sikkim — the historical timeline.
 *
 * The rule that governs the rest of this archive governs this file hardest,
 * because a timeline is the easiest place in a heritage product to invent
 * things. Every event here carries the sources it was written from, and the
 * `verification` field says how firmly it stands:
 *
 *   verified        — stated by a government or institutional source.
 *   source-backed   — stated by a reference work; nothing found contradicts it.
 *   oral tradition  — transmitted and attested as tradition, not as record.
 *                     Retold as the tradition tells it, never upgraded.
 *   unverified      — retained as a research lead, shown as unresolved.
 *
 * Note what "verified" deliberately does NOT include: corroboration across two
 * encyclopedia articles. Two articles in the same reference work are one
 * tertiary publication agreeing with itself, and treating that as independent
 * confirmation is how a plausible error becomes a fact. This mirrors the
 * monastery records, which cap encyclopedia-sourced confidence at "medium".
 * scripts/qa/heritage-integrity.mjs enforces the rule mechanically.
 *
 * Where sources disagree — 15 May versus 16 May 1975, the 8th versus the 9th
 * century for Guru Rinpoche — the disagreement is written into the record
 * rather than resolved by picking a side.
 *
 * `imageKey` names an item in the Digital Heritage Archive, so an event's
 * illustration is a catalogued, licensed, attributed object rather than a
 * loose file. An event with no legitimate photograph has `imageKey: null` and
 * the page says "Documentation currently unavailable" — which is true, and is
 * better than a stock photograph of a mountain.
 */

export type HistoryEra =
  | "Early Sikkim"
  | "The Namgyal Kingdom"
  | "Monastic Foundations"
  | "The Colonial Encounter"
  | "Political Transformation"
  | "Modern Sikkim";

/**
 * Stable anchor id for an era heading. Shared by the timeline page (a server
 * component) and the era jump-bar (a client component) — which is why it lives
 * here rather than in the client module that used to export it.
 */
export function eraAnchor(era: string): string {
  return `era-${era
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export const HISTORY_ERAS: { id: HistoryEra; span: string; blurb: string }[] = [
  {
    id: "Early Sikkim",
    span: "before 1642",
    blurb:
      "The Lepcha in the valleys, the Limbu on the western slopes, and a founding compact remembered rather than recorded.",
  },
  {
    id: "The Namgyal Kingdom",
    span: "1642 – 1793",
    blurb:
      "A Dharma King crowned in a forest clearing, and a capital that moved twice under pressure.",
  },
  {
    id: "Monastic Foundations",
    span: "1697 – 1740s",
    blurb:
      "The gompas that still hold the state's art, its libraries and its festival calendar.",
  },
  {
    id: "The Colonial Encounter",
    span: "1788 – 1909",
    blurb:
      "Four treaties, one botanist's arrest, and a kingdom that ended up a protectorate.",
  },
  {
    id: "Political Transformation",
    span: "1950 – 1975",
    blurb: "Protectorate, agitation, referendum — and the end of a 333-year dynasty.",
  },
  {
    id: "Modern Sikkim",
    span: "2006 – today",
    blurb: "A reopened pass, a World Heritage landscape, and the first fully organic state.",
  },
];

export type VerificationStatus =
  | "verified"
  | "source-backed"
  | "oral tradition"
  | "community contribution"
  | "unverified";

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  "source-backed": "Source-backed",
  "oral tradition": "Oral tradition",
  "community contribution": "Community contribution",
  unverified: "Unverified",
};

export interface EventSource {
  name: string;
  url: string;
  type: SourceType;
  /** What specifically was taken from this source. */
  covers: string;
}

export interface HistoryEvent {
  slug: string;
  /** Sort key only — never displayed. `yearLabel` is what the reader sees. */
  sortYear: number;
  yearLabel: string;
  title: string;
  era: HistoryEra;
  shortDescription: string;
  description: string[];
  keyFacts: string[];
  /** Archive item key, or null where no legitimate image exists. */
  imageKey: string | null;
  /** Why this photograph stands here, when it is not contemporary with the event. */
  imageNote?: string;
  sources: EventSource[];
  relatedMonasteries: string[];
  relatedStories: string[];
  /** Slugs from src/data/places.ts. */
  relatedPlaces: string[];
  verification: VerificationStatus;
  /** Set wherever the record is knowingly incomplete or contested. */
  verificationNote?: string;
  /** A real place name, used to build a Maps search link. No invented coordinates. */
  mapQuery?: string;
  lastVerifiedAt: string;
}

const VERIFIED_ON = "2026-08-17";

/* ------------------------------------------------------------- source helpers */

const wiki = (title: string, covers: string): EventSource => ({
  name: `Wikipedia — ${title.replace(/_/g, " ")}`,
  url: `https://en.wikipedia.org/wiki/${title}`,
  type: "encyclopedia",
  covers,
});

const govSikkim = (covers: string): EventSource => ({
  name: SOURCES["sikkim-ipr"]!.name,
  url: SOURCES["sikkim-ipr"]!.url,
  type: "government",
  covers,
});

const govIndiaUtsav = (covers: string): EventSource => ({
  name: SOURCES["utsav-gov-in"]!.name,
  url: SOURCES["utsav-gov-in"]!.url,
  type: "government",
  covers,
});

/* ============================================================================
   THE EVENTS
   ========================================================================== */

export const historyEvents: HistoryEvent[] = [
  /* ------------------------------------------------------------ Early Sikkim */
  {
    slug: "lepcha-settlement",
    sortYear: 600,
    yearLabel: "6th – 7th century",
    title: "The Lepcha in the valleys",
    era: "Early Sikkim",
    shortDescription:
      "The community that calls itself Rongkup — the ravine folk — is the earliest settled population the record can reach.",
    description: [
      "Before there was a kingdom there were the Lepcha, who call themselves Rongkup and who describe themselves not as arrivals but as people of the place. Reference accounts of the region place Lepcha occupation of these valleys around the 6th century CE, and the consolidation of the Lepcha tribes under a figure named Thekung Adek in the 7th.",
      "West of them were the Limbu, one of the Kirat peoples, whose own traditions reach further back still. Both communities were long established before Tibetan Buddhism arrived over the passes, and both are recognised communities of Sikkim today.",
      "This part of the chronology deserves reading carefully. It is reconstructed from tradition and from later chronicles rather than from contemporary documents, and the dates should be held loosely. What is not in doubt is the sequence: the Lepcha and the Limbu were here first, and the kingdom that followed was built by agreement with them rather than over them.",
    ],
    keyFacts: [
      "The Lepcha call themselves Rongkup, usually rendered as 'the ravine folk'.",
      "Reference accounts place Lepcha occupation of the region around the 6th century CE.",
      "Thekung Adek is remembered as having consolidated the Lepcha tribes in the 7th century.",
      "Dzongu, in Mangan district, is reserved for the Lepcha community to this day.",
    ],
    imageKey: "story/lepcha-portrait",
    imageNote:
      "A 19th-century studio photograph held by the Rijksmuseum — the earliest photographic record of the community in this archive, and roughly twelve centuries later than the events described. The sitter's name was not recorded.",
    sources: [
      wiki("History_of_Sikkim", "The 6th-century Lepcha occupation and Thekung Adek's 7th-century consolidation."),
      wiki("Lepcha_people", "The community's own name, its territory, and the Dzongu reserve."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-people-who-say-they-never-arrived", "the-valley-reserved-for-the-lepchas", "the-hill-that-saved-the-lepchas"],
    relatedPlaces: [],
    verification: "source-backed",
    verificationNote:
      "Pre-kingdom chronology is reconstructed from tradition and later chronicles, not from contemporary documents. The sequence is secure; the century dates are not.",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "guru-rinpoche-passage",
    sortYear: 850,
    yearLabel: "8th – 9th century",
    title: "Guru Rinpoche's passage",
    era: "Early Sikkim",
    shortDescription:
      "The master who is said to have crossed this land, blessed it, and foretold the kingdom that would come.",
    description: [
      "Guru Padmasambhava — Guru Rinpoche — is held in Sikkimese tradition to have passed through this country, blessed its ground, and foretold the era of the monarchy that would follow. Reference accounts of Sikkim's history record the tradition as placing his passage in the 9th century; other accounts of his life place him in the 8th. Both are repeated, and this archive does not adjudicate between them.",
      "The consequences are visible everywhere regardless of the date. Tashiding is built on a hill his blessing is said to have singled out. Gurudongmar Lake carries his name in local tradition. The statue above Namchi at Samdruptse, finished in the 2000s, is a modern expression of a very old attachment.",
      "This is recorded here as tradition, which is what it is. What is documented is not that a man crossed these passes in a particular century but that Sikkim's monasteries, its lakes and its ritual calendar are organised around the belief that he did.",
    ],
    keyFacts: [
      "Reference accounts of Sikkim's history place the passage in the 9th century; accounts of Guru Rinpoche's own life more often say the 8th.",
      "Tradition holds that he blessed the land and foretold the era of the monarchy.",
      "Tashiding, Gurudongmar and Samdruptse are all tied to him in local tradition.",
    ],
    imageKey: "story/samdruptse",
    imageNote:
      "The statue at Samdruptse, completed in the 2000s. No contemporary depiction exists; this is how the tradition is expressed today.",
    sources: [
      wiki("History_of_Sikkim", "The tradition that Guru Rinpoche passed through the land and foretold the monarchy."),
      wiki("Padmasambhava", "The figure himself and the competing dating of his life."),
    ],
    relatedMonasteries: ["tashiding"],
    relatedStories: ["a-prophecy-read-in-water", "the-four-points-of-the-hidden-valley"],
    relatedPlaces: ["gurudongmar-lake"],
    verification: "oral tradition",
    verificationNote:
      "Retold as the tradition tells it. The passage is not established by contemporary record, and the century is disputed between sources.",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "kabi-lungchok-treaty",
    sortYear: 1400,
    yearLabel: "Before 1642 · date not established",
    title: "The blood-brotherhood at Kabi",
    era: "Early Sikkim",
    shortDescription:
      "A Lepcha chief and a Bhutia leader swore brotherhood at Kabi — the compact Sikkim still names as its founding agreement.",
    description: [
      "At Kabi Lungchok, on the north road out of Gangtok, a treaty of brotherhood was sworn between Thekung Tek, a Lepcha bonthing, and Khye Bumsa, the Bhutia leader from whom the Namgyal royal family traced its descent. Animals were sacrificed, stones were raised, and the two communities bound themselves to one another.",
      "The Government of India's own festival record cites this pact when it explains Pang Lhabsol, the observance that binds the two communities to the same guardian mountain. It is, in other words, not a folk curiosity: it is the agreement the state's ceremonial calendar is built on.",
      "No date survives. Reference accounts describe it as preceding the establishment of the monarchy in 1642 without saying by how much, and this archive will not manufacture a year to fill the gap. What can be said is that the site is marked, the pact is named in government sources, and it is remembered as the moment two peoples decided to be one country.",
    ],
    keyFacts: [
      "Sworn between Thekung Tek, a Lepcha bonthing, and Khye Bumsa, ancestor of the Namgyal royal house.",
      "The site at Kabi Lungchok, in Mangan district, is marked with standing stones.",
      "The Ministry of Tourism's festival record cites the pact in its account of Pang Lhabsol.",
      "No source consulted gives a date; it is placed only as 'before 1642'.",
    ],
    imageKey: "story/kabi-lungchok",
    sources: [
      govIndiaUtsav(
        "The blood-brotherhood pact between the Lepcha bonthing Thekung Tek and Khye-Bumsa, ancestor of the Namgyal royal family, as cited in the national festival record for Pang Lhabsol.",
      ),
      wiki("Kabi_Lungchok", "The site, the signatories, and the absence of any recorded date."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-treaty-sworn-at-kabi", "why-a-mountain-commands-an-army"],
    relatedPlaces: [],
    verification: "oral tradition",
    verificationNote:
      "Named in a Government of India source, but undated in every source consulted. Recorded as the tradition records it.",
    mapQuery: "Kabi Lungchok, Mangan District, Sikkim, India",
    lastVerifiedAt: VERIFIED_ON,
  },

  /* ------------------------------------------------------ The Namgyal Kingdom */
  {
    slug: "yuksom-coronation-1642",
    sortYear: 1642,
    yearLabel: "1642",
    title: "The crowning at Yuksom",
    era: "The Namgyal Kingdom",
    shortDescription:
      "Three lamas met in a forest clearing in West Sikkim and consecrated Phuntsog Namgyal as the first Chogyal.",
    description: [
      "In 1641 three lamas travelled from Kham, in eastern Tibet, into the country the Tibetans called the hidden land. Lhatsun Chenpo came from the north, Ngadak Sempa Chenpo from the south and Kathok Rinzing Chenpo from the west, and they met at a clearing that has been called Yuksom ever since — the meeting place of the three learned monks.",
      "In 1642 they consecrated Phuntsog Namgyal at Norbugang as the first Chogyal of Sikkim. He was a fifth-generation descendant of Guru Tashi, a prince of the Minyak house of Kham. The stone throne he was seated on still stands in the pine grove there.",
      "The title matters more than the ceremony. Chogyal translates as Dharma King, and it placed the monarchy inside Buddhist teaching rather than beside it. Everything downstream follows from that: the monasteries the kingdom endowed, the festivals it choreographed, and the rule that the monks of Pemayangtse alone held the standing to anoint later kings.",
      "The dynasty Phuntsog Namgyal founded ran through twelve rulers and 333 years. It ended in 1975. Its monasteries did not.",
    ],
    keyFacts: [
      "The three lamas travelled from Kham in 1641; the consecration followed at Norbugang in 1642.",
      "Yuksom is usually read as 'the meeting place of the three learned monks'.",
      "Phuntsog Namgyal reigned 1642–1670 and was a fifth-generation descendant of Guru Tashi of the Minyak house.",
      "'Chogyal' translates as Dharma King — a religious office as much as a political one.",
      "The coronation throne at Norbugang still stands.",
    ],
    imageKey: "story/coronation-throne",
    sources: [
      wiki("Sikkim", "Phuntsog Namgyal as founder of the monarchy in 1642, consecrated as the first Chogyal."),
      wiki("Yuksom", "The three lamas, their 1641 arrival, the meaning of the name, and the Norbugang throne."),
      wiki("Namgyal_dynasty_(Sikkim)", "Phuntsog Namgyal's reign dates of 1642–1670 and the succession that followed."),
      wiki("History_of_Sikkim", "The 1642 consecration and Phuntsog Namgyal's descent from Guru Tashi of the Minyak house."),
    ],
    relatedMonasteries: ["dubdi", "pemayangtse", "tashiding"],
    relatedStories: ["the-throne-of-stone-at-norbugang", "the-dharma-kings"],
    relatedPlaces: [],
    verification: "source-backed",
    mapQuery: "Norbugang Coronation Throne, Yuksom, Sikkim, India",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "rabdentse-capital-1670",
    sortYear: 1670,
    yearLabel: "1670",
    title: "The capital moves to Rabdentse",
    era: "The Namgyal Kingdom",
    shortDescription:
      "Tensung Namgyal moved the seat of the kingdom from Yuksom to a defensible ridge below Pemayangtse.",
    description: [
      "Phuntsog Namgyal died in 1670 and his son Tensung Namgyal succeeded him, reigning until 1700. One of his first acts was to move the capital from Yuksom to Rabdentse, on a ridge in what is now Gyalshing district.",
      "Rabdentse served as the seat of the kingdom for well over a century, through the Bhutanese occupation and the Gorkha wars, until the court withdrew north to Tumlong. What survives today is a ruin on a forested spur below Pemayangtse — walls, platforms and the stone footings of the throne room, reached by a walk through the trees.",
      "That Pemayangtse was founded within sight of it in 1705 is not a coincidence. Sikkim's premier monastery and Sikkim's capital were built to look at one another.",
    ],
    keyFacts: [
      "Tensung Namgyal, second Chogyal, reigned 1670–1700.",
      "The capital moved from Yuksom to Rabdentse in 1670.",
      "Rabdentse remained the capital until the court withdrew to Tumlong in 1793.",
      "The site survives as a ruin below Pemayangtse Monastery.",
    ],
    imageKey: "story/rabdentse",
    sources: [
      wiki("History_of_Sikkim", "The 1670 move of the capital from Yuksom to Rabdentse under Tensung Namgyal."),
      wiki("Namgyal_dynasty_(Sikkim)", "Tensung Namgyal's reign dates of 1670–1700."),
      wiki("Rabdentse", "The site, its role as the second capital, and its present condition."),
    ],
    relatedMonasteries: ["pemayangtse", "sanga-choeling"],
    relatedStories: ["the-capital-the-gurkhas-burned", "the-dharma-kings"],
    relatedPlaces: ["rabdentse"],
    verification: "source-backed",
    mapQuery: "Rabdentse Ruins, Gyalshing District, Sikkim, India",
    lastVerifiedAt: VERIFIED_ON,
  },

  /* ---------------------------------------------------- Monastic Foundations */
  {
    slug: "first-monasteries",
    sortYear: 1697,
    yearLabel: "1697 – 1717",
    title: "The first monasteries",
    era: "Monastic Foundations",
    shortDescription:
      "Sanga Choeling, Dubdi, Pemayangtse and Tashiding — four foundations in twenty years, all still standing.",
    description: [
      "Within two generations of the coronation the kingdom had built the institutions that still define it. Sanga Choeling was founded in 1697 by Lhatsun Chenpo himself, one of the three lamas of Yuksom. Dubdi followed in 1701, on the hillside above the coronation ground, and is generally held to be the oldest monastery in Sikkim.",
      "Pemayangtse came in 1705, conceived as the premier monastery of the kingdom — its monks alone held the standing to anoint the Chogyals. Tashiding was founded in 1717 on the heart-shaped hill between the Rathong and the Rangeet, on ground Guru Rinpoche is said to have blessed, and became the holiest site in the state.",
      "These are not ruins. All four are working monasteries with resident communities, festival calendars and libraries, and every one of them is in this archive's catalogue.",
    ],
    keyFacts: [
      "Sanga Choeling, 1697 — founded by Lhatsun Chenpo, one of the three lamas of Yuksom.",
      "Dubdi, 1701 — above Yuksom, generally held to be the oldest monastery in Sikkim.",
      "Pemayangtse, 1705 — premier Nyingma monastery; its monks anointed the Chogyals.",
      "Tashiding, 1717 — the holiest site in Sikkim, home of the Bhumchu ceremony.",
    ],
    imageKey: "mon/dubdi",
    sources: [
      wiki("Dubdi_Monastery", "The 1701 foundation and Dubdi's standing as the oldest monastery in Sikkim."),
      wiki("Sanga_Choeling_Monastery", "The 1697 foundation by Lhatsun Chenpo."),
      wiki("Pemayangtse_Monastery", "The 1705 foundation and the monastery's role in anointing the Chogyals."),
      wiki("Tashiding_Monastery", "The 1717 foundation and the site's standing as the holiest in Sikkim."),
    ],
    relatedMonasteries: ["sanga-choeling", "dubdi", "pemayangtse", "tashiding"],
    relatedStories: ["the-throne-of-stone-at-norbugang", "a-heaven-carved-by-one-man", "a-prophecy-read-in-water"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "pang-lhabsol-instituted",
    sortYear: 1700,
    yearLabel: "Reign of Chakdor Namgyal, 1700 – 1716",
    title: "The mountain made guardian",
    era: "Monastic Foundations",
    shortDescription:
      "The third Chogyal dedicated a dance to Kanchenjunga and gave two communities one guardian to share.",
    description: [
      "Chakdor Namgyal, third Chogyal of Sikkim, introduced the Pangtoed dance and dedicated it to Kanchenjunga as a war deity. That is the account given in the Government of India's own festival record, and it is the origin of Pang Lhabsol — the observance in which the mountain standing over the whole state is honoured as its guardian.",
      "Pang means to witness. The festival commemorates the consecration of Khangchendzonga as guardian deity, and it commemorates the blood-brotherhood pact between the Lepcha bonthing and the Bhutia leader at Kabi. One ceremony, two purposes, deliberately fused: a shared mountain for communities who had agreed to be one people.",
      "It is still danced. The best-known staging is in the courtyard of the Tsuklakhang, the royal chapel inside the palace compound in Gangtok, where a masked dancer takes the part of the mountain itself.",
    ],
    keyFacts: [
      "Chakdor Namgyal, third Chogyal, reigned 1700–1716.",
      "He introduced the Pangtoed dance and dedicated it to Kanchenjunga as a war deity.",
      "Pang Lhabsol commemorates both the consecration of the mountain and the Lepcha–Bhutia pact.",
      "The principal staging is at the Tsuklakhang in Gangtok.",
    ],
    imageKey: "hero/kanchenjunga",
    imageNote:
      "The mountain the festival is addressed to. No openly licensed photograph of a Pang Lhabsol observance was found for this archive.",
    sources: [
      govIndiaUtsav(
        "Chakdor Namgyal's introduction of the Pangtoed dance, the consecration of Khangchendzonga as guardian deity, the Lepcha–Bhutia pact, and the Tsuklakhang as the principal venue.",
      ),
      wiki("Namgyal_dynasty_(Sikkim)", "Chakdor Namgyal's reign dates of 1700–1716."),
    ],
    relatedMonasteries: ["tsuklakhang", "ralang"],
    relatedStories: ["why-a-mountain-commands-an-army", "the-dance-that-worships-a-snowy-range"],
    relatedPlaces: [],
    verification: "verified",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "bhutanese-occupation-1700",
    sortYear: 1701,
    yearLabel: "1700 – 1706",
    title: "The Bhutanese occupation",
    era: "Monastic Foundations",
    shortDescription:
      "A succession dispute let Bhutan into the kingdom, and the boy king spent his minority in exile in Tibet.",
    description: [
      "Chakdor Namgyal succeeded as a child in 1700, and his half-sister's claim to the throne brought Bhutanese forces into Sikkim. The young Chogyal was taken to Tibet for safety and the country was occupied for some six years before Tibetan intervention restored him.",
      "The episode set a pattern that held for the next century: a small kingdom with long borders, powerful neighbours on three sides, and a throne whose disputes invited them in.",
    ],
    keyFacts: [
      "Chakdor Namgyal succeeded in 1700 as a minor.",
      "Bhutanese forces occupied the kingdom for roughly six years, to about 1706.",
      "The Chogyal spent the occupation in exile in Tibet and was restored with Tibetan help.",
    ],
    imageKey: "history/punakha-dzong",
    imageNote:
      "A Bhutanese dzong of the period, photographed in Bhutan. It shows the fortress-monastery form of the occupying power, not the occupation itself.",
    sources: [
      wiki("History_of_Sikkim", "The Bhutanese occupation of 1700–1706 during Chakdor Namgyal's minority."),
    ],
    relatedMonasteries: [],
    relatedStories: [],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "phodong-and-the-six-great-monasteries",
    sortYear: 1740,
    yearLabel: "c. 1740",
    title: "Phodong and the six great monasteries",
    era: "Monastic Foundations",
    shortDescription:
      "The Kagyu house of the north road, founded under the fourth Chogyal and counted among the kingdom's six great gompas.",
    description: [
      "Phodong was founded around 1740, under Chogyal Gyurmed Namgyal, and was reckoned one of the six great monasteries of the kingdom — the principal Karma Kagyu seat on the north road out of Gangtok.",
      "Earthquakes levelled the old buildings. What stands today is a rebuild on the original plan, its verandah murals repainted from the originals, and it keeps a festival calendar that has run for more than two and a half centuries.",
      "The point of counting six great monasteries is that the kingdom's religious geography was administrative as well as devotional. These were the houses through which a Buddhist state governed a Buddhist country.",
    ],
    keyFacts: [
      "Founded around 1740 under Chogyal Gyurmed Namgyal, fourth Chogyal (reigned 1716–1733 per the dynastic record).",
      "Counted among the six great monasteries of the kingdom.",
      "The principal Karma Kagyu monastery of north Sikkim.",
      "Rebuilt after earthquake damage, on the old plan.",
    ],
    imageKey: "mon/phodong",
    sources: [
      wiki("Phodong_Monastery", "The c. 1740 foundation, the six great monasteries, and the rebuilding after earthquakes."),
      wiki("Namgyal_dynasty_(Sikkim)", "Gyurmed Namgyal's place in the dynastic succession."),
    ],
    relatedMonasteries: ["phodong", "phensang"],
    relatedStories: ["painting-on-cotton-and-silk", "what-a-gompa-actually-is"],
    relatedPlaces: [],
    verification: "source-backed",
    verificationNote:
      "The dynastic record gives Gyurmed Namgyal's reign as 1716–1733, which does not sit neatly with a c. 1740 foundation. Both figures are as their sources give them; the discrepancy is left visible rather than smoothed away.",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "gorkha-invasions-1788",
    sortYear: 1788,
    yearLabel: "1788 – 1793",
    title: "The Gorkha invasions and the retreat to Tumlong",
    era: "The Colonial Encounter",
    shortDescription:
      "The Gorkha army came east across the Singalila ridge, and the court abandoned Rabdentse for Tumlong.",
    description: [
      "In 1788 the Gorkha army of Nepal invaded Sikkim. The war went badly. Territory west of the Teesta was lost, Rabdentse sat exposed on its ridge, and in 1793 the court withdrew north to Tumlong.",
      "The losses of this period are the reason the next fifty years of Sikkim's history are a history of treaties. A kingdom that could not hold its western districts by arms would spend the nineteenth century trying to recover them by agreement — first with the British against Nepal, then, less happily, with the British against itself.",
    ],
    keyFacts: [
      "The Gorkha army of Nepal invaded in 1788.",
      "The capital moved from Rabdentse to Tumlong in 1793.",
      "Territory lost to Nepal in this period was the subject of the Treaty of Titalia in 1817.",
    ],
    imageKey: "history/anglo-nepalese-war",
    imageNote:
      "A contemporary illustration of the war against the Gorkha kingdom. Illustrative of the adversary and era; it does not depict fighting in Sikkim.",
    sources: [
      wiki("History_of_Sikkim", "The 1788 Gorkha invasion and the 1793 move of the capital to Tumlong."),
    ],
    relatedMonasteries: ["phodong"],
    relatedStories: ["the-capital-the-gurkhas-burned"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },

  /* --------------------------------------------------- The Colonial Encounter */
  {
    slug: "treaty-of-titalia-1817",
    sortYear: 1817,
    yearLabel: "10 February 1817",
    title: "The Treaty of Titalia",
    era: "The Colonial Encounter",
    shortDescription:
      "Britain returned the land Nepal had taken — and took, in exchange, a permanent say in Sikkim's affairs.",
    description: [
      "The Anglo-Nepalese War of 1814–1816 ended with the Treaty of Sugauli, under which Nepal ceded to the East India Company the country between the Mechi and the Teesta — land taken from Sikkim in the preceding decades. On 10 February 1817 the Company handed it back.",
      "The Treaty of Titalia was negotiated by Captain Barre Latter for the Company with three Sikkimese officials: Nazir Chaina Tenjin, Macha Teinbah and Lama Duchim Longadoo. It guaranteed Sikkim's security and restored the annexed territory.",
      "The price was written into the same document. Sikkim undertook not to move against Nepal, to submit disputes to British arbitration, to supply troops on request, and to let Company goods pass duty-free. It is the moment a Himalayan kingdom acquired a protector, and the beginning of the process by which it stopped being independent.",
    ],
    keyFacts: [
      "Signed 10 February 1817 between the Kingdom of Sikkim and the British East India Company.",
      "Negotiated by Captain Barre Latter with Nazir Chaina Tenjin, Macha Teinbah and Lama Duchim Longadoo.",
      "Restored the land between the Mechi and Teesta rivers, ceded by Nepal under the 1816 Treaty of Sugauli.",
      "In return Sikkim accepted British arbitration, supplied troops on request, and granted duty-free transit.",
    ],
    imageKey: "history/kingdom-of-sikkim",
    imageNote:
      "A historical map of the kingdom whose territory the treaty restored.",
    sources: [
      wiki(
        "Treaty_of_Titalia",
        "The 10 February 1817 date, the named signatories, the territory restored, and the obligations Sikkim accepted.",
      ),
      wiki("Treaty_of_Sugauli", "The 1816 cession by Nepal that made the restoration possible."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-capital-the-gurkhas-burned"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "darjeeling-cession-1835",
    sortYear: 1835,
    yearLabel: "1835",
    title: "The cession of Darjeeling",
    era: "The Colonial Encounter",
    shortDescription: "The hill the British wanted for a sanatorium left Sikkim and never came back.",
    description: [
      "An internal disturbance beginning in 1825 gave the British the opening they had been looking for, and in 1835 Darjeeling was ceded to them. What the Company wanted was a hill station — a place to send officers out of the Bengal heat — and what it acquired was the seed of a tea industry and a district that has been part of Bengal ever since.",
      "For Sikkim the loss was permanent, and the resentment it left behind is the background to everything that happened between the kingdom and the British over the following twenty-five years.",
    ],
    keyFacts: [
      "The disturbance that gave the British their opening began in 1825.",
      "Darjeeling was ceded in 1835.",
      "The territory was never returned; it remains part of West Bengal.",
    ],
    imageKey: "history/darjeeling",
    imageNote:
      "Darjeeling today — the hill tract ceded in 1835 and never returned. Photographed in West Bengal, outside Sikkim.",
    sources: [
      wiki("History_of_Sikkim", "The 1825 disturbance and the 1835 cession of Darjeeling."),
    ],
    relatedMonasteries: [],
    relatedStories: [],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "campbell-hooker-1849",
    sortYear: 1849,
    yearLabel: "1849",
    title: "The detention of Campbell and Hooker",
    era: "The Colonial Encounter",
    shortDescription:
      "A superintendent and a botanist strayed over a pass, were detained, and handed Britain a pretext.",
    description: [
      "In 1849 Archibald Campbell, the British superintendent at Darjeeling, and Joseph Dalton Hooker, the botanist whose Sikkim collections would reshape European gardens, travelled into the mountains and crossed the Cho La into Tibet. The Sikkim government detained them, at the instigation of a pro-Tibetan minister the British called the mad Dewan.",
      "They were released, but the incident produced a punitive expedition and further annexation of Sikkimese territory. It is a small event with a long shadow: an accidental border crossing, a diplomatic humiliation, and a map redrawn in consequence.",
    ],
    keyFacts: [
      "Archibald Campbell was superintendent of Darjeeling; Joseph Dalton Hooker was collecting botanically in Sikkim.",
      "The pair strayed across the Cho La into Tibet and were detained by the Sikkim government.",
      "The detention was attributed to a pro-Tibetan minister known to the British as the 'mad Dewan'.",
      "A punitive British expedition and the annexation of further territory followed.",
    ],
    imageKey: "history/joseph-hooker",
    imageNote:
      "Joseph Dalton Hooker, the botanist detained. A portrait of the man; no photograph of the detention exists.",
    sources: [
      wiki(
        "History_of_Sikkim",
        "The 1849 detention of Campbell and Hooker, the crossing of the Cho La, the 'mad Dewan', and the punitive expedition that followed.",
      ),
    ],
    relatedMonasteries: [],
    relatedStories: [],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "treaty-of-tumlong-1861",
    sortYear: 1861,
    yearLabel: "March 1861",
    title: "The Treaty of Tumlong",
    era: "The Colonial Encounter",
    shortDescription: "The document that turned a kingdom into a protectorate in all but name.",
    description: [
      "In March 1861 Sir Ashley Eden concluded a treaty at Tumlong for the British Empire. Sidkeong Namgyal signed for Sikkim in place of his father, who was in Tibet. The terms made Sikkim a de facto British protectorate.",
      "Sikkim paid an indemnity of seven thousand rupees. Britain acquired the right to intervene in the kingdom's internal affairs, the abolition of restrictions on British subjects travelling in Sikkim, duty-free entry for British goods, and permission to build roads through the country.",
      "Roads through the Himalaya were what the treaty was really about. The route to Tibet ran through Sikkim, and every clause about travellers and trade was a clause about that route.",
    ],
    keyFacts: [
      "Concluded in March 1861 between the British Empire and the Kingdom of Sikkim.",
      "Signed by Sir Ashley Eden for Britain and Sidkeong Namgyal for Sikkim.",
      "Sikkim paid an indemnity of 7,000 rupees.",
      "Britain gained the right to intervene internally, free trade, unrestricted travel and road-building rights.",
    ],
    imageKey: "history/tumlong",
    imageNote:
      "Tumlong, where the treaty was signed and the court sat for a century.",
    sources: [
      wiki(
        "Treaty_of_Tumlong",
        "The March 1861 date, the signatories, the indemnity, and the terms that made Sikkim a de facto protectorate.",
      ),
      wiki("History_of_Sikkim", "The treaty's effect on Sikkim's status."),
    ],
    relatedMonasteries: ["phodong"],
    relatedStories: [],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "sikkim-expedition-1888",
    sortYear: 1888,
    yearLabel: "1888",
    title: "The Sikkim Expedition",
    era: "The Colonial Encounter",
    shortDescription: "British and Tibetan forces fought over the northern passes; the north changed hands.",
    description: [
      "In 1888 British forces defeated Tibetan troops who had occupied positions in northern Sikkim, and northern Sikkim came under the rule of British India. It was a border war fought at altitude over the control of the trade routes into Tibet.",
      "Two years later the outcome was written into a treaty between Britain and Qing China, in a negotiation to which neither Sikkim nor Tibet was a party.",
    ],
    keyFacts: [
      "British forces defeated Tibetan troops in 1888.",
      "Northern Sikkim came under the rule of British India as a result.",
      "The settlement was formalised in the Convention of Calcutta in 1890.",
    ],
    imageKey: "history/sikkim-expedition",
    imageNote:
      "A map compiled by the Intelligence Branch during the 1888 expedition.",
    sources: [
      wiki("History_of_Sikkim", "The 1888 defeat of Tibetan forces and northern Sikkim passing under British India."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-old-silk-route-over-zuluk"],
    relatedPlaces: ["nathu-la"],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "convention-of-calcutta-1890",
    sortYear: 1890,
    yearLabel: "17 March 1890",
    title: "The Convention of Calcutta",
    era: "The Colonial Encounter",
    shortDescription:
      "Britain and Qing China fixed Sikkim's status and its northern border — without consulting Sikkim or Tibet.",
    description: [
      "On 17 March 1890 the Viceroy of India, Lord Lansdowne, and the Chinese Amban in Tibet, Sheng Tai, signed a convention at Calcutta. It recognised a British protectorate over Sikkim and defined the boundary between Sikkim and Tibet.",
      "Article 1 drew that boundary along the crest of the range dividing the waters flowing into the Teesta from those flowing north into Tibet, running from Mount Gipmochi on the Bhutan frontier to the Nepal border. That watershed line is still, in substance, the border.",
      "China negotiated without consulting Tibet, and the Tibetans refused to recognise the result — a refusal that led in time to the British expedition to Tibet in 1904. Sikkim, whose status and frontier were the subject of the document, was not a party to it either.",
    ],
    keyFacts: [
      "Signed 17 March 1890 at Calcutta by Lord Lansdowne for Britain and Amban Sheng Tai for Qing China.",
      "Recognised a British protectorate over Sikkim.",
      "Defined the Sikkim–Tibet boundary along the Teesta watershed, from Mount Gipmochi to the Nepal frontier.",
      "Tibet was not consulted and refused to recognise the convention.",
    ],
    imageKey: "place/nathula",
    imageNote:
      "Nathu La, on the watershed line the convention defined. The document itself is not in this archive.",
    sources: [
      wiki(
        "Convention_of_Calcutta",
        "The 17 March 1890 date, the signatories, the recognition of the protectorate, the Article 1 boundary, and Tibet's refusal to recognise it.",
      ),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-pass-that-reopened-after-forty-four-years", "the-old-silk-route-over-zuluk"],
    relatedPlaces: ["nathu-la"],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "capital-gangtok-1894",
    sortYear: 1894,
    yearLabel: "1894",
    title: "The capital moves to Gangtok",
    era: "The Colonial Encounter",
    shortDescription: "The court came down from Tumlong to the ridge that has been the capital ever since.",
    description: [
      "In 1894, during the reign of Thutob Namgyal, the capital was shifted from Tumlong to Gangtok. It has stayed there. The royal chapel, the Tsuklakhang, was built inside the palace compound four years later, and Enchey — the gompa on the ridge above the town — was rebuilt in 1909.",
      "Gangtok's position was chosen for the same reason the British wanted roads through Sikkim: it sits on the route to the Nathu La and the Tibetan trade. The town that grew there is the one visitors arrive in today, and M.G. Marg, its pedestrianised spine, runs along the ridge the court moved to.",
    ],
    keyFacts: [
      "The capital moved from Tumlong to Gangtok in 1894.",
      "Thutob Namgyal, ninth Chogyal, reigned 1874–1914.",
      "The Tsuklakhang, the royal chapel, was built in the palace compound in 1898.",
    ],
    imageKey: "story/mg-marg",
    sources: [
      wiki("History_of_Sikkim", "The 1894 move of the capital to Gangtok."),
      wiki("Namgyal_dynasty_(Sikkim)", "Thutob Namgyal's reign dates of 1874–1914."),
    ],
    relatedMonasteries: ["tsuklakhang", "enchey"],
    relatedStories: ["the-dharma-kings", "the-lama-who-could-fly", "a-day-on-foot-in-gangtok"],
    relatedPlaces: ["do-drul-chorten", "namgyal-institute-of-tibetology"],
    verification: "source-backed",
    mapQuery: "M.G. Marg, Gangtok, Sikkim, India",
    lastVerifiedAt: VERIFIED_ON,
  },

  {
    slug: "enchey-rebuilt-1909",
    sortYear: 1909,
    yearLabel: "1909",
    title: "Enchey is rebuilt above the new capital",
    era: "The Colonial Encounter",
    shortDescription:
      "The gompa on the ridge over Gangtok took its present form, fifteen years after the court arrived below it.",
    description: [
      "The site above Gangtok had been a hermitage since the early nineteenth century, blessed — tradition says — by Druptob Karpo, a tantric master remembered for the power of flight. The temple standing there now was raised in 1909.",
      "The timing follows the capital. The court moved to Gangtok in 1894; within a generation the town had a royal chapel in the palace compound and a rebuilt gompa on the ridge above it. A capital in this kingdom was not complete until its religious architecture was.",
      "Enchey's two-day Cham festival before Losar is still the capital's great winter gathering.",
    ],
    keyFacts: [
      "The present temple was raised in 1909.",
      "The site was blessed in the early 19th century by the tantric master Druptob Karpo — recorded as legend, not as record.",
      "Its Cham dances before Losar remain Gangtok's principal winter festival.",
    ],
    imageKey: "story/enchey",
    sources: [
      wiki("Enchey_Monastery", "The 1909 rebuilding, the Druptob Karpo tradition, and the pre-Losar Cham festival."),
    ],
    relatedMonasteries: ["enchey", "tsuklakhang"],
    relatedStories: ["the-lama-who-could-fly", "dancing-the-year-into-the-ground"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },

  /* ------------------------------------------------- Political Transformation */
  {
    slug: "indo-sikkim-treaty-1950",
    sortYear: 1950,
    yearLabel: "December 1950",
    title: "Sikkim becomes an Indian protectorate",
    era: "Political Transformation",
    shortDescription:
      "When the British left, the protectorate passed to India — and the kingdom kept its throne for another twenty-five years.",
    description: [
      "British paramountcy ended with British India, and what followed for Sikkim was a standstill agreement with the new Indian government in 1948 and then, in December 1950, a treaty. It gave Sikkim the status of an Indian protectorate: India took responsibility for defence, external affairs and communications, and the Chogyal continued to rule internally.",
      "That arrangement held for a quarter of a century. It ended, in the end, not because India tore it up but because the politics inside Sikkim outgrew it.",
    ],
    keyFacts: [
      "A standstill agreement was signed between India and Sikkim in 1948.",
      "The India–Sikkim treaty of December 1950 made Sikkim an Indian protectorate.",
      "India assumed responsibility for defence, external affairs and communications.",
      "The Chogyal continued to rule internally until 1975.",
    ],
    imageKey: "history/palden-thondup-namgyal",
    imageNote:
      "Palden Thondup Namgyal, who reigned through the protectorate years.",
    sources: [
      wiki("Sikkim", "The 1950 treaty giving Sikkim the status of an Indian protectorate."),
      wiki("History_of_Sikkim", "The December 1950 India–Sikkim Peace Treaty and the 1948 standstill agreement."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-year-the-kingdom-became-a-state"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "nathu-la-1962",
    sortYear: 1962,
    yearLabel: "1962",
    title: "Nathu La closes",
    era: "Political Transformation",
    shortDescription: "The Sino-Indian War shut the pass, and with it the trade route Sikkim had lived on.",
    description: [
      "Nathu La is a pass on the border between Sikkim and Tibet, and for centuries it carried the trade between them — wool, salt and yak tails going one way, cotton and grain the other. The Sino-Indian War of 1962 closed it.",
      "The closure lasted forty-four years. Villages along the old road east of Gangtok lost the traffic they had been built around, and the Silk Route through East Sikkim became a scenic drive rather than a working one.",
    ],
    keyFacts: [
      "Nathu La sits on the India–China border in what is now Gangtok district.",
      "The pass was closed following the Sino-Indian War of 1962.",
      "It remained closed for forty-four years.",
    ],
    imageKey: "story/silk-route",
    sources: [
      wiki("Sikkim", "The closure of Nathu La from 1962."),
      wiki("Nathu_La", "The pass, its position on the historic trade route, and its closure."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-pass-that-reopened-after-forty-four-years", "the-old-silk-route-over-zuluk"],
    relatedPlaces: ["nathu-la", "tsomgo-lake"],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "rumtek-consecrated-1966",
    sortYear: 1966,
    yearLabel: "1966",
    title: "The Karmapa's seat-in-exile at Rumtek",
    era: "Political Transformation",
    shortDescription:
      "The treasures of Tsurphu crossed the Himalaya in 1959, and by 1966 a lineage had a new seat on a ridge facing Gangtok.",
    description: [
      "In 1959 the 16th Gyalwang Karmapa left Tibet, carrying the treasures of Tsurphu — the lineage's monastery there — and chose a ridge facing Gangtok to rebuild. An earlier Rumtek gompa had stood on the site since the eighteenth century.",
      "The new seat was inaugurated in 1966 as the Dharma Chakra Centre, and it grew into a working institution rather than a monument: main temple, shedra college, retreat centre, and the Golden Stupa where the 16th Karmapa's relics rest. It is the largest monastic complex in Sikkim.",
      "It is also the focal point of the dispute within the Karma Kagyu school known as the 17th Karmapa controversy. This archive records that the dispute exists and takes no side in it.",
    ],
    keyFacts: [
      "The 16th Karmapa left Tibet in 1959 with the treasures of Tsurphu.",
      "The present seat was inaugurated in 1966 as the Dharma Chakra Centre.",
      "An earlier Rumtek gompa had stood on the site since the 18th century.",
      "It is the largest monastic complex in Sikkim and the Karma Kagyu seat in exile.",
    ],
    imageKey: "story/rumtek-interior",
    sources: [
      wiki(
        "Rumtek_Monastery",
        "The 1959 departure from Tibet, the 1966 inauguration, the earlier 18th-century gompa, and the 17th Karmapa controversy.",
      ),
    ],
    relatedMonasteries: ["rumtek", "lingdum"],
    relatedStories: ["the-relics-that-crossed-the-mountains", "the-monastery-at-the-centre-of-the-compass"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "agitation-1973",
    sortYear: 1973,
    yearLabel: "1973",
    title: "The agitation",
    era: "Political Transformation",
    shortDescription: "Anti-royalist protests filled the streets of Gangtok, and Indian security forces put them down.",
    description: [
      "In 1973 anti-royalist agitations broke out in Sikkim on a scale the kingdom's own administration could not contain, and Indian security forces were used to quell them. The grievances were about representation: the electoral arrangements of the kingdom weighted seats between communities in a way its opponents held to be indefensible.",
      "What followed was two years of constitutional change that ran in one direction only, ending with the referendum of 1975.",
    ],
    keyFacts: [
      "Anti-royalist agitations took place across Sikkim in 1973.",
      "Indian security forces were used to restore order.",
      "The agitation began the constitutional process that ended the monarchy two years later.",
    ],
    imageKey: "history/tsuklakhang-palace",
    imageNote:
      "The royal chapel in the palace compound at Gangtok, before which the agitation gathered. Not a photograph of the protests.",
    sources: [
      wiki("Sikkim", "The 1973 anti-royalist agitations and the use of Indian security forces."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-year-the-kingdom-became-a-state"],
    relatedPlaces: [],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "referendum-and-statehood-1975",
    sortYear: 1975,
    yearLabel: "14 April – 16 May 1975",
    title: "The referendum, and the end of the kingdom",
    era: "Political Transformation",
    shortDescription:
      "A vote abolished a 333-year monarchy, and Sikkim became the twenty-second state of the Indian Union.",
    description: [
      "On 14 April 1975 Sikkim voted on whether to abolish the monarchy and merge with India. The referendum was ordered by Chief Minister Kazi Lhendup Dorji following a resolution of the National Assembly. Turnout was about 63 per cent. Of the votes cast, 59,637 — 97.55 per cent — were in favour and 1,496 against.",
      "The Constitution (Thirty-Sixth Amendment) Act was ratified by President Fakhruddin Ali Ahmed on 15 May, and Sikkim became the 22nd state of the Indian Union on 16 May 1975. Palden Thondup Namgyal, twelfth and last Chogyal, had reigned since 1963. The Government of Sikkim's own account records Kazi Lhendup Dorji as the state's first Chief Minister.",
      "The result was contested, and this archive records the contest rather than smoothing it over. The journalist Sunanda K. Datta-Ray argued that it would not have been physically possible to complete the arrangements, hold the polls and count the votes between 11 and 15 April given the difficulty of reaching remote areas. Supporters of the Chogyal claimed that a large majority of voters were not Sikkimese. The Chogyal called the referendum illegal and unconstitutional; China and Pakistan called it a disguise for annexation.",
      "What is not in dispute is the outcome. The Namgyal dynasty had ruled for 333 years, and after 16 May 1975 it did not. The monasteries it endowed remain, which is most of what this archive is about.",
    ],
    keyFacts: [
      "The referendum was held on 14 April 1975; turnout was approximately 63 per cent.",
      "59,637 votes (97.55%) were cast in favour of abolishing the monarchy; 1,496 (2.45%) against.",
      "The Thirty-Sixth Amendment was ratified on 15 May 1975; statehood took effect on 16 May 1975.",
      "Sikkim became the 22nd state of the Indian Union; Kazi Lhendup Dorji became its first Chief Minister.",
      "Palden Thondup Namgyal was the twelfth and last Chogyal, ending a dynasty founded in 1642.",
    ],
    imageKey: "history/chogyal",
    imageNote:
      "The Chogyal and Gyalmo with their daughter in Gangtok. The monarchy shown here ended with the referendum.",
    sources: [
      govSikkim(
        "Sikkim becoming the 22nd state of India in 1975 following a political transition, and Kazi Lhendup Dorji as its first Chief Minister.",
      ),
      wiki(
        "1975_Sikkimese_monarchy_referendum",
        "The 14 April 1975 date, the turnout and vote counts, the 15 May ratification, and the objections raised by Datta-Ray, the Chogyal, China and Pakistan.",
      ),
      wiki("Sikkim", "The 97.5 per cent result and 16 May 1975 as the date Sikkim became the 22nd state."),
      wiki("Namgyal_dynasty_(Sikkim)", "Palden Thondup Namgyal's reign and the abolition of the monarchy."),
    ],
    relatedMonasteries: ["tsuklakhang", "pemayangtse"],
    relatedStories: ["the-year-the-kingdom-became-a-state", "the-dharma-kings", "the-throne-of-stone-at-norbugang"],
    relatedPlaces: [],
    verification: "verified",
    verificationNote:
      "The dates and figures are corroborated across government and reference sources. The conduct of the referendum was and remains contested; the objections are set out in the account above rather than omitted.",
    lastVerifiedAt: VERIFIED_ON,
  },

  /* -------------------------------------------------------------- Modern Sikkim */
  {
    slug: "nathu-la-2006",
    sortYear: 2006,
    yearLabel: "6 July 2006",
    title: "Nathu La reopens",
    era: "Modern Sikkim",
    shortDescription: "After forty-four years the pass opened again to cross-border trade.",
    description: [
      "On 6 July 2006 Nathu La was opened to cross-border trade for the first time since 1962. The volumes have been modest and the trading days limited, but the reopening changed what the old Silk Route road through East Sikkim means: a working border again, rather than a closed one.",
      "For visitors it made a drive to 4,300 metres possible, on a permit, past Tsomgo Lake and up to the fence itself.",
    ],
    keyFacts: [
      "The pass reopened to cross-border trade on 6 July 2006.",
      "It had been closed since the Sino-Indian War of 1962 — forty-four years.",
      "Visits require a protected-area permit arranged through registered operators.",
    ],
    imageKey: "place/nathula",
    sources: [
      wiki("Sikkim", "The 6 July 2006 opening of Nathu La to cross-border trade."),
      wiki("Nathu_La", "The pass and its status."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-pass-that-reopened-after-forty-four-years", "the-old-silk-route-over-zuluk"],
    relatedPlaces: ["nathu-la", "tsomgo-lake"],
    verification: "source-backed",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "khangchendzonga-unesco-2016",
    sortYear: 2016,
    yearLabel: "July 2016",
    title: "Khangchendzonga becomes a World Heritage site",
    era: "Modern Sikkim",
    shortDescription:
      "India's first mixed World Heritage property — inscribed for its living sacred landscape as much as its ecology.",
    description: [
      "In July 2016 Khangchendzonga National Park was inscribed on the UNESCO World Heritage List as a mixed property — the first in India — under criteria (iii), (vi), (vii) and (x). The park itself was established in 1977.",
      "The mixed designation is the point. Criteria (iii) and (vi) are cultural criteria, and they are what recognise that this landscape is not merely spectacular terrain: it is a sacred geography, with Kanchenjunga venerated as the guardian of the land and a body of practice, myth and ceremony attached to specific peaks, lakes, caves and rocks within the property.",
      "In other words, the case that Sikkim's mountains and Sikkim's monasteries are one heritage rather than two is not this archive's invention. It is the basis on which the property was listed.",
    ],
    keyFacts: [
      "Inscribed in July 2016 under criteria (iii), (vi), (vii) and (x).",
      "The first mixed natural-and-cultural World Heritage property in India.",
      "Khangchendzonga National Park was established in 1977.",
      "Kanchenjunga is 8,586 m — the third-highest peak in the world and the highest in India.",
    ],
    imageKey: "hero/kanchenjunga",
    sources: [
      {
        name: SOURCES["unesco-whc"]!.name,
        url: SOURCES["unesco-whc"]!.url,
        type: "government",
        covers: "The property record, its inscription year, mixed status and criteria.",
      },
      wiki(
        "Khangchendzonga_National_Park",
        "The July 2016 inscription as India's first mixed World Heritage site, criteria (iii)(vi)(vii)(x), and the park's establishment in 1977.",
      ),
    ],
    relatedMonasteries: ["pemayangtse", "dubdi", "tashiding"],
    relatedStories: ["the-park-that-is-both-nature-and-culture", "why-a-mountain-commands-an-army", "the-five-treasures-of-the-great-snow"],
    relatedPlaces: ["khecheopalri-lake", "yumthang-valley"],
    verification: "verified",
    verificationNote:
      "The UNESCO property page answers automated requests with 403, so the inscription year, type and criteria were taken from the encyclopedia record of the property. Both are cited.",
    lastVerifiedAt: VERIFIED_ON,
  },
  {
    slug: "organic-state-2016",
    sortYear: 2017,
    yearLabel: "2016",
    title: "India's first fully organic state",
    era: "Modern Sikkim",
    shortDescription:
      "Chemical fertilisers and pesticides were banned outright, across every field in the state.",
    description: [
      "The Government of Sikkim's own account states that the state became India's first fully organic state in 2016, banning chemical fertilisers and pesticides to promote sustainable agriculture. Reference accounts describe the conversion as having been completed in 2015, with the declaration following; both are recorded here rather than reconciled.",
      "The policy is not incidental to heritage. Sikkim's agriculture is terraced, small-holding and hand-worked, and its signature crops — large cardamom under forest shade, the tea at Temi, the millet that becomes tongba — are grown by methods that predate the chemicals being banned. The organic policy formalised a practice as much as it changed one.",
    ],
    keyFacts: [
      "The Government of Sikkim records the state as becoming India's first fully organic state in 2016.",
      "Chemical fertilisers and pesticides were banned.",
      "Reference accounts date the completion of the conversion to 2015, ahead of the declaration.",
    ],
    imageKey: "story/terrace-farming",
    sources: [
      govSikkim(
        "Sikkim becoming India's first fully organic state in 2016, and the ban on chemical fertilisers and pesticides.",
      ),
      wiki("Sikkim", "The alternative dating of the conversion to 2015."),
    ],
    relatedMonasteries: [],
    relatedStories: ["the-terraces-that-turned-organic", "indias-only-himalayan-tea-garden"],
    relatedPlaces: [],
    verification: "verified",
    verificationNote:
      "The Government of Sikkim says 2016; the encyclopedia record says the goal was achieved in 2015. The government source is followed for the headline year and the discrepancy is stated.",
    lastVerifiedAt: VERIFIED_ON,
  },
];

/* ------------------------------------------------------------------ accessors */

/** Chronological order — the order the timeline renders in. */
export const historyTimeline: HistoryEvent[] = [...historyEvents].sort(
  (a, b) => a.sortYear - b.sortYear,
);

export function getHistoryEvent(slug: string): HistoryEvent | undefined {
  return historyEvents.find((event) => event.slug === slug);
}

export function getEventsForEra(era: HistoryEra): HistoryEvent[] {
  return historyTimeline.filter((event) => event.era === era);
}

/** Events that name this monastery — powers the "In the timeline" rail. */
export function getEventsForMonastery(slug: string): HistoryEvent[] {
  return historyTimeline.filter((event) => event.relatedMonasteries.includes(slug));
}

export function getEventsForStory(slug: string): HistoryEvent[] {
  return historyTimeline.filter((event) => event.relatedStories.includes(slug));
}

/** Neighbours in the timeline, for the previous/next control on a detail page. */
export function getAdjacentEvents(slug: string): {
  previous: HistoryEvent | null;
  next: HistoryEvent | null;
} {
  const index = historyTimeline.findIndex((event) => event.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: historyTimeline[index - 1] ?? null,
    next: historyTimeline[index + 1] ?? null,
  };
}

/** A Maps search built from a real place name — never an invented coordinate. */
export function eventMapUrl(event: HistoryEvent): string | null {
  if (!event.mapQuery) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.mapQuery)}`;
}

/** Counts for the preservation dashboard. Computed, never hardcoded. */
export const HISTORY_COVERAGE = {
  total: historyEvents.length,
  verified: historyEvents.filter((e) => e.verification === "verified").length,
  sourceBacked: historyEvents.filter((e) => e.verification === "source-backed").length,
  oralTradition: historyEvents.filter((e) => e.verification === "oral tradition").length,
  withImage: historyEvents.filter((e) => e.imageKey !== null).length,
  eras: HISTORY_ERAS.length,
  citations: historyEvents.reduce((sum, e) => sum + e.sources.length, 0),
} as const;
