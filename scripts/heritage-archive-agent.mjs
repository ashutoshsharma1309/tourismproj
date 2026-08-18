#!/usr/bin/env node
/**
 * Heritage Archive Agent — Ney Heritage
 * =====================================
 *
 * Builds the media registry behind the NEY Digital Heritage Archive.
 *
 * The archive's rule is the project's rule (§0, §22): nothing ships without a
 * named source, a licence and an attribution. This agent is what enforces that
 * mechanically rather than on trust. For every curated item it:
 *
 *   1. SUBJECT   — resolves the item's subject article on Wikipedia, confirms
 *                  it exists, and pulls the lead extract. An item whose subject
 *                  article cannot be resolved does NOT ship; it is reported.
 *   2. MEDIA     — resolves the Commons file to a stable URL and reads the
 *                  licence, licence URL, author and credit out of Commons'
 *                  own extmetadata. A file with no readable licence does NOT
 *                  ship.
 *   3. VENDOR    — downloads the file into public/images/, because this project
 *                  does not hotlink upload.wikimedia.org (see src/data/images.ts
 *                  for why: rate-limited hotlinks rendered broken on first load).
 *   4. REGISTER  — writes src/data/generated/archive-items.json.
 *
 * Files already resolved by scripts/sikkim-cultural-research.mjs are reused
 * from src/data/generated/story-images.json rather than re-queried.
 *
 * Wikimedia rate-limits hard, so calls are spaced with backoff — the same
 * discipline as scripts/heritage-discovery.mjs.
 *
 *   node scripts/heritage-archive-agent.mjs            # everything
 *   node scripts/heritage-archive-agent.mjs --no-media # metadata only
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA =
  "NeyHeritage-archive-agent/1.0 (https://github.com/ashutoshsharma1309/tourismproj; cultural heritage documentation)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const OUT_IMAGES = join(ROOT, "public/images");
const OUT_JSON = join(ROOT, "src/data/generated/archive-items.json");

const SKIP_MEDIA = process.argv.includes("--no-media");
const FORCE = process.argv.includes("--force");

/* =========================================================================
   THE CURATED ARCHIVE

   Each entry names: the image key, the subject's own Wikipedia article, the
   category, and the community / location / period the item belongs to.

   `sikkimSubject: false` marks a photograph that illustrates a tradition
   shared across the Himalaya but was NOT taken in Sikkim. Those items ship
   with the place of capture stated on the card and on the detail page, and
   they never claim to depict a named Sikkim site. Mislabelling one of these
   is exactly the failure this field exists to prevent.
   ========================================================================= */

const ITEMS = [
  /* ------------------------------------------------ historic sites & objects */
  {
    key: "story/coronation-throne",
    title: "The coronation throne at Norbugang",
    category: "Historic sites",
    wiki: "Yuksom",
    community: "Bhutia",
    location: "Yuksom, Gyalshing district",
    period: "1642",
    mediaType: "image",
    monasteries: ["dubdi"],
    events: ["yuksom-coronation-1642"],
    stories: ["the-throne-of-stone-at-norbugang"],
    note: "The stone throne at Norbugang, Yuksom, where the first Chogyal was consecrated in 1642.",
  },
  {
    key: "story/kabi-lungchok",
    title: "Kabi Lungchok, site of the blood-brotherhood",
    category: "Historic sites",
    wiki: "Kabi_Lungchok",
    community: "Lepcha and Bhutia",
    location: "Kabi, Mangan district",
    period: "Undated tradition",
    mediaType: "image",
    monasteries: [],
    events: ["kabi-lungchok-treaty"],
    stories: ["the-treaty-sworn-at-kabi"],
    note: "The memorial ground at Kabi where the treaty of brotherhood between the Lepcha and the Bhutia is remembered.",
  },
  {
    key: "story/rabdentse",
    title: "The ruins of Rabdentse",
    category: "Historic sites",
    wiki: "Rabdentse",
    community: "Bhutia",
    location: "Gyalshing district",
    period: "c. 1670 – 1814",
    mediaType: "image",
    monasteries: ["pemayangtse"],
    events: ["rabdentse-capital-1670"],
    stories: ["the-capital-the-gurkhas-burned", "the-dharma-kings"],
    note: "What remains of Sikkim's second capital, on the ridge below Pemayangtse.",
  },
  {
    key: "story/silk-route",
    title: "The old Silk Route through East Sikkim",
    category: "Historic sites",
    wiki: "Nathu_La",
    community: null,
    location: "Pakyong district",
    period: "Historic trade route",
    mediaType: "image",
    monasteries: [],
    events: ["nathu-la-1962", "nathu-la-2006"],
    stories: ["the-old-silk-route-over-zuluk", "the-pass-that-reopened-after-forty-four-years"],
    note: "The zig-zag road climbing toward the passes that carried trade between Sikkim and Tibet.",
  },

  /* -------------------------------------------------------- monastery heritage */
  {
    key: "story/rumtek-interior",
    title: "Inside Rumtek Monastery",
    category: "Monastery heritage",
    wiki: "Rumtek_Monastery",
    community: "Bhutia",
    location: "Gangtok district",
    period: "Consecrated 1966",
    mediaType: "image",
    monasteries: ["rumtek"],
    events: [],
    stories: ["the-relics-that-crossed-the-mountains", "the-monastery-at-the-centre-of-the-compass"],
    note: "Interior detail at the Dharma Chakra Centre, seat-in-exile of the Karmapa.",
  },
  {
    key: "story/enchey",
    title: "Enchey Monastery above Gangtok",
    category: "Monastery heritage",
    wiki: "Enchey_Monastery",
    community: "Bhutia",
    location: "Gangtok district",
    period: "Present temple 1909",
    mediaType: "image",
    monasteries: ["enchey"],
    events: [],
    stories: ["the-lama-who-could-fly"],
    note: "The capital's principal Nyingma gompa, on the ridge blessed by Druptob Karpo.",
  },
  {
    key: "story/dzongu",
    title: "Tingvong Monastery, Upper Dzongu",
    category: "Community heritage",
    wiki: "Lepcha_people",
    community: "Lepcha",
    location: "Dzongu, Mangan district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: ["lepcha-settlement"],
    stories: ["the-valley-reserved-for-the-lepchas"],
    note: "A gompa in Dzongu, the reserve held for the Lepcha community in North Sikkim.",
  },
  {
    key: "story/samdruptse",
    title: "The Guru Padmasambhava statue at Samdruptse",
    category: "Architecture",
    wiki: "Namchi",
    community: "Bhutia",
    location: "Namchi, Namchi district",
    period: "Completed 2004",
    mediaType: "image",
    monasteries: [],
    events: ["guru-rinpoche-passage"],
    stories: ["the-four-points-of-the-hidden-valley", "south-sikkims-two-hills"],
    note: "The hilltop statue of Guru Rinpoche above Namchi.",
  },

  /* ---------------------------------------------------------------- festivals */
  {
    key: "story/black-hat-dance",
    title: "The Black Hat dance",
    category: "Dance",
    wiki: "Cham_dance",
    community: "Bhutia",
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: ["enchey", "phensang", "ralang"],
    events: ["pang-lhabsol-instituted"],
    stories: ["dancing-the-year-into-the-ground", "eight-tantric-gods-and-a-bonfire"],
    note: "A Black Hat dancer, one of the masked forms of Cham performed in Sikkimese monasteries.",
  },
  {
    key: "story/indra-jatra",
    title: "Indra Jatra chariot procession",
    category: "Festivals",
    wiki: "Indra_Jatra",
    community: "Newar",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-rain-kings-festival-kept-in-sikkim"],
    sikkimSubject: false,
    captureNote:
      "Photographed in Nepal. Indra Jatra is kept by Newar communities across the eastern Himalaya, Sikkim's among them; no openly licensed photograph of a Sikkim observance was found.",
  },

  /* -------------------------------------------------------------------- dance */
  {
    key: "story/maruni",
    title: "Maruni dance",
    category: "Dance",
    wiki: "Maruni",
    community: "Nepali",
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-eleven-dances-of-three-communities"],
    note: "One of the oldest Nepali folk dances, performed in Sikkim at Tihar and at weddings.",
  },
  {
    key: "story/sakela",
    title: "Sakela Silli dance",
    category: "Dance",
    wiki: "Sakela",
    community: "Rai (Kirat)",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-eleven-dances-of-three-communities"],
    sikkimSubject: false,
    captureNote:
      "Photographed at Dharan, Nepal. Sakela is the principal festival of the Kirat Rai, a community present in Sikkim; no openly licensed photograph of a Sikkim observance was found.",
  },

  /* -------------------------------------------------------------------- music */
  {
    key: "story/naumati",
    title: "Naumati baja, the nine-instrument ensemble",
    category: "Music",
    wiki: "Naumati_baaja",
    community: "Nepali",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-drum-no-celebration-is-complete-without", "the-eleven-dances-of-three-communities"],
    sikkimSubject: false,
    captureNote:
      "Photographed in Nepal. The naumati baja is played at Nepali ceremonies across the eastern Himalaya, Sikkim included.",
  },
  {
    key: "story/chyabrung",
    title: "Chyabrung, the Limbu drum",
    category: "Music",
    wiki: "Chyabrung",
    community: "Limbu",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-drum-you-wear"],
    sikkimSubject: false,
    captureNote:
      "Photographed at a Rai and Limbu gathering outside Sikkim. The chyabrung is a Limbu instrument; the Limbu are one of Sikkim's recognised communities.",
  },
  {
    key: "story/dhyangro",
    title: "The dhyangro, a shaman's frame drum",
    category: "Music",
    wiki: "Dhyangro",
    community: "Rai and Limbu",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-shaman-who-lives-in-the-forest", "the-healers-sikkim-still-keeps"],
    sikkimSubject: false,
    captureNote:
      "Photographed at a Rai Mangpa ritual outside Sikkim. The dhyangro is used by shamans of communities present in Sikkim.",
  },

  /* ----------------------------------------------------------- oral traditions */
  {
    key: "story/banjhakri-statues",
    title: "Ban Jhakri and the taken child",
    category: "Oral traditions",
    wiki: "Banjhakri_and_Banjhakrini",
    community: "Nepali",
    location: "Gangtok district",
    period: "Undated tradition",
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-shaman-who-lives-in-the-forest"],
    claim: "oral tradition",
    note: "Statues at Gangtok depicting the forest shaman of Nepali tradition and the child he is said to take for initiation.",
  },
  {
    key: "story/banjhakri-falls",
    title: "Ban Jhakri Falls, Gangtok",
    category: "Sacred landscapes",
    wiki: "Banjhakri_Falls_and_Energy_Park",
    community: "Nepali",
    location: "Gangtok district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-shaman-who-lives-in-the-forest"],
    note: "The falls and energy park at Gangtok named for the forest shaman of Nepali tradition.",
  },

  /* --------------------------------------------------------- community heritage */
  {
    key: "story/lepcha-portrait",
    title: "Portrait of an unnamed Lepcha woman",
    category: "Historical photographs",
    wiki: "Lepcha_people",
    community: "Lepcha",
    location: "Sikkim",
    period: "19th century",
    mediaType: "image",
    monasteries: [],
    events: ["lepcha-settlement"],
    stories: ["the-people-who-say-they-never-arrived", "the-scholar-killed-for-an-alphabet"],
    note: "A 19th-century studio photograph held by the Rijksmuseum. The sitter's name was not recorded.",
  },
  {
    key: "story/limbu-house",
    title: "A Limbu house at Hee-Kengbari",
    category: "Architecture",
    wiki: "Limbu_people",
    community: "Limbu",
    location: "Hee-Kengbari, Gyalshing district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["a-house-with-no-nails"],
    note: "Domestic architecture in a Limbu village in West Sikkim.",
  },

  /* ------------------------------------------------------------------ clothing */
  {
    key: "story/dhaka-topi",
    title: "The dhaka topi",
    category: "Clothing",
    wiki: "Dhaka_topi",
    community: "Nepali",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["who-the-nepali-of-sikkim-actually-are"],
    sikkimSubject: false,
    captureNote:
      "Photographed in Nepal. The dhaka topi, woven from dhaka cloth, is worn by Nepali communities in Sikkim.",
  },

  /* -------------------------------------------------------------- food heritage */
  {
    key: "story/sel-roti",
    title: "Sel roti",
    category: "Food heritage",
    wiki: "Sel_roti",
    community: "Nepali",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-ring-of-bread-that-means-its-tihar", "fifteen-days-of-dashain-five-of-tihar"],
    sikkimSubject: false,
    captureNote: "Photographed outside Sikkim. Sel roti is made in Sikkimese Nepali households at Tihar and Dashain.",
  },
  {
    key: "story/gundruk",
    title: "Gundruk",
    category: "Food heritage",
    wiki: "Gundruk",
    community: "Nepali",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["why-sikkim-ferments-almost-everything", "what-grows-wild-and-gets-eaten"],
    sikkimSubject: false,
    captureNote: "Photographed outside Sikkim. Gundruk — fermented leafy greens — is a staple of the Sikkimese kitchen.",
  },
  {
    key: "story/momo",
    title: "Momo",
    category: "Food heritage",
    wiki: "Momo_(food)",
    community: "Bhutia and Nepali",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["sikkim-eats-what-the-road-brought"],
    sikkimSubject: false,
    captureNote: "Photographed outside Sikkim. The momo is eaten across the eastern Himalaya, Sikkim included.",
  },
  {
    key: "story/thukpa",
    title: "Thukpa",
    category: "Food heritage",
    wiki: "Thukpa",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["sikkim-eats-what-the-road-brought"],
    sikkimSubject: false,
    captureNote: "Photographed outside Sikkim. Thukpa is a Tibetan noodle soup eaten throughout the Sikkim hills.",
  },
  {
    key: "story/chhurpi",
    title: "Chhurpi",
    category: "Food heritage",
    wiki: "Chhurpi",
    community: "Bhutia and Nepali",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-cheese-you-chew-for-five-hours"],
    note: "Hardened yak- or cow-milk cheese, a Himalayan preservation method as much as a food.",
  },
  {
    key: "story/tongba",
    title: "Tongba, the Limbu millet brew",
    category: "Food heritage",
    wiki: "Tongba",
    community: "Limbu",
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-drink-you-sip-through-a-straw"],
    note: "Fermented millet drunk hot through a bamboo straw from its own wooden vessel.",
  },

  /* -------------------------------------------------------- traditional knowledge */
  {
    key: "story/temi-tea",
    title: "Temi Tea Garden",
    category: "Traditional knowledge",
    wiki: "Temi_Tea_Garden",
    community: null,
    location: "Temi, Namchi district",
    period: "Established 1969",
    mediaType: "image",
    monasteries: [],
    events: ["organic-state-2016"],
    stories: ["indias-only-himalayan-tea-garden"],
    note: "Sikkim's only tea estate, on the slope below Tendong.",
  },
  {
    key: "story/cardamom",
    title: "Large cardamom",
    category: "Traditional knowledge",
    wiki: "Amomum_subulatum",
    community: null,
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: ["organic-state-2016"],
    stories: ["the-terraces-that-turned-organic"],
    note: "The state's signature cash crop, grown under forest shade on terraced slopes.",
  },
  {
    key: "story/terrace-farming",
    title: "Terraced fields in the Sikkim hills",
    category: "Traditional knowledge",
    wiki: "Terrace_(agriculture)",
    community: null,
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: ["organic-state-2016"],
    stories: ["the-terraces-that-turned-organic"],
    note: "Terracing, the technique that makes cultivation possible on these gradients.",
  },
  {
    key: "story/yak",
    title: "Yak above Tsomgo",
    category: "Traditional knowledge",
    wiki: "Domestic_yak",
    community: "Bhutia",
    location: "Gangtok district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["life-at-the-top-of-the-road", "the-cheese-you-chew-for-five-hours"],
    note: "High-altitude herding, the economy behind chhurpi, wool and transport above the tree line.",
  },

  /* ----------------------------------------------------------- sacred landscapes */
  {
    key: "story/prayer-flags",
    title: "Prayer flags at Khecheopalri",
    category: "Sacred landscapes",
    wiki: "Prayer_flag",
    community: "Bhutia and Lepcha",
    location: "Khecheopalri, Gyalshing district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-lake-where-no-leaf-floats"],
    note: "Flags strung above the lake revered by both Buddhist and Lepcha communities.",
  },
  {
    key: "story/barsey",
    title: "Rhododendron in bloom at Barsey",
    category: "Sacred landscapes",
    wiki: "Varsey_Rhododendron_Sanctuary",
    community: null,
    location: "Soreng district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["four-kilometres-through-rhododendron"],
    note: "The rhododendron sanctuary on the Singalila ridge, in flower.",
  },
  {
    key: "story/teesta-confluence",
    title: "Where the Rangeet meets the Teesta",
    category: "Sacred landscapes",
    wiki: "Teesta_River",
    community: null,
    location: "Sikkim–West Bengal border",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["a-dip-where-two-rivers-meet"],
    note: "The confluence that drains almost the whole of Sikkim.",
  },
  {
    key: "story/red-panda",
    title: "Red panda, the state animal",
    category: "Sacred landscapes",
    wiki: "Red_panda",
    community: null,
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: ["khangchendzonga-unesco-2016"],
    stories: ["the-park-that-is-both-nature-and-culture"],
    note: "Sikkim's state animal, resident in the forests of the Khangchendzonga landscape.",
  },
  {
    key: "story/aritar-lake",
    title: "Lampokhari, Aritar",
    category: "Sacred landscapes",
    wiki: "Aritar",
    community: null,
    location: "Aritar, Pakyong district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["a-lake-that-was-read-like-a-book", "the-old-silk-route-over-zuluk"],
    note: "One of the oldest natural lakes in Sikkim, on the old Silk Route road.",
  },

  /* ------------------------------------------------------------------ architecture */
  {
    key: "story/singshore",
    title: "Singshore Bridge",
    category: "Architecture",
    wiki: "Singshore_Bridge,_Pelling",
    community: null,
    location: "Gyalshing district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-seven-stops-of-the-west-sikkim-circuit"],
    note: "The gorge-spanning suspension bridge above Uttarey.",
  },
  {
    key: "story/mg-marg",
    title: "M.G. Marg, Gangtok",
    category: "Architecture",
    wiki: "Gangtok",
    community: null,
    location: "Gangtok",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: ["capital-gangtok-1894"],
    stories: ["a-day-on-foot-in-gangtok", "where-the-hills-come-to-sell"],
    note: "The pedestrianised centre of the capital the Chogyals moved to in 1894.",
  },
  {
    key: "story/chardham",
    title: "Siddhesvara Dham, Namchi",
    category: "Architecture",
    wiki: "Namchi",
    community: "Nepali",
    location: "Solophok, Namchi district",
    period: "Opened 2011",
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["south-sikkims-two-hills"],
    note: "The Hindu pilgrimage complex at Solophok — a reminder that Sikkim's sacred landscape is not only Buddhist.",
  },

  /* =====================================================================
     Items drawn from the photography already vendored for the catalogue.
     Their Commons file pages come from src/data/generated/image-credits.json;
     licence and author are resolved here the same way as everything else.
     ===================================================================== */

  /* Monastery photographs — one per catalogued site. */
  ...[
    ["rumtek", "Rumtek Monastery", "Rumtek_Monastery", "Gangtok district", "Consecrated 1966"],
    ["pemayangtse", "Pemayangtse Monastery", "Pemayangtse_Monastery", "Gyalshing district", "Founded 1705"],
    ["tashiding", "Tashiding Monastery", "Tashiding_Monastery", "Gyalshing district", "Founded 1717"],
    ["enchey", "Enchey Monastery", "Enchey_Monastery", "Gangtok district", "Present temple 1909"],
    ["lingdum", "Lingdum (Ranka) Monastery", "Lingdum_Monastery", "Gangtok district", "Completed 1999"],
    ["phodong", "Phodong Monastery", "Phodong_Monastery", "Mangan district", "Founded c. 1740"],
    ["phensang", "Phensang Monastery", "Phensang_Monastery", "Mangan district", "Founded 1721"],
    ["lachen", "Lachen Monastery", "Lachen_Monastery", "Mangan district", "Founded 1858"],
    ["lachung", "Lachung Monastery", "Lachung_Monastery", "Mangan district", "Founded 1880"],
    ["sanga-choeling", "Sanga Choeling Monastery", "Sanga_Choeling_Monastery", "Gyalshing district", "Founded 1697"],
    ["dubdi", "Dubdi Monastery", "Dubdi_Monastery", "Gyalshing district", "Founded 1701"],
    ["ralang", "Ralang Monastery", "Ralang_Monastery", "Namchi district", "Founded 1768"],
    ["rinchenpong", "Rinchenpong Monastery", "Rinchenpong_Monastery", "Soreng district", "Founded c. 1730"],
    ["tsuklakhang", "Tsuklakhang Palace Monastery", "Tsuklakhang_Palace", "Gangtok district", "Built 1898"],
  ].map(([slug, title, wiki, location, period]) => ({
    key: `mon/${slug}`,
    title,
    category: "Monastery heritage",
    wiki,
    community: "Bhutia",
    location,
    period,
    mediaType: "image",
    monasteries: [slug],
    events: [],
    stories: [],
  })),

  /**
   * Kewzing has a freely licensed photograph and no dedicated reference
   * article — the only catalogued monastery in that position, which is also
   * why its own record is flagged unverified in src/data/monasteries.ts.
   *
   * It ships anyway, marked UNVERIFIED, because the alternative is to omit it
   * silently and leave the archive looking complete when it is not. A visible
   * hole is the honest version of a hole.
   */
  {
    key: "mon/kewzing",
    title: "Kewzing Monastery",
    category: "Monastery heritage",
    wiki: "List_of_Buddhist_monasteries_in_Sikkim",
    community: "Bhutia",
    location: "Kewzing, Namchi district",
    period: "Founded late 19th century",
    mediaType: "image",
    monasteries: ["kewzing"],
    events: [],
    stories: ["the-village-that-governs-itself"],
    claim: "unverified",
    note: "A village gompa in south Sikkim's homestay country. No dedicated reference article documents this site.",
    captureNote:
      "The photograph is a licensed Wikimedia Commons file of Kewzing Monastery. What is missing is a source documenting the monastery itself — no encyclopedia article, government listing or institutional record for it was found, so its founding date and history are not asserted here.",
  },

  /* Thematic Vajrayana subjects. These were photographed elsewhere in the
     Himalaya and must never be presented as a named Sikkim site. */
  {
    key: "arch/thangka",
    title: "Painting a thangka",
    category: "Crafts",
    wiki: "Thangka",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: ["pemayangtse", "phodong"],
    events: [],
    stories: ["painting-on-cotton-and-silk"],
    sikkimSubject: false,
    captureNote:
      "Photographed at Lhasa, Tibet. Thangka painting is practised in Sikkimese monasteries by the same iconographic conventions.",
  },
  {
    key: "arch/manuscript",
    title: "A Tibetan manuscript leaf",
    category: "Historical documents",
    wiki: "Tibetan_literature",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["why-any-of-this-needs-documenting", "the-institute-that-digitises-what-it-cannot-save"],
    sikkimSubject: false,
    captureNote:
      "A manuscript leaf held by the Wellcome Collection, not photographed in Sikkim. Sikkim's monastery libraries hold comparable material; none of it has been digitised into this archive yet.",
  },
  {
    key: "arch/canon",
    title: "The Tibetan Buddhist canon",
    category: "Historical documents",
    wiki: "Tibetan_Buddhist_canon",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["what-a-gompa-actually-is", "the-scripture-that-is-sung-not-read"],
    sikkimSubject: false,
    captureNote:
      "Photographed outside Sikkim. The Kangyur and Tengyur are the texts a Sikkimese gompa's library is built around.",
  },
  {
    key: "arch/prayer-wheel",
    title: "A monastery prayer wheel",
    category: "Crafts",
    wiki: "Prayer_wheel",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["what-a-gompa-actually-is"],
    sikkimSubject: false,
    captureNote:
      "Photographed at Bardan Gompa, Zanskar. Prayer wheels of this form ring Sikkimese gompas and the Do-drul Chorten in Gangtok.",
  },
  {
    key: "int/thiksey",
    title: "Offering bowls in a Himalayan gompa",
    category: "Monastery heritage",
    wiki: "Thikse_Monastery",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: ["rumtek", "lingdum", "phodong"],
    events: [],
    stories: ["what-a-gompa-actually-is", "how-to-be-a-guest-in-a-monastery"],
    sikkimSubject: false,
    captureNote:
      "Photographed at Thiksey Monastery, Ladakh. The arrangement of water bowls and butter lamps is shared across Tibetan Buddhist practice.",
  },
  {
    key: "fest/cham",
    title: "A masked Cham dancer",
    category: "Festivals",
    wiki: "Cham_dance",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: ["enchey", "phensang", "ralang"],
    events: ["pang-lhabsol-instituted"],
    stories: ["dancing-the-year-into-the-ground", "eight-tantric-gods-and-a-bonfire"],
    sikkimSubject: false,
    captureNote:
      "Photographed at Diskit Monastery, Ladakh. Cham is danced in Sikkim at Losoong, Losar and Pang Lhabsol.",
  },
  {
    key: "fest/hemis",
    title: "A monastery festival gathering",
    category: "Festivals",
    wiki: "Hemis_Festival",
    community: "Bhutia",
    location: null,
    period: null,
    mediaType: "image",
    monasteries: ["rumtek", "enchey"],
    events: [],
    stories: ["three-new-years-in-one-winter", "the-buddhist-year-in-four-days"],
    sikkimSubject: false,
    captureNote:
      "Photographed at Hemis, Ladakh. It stands in for the crowd a Sikkimese monastery draws at festival; no openly licensed photograph of a Sikkim festival crowd was found.",
  },

  /* Sikkim's landscape and heritage sites, already vendored. */
  {
    key: "hero/kanchenjunga",
    title: "Kangchenjunga at sunrise",
    category: "Sacred landscapes",
    wiki: "Kangchenjunga",
    community: "Bhutia and Lepcha",
    location: "Sikkim",
    period: null,
    mediaType: "image",
    monasteries: ["ralang", "rinchenpong", "pemayangtse"],
    events: ["khangchendzonga-unesco-2016", "pang-lhabsol-instituted"],
    stories: ["why-a-mountain-commands-an-army", "the-five-treasures-of-the-great-snow", "the-dance-that-worships-a-snowy-range"],
    note: "The mountain venerated in Sikkim as the guardian of the land.",
  },
  {
    key: "hero/buddha-park",
    title: "Buddha Park, Ravangla",
    category: "Architecture",
    wiki: "Buddha_Park_of_Ravangla",
    community: "Bhutia",
    location: "Ravangla, Namchi district",
    period: "Opened 2013",
    mediaType: "image",
    monasteries: ["ralang"],
    events: [],
    stories: ["south-sikkims-two-hills"],
    note: "The seated Buddha above Ravangla, raised for the 2550th birth anniversary of the Buddha.",
  },
  {
    key: "hero/gurudongmar",
    title: "Gurudongmar Lake",
    category: "Sacred landscapes",
    wiki: "Gurudongmar_Lake",
    community: "Bhutia",
    location: "Mangan district",
    period: null,
    mediaType: "image",
    monasteries: ["lachen"],
    events: ["guru-rinpoche-passage"],
    stories: ["the-lake-that-would-not-freeze"],
    note: "One of the highest lakes in the world, held sacred in Buddhist, Sikh and Hindu tradition.",
  },
  {
    key: "hero/yumthang",
    title: "Yumthang Valley",
    category: "Sacred landscapes",
    wiki: "Yumthang_Valley_of_Flowers",
    community: "Bhutia",
    location: "Mangan district",
    period: null,
    mediaType: "image",
    monasteries: ["lachung"],
    events: [],
    stories: ["life-at-the-top-of-the-road"],
    note: "The grazing valley north of Lachung, known for its rhododendron flowering.",
  },
  {
    key: "place/tsomgo",
    title: "Tsomgo Lake",
    category: "Sacred landscapes",
    wiki: "Lake_Tsomgo",
    community: "Bhutia and Lepcha",
    location: "Gangtok district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: [],
    stories: ["the-pass-that-reopened-after-forty-four-years"],
    note: "A glacial lake on the Nathu La road, held sacred locally and frozen through the winter.",
  },
  {
    key: "place/nathula",
    title: "Nathu La",
    category: "Historic sites",
    wiki: "Nathu_La",
    community: null,
    location: "Gangtok district",
    period: null,
    mediaType: "image",
    monasteries: [],
    events: ["nathu-la-1962", "nathu-la-2006"],
    stories: ["the-pass-that-reopened-after-forty-four-years", "the-old-silk-route-over-zuluk"],
    note: "The pass on the India–China border, one of the historic trading routes into Tibet.",
  },
  {
    key: "place/khecheopalri",
    title: "Khecheopalri Lake",
    category: "Sacred landscapes",
    wiki: "Khecheopalri_Lake",
    community: "Bhutia and Lepcha",
    location: "Gyalshing district",
    period: null,
    mediaType: "image",
    monasteries: ["pemayangtse"],
    events: [],
    stories: ["the-lake-where-no-leaf-floats"],
    note: "A forest lake revered by both Buddhist and Lepcha communities.",
  },

  /* ------------------------------------------- the colonial-era timeline
     Photographs and period documents for events that previously rendered an
     empty card. None of these is a photograph OF its event — several predate
     photography entirely — so each carries a note saying what it actually
     shows, and anything captured outside Sikkim is flagged sikkimSubject:false.
     ------------------------------------------------------------------------ */
  {
    key: "history/punakha-dzong",
    title: "Punakha Dzong, Bhutan",
    category: "Historic sites",
    wiki: "Punakha_Dzong",
    community: "Bhutia",
    location: "Punakha, Bhutan",
    period: "Founded 1637",
    mediaType: "image",
    sikkimSubject: false,
    monasteries: [],
    events: ["bhutanese-occupation-1700"],
    stories: [],
    note: "A Bhutanese dzong of the period — the fortress-monastery form of the power that occupied eastern Sikkim. Photographed in Bhutan, not Sikkim, and not a depiction of the occupation.",
  },
  {
    key: "history/anglo-nepalese-war",
    title: "The Anglo-Nepalese War",
    category: "Documents",
    wiki: "Anglo-Nepalese_War",
    community: null,
    location: "Himalayan frontier",
    period: "1814 – 1816",
    mediaType: "image",
    sikkimSubject: false,
    monasteries: [],
    events: ["gorkha-invasions-1788"],
    stories: [],
    note: "Contemporary depiction of the war against the Gorkha kingdom. Illustrative of the adversary and the era; it does not show fighting in Sikkim.",
  },
  {
    key: "history/kingdom-of-sikkim",
    title: "The Kingdom of Sikkim",
    category: "Documents",
    wiki: "Kingdom_of_Sikkim",
    community: "Bhutia",
    location: "Sikkim",
    period: "1642 – 1975",
    mediaType: "image",
    monasteries: [],
    events: ["treaty-of-titalia-1817"],
    stories: [],
    note: "The kingdom whose territory the Treaty of Titalia restored. A historical emblem of the state, not a photograph of the signing.",
  },
  {
    key: "history/darjeeling",
    title: "Darjeeling",
    category: "Historic sites",
    wiki: "Darjeeling",
    community: null,
    location: "Darjeeling, West Bengal",
    period: "Ceded 1835",
    mediaType: "image",
    sikkimSubject: false,
    monasteries: [],
    events: ["darjeeling-cession-1835"],
    stories: [],
    note: "Darjeeling as it is today — the hill tract ceded by Sikkim in 1835 and never returned. Photographed in West Bengal, outside Sikkim.",
  },
  {
    key: "history/joseph-hooker",
    title: "Joseph Dalton Hooker",
    category: "Portraits",
    wiki: "Joseph_Dalton_Hooker",
    community: null,
    location: "Britain",
    period: "1817 – 1911",
    mediaType: "image",
    sikkimSubject: false,
    monasteries: [],
    events: ["campbell-hooker-1849"],
    stories: [],
    note: "The botanist detained alongside Archibald Campbell in 1849. A portrait of the man; no photograph of the detention exists.",
  },
  {
    key: "history/tumlong",
    title: "Tumlong, the former capital",
    category: "Historic sites",
    wiki: "Tumlong",
    community: "Bhutia",
    location: "Tumlong, Mangan district",
    period: "Capital 1793 – 1894",
    mediaType: "image",
    monasteries: [],
    events: ["treaty-of-tumlong-1861"],
    stories: [],
    note: "Tumlong, where the 1861 treaty was signed and the court sat for a century.",
  },
  {
    key: "history/sikkim-expedition",
    title: "The Sikkim Expedition of 1888",
    category: "Documents",
    wiki: "Sikkim_expedition",
    community: null,
    location: "Northern passes",
    period: "1888",
    mediaType: "image",
    monasteries: [],
    events: ["sikkim-expedition-1888"],
    stories: [],
    note: "Contemporary material from the 1888 expedition over the northern passes.",
  },
  {
    key: "history/palden-thondup-namgyal",
    title: "Palden Thondup Namgyal, the twelfth Chogyal",
    category: "Portraits",
    wiki: "Palden_Thondup_Namgyal",
    community: "Bhutia",
    location: "Gangtok",
    period: "1923 – 1982",
    mediaType: "image",
    monasteries: [],
    events: ["indo-sikkim-treaty-1950"],
    stories: [],
    note: "The last Chogyal, who reigned through the protectorate years and the end of the monarchy.",
  },
  {
    key: "history/tsuklakhang-palace",
    title: "Tsuklakhang, the palace chapel",
    category: "Historic sites",
    wiki: "Tsuklakhang_Palace",
    community: "Bhutia",
    location: "Gangtok",
    period: "Built 1898",
    mediaType: "image",
    monasteries: ["tsuklakhang"],
    events: ["agitation-1973"],
    stories: [],
    note: "The royal chapel inside the palace compound in Gangtok, before which the 1973 agitation gathered. Not a photograph of the protests.",
  },
  {
    key: "history/chogyal",
    title: "The royal family of Sikkim",
    category: "Portraits",
    wiki: "Chogyal",
    community: "Bhutia",
    location: "Sikkim",
    period: "1642 – 1975",
    mediaType: "image",
    monasteries: [],
    events: ["referendum-and-statehood-1975"],
    stories: [],
    note: "The Chogyal and Gyalmo with their daughter at birthday celebrations in Gangtok. The monarchy this photograph shows was ended by the 1975 referendum.",
  },
];

/* ------------------------------------------------------------------ utils */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithBackoff(url, init = {}, attempt = 0) {
  let res;
  try {
    res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
  } catch (error) {
    if (attempt < 4) {
      await sleep(1500 * 2 ** attempt);
      return fetchWithBackoff(url, init, attempt + 1);
    }
    throw error;
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(1500 * 2 ** attempt);
    return fetchWithBackoff(url, init, attempt + 1);
  }
  return res;
}

/** Strip the HTML Commons puts in its extmetadata fields. */
function plain(value) {
  if (!value) return null;
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null;
}

/** The `File:Foo.jpg` title behind a Commons file page or upload URL. */
function fileTitleFrom(url) {
  const decoded = decodeURIComponent(url);
  const page = decoded.match(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/);
  if (page) return page[1].replace(/_/g, " ");
  const thumb = decoded.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  const direct = decoded.match(/\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)$/);
  const file = thumb?.[1] ?? direct?.[1];
  return file ? `File:${file.replace(/_/g, " ")}` : null;
}

/* ------------------------------------------------------- subject resolution */

/**
 * Confirm the subject's article exists and take its lead extract. The extract
 * is what the archive quotes as sourced context — the agent writes no prose of
 * its own, so there is nothing here that a source does not say.
 */
async function resolveSubject(title) {
  const url =
    `${WIKI_API}?action=query&format=json&origin=*&redirects=1&prop=extracts|info` +
    `&inprop=url&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`wikipedia HTTP ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const extract = (page.extract ?? "").trim();
  if (!extract) return null;
  return {
    title: page.title,
    url: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    extract,
  };
}

/* --------------------------------------------------------- media resolution */

async function resolveCommons(fileTitle) {
  const url =
    `${COMMONS_API}?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata|size` +
    `&iiurlwidth=1600&titles=${encodeURIComponent(fileTitle)}`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`commons HTTP ${res.status}`);
  const data = await res.json();
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license = plain(meta.LicenseShortName?.value);
  if (!license) return null; // no readable licence — does not ship
  return {
    file: page.title,
    url: info.thumburl ?? info.url,
    descriptionUrl: info.descriptionurl,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    license,
    licenseUrl: plain(meta.LicenseUrl?.value),
    attribution: plain(meta.Artist?.value),
    credit: plain(meta.Credit?.value),
  };
}

/* ------------------------------------------------------------------ vendor */

async function vendor(key, url) {
  const local = join(OUT_IMAGES, `${key}.jpg`);
  const publicPath = `/images/${key}.jpg`;
  if (!FORCE && existsSync(local) && statSync(local).size > 1024) return publicPath;
  mkdirSync(dirname(local), { recursive: true });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetchWithBackoff(url, { headers: { Accept: "image/*" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`content-type ${type}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`too small (${buf.length}b)`);
      writeFileSync(local, buf);
      return publicPath;
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(1200 * attempt);
    }
  }
  return null;
}

/* -------------------------------------------------------------------- main */

console.log("Heritage Archive Agent");
console.log("──────────────────────\n");

const storyImages = JSON.parse(await readFile(join(ROOT, "src/data/generated/story-images.json"), "utf8"));
const credits = JSON.parse(await readFile(join(ROOT, "src/data/generated/image-credits.json"), "utf8"));
const creditByKey = Object.fromEntries(credits.map((c) => [c.key, c]));

const resolved = [];
const failures = [];
const today = new Date().toISOString().slice(0, 10);

for (const item of ITEMS) {
  /* Where does this item's Commons file come from? */
  const fromStory = storyImages.images?.[item.key];
  const fromCredit = creditByKey[item.key];
  const fileTitle =
    fromStory?.file ?? (fromCredit ? fileTitleFrom(fromCredit.commonsFilePage ?? fromCredit.sourceUrl) : null);

  if (!fileTitle) {
    failures.push({ key: item.key, reason: "no Commons file registered" });
    console.log(`  ✗ ${item.key.padEnd(26)} no Commons file registered`);
    continue;
  }

  let subject = null;
  let media = null;
  try {
    subject = await resolveSubject(item.wiki);
    await sleep(400);
    media = await resolveCommons(fileTitle);
  } catch (error) {
    failures.push({ key: item.key, reason: String(error.message ?? error) });
    console.log(`  ✗ ${item.key.padEnd(26)} ${error.message ?? error}`);
    await sleep(600);
    continue;
  }

  if (!subject) {
    failures.push({ key: item.key, reason: `subject article not found: ${item.wiki}` });
    console.log(`  ✗ ${item.key.padEnd(26)} subject article not found: ${item.wiki}`);
    await sleep(600);
    continue;
  }
  if (!media) {
    failures.push({ key: item.key, reason: `Commons file unresolved or unlicensed: ${fileTitle}` });
    console.log(`  ✗ ${item.key.padEnd(26)} Commons file unresolved: ${fileTitle}`);
    await sleep(600);
    continue;
  }

  let localPath = `/images/${item.key}.jpg`;
  if (!SKIP_MEDIA) {
    try {
      localPath = await vendor(item.key, media.url);
    } catch (error) {
      failures.push({ key: item.key, reason: `download failed: ${error.message ?? error}` });
      console.log(`  ✗ ${item.key.padEnd(26)} download failed: ${error.message ?? error}`);
      await sleep(600);
      continue;
    }
  }

  resolved.push({
    id: item.key.replace(/\//g, "-"),
    key: item.key,
    title: item.title,
    category: item.category,
    community: item.community ?? null,
    location: item.location ?? null,
    period: item.period ?? null,
    mediaType: item.mediaType,
    mediaUrl: localPath,
    width: media.width,
    height: media.height,
    note: item.note ?? null,
    /* Sourced context, verbatim from the subject's article. */
    context: subject.extract.length > 900 ? `${subject.extract.slice(0, 900).trimEnd()}…` : subject.extract,
    sourceName: `Wikipedia — ${subject.title}`,
    sourceUrl: subject.url,
    creator: media.attribution,
    credit: media.credit,
    license: media.license,
    licenseUrl: media.licenseUrl,
    commonsFile: media.file,
    commonsFilePage: media.descriptionUrl,
    sikkimSubject: item.sikkimSubject !== false,
    captureNote: item.captureNote ?? null,
    claim: item.claim ?? "documented",
    relatedMonasteries: item.monasteries ?? [],
    relatedEvents: item.events ?? [],
    relatedStories: item.stories ?? [],
    resolvedAt: today,
  });

  console.log(
    `  ✓ ${item.key.padEnd(26)} ${media.license.padEnd(14)} ${(media.attribution ?? "—").slice(0, 28)}`,
  );
  await sleep(500);
}

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(
  OUT_JSON,
  `${JSON.stringify({ generatedAt: today, items: resolved.sort((a, b) => a.id.localeCompare(b.id)), failures }, null, 2)}\n`,
);

console.log(`\n${resolved.length} items registered, ${failures.length} failed.`);
console.log(`→ ${OUT_JSON.replace(ROOT + "/", "")}`);
if (failures.length) {
  console.log("\nUnresolved — these do NOT ship:");
  for (const f of failures) console.log(`  ${f.key} — ${f.reason}`);
}
