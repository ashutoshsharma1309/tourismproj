import { defineStory, govFestivals, govTourism, wiki } from "./types";
import type { Story } from "./types";

/**
 * Communities.
 *
 * Sikkim Tourism describes the state's people as three ethnic groups —
 * Lepcha, Bhutia and Nepali — intermingling freely into a homogeneous blend
 * while each preserves its own identity. That is the official framing and it
 * is a fair one, but "Nepali" covers a dozen communities with their own
 * languages, festivals and scripts, and this archive names them.
 *
 * Nothing here describes a living community in the past tense.
 */

export const communityStories: Story[] = [
  defineStory({
    slug: "the-people-who-say-they-never-arrived",
    title: "The people who say they never arrived",
    category: "Lepcha Heritage",
    claimType: "documented history",
    communities: ["Lepcha"],
    imageKey: "story/lepcha-portrait",
    heroAlt: "A 19th-century studio portrait of a Lepcha woman from Sikkim, from the Rijksmuseum collection",
    imageNote:
      "A studio portrait made in the 1860s and held by the Rijksmuseum. Photographs of Lepcha people from this period are colonial-era images; it is shown here as a historical document, not as a picture of Lepcha life today.",
    summary:
      "Scholars have proposed elaborate migration routes for the Lepchas — through Cambodia, up the Irrawaddy, back across the Patkoi. The Lepchas themselves have no tradition of migrating at all, and conclude that they have always been here.",
    content: [
      "The Lepchas call themselves Mútuncí Róngkup Rumkup — the beloved children of the Róng and of God — usually shortened to Rongkup. They are among the indigenous people of Sikkim and the neighbouring hills of Darjeeling, Kalimpong and eastern Nepal, and number around eighty thousand in all. In Sikkim they are considered around fifteen per cent of the state's population.",
      "There is a long scholarly argument about where they came from. One account has them migrating from Cambodia and Tibet; another proposes a route through Cambodia, up the Ayeyarwady and Chindwin rivers, back west across the Patkoi range and into India, an idea supported by Austroasiatic substrata in their vocabulary. They speak a Tibeto-Burman language which some classify as Himalayish.",
      "The Lepchas themselves have no tradition of migration. Given that, they conclude they are autochthonous — that they have always been in the country now covered by Sikkim, the Darjeeling district, eastern Nepal and southwestern Bhutan. An archive can note both the linguistic evidence and the community's own account without pretending the question is settled.",
      "What is not in doubt is how deeply their culture is keyed to this specific landscape. Lepchas are divided into clans, called putsho, and each clan reveres its own sacred lake and mountain peak — the words are dâ and cú — from which the clan takes its name. Clan names are long enough that they are usually shortened: Nāmchumú becomes Namchu, Fonyung Rumsóngmú becomes Foning. Ancestral peaks are honoured in ceremonies, and rituals commonly involve local species. In Sikkim, Lepchas are recorded as using over 370 species of animals, fungi and plants.",
      "Most Lepchas are Buddhist today, and a considerable number are Christian, but some have not given up Mun, their shamanistic religion. In practice, Mun and Buddhist rituals are frequently observed alongside one another. The religion is led by mun, who officiate ceremonies and festivals, and bóngthíng, who are healers and are often female.",
      "The clothing is distinctive and still worn. Women wear the dumvun or dumdyám, an ankle-length piece of smooth cotton or silk folded over one shoulder, pinned at the other and held by a waistband, often over a contrasting long-sleeved blouse. Men wear the thakraw, a multicoloured hand-woven cloth pinned at one shoulder over shirt and trousers, with a flat round cap called a thyáktuk — black velvet sides, a multicoloured top and a knot.",
      "They are mostly agriculturists, growing oranges, rice and cardamom. Their cuisine is milder than Indian or Nepali cooking: rice is the staple, with wheat, maize and buckwheat, and dishes like ponguzom, su zom, ihukpa and sorongbeetuluk. Khuzom is a traditional bread of buckwheat, millet and corn or wheat flour.",
      "And they hold a rich body of dance, song and folktale — Zo-Mal-Lok, Chu-Faat, Tendong Lho Rum Faat, Kinchum-Chu-Bomsa — played on sanga, yangjey, fungal, yarka, flute and tungbuk. The Lepcha were also earlier ruled by Pano Gaeboo Achyok, who united them and is honoured every 20 December.",
    ],
    keyFacts: [
      "Lepchas call themselves Rongkup and number around 80,000, roughly 15% of Sikkim's population.",
      "They have no tradition of migration and hold that they are indigenous to this landscape.",
      "Clans (putsho) each revere a sacred lake and peak, and take their name from them.",
      "Lepchas in Sikkim are recorded using over 370 species of animals, fungi and plants in ritual and daily life.",
      "The Mun religion persists alongside Buddhism, led by mun and by bóngthíng healers, often women.",
    ],
    relatedMonasteries: ["phodong", "phensang"],
    relatedPlaces: ["kabi-lungchok", "namchi", "mangan"],
    relatedStories: [
      "the-hill-that-saved-the-lepchas",
      "the-valley-reserved-for-the-lepchas",
      "the-healers-sikkim-still-keeps",
    ],
    sources: [
      wiki(
        "Lepcha_people",
        "The name Rongkup, population, the migration debate and the autochthony claim, clans and their sacred lakes and peaks, the 370 species, Mun religion, clothing, agriculture, cuisine, dances and Gaeboo Achyok.",
      ),
      wiki("Indigenous_peoples_of_Sikkim", "The Lepchas as first inhabitants, mun and bóngthíng, and syncretic practice."),
      govTourism("about", "The state's description of the Lepcha as among the earliest inhabitants of Sikkim."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Lepcha", "Rongkup", "Mun", "bongthing", "clans", "indigenous", "dumvun", "thakraw"],
  }),

  defineStory({
    slug: "the-valley-reserved-for-the-lepchas",
    title: "The valley reserved for the Lepchas",
    category: "Lepcha Heritage",
    claimType: "documented history",
    communities: ["Lepcha"],
    imageKey: "story/dzongu",
    heroAlt: "Chortens in the grounds of Tingvong Monastery, Upper Dzongu, north Sikkim",
    summary:
      "North of Mangan, across the Teesta, lies Dzongu — a reserve set aside for the Lepcha community. It is one of the few places in India where a landscape is legally tied to the people whose culture is built from it.",
    content: [
      "Dzongu is a valley in north Sikkim, reached across the Teesta beyond Mangan, and it is a Lepcha reservation: land set aside for the community, entry to which is regulated. It is also, not coincidentally, where a great deal of Lepcha cultural practice has survived in usable condition.",
      "The logic of the reserve makes sense once you know how Lepcha culture is organised. Clans take their names from particular lakes and peaks. Ceremonies honour specific ancestral mountains. Ritual practice draws on hundreds of plant, fungal and animal species that grow in particular forests at particular altitudes. Move the people and you do not simply relocate a community — you sever the references that the songs, the clan names and the ceremonies are made of.",
      "The valley sits in the buffer of the Khangchendzonga landscape, and Upper Dzongu is high, forested and thinly settled, with monasteries like Tingvong scattered along the ridges above the river. Lepcha villages here run homestays, which is currently the most straightforward way for a visitor to see the valley: you stay in a house, you eat what the household eats, and the money reaches the household directly.",
      "The reserve is under pressure. The Lepcha reservation in Dzongu is threatened by dam construction — the Teesta is one of the most heavily developed rivers in the eastern Himalaya, and hydroelectric projects have been proposed and built along its length. Sikkim receives most of its electricity from nineteen hydroelectric power stations. The tension between that and a valley reserved for a community whose culture is keyed to its rivers and peaks is not a theoretical one, and it has driven sustained protest by Lepcha organisations.",
      "This archive does not take a position on any specific project. What it records is that the Lepcha reserve exists, that it is legally distinct, that it is the strongest surviving concentration of Lepcha cultural practice in Sikkim, and that the community itself describes it as under threat.",
      "The organisational face of that concern is broader than Dzongu. The Sikkim Bhutia Lepcha Apex Committee, founded in 1999, promotes the socio-political and economic rights of the Bhutia and Lepcha people as set out in Article 371F of the Indian Constitution — the provision that preserved Sikkim's own laws when it joined India in 1975.",
      "For a visitor: Dzongu requires a permit, arranged in advance, and the point of coming is not a viewpoint. It is that you are in the one part of Sikkim where a landscape and a culture are still legally the same object.",
    ],
    keyFacts: [
      "Dzongu, in north Sikkim beyond Mangan, is a reserve set aside for the Lepcha community.",
      "Entry requires a permit arranged in advance; village homestays are the usual way to visit.",
      "Lepcha clan names, ceremonies and ritual species are tied to specific local lakes, peaks and forests.",
      "The reserve is described as threatened by dam construction on the Teesta.",
      "Sikkim draws most of its electricity from 19 hydroelectric power stations.",
    ],
    relatedMonasteries: ["phodong", "phensang", "lachen"],
    relatedPlaces: ["mangan", "chungthang", "khangchendzonga-national-park"],
    relatedStories: [
      "the-people-who-say-they-never-arrived",
      "the-hill-that-saved-the-lepchas",
      "a-house-with-no-nails",
    ],
    sources: [
      wiki(
        "Indigenous_peoples_of_Sikkim",
        "The Lepcha reservation in Dzongu valley and the threat from dam construction; SIBLAC and Article 371F.",
      ),
      wiki("Lepcha_people", "Clan naming from lakes and peaks and the ritual use of local species."),
      wiki("Sikkim", "Sikkim's 19 hydroelectric power stations."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Dzongu", "Lepcha", "reserve", "Teesta", "Mangan", "homestay", "North Sikkim"],
  }),

  defineStory({
    slug: "people-of-the-rice-valley",
    title: "People of the rice valley",
    category: "Bhutia Heritage",
    claimType: "documented history",
    communities: ["Bhutia"],
    legacyImageKey: "mon/lachung",
    heroAlt: "Lachung Monastery in the high valley of north Sikkim, a Bhutia settlement",
    summary:
      "The Bhutias call themselves Drejongpa — people of the rice valley. They arrived from Tibet, brought Buddhism, founded a monarchy, and gave Sikkim the garment, the drink and the vase-shaped incense burner you will see outside half its houses.",
    content: [
      "Bhutia is the exonym; Drejongpa is what the community calls itself, and it means people of the rice valley. They are a Tibetan ethnic group native to Sikkim, and they speak Drejongke, a Tibetic language descended from Old Tibetan. It shares 65 per cent lexical similarity with Dzongkha, the language of Bhutan, and only 42 per cent with standard Tibetan — a measure of how long these communities have been developing separately.",
      "Migration from Tibet began in small numbers as early as the 8th century, increased in the 13th when many clans came with Gyed Bum Sa, and became a movement in the mid-1600s. The long conflict between the Red Hat and Yellow Hat schools ended with a decisive Yellow Hat victory and persecution of Red Hat followers; many fled south over the Himalayan passes into Sikkim and Bhutan. Both countries have Red Hat majorities to this day, and Sikkim's Buddhism is accordingly Nyingma and Kagyu rather than Gelug.",
      "Bhutia surnames are frequently geographical. In north Sikkim, where the community is in the majority, people are known as Lachenpas or Lachungpas — inhabitants of La chen, the big pass, or La chung, the small pass.",
      "The dress is the most visible marker. The kho, called bakhu in Nepali, is a loose cloak-like garment fastened at the neck on one side and at the waist with a silk or cotton belt, close kin to the Tibetan chuba and the Mongolian deel. Men wear it over loose trousers. Women wear a sleeveless floor-length version over a full-sleeved blouse — the wonju or teygho — tied at the waist with a silk belt called a kyera. Married women add the pangden, a loose sheet of multicoloured woollen cloth with geometric designs, worn at the front. Embroidered leather boots complete it. Pure gold is favoured for jewellery by women and men alike.",
      "Outside the house you will often see a sangbum: a stone structure shaped like a vase, for burning incense. Sang means incense, bum means vase. What is burned in it is specific — scented dried leaves or stalks of Rhododendron anthopogon, Juniperus recurva or Rhododendron setosum, or pine incense sticks — offered to the deities.",
      "The food is rice with vegetables or meat fried in animal fat, usually pork or beef, with momo and thukpa as the best-known dishes. Chhaang is the favourite drink, fermented from barley or millet and served in a bamboo container called a tongba, and butter tea appears on religious and social occasions. The community is recorded as using over 70 species of animal, fungi and plant.",
      "The Bhutias' festivals are Losar at the start of the Tibetan year and Losoong at its end, both marked with Cham dancing, and their folk dances include Denzong-Neh-Na, Ta-Shi-Yang-Ku, Tashi Shabdo, Guru-Chinlap, Singhi Chham and Yak Chham. They are recognised as a Scheduled Tribe in Sikkim, West Bengal and Tripura.",
    ],
    keyFacts: [
      "Drejongpa — 'people of the rice valley' — is the community's own name; Bhutia is the exonym.",
      "Drejongke is 65% lexically similar to Dzongkha and only 42% to standard Tibetan.",
      "Red Hat persecution in Tibet in the mid-1600s drove migration south; Sikkim's Buddhism is Nyingma and Kagyu.",
      "The kho or bakhu is the traditional garment; the pangden apron marks a married woman.",
      "The sangbum, a vase-shaped stone incense burner, stands outside the house and burns rhododendron and juniper.",
    ],
    relatedMonasteries: ["lachen", "lachung", "rumtek", "phodong"],
    relatedPlaces: ["lachung", "lachen", "chungthang"],
    relatedStories: [
      "the-village-that-governs-itself",
      "two-days-before-the-new-year-evil-is-destroyed",
      "the-drink-you-sip-through-a-straw",
    ],
    sources: [
      wiki(
        "Bhutia",
        "Drejongpa and Drejongke, the lexical similarity figures, the migration history and Red Hat persecution, Lachenpa and Lachungpa naming, the kho/bakhu/pangden, the sangbum and its incense, food, chhaang, dances and Scheduled Tribe status.",
      ),
      wiki("Kho_(Bhutia_dress)", "The kho as a loose garment fastened at neck and waist, and the wonju blouse."),
      govTourism("about", "The state's description of the Bhutia as migrants from Kham in the 14th century, living mostly in the north and east."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Bhutia", "Drejongpa", "kho", "bakhu", "pangden", "sangbum", "Lachenpa", "Tibetan"],
  }),

  defineStory({
    slug: "the-village-that-governs-itself",
    title: "The village that governs itself",
    category: "Bhutia Heritage",
    claimType: "documented history",
    communities: ["Bhutia"],
    legacyImageKey: "mon/lachen",
    heroAlt: "Lachen Monastery above the town of Lachen in north Sikkim",
    summary:
      "Lachen and Lachung run their own affairs through the Dzumsa — literally, the meeting place of the people. Every household is represented, the headman is called the Pipon, and the state recognises the whole arrangement.",
    content: [
      "Two towns in north Sikkim have a form of government the rest of India does not. Lachen and Lachung — the big pass and the small pass — are administered by the Dzumsa, a traditional legal and governing system whose name means the meeting place of the people.",
      "The Dzumsa is a village assembly with representation for every household. It manages local governance, resolves disputes and organises community activities. It is headed by a village headman called the Pipon. This is not a folk custom that survives alongside the real administration: the state government has extended full protection to it, according the Dzumsa the status of a Panchayat ward and the Pipon that of a Panchayat head.",
      "The practical effect is visible to any visitor who spends a night in Lachen. Decisions about grazing, about when vehicles may move, about how tourism is handled, about the use of common land, are taken by the assembly and are binding. Homestay allocation in some seasons has been managed collectively. A visitor who is told that something is not possible today has usually run into a Dzumsa decision rather than an individual's preference, and arguing is beside the point.",
      "The people of these towns are Bhutia and Tibetan, speaking Nepali, Bhutia and Tibetan. Lachen sits at about 2,900 metres near the confluence of the Lachen and Lachung rivers, both tributaries of the Teesta, roughly 129 kilometres from Gangtok. It is the base for Gurudongmar Lake, for Thangu valley thirty kilometres north, and for the Chopta valley, which is rich in alpine flora and quiet enough for birdwatching.",
      "The Lachen and Lachung rivers meet at Chungthang, downstream, to become the Teesta — so these two towns are, in a real hydrological sense, where Sikkim's principal river begins.",
      "The Dzumsa is worth thinking about beyond its novelty. Sikkim has a good deal of traditional governance that survived the transition of 1975, protected by Article 371F: the monastic calendar shapes public holidays, communal land arrangements persist, and the Dzumsa is the clearest single case of a pre-modern institution operating with statutory recognition inside a modern Indian state.",
      "Practically, north Sikkim requires permits, which are issued through registered travel agencies and checked at police posts on the way up. Lachen and Lachung are the overnight bases for almost all northern travel, so most visitors pass through Dzumsa territory without ever being told what it is.",
    ],
    keyFacts: [
      "Lachen and Lachung are governed by the Dzumsa, meaning 'the meeting place of the people'.",
      "Every household is represented; the assembly is headed by a village headman called the Pipon.",
      "The state accords the Dzumsa the status of a Panchayat ward and the Pipon that of a Panchayat head.",
      "Lachen sits at about 2,900 m and is the base for Gurudongmar, Thangu and Chopta valley.",
      "The Lachen and Lachung rivers join at Chungthang to form the Teesta.",
    ],
    relatedMonasteries: ["lachen", "lachung"],
    relatedPlaces: ["lachen", "lachung", "chungthang", "gurudongmar-lake"],
    relatedStories: [
      "people-of-the-rice-valley",
      "the-lake-that-would-not-freeze",
      "what-you-actually-need-a-permit-for",
    ],
    sources: [
      wiki("Bhutia", "The Dzumsa, its meaning, the Pipon, and the state's grant of Panchayat status."),
      wiki("Lachen,_Sikkim", "Lachen's altitude and distances, the Dzumsa as household-based governance, and access to Gurudongmar, Thangu and Chopta."),
      wiki("Chungthang", "The confluence of the Lachen and Lachung rivers forming the Teesta."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Dzumsa", "Lachen", "Lachung", "Pipon", "governance", "North Sikkim"],
  }),

  defineStory({
    slug: "who-the-nepali-of-sikkim-actually-are",
    title: "Who the 'Nepali' of Sikkim actually are",
    category: "Nepali Heritage",
    claimType: "documented history",
    communities: ["Nepali", "Rai", "Limbu", "Tamang", "Gurung", "Magar", "Newar", "Sherpa"],
    imageKey: "story/maruni",
    heroAlt: "Dancers performing the Maruni, a Nepali folk dance, in Sikkim",
    summary:
      "The word covers at least a dozen communities with distinct languages, festivals and scripts. The Rai are the single largest community in Sikkim; the Limbu gave the state its name. Reading them as one people loses most of the story.",
    content: [
      "Sikkim Tourism describes the state's culture as a blend of Lepcha, Bhutia and Nepali, and calls Nepali the predominant community and lingua franca. That is true and it is also where most descriptions stop, which is a shame, because the third term hides more than it reveals.",
      "The Anthropological Survey of India has identified twenty-one communities in Sikkim, and more than thirteen languages of different linguistic stock are spoken. One enumeration of community shares puts the Rai at 13.4 per cent — the single largest ethnic community in the state — followed by Chettris at 12.22, Limbus at 9.79, Bhutias at 8.57, Lepchas at 7.94, Khas Bahun at 6.96, Tamangs at 6.8, Gurungs at 5.87, Sherpas at 4.45, Kamis at 4.25, Pradhans (Newar) at 3.73, Magars at 2.69 and Damais at 1.96, with smaller numbers of Sunuwar, Bhujel, Thami, Sarki, Jogi and Yakkha.",
      "Some of these communities were here before the word Nepali applied to anyone. The Limbus — Tsongs — are, with the Lepchas, the indigenous people of Sikkim; the state's name itself is generally derived from the Limbu words su, new, and khyim, palace or house. Others arrived later and for specific reasons. The Newars, the business class among Nepali communities, were brought by the ministers of the Chogyal because they had the technology of minting coins and of building pagoda-type houses, and were given permission to dig mines. They in turn brought worker and artisan castes — Kamis who are smiths, Damais who are tailors, Sarkis who are cobblers.",
      "The largest transformation came in the 18th and 19th centuries. Gorkhali rulers conquered western Sikkim; the Treaty of Titalia in 1817 returned occupied lands to Sikkim and brought the already-settled Nepalese population under Sikkimese rule; colonial landlords encouraged further immigration to raise rents in densely forested country. By the first census of Sikkim in 1891, two-thirds of the population — 25,955 of 30,458 — were of Nepalese origin.",
      "They also changed the physical landscape permanently. The Nepalese introduced terraced cultivation to Sikkim's hills, which had a great effect on rice, maize, and the cash crops of cardamom and ginger. The stepped fields you photograph from the road above Namchi are an 18th- and 19th-century technology transfer.",
      "The evidence that these are distinct communities rather than one is in the state's own festival calendar. The Rai keep Sakewa. The Limbu keep Teyongsi Sirijunga Sawan Tongnam. The Tamang keep Sonam Lochar, the Gurung Tamu Lochar, the Magar Barahimizong, the Newar Indra Jatra. Sikkim recognises Nepali, Limbu, Newar, Rai, Gurung, Magar, Sherpa, Tamang, Sunwar and Bhujel as official languages for the preservation of culture and tradition.",
      "So: Nepali is accurate as a linguistic and civic description, and inadequate as an ethnic one. When someone in Sikkim tells you which community they are from, they are not being pedantic.",
    ],
    keyFacts: [
      "The Anthropological Survey of India identifies 21 communities in Sikkim, speaking more than 13 languages.",
      "The Rai are the single largest ethnic community in Sikkim, followed by Chettris and Limbus.",
      "The state's name is generally derived from the Limbu su-khyim — 'new palace'.",
      "By the 1891 census, 25,955 of Sikkim's 30,458 residents were of Nepalese origin.",
      "Nepalese settlers introduced terraced cultivation, reshaping Sikkim's agriculture and its hillsides.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "jorethang", "namchi", "singtam"],
    relatedStories: [
      "dancing-the-year-into-the-ground",
      "twelve-official-languages-in-one-small-state",
      "the-terraces-that-turned-organic",
    ],
    sources: [
      govTourism("about", "The state's framing of Lepcha, Bhutia and Nepali, and Nepali as the predominant community and lingua franca."),
      wiki(
        "Sikkimese_people",
        "The 21 communities identified by the Anthropological Survey of India, the community population shares, and the list of official languages.",
      ),
      wiki(
        "Indigenous_peoples_of_Sikkim",
        "The Limbu as indigenous and the su-khyim etymology, the Newar invitation and the artisan castes, the Treaty of Titalia, the 1891 census and the introduction of terraced cultivation.",
      ),
      govFestivals("The community attribution of Sakewa, Teyongsi Srijunga Sawan Tongnam, Sonam Lochar, Tamu Lochar, Barahimizong and Indra Jatra."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Nepali", "Rai", "Limbu", "Newar", "Tamang", "Gurung", "Magar", "communities", "terracing"],
  }),

  defineStory({
    slug: "the-scripture-that-is-sung-not-read",
    title: "The scripture that is sung, not read",
    category: "Folklore & Oral Tradition",
    claimType: "oral tradition",
    communities: ["Limbu", "Rai"],
    imageKey: "story/limbu-house",
    heroAlt: "A traditional Limbu house at Hee-Kengbari village in west Sikkim",
    summary:
      "The Mundhum is the Limbu people's scripture, and for most of its life it had no written form at all. It was composed and recited as song by bards, and it still governs how a house is built and where its central pillar stands.",
    content: [
      "The Mundhum, also called Peylan, is the ancient religious scripture and folk literature of Kirat Mundhum, the indigenous religion of the Kirati peoples. The name means the power of great strength in the Limbu language. It covers the culture, customs and traditions of the Yakthung — the Limbus' own name for themselves — and its material is held to precede the rise of Vedic civilisation in the subcontinent.",
      "It comes in two parts, and the division is the interesting thing. The Thungsap Mundhum was collected, preserved and transmitted entirely by word of mouth until writing arrived: an epic composed and recited as songs by Sambas, who were religious poets and bards. The word itself carries the method — sam means song, and ba the one who knows it. The Peysap Mundhum is the written body, divided into four parts covering the creation of the universe, the beginning of humankind, the cause and effect of sin, the origin of evil spirits, the first leader who made laws for marriage, arbitration and purification, a deluge that destroyed humankind, and the reason there are many languages.",
      "The performers matter as much as the text. Yakthung culture includes Phedangma, Yeba, Yema, Shamba, Samma and Tutu-Tumyahangs — categories of ritual specialist, each with their own function. Mundhum rituals are performed only by these specialists, in a very ancient form of the language and in particular tones. To study Mundhum you must first study Limbu, Yakkha, Bantawa or Sunuwar.",
      "The deity at its centre is Yuma Sammang, literally Mother Earth or Grandmother, also known as Ningwaphuma, widely revered among Yakthungs and generally regarded as a maternal figure. The religion is called Yuma Samyo.",
      "Where this becomes visible to a visitor is in architecture. The Limbu house is a symbolic representation of Yuma. Windows and doors are embroidered with wood carvings of flowers used in ritual; some carvings directly represent the gold jewellery worn by Limbu women; the skirting of the wall is painted with red mud, a representation of the patuka belt women wear. The most important element is the muring-sitlam, the main pillar at the centre of the ground floor, which is believed to be where the Yuma goddess resides in the house — and around which the household performs ritual prayers and offerings, usually twice a year.",
      "On the outside, a Limbu house is identified by geometric patterns — circle, triangle, square — painted on the facade, and by the Silam Sakma symbol, a diamond of nine concentric layers crossed by a vertical and a horizontal axis, used ritually by phedangmas. It appears on entry gates and balcony railings, and is worn on the left chest at community events.",
      "These houses are found in eastern Nepal and western Sikkim. Acculturation has made them harder to identify from the outside than they once were, which is exactly the kind of quiet loss an archive exists to note before it finishes.",
    ],
    keyFacts: [
      "The Mundhum is the scripture of Kirat Mundhum, the indigenous religion of the Kirati peoples.",
      "The Thungsap Mundhum was transmitted entirely orally, composed and recited as song by Sambas.",
      "Yuma Sammang — Mother Earth — is the central deity; the religion is called Yuma Samyo.",
      "A Limbu house's central pillar, the muring-sitlam, is where Yuma is held to reside, and is worshipped twice yearly.",
      "The Silam Sakma symbol — nine concentric diamonds on two axes — identifies a Limbu house or wearer.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gyalshing", "soreng", "rinchenpong"],
    relatedStories: [
      "the-scholar-killed-for-an-alphabet",
      "dancing-the-year-into-the-ground",
      "the-drink-you-sip-through-a-straw",
    ],
    sources: [
      wiki("Mundhum", "The name and meaning, the Thungsap and Peysap divisions, the Sambas, and the content of the four written parts."),
      wiki("Yuma_Sammang", "Yuma Sammang as Mother Earth, Ningwaphuma, Yuma Samyo, and the Mundhum performers."),
      wiki(
        "Limbu_people",
        "The Limbu house as a representation of Yuma, the muring-sitlam pillar, the red mud skirting and patuka, the geometric facade patterns and the Silam Sakma symbol.",
      ),
    ],
    verificationStatus: "community-attested",
    lastVerified: "2026-08-17",
    tags: ["Mundhum", "Limbu", "Yakthung", "Yuma", "phedangma", "oral tradition", "house"],
  }),

  defineStory({
    slug: "the-healers-sikkim-still-keeps",
    title: "The healers Sikkim still keeps",
    category: "Traditional Knowledge",
    claimType: "oral tradition",
    communities: ["Lepcha", "Limbu", "Rai", "Tamang", "Gurung", "Magar"],
    imageKey: "story/dhyangro",
    heroAlt: "A Rai mangpa with a dhyangro, the double-sided frame drum used in shamanic ritual",
    summary:
      "Bongthing, mun, phedangma, mangpa, jhakri — Sikkim has a working vocabulary for ritual healers, one word per community. They are cultural practitioners, not medical ones, and this archive is careful about the difference.",
    content: [
      "Across Sikkim and the neighbouring hills, most communities have a word for a ritual specialist who diagnoses trouble, conducts ceremonies and mediates with spirits. The Nepali word is jhākri, sometimes reserved for a particular kind of practitioner; in Limbu the term is phedangba, in Rai nakchhong or mangpa or bijuwa, and among the Lepchas the specialist is a bóngthíng, alongside the mun who officiate ceremonies and festivals.",
      "This is cultural heritage, and this archive treats it as such. Nothing here is a medical claim. What is documented is that these practitioners exist, what they do in ritual terms, and what part they play in community life. Anyone unwell in Sikkim should see a doctor.",
      "What they do, described plainly: jhākris perform rituals at weddings, funerals and harvests. Their practices are influenced by Tibetan Buddhism, by Mun and by Bön rites — a genuinely layered tradition rather than a single one. Their principal instrument is the dhyāngro, a frame drum made of animal hide stretched over a hollow wooden ring, played with bells attached by rope, and mantras are recited in Tibetan or in the practitioner's own language.",
      "Among the Lepchas, bóngthíng are healers and are often female, and Mun and Buddhist rituals are frequently observed alongside each other in the same household. That syncretism is normal here rather than exceptional.",
      "Sikkim has also built a public monument to the tradition, which is unusual anywhere in the world. The Banjhakri Falls and Energy Park, about seven kilometres from Gangtok on the highway to north Sikkim, was conceived by the then Chief Minister after a visit to the falls in 2004, with the stated intention of reviving interest in the shamanic beliefs of the people. Citizens were invited to suggest themes. Two acres of forest were developed, and the park now holds statues of jhākri and of the ancestors of the Kirati people, with sculptures of Mangpa, jhākri, Bongthing, Phedangba and Bijuwa housed in thatched enclosures.",
      "The natural waterfall the park is built around is a spring-fed cascade about thirty metres high, in thickly forested land. Ban means forest and jhākri means healer: the Ban Jhakri is specifically the shamanic healer who worships spirits living in the caves around these falls.",
      "There is one more site where this tradition and a landscape meet publicly. Tsomgo Lake, at 3,753 metres on the Gangtok–Nathu La road, is the venue for the Guru Purnima festival, when the jhakris of Sikkim assemble at the lake. Buddhist monks are also recorded as having prognosticated by studying the lake's changing colours. A glacial lake that draws both monks and shamans is a fair summary of how religion works in this state.",
    ],
    keyFacts: [
      "Each community has its own term: bóngthíng and mun (Lepcha), phedangba (Limbu), mangpa or nakchhong (Rai), jhākri (Nepali).",
      "Practices draw on Tibetan Buddhism, Mun and Bön rites; the principal instrument is the dhyāngro frame drum.",
      "Lepcha bóngthíng are healers and are often women.",
      "Banjhakri Falls and Energy Park near Gangtok was developed from 2004 to revive interest in shamanic tradition.",
      "Jhakris gather at Tsomgo Lake for Guru Purnima; monks are recorded reading the lake's changing colours.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["banjhakri-falls", "tsomgo-lake", "gangtok"],
    relatedStories: [
      "the-shaman-who-lives-in-the-forest",
      "the-people-who-say-they-never-arrived",
      "a-lake-that-was-read-like-a-book",
    ],
    sources: [
      wiki("Jhākri", "The terms across communities, the ritual functions, the Buddhist/Mun/Bön influences and the dhyāngro."),
      wiki("Indigenous_peoples_of_Sikkim", "Lepcha mun and bóngthíng, and the syncretic practice of Mun with Buddhism."),
      wiki(
        "Banjhakri_Falls_and_Energy_Park",
        "The park's conception in 2004, the statuary of Mangpa, jhākri, Bongthing, Phedangba and Bijuwa, the 30 m falls and the meaning of Ban Jhakri.",
      ),
      wiki("Lake_Tsomgo", "The Guru Purnima gathering of jhakris and the monks' reading of the lake's colours."),
    ],
    verificationStatus: "community-attested",
    lastVerified: "2026-08-17",
    tags: ["jhakri", "bongthing", "mun", "phedangma", "dhyangro", "shaman", "healing", "Banjhakri"],
  }),

  defineStory({
    slug: "the-shaman-who-lives-in-the-forest",
    title: "The shaman who lives in the forest",
    category: "Folklore & Oral Tradition",
    claimType: "legend",
    communities: ["Rai", "Limbu", "Nepali"],
    imageKey: "story/banjhakri-statues",
    heroAlt: "Statues of Banjhakri and an initiate boy near the Banjhakri Falls in Gangtok",
    summary:
      "He is short, covered in hair, and his feet point backwards. He takes promising children into a cave and teaches them to be shamans — and his wife, if she gets to them first, eats them.",
    content: [
      "Banjhākri and Banjhākrini are shamanic deities in the tradition of the Kirati people of Sikkim, Darjeeling, Kalimpong and Nepal. In Nepali, ban means wilderness, jhākri means shaman and jhākrini means shamaness. They are a couple, and possibly two aspects of the same being. They are the supernatural shamans of the forest.",
      "The descriptions are unusually specific for a folk figure. Banjhākri is short — about one to one and a half metres — wild, simian, a trickster, and a descendant of the sun. His ears are large. His feet point backwards. Long matted hair covers his whole body except his face and palms. He plays a golden dhyāngro, the frame drum that real Nepali jhākri play.",
      "Banjhākrini is both bear-like and human, with long hair on her head, long pendulous breasts and, like her husband, backward-pointing feet. She is usually described as bloodthirsty and brutal, and she carries a symbolic golden sickle.",
      "The story they belong to is an initiation story. Banjhākri finds human children with the potential to become great shamans and takes them back to his cave to train them. In the cave they are in danger of being eaten whole by Banjhākrini. The children who pass her ordeal are trained by Banjhākri, and when they return home with that training they can become more powerful than shamans taught by people. He abducts them, but not out of malice — the abduction is the curriculum.",
      "Like the yeti, both are held to be visible in this world and not only in the spirit world, though only powerful shamans can see them. The comparison with the yeti is one the tradition itself makes, and it comes with a distinction: yeti are taller than humans, Banjhākri is smaller. One anthropologist has suggested Banjhākri is a therianthrope, a humanoid who changes into animal form.",
      "Some accounts hold that there are many ban-jhākri and ban-jhākrini rather than one couple. Either way, the shamans of Nepal regard the original Banjhākri as the founder of their tradition — revered and celebrated as a teacher and as the god of the forest.",
      "This is filed as a legend, deliberately and without embarrassment. It is a narrative of real cultural weight whose historical status is not established, and it explains something no historical record can: why a community understands shamanic ability as something conferred by the forest rather than inherited or purchased, and why the training is imagined as a terrifying ordeal rather than an apprenticeship.",
      "You can see the pair in bronze. The Banjhakri Falls and Energy Park outside Gangtok has statues of Banjhakri and an initiate boy, and the falls themselves are said to be where the spirits live in the caves.",
    ],
    keyFacts: [
      "Banjhākri and Banjhākrini are the forest shaman deities of the Kirati tradition in Sikkim and Nepal.",
      "Banjhākri is about 1–1.5 m tall, hair-covered, with backward-pointing feet, and plays a golden dhyāngro.",
      "He abducts children with shamanic potential and trains them in his cave; Banjhākrini may eat them first.",
      "Children who survive her ordeal are held to become more powerful than shamans trained by people.",
      "Statues of Banjhakri and an initiate stand at the Banjhakri Falls park outside Gangtok.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["banjhakri-falls", "gangtok"],
    relatedStories: [
      "the-healers-sikkim-still-keeps",
      "the-scripture-that-is-sung-not-read",
      "the-hill-that-saved-the-lepchas",
    ],
    sources: [
      wiki(
        "Banjhakri_and_Banjhakrini",
        "The pair as forest shaman deities, their physical descriptions, the abduction-and-training narrative, the yeti comparison and their status as founders of Nepali shamanism.",
      ),
      wiki("Banjhakri_Falls_and_Energy_Park", "The statues of Banjhakri and the initiate boy, and the spirits held to live in the caves around the falls."),
    ],
    verificationStatus: "community-attested",
    lastVerified: "2026-08-17",
    tags: ["Banjhakri", "legend", "shaman", "forest", "Kirati", "folklore", "initiation"],
  }),
];
