import { defineStory, govFestivals, wiki } from "./types";
import type { Story } from "./types";

/**
 * Sikkim History.
 *
 * The through-line: a kingdom founded on an agreement between communities,
 * moved twice, ended by referendum. Where a founding account is a religious
 * narrative rather than a record — the vision that sent three lamas looking
 * for a fourth man — it is labelled as one.
 */

export const historyStories: Story[] = [
  defineStory({
    slug: "the-throne-of-stone-at-norbugang",
    title: "The throne of stone at Norbugang",
    category: "Sikkim History",
    claimType: "documented history",
    communities: ["Bhutia", "Lepcha"],
    imageKey: "story/coronation-throne",
    heroAlt: "The stone coronation throne at Norbugang, Yuksom, where the first Chogyal was consecrated",
    summary:
      "In 1642 three lamas met in a forest clearing in West Sikkim and crowned a milk-churning stranger as the first Chogyal. The stone slab they sat him on is still there, in a pine grove above Yuksom.",
    content: [
      "Yuksom is a large village at about 1,780 metres, forty kilometres north of Gyalshing, and it is the reason Sikkim exists as a political idea. Its name is usually read as the meeting place of the three learned monks, and in 1642 that is exactly what it was.",
      "The account runs like this. Lhatsun Chenpo travelled from Tibet in 1641 to propagate Buddhism in a country the Tibetans called Drejong — the hidden country — and was joined by two more lamas, Sempa Chenpo and Rinzing Chenpo. They came from three directions: north, west and south. A prophecy attributed to Guru Padmasambhava, the 8th-century master who is Sikkim's patron saint, required a fourth man from the east. They went looking for him, and near present-day Gangtok they found a man churning milk who fed them and gave them shelter. They decided he was the one.",
      "The man was Phuntsog Namgyal, then thirty-eight, a fifth-generation descendant of a prince from the Mi-nyak house of Kham in eastern Tibet. They brought him back to Norbugang, seated him on a pedestal of stone on a pine-covered hill, anointed him with water from a sacred urn and gave him the title Chogyal — Dharma King, the king who rules by righteousness.",
      "That title is the interesting part. It is not decoration. It placed the monarchy inside Buddhist teaching rather than beside it, and it set the pattern for everything that followed: the monasteries the kingdom built, the festivals it choreographed, the monks who alone held the standing to anoint later kings.",
      "Phuntsog Namgyal did not simply take a crown and stop. He moved the capital to Yuksom, divided the kingdom into twelve dzongs each under a Lepcha governor, and instituted a council of twelve ministers. In 1663 representatives of the Bhutias, Lepchas and Limbus met him to formalise their unity in writing and to create a council — an idea remembered as Lho-Mon-Tsong-Sum, and still the core of what Sikkimese national identity means. The same document recognised autonomy for the Limbu subbas.",
      "The dynasty he founded lasted through twelve kings and 333 years, until 1975. The stone throne outlasted all of them. It sits in the Norbugang park beside a chorten and a prayer hall, an ordinary-looking slab in a quiet grove, and it is the single most consequential object in the state.",
      "Yuksom is also where the kingdom's religious architecture began: Dubdi Monastery, generally held to be Sikkim's oldest, stands a walk uphill. The town is now better known as the trailhead for Khangchendzonga National Park, which means most people who pass through the coronation site are on their way to somewhere else with a rucksack on. It is worth an hour on the way out.",
    ],
    keyFacts: [
      "Phuntsog Namgyal was consecrated at Norbugang, near Yuksom, in 1642 — Sikkim's first capital and first Chogyal.",
      "Yuksom means 'the meeting place of the three learned monks'; the three came from the north, west and south.",
      "The kingdom was divided into twelve dzongs, each under a Lepcha dzongpon heading a council of twelve ministers.",
      "In 1663 the Bhutias, Lepchas and Limbus formalised their unity in writing — the idea remembered as Lho-Mon-Tsong-Sum.",
      "The Namgyal dynasty ran from 1642 to 1975: twelve kings, 333 years.",
    ],
    relatedMonasteries: ["dubdi", "pemayangtse", "tashiding"],
    relatedPlaces: ["yuksom", "rabdentse"],
    relatedStories: ["the-treaty-sworn-at-kabi", "the-capital-the-gurkhas-burned", "the-dharma-kings"],
    sources: [
      wiki("Yuksom", "The 1642 coronation, the three lamas, the twelve dzongs, and Yuksom's altitude and position."),
      wiki("Phuntsog_Namgyal", "Phuntsog Namgyal's age, ancestry, the 1663 treaty and the Lho-Mon-Tsong-Sum idea."),
      wiki("Chogyal", "The meaning of the title and the span of the monarchy."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Yuksom", "Chogyal", "Namgyal", "coronation", "Norbugang", "1642", "West Sikkim"],
  }),

  defineStory({
    slug: "the-treaty-sworn-at-kabi",
    title: "The treaty sworn at Kabi",
    category: "Sikkim History",
    claimType: "documented history",
    communities: ["Lepcha", "Bhutia"],
    imageKey: "story/kabi-lungchok",
    heroAlt: "Standing stones at Kabi Lungchok, north of Gangtok, marking the Lepcha–Bhutia blood-brotherhood treaty",
    summary:
      "Seventeen kilometres north of Gangtok, a line of stones marks where a Lepcha chief and a Tibetan prince swore to treat each other's people as their own. The name of the place means, literally, stone erected by our blood.",
    content: [
      "Long before there was a kingdom, there was an agreement. At Kabi Lungchok, on the North Sikkim highway seventeen kilometres above Gangtok, the Lepcha chief Thekong Tek and the Tibetan prince Khye Bumsa ceremonially signed a treaty of blood brotherhood. Stone pillars mark the spot. Life-size statues of the two men now stand beside them.",
      "The name carries the meaning plainly: Kabi Lungchok, pronounced closer to Kayu-sha-bhi Lungchok, is read as 'stone erected by our blood'. It is not a metaphor about friendship in the abstract. It was a working political instrument between a people who were already here and a people arriving from the north.",
      "The Lepchas — Rongkup, the beloved children of the Róng — are generally held to be Sikkim's first inhabitants, and were both the population and the rulers of the land until 1641. The Bhutias came from Tibet in growing numbers from the 13th century onwards, many of them fleeing the long conflict between the Red Hat and Yellow Hat schools, which the Yellow Hats won decisively in the mid-1600s. Sikkim and Bhutan both still have Red Hat majorities as a direct result.",
      "What Kabi settles is the terms on which those two facts met. The Bhutias who came claimed descent from a common ancestor, Khye Bumsa, and organised into fourteen main families. The Lepcha and the Limbu were already here. When the monarchy was founded in 1642, Tibetan sources described Tibetans, Lepchas and Limbus together as the original races of the kingdom — a framing that runs straight back to the stones at Kabi.",
      "Around 1819 the Lepchas were still the largest group, roughly half of all Sikkimese, with Bhutias about thirty per cent and Limbus about twenty; the Limbu and Lepcha intermarried frequently. The demographics changed completely over the following century, but the treaty did not stop being the founding story.",
      "It is also why Pang Lhabsol, Sikkim's most distinctive festival, is not only about a mountain. The Government of Sikkim's own account of the festival says it commemorates the blood brotherhood sworn between the Lepchas and the Bhutias at Kabi in the 15th century — an annual, public, danced restatement of an agreement made in a forest.",
      "The site today is a quiet grove of tall trees with an interpretive plaque and the sacred groves around it. There is not much to photograph. That is rather the point: the most important thing that ever happened here was two men agreeing not to be enemies, and agreements do not photograph well.",
    ],
    keyFacts: [
      "Kabi Lungchok lies 17 km north of Gangtok on the North Sikkim highway; stone pillars mark the treaty site.",
      "The treaty was sworn between the Lepcha chief Thekong Tek and the Tibetan prince Khye Bumsa.",
      "The name is read as 'stone erected by our blood'.",
      "Around 1819 Lepchas were roughly half the population, Bhutias about 30% and Limbus about 20%.",
      "Pang Lhabsol commemorates this pact each year, per the Government of Sikkim.",
    ],
    relatedMonasteries: ["phodong", "phensang"],
    relatedPlaces: ["kabi-lungchok"],
    relatedStories: [
      "the-throne-of-stone-at-norbugang",
      "why-a-mountain-commands-an-army",
      "the-people-who-say-they-never-arrived",
    ],
    sources: [
      wiki("Kabi_Lungchok", "The treaty site, the two signatories, the meaning of the name and the statues."),
      wiki(
        "Indigenous_peoples_of_Sikkim",
        "The 13th-century blood brotherhood, the fourteen Bhutia families, and the c.1819 population shares.",
      ),
      govFestivals("Pang Lhabsol as commemoration of the blood brotherhood sworn at Kabi in the 15th century."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Kabi", "Lungchok", "blood brotherhood", "Thekong Tek", "Khye Bumsa", "treaty", "North Sikkim"],
  }),

  defineStory({
    slug: "the-capital-the-gurkhas-burned",
    title: "The capital the Gurkhas burned",
    category: "Sikkim History",
    claimType: "documented history",
    communities: ["Bhutia", "Limbu"],
    imageKey: "story/rabdentse",
    heroAlt: "The ruins of Rabdentse, second capital of the kingdom of Sikkim, on a forested ridge near Pelling",
    summary:
      "For 144 years Rabdentse was the seat of the Sikkimese kings. Today it is a stone footprint on a forested ridge below Pemayangtse, reached by a fifteen-minute walk through birdsong, with Khangchendzonga filling the horizon.",
    content: [
      "Rabdentse was the second capital of the kingdom of Sikkim, established in 1670 by the second Chogyal, Tensung Namgyal, when he moved the court down from Yuksom. It held that role until 1814. Then the invading Gurkha army destroyed it, and what remains is a ruin: the outline of the palace, a scatter of chortens, and one of the best views of the Khangchendzonga range in West Sikkim.",
      "The court that lived here was more tangled than the ruins suggest. Tensung Namgyal had three wives — Tibetan, Bhutanese and Limbu. The Limbu wife, daughter of the chief Yo Yo-Hang, brought seven girls of her family who married into noble Sikkimese households; many of their husbands became councillors with the title Kazi, which carried real power and privilege for the next two centuries.",
      "What followed reads like a succession drama because it was one. When Tensung died in 1700, the throne passed to Chador Namgyal, son of the second wife and a minor at the time. His elder half-sister Pendiongmu, of Bhutanese descent, opposed the succession, brought in help from Bhutan and drove him out. Chador spent ten years in exile in Tibet, where he became fluent enough in Buddhist learning and Tibetan literature to serve as state astrologer to the Sixth Dalai Lama, before returning to reclaim his throne with Tibetan backing.",
      "It did not end well. In 1716 his half-sister had him murdered at the Ralang hot springs. But the decade in Lhasa mattered: this is the same Chador Namgyal who choreographed the Pangtoed warrior dance of Pang Lhabsol, and to whom the creation of the Lepcha script is traditionally attributed. A Sikkimese king in exile spent ten years reading, and came home with a festival and an alphabet.",
      "Rabdentse today is protected as a monument of national importance by the Archaeological Survey of India. The approach is a walk of about fifteen minutes from the road below Pemayangtse Monastery, through chestnut and oak with a great deal of birdsong. You arrive at a flat terrace of dressed stone, the throne platform, and three chortens, and then the ground simply falls away to the west.",
      "The pairing with Pemayangtse is not accidental. The monastery was the kingdom's premier gompa, and it sits a few minutes uphill from the palace it served. Together with the Rabdentse ruins, Khecheopalri Lake, Sanga Choeling, Dubdi and Tashiding, it forms a pilgrimage circuit that has been walked for three centuries.",
    ],
    keyFacts: [
      "Rabdentse was Sikkim's capital from 1670 to 1814, founded by the second Chogyal, Tensung Namgyal.",
      "It was destroyed by an invading Gurkha army; only the palace outline and chortens remain.",
      "The site is protected by the Archaeological Survey of India as a monument of national importance.",
      "Chador Namgyal, the third Chogyal, spent ten years exiled in Tibet and served as state astrologer to the Sixth Dalai Lama.",
      "The ruins sit a short walk below Pemayangtse Monastery, on the West Sikkim pilgrimage circuit.",
    ],
    relatedMonasteries: ["pemayangtse", "sanga-choeling", "tashiding"],
    relatedPlaces: ["rabdentse", "pelling", "khecheopalri-lake"],
    relatedStories: [
      "the-throne-of-stone-at-norbugang",
      "the-seven-stops-of-the-west-sikkim-circuit",
      "why-a-mountain-commands-an-army",
    ],
    sources: [
      wiki(
        "Rabdentse",
        "Dates of the capital, its destruction, ASI protection, the three wives, the Kazi title and the Chador Namgyal succession.",
      ),
      wiki("Pelling", "Rabdentse's position near Pelling and the surrounding attractions."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Rabdentse", "Pelling", "ruins", "Chador Namgyal", "Kazi", "ASI", "West Sikkim"],
  }),

  defineStory({
    slug: "the-dharma-kings",
    title: "The Dharma Kings",
    category: "Sikkim History",
    claimType: "documented history",
    communities: ["Bhutia"],
    legacyImageKey: "mon/tsuklakhang",
    heroAlt: "Tsuklakhang, the royal chapel inside the palace compound in Gangtok",
    summary:
      "Sikkim's monarchs held a title that made religious teaching part of the job description — and it explains why a small royal chapel in Gangtok mattered more than the palace beside it.",
    content: [
      "The Chogyals were the monarchs of the Kingdom of Sikkim, of the Namgyal dynasty. The word translates as Dharma King, or righteous ruler, and it was conferred on Sikkim's Buddhist kings from the first coronation in 1642.",
      "It was not an honorific bolted onto a secular throne. It placed the monarchy inside Buddhist teaching, which is why the Tsuklakhang — the royal chapel inside the palace compound in Gangtok — was where coronations, royal weddings and state rituals happened, and why the calendar of the court and the calendar of the monasteries were the same calendar.",
      "It also explains Pemayangtse's unusual standing. The monastery was conceived as the premier gompa of the kingdom, and its monks alone held the right to anoint the Chogyals. A monastery that can make a king is a different kind of institution from a monastery that prays for one.",
      "The Chogyal was Sikkim's absolute monarch from 1642 to 1973 and a constitutional monarch from 1973 to 1975. Sikkim had become a princely state of the British Indian Empire in 1890, continued as a protectorate of India after 1947, and by the early 1970s held the highest literacy rate and per capita income among Himalayan states.",
      "In 1973 anti-royalist riots took place in front of the palace. In 1975, after the Indian Army took over Gangtok, a referendum was held; the monarchy was dissolved and Sikkim became India's twenty-second state. The last Chogyal, Palden Thondup Namgyal, died in 1982. His son Wangchuk Namgyal was named and crowned the thirteenth Chogyal, but the Government of India did not recognise the coronation, and the position confers no official authority.",
      "What the office left behind is not a ruin but a working infrastructure. The monasteries the Chogyals commissioned still hold their festivals on the dates the court set. The Pangtoed dance a king choreographed is still danced. Temi Tea Garden, the only tea estate in Sikkim, was established in 1969 by the last Chogyal as employment for Tibetan refugees, and it is still producing.",
      "This archive takes no view on the politics of 1975. It records what the title meant and what it built, both of which are still visible on a Tuesday morning in Gangtok.",
    ],
    keyFacts: [
      "Chogyal translates as 'Dharma King' or righteous ruler; the office ran from 1642.",
      "Absolute monarchy until 1973, constitutional monarchy 1973–1975.",
      "Pemayangtse's monks alone held the right to anoint the Chogyals.",
      "In 1975 a referendum dissolved the monarchy and Sikkim became India's 22nd state.",
      "The last Chogyal founded Temi Tea Garden in 1969 as employment for Tibetan refugees.",
    ],
    relatedMonasteries: ["tsuklakhang", "pemayangtse", "rumtek"],
    relatedPlaces: ["gangtok", "temi-tea-garden"],
    relatedStories: [
      "the-throne-of-stone-at-norbugang",
      "indias-only-himalayan-tea-garden",
      "the-capital-the-gurkhas-burned",
    ],
    sources: [
      wiki("Chogyal", "The meaning of the title, the span of the monarchy and the titular succession after 1982."),
      wiki("Sikkim", "Princely state status from 1890, the 1973 riots, the 1975 referendum and statehood."),
      wiki("Temi_Tea_Garden", "Establishment of the estate in 1969 by Palden Thondup Namgyal."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Chogyal", "Namgyal", "monarchy", "1975", "Tsuklakhang", "referendum"],
  }),

  defineStory({
    slug: "the-year-the-kingdom-became-a-state",
    title: "The year the kingdom became a state",
    category: "Sikkim History",
    claimType: "documented history",
    communities: ["Shared"],
    legacyImageKey: "hero/kanchenjunga",
    heroAlt: "The Khangchendzonga range at sunrise, seen across the ridges of Sikkim",
    summary:
      "In April 1975 Sikkim voted, and 333 years of monarchy ended. The referendum is still argued about — which is precisely why an archive should record what is documented and stop there.",
    content: [
      "On 14 April 1975 a referendum was held in Sikkim on abolishing the monarchy and joining India. The official result was overwhelming: turnout above 59 per cent of the electorate, and a very large majority for the motion. On 16 May 1975 Sikkim became the twenty-second state of the Indian Union, and the office of Chogyal ceased to exist.",
      "The road there was longer than one vote. Sikkim had been a princely state of the British Indian Empire from 1890, and after 1947 it did not accede to India like most princely states; it continued as a protectorate, with India responsible for defence, external affairs and communications. Internally it remained a monarchy under the Chogyal.",
      "The pressure that ended it was partly demographic and partly electoral. The first census of Sikkim, in 1891, had already found that two-thirds of the population — 25,955 out of 30,458 — were of Nepalese origin, a shift driven by 18th-century conquest, migration, and encouragement from colonial landlords who wanted rents from otherwise densely forested country. The kingdom's representative arrangements, which weighted Bhutia-Lepcha votes differently from others, became the central political question of the twentieth century.",
      "In 1973 anti-royalist demonstrations took place in front of the palace in Gangtok. In 1974 a new constitution reduced the Chogyal to a constitutional figurehead. In 1975 the Indian Army took control of Gangtok, and the referendum followed.",
      "That sequence is contested, and this archive is not going to pretend otherwise. Accounts differ sharply on how free the vote was, and the disagreement is not a technicality — it is about whether a country was absorbed or a people chose. What can be stated without argument is the chronology, the official figures, and the fact that both readings are held sincerely by people in Sikkim today.",
      "What changed afterwards is easier to document. Sikkim kept unusual constitutional protections: Article 371F of the Indian Constitution preserved existing Sikkimese laws and land arrangements, and the Sikkim Bhutia Lepcha Apex Committee, founded in 1999, exists to press the rights it guarantees. The state kept twelve official languages for cultural preservation. It kept the monastic calendar. It kept, as a state holiday, a festival honouring the mountain a king declared the guardian of the country.",
      "A visitor sees the result rather than the argument: a modern Indian state whose public holidays are still those of a Himalayan kingdom.",
    ],
    keyFacts: [
      "The referendum was held on 14 April 1975; Sikkim became India's 22nd state on 16 May 1975.",
      "Sikkim was a British princely state from 1890 and an Indian protectorate after 1947, not an acceding state.",
      "The 1891 census already recorded 25,955 of 30,458 residents as of Nepalese origin.",
      "Article 371F preserves Sikkim's pre-1975 laws and land arrangements.",
      "Accounts of how free the vote was differ; this archive records the chronology, not a verdict.",
    ],
    relatedMonasteries: ["tsuklakhang"],
    relatedPlaces: ["gangtok"],
    relatedStories: ["the-dharma-kings", "who-the-nepali-of-sikkim-actually-are"],
    sources: [
      wiki("1975_Sikkimese_monarchy_referendum", "The referendum date, turnout, result and the events of 1973–75."),
      wiki("Sikkim", "Protectorate status, the 1975 accession and the state's constitutional position."),
      wiki(
        "Indigenous_peoples_of_Sikkim",
        "The 1891 census figures, 18th-century migration, and Article 371F and SIBLAC.",
      ),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["1975", "referendum", "statehood", "Article 371F", "monarchy", "history"],
  }),

  defineStory({
    slug: "the-old-silk-route-over-zuluk",
    title: "The old road to Lhasa, and its thirty-two hairpins",
    category: "Sikkim History",
    claimType: "documented history",
    communities: ["Bhutia"],
    imageKey: "story/silk-route",
    heroAlt: "The switchback road at Zuluk in eastern Sikkim, part of the old trade route to Tibet",
    summary:
      "Zuluk was an overnight halt for traders walking wool and salt between Kalimpong and Tibet. The trade stopped in 1959; the road, folded into the hillside in a famous series of hairpin bends, did not.",
    content: [
      "Zuluk — also spelt Dzuluk or Jaluk — is a hamlet at about 2,900 metres in the Rongli subdivision of Pakyong district, and it is one of the few places in Sikkim where the road itself is the monument.",
      "It was a transit point on the trade route between Kalimpong and Tibet, used as an overnight base by traders crossing at Jelep La. The route ran from Kalimpong through Pedong, Aritar and Zuluk, over the pass and down into the Chumbi valley. It was in use within living memory: traffic continued until the Chinese crackdown in Tibet in 1959 closed it.",
      "That trade is the reason Sikkim looks the way it does. The state lay on the ancient Silk Road connecting China via Tibet, and centuries of inter-kingdom commerce, migration and annexation along it shaped everything from the food to the family names. Gangtok itself rose in the early twentieth century as a major stopover between Lhasa and Calcutta.",
      "What remains at Zuluk is a road that switches back on itself over and over as it climbs — the reason photographers come — and forest that has been left mostly alone. Zuluk sits within the Pangolakha Wildlife Sanctuary; deer, wild dog, Himalayan bear and red panda are seen. Winter brings three to five feet of snow, and the monsoon is long and heavy.",
      "Further down the same historic road, Aritar in the Pakyong district holds two more relics of the era. Lampokhari, also called Aritar Lake, is one of the oldest natural lakes in Sikkim and the only one arranged for boating. Beside it stands Ari-Bangla, a dak bungalow built in 1895 by Sir James Claude White, the first British political officer in Sikkim; Sikkim's first treasury was built on the same premises, and the first police outpost began functioning there in 1897.",
      "Aritar Gumpa, a Kagyu monastery nearby, is described as among the oldest in Sikkim, with carved and painted murals and a collection of manuscripts and icons. The Parbateyswar Shivalaya Mandir draws thousands of Hindu devotees during the month of Sawan. Within a few kilometres of a former trade halt, the route left behind a monastery, a temple, a lake, a colonial bungalow and a police station.",
      "The eastern route needs permits and is closed to some travellers on some days, so it is a trip to arrange through a registered operator rather than to improvise. But it is the most legible surviving piece of the Sikkim that existed because of where it stood between two empires.",
    ],
    keyFacts: [
      "Zuluk sits at about 2,900 m and was an overnight halt on the Kalimpong–Tibet trade route via Jelep La.",
      "The route was in use until the Chinese crackdown in Tibet in 1959.",
      "Zuluk lies within the Pangolakha Wildlife Sanctuary; red panda and Himalayan bear are recorded there.",
      "Ari-Bangla at Aritar was built in 1895 by Sir James Claude White, Sikkim's first British political officer.",
      "Lampokhari (Aritar Lake) is among the oldest natural lakes in Sikkim and the only one set up for boating.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["dzuluk", "aritar", "rongli", "nathu-la"],
    relatedStories: [
      "the-pass-that-reopened-after-forty-four-years",
      "what-you-actually-need-a-permit-for",
      "sikkim-eats-what-the-road-brought",
    ],
    sources: [
      wiki("Dzuluk", "Zuluk's altitude, its role on the Kalimpong–Tibet route, Jelep La, 1959, and the sanctuary."),
      wiki("Aritar,_Sikkim", "Lampokhari, Ari-Bangla and its 1895 construction, the treasury, Aritar Gumpa and the Shivalaya Mandir."),
      wiki("Sikkimese_cuisine", "Sikkim's position on the ancient Silk Road and the effect of that trade."),
      wiki("Gangtok", "Gangtok's rise as a stopover on the Lhasa–Calcutta trade route."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Zuluk", "silk route", "Jelep La", "Aritar", "trade", "East Sikkim", "Pakyong"],
  }),
];
