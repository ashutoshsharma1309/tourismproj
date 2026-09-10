import { defineStory, govFestivals, govTourism, wiki } from "./types";
import type { Story } from "./types";

/**
 * Folk music and dance, craft, and the written word.
 *
 * Community attribution for every dance here comes from Sikkim Tourism's own
 * folk-dance page, which names the community for each. That matters: a dance
 * described as generically "Sikkimese" belongs to nobody, and the people who
 * keep it deserve the credit line.
 */

export const folkArtStories: Story[] = [
  defineStory({
    slug: "the-eleven-dances-of-three-communities",
    title: "Eleven dances, and who they belong to",
    category: "Folk Music & Dance",
    claimType: "documented history",
    communities: ["Lepcha", "Bhutia", "Nepali", "Limbu", "Tamang"],
    imageKey: "story/maruni",
    heroAlt: "Dancers in traditional dress performing a Nepali folk dance in Sikkim",
    summary:
      "The state's own folk-dance list names eleven dances and, for each one, the community it belongs to. Read it end to end and you get a fair map of Sikkimese culture: mountains, harvests, weddings, yaks and gods.",
    content: [
      "Sikkim Tourism publishes a list of the state's folk dances, and unusually for a tourism page it does the one thing that matters: it says whose each dance is. Eleven dances, attributed. It is the most useful single page about Sikkimese culture on the internet, and almost nobody reads it.",
      "Three of the eleven are Lepcha. Chu-Faat is danced in honour of Khangchendzonga — chu means snowy range, faat means worship — with dancers carrying butter lamps and green bamboo leaves and singing devotional songs. Zo-Mal-Lok depicts the sowing, reaping and harvesting of paddy, old and young joining hands, danced to tungbuk, flute, cymbal and drum. Tendong Lho Rum Faat retells the flood that Tendong hill saved the Lepchas from.",
      "Four are Bhutia. Denong-Neh-Nah is danced by boys and girls to pay homage to past and present saints, including Guru Rinpoche, to flute, yangjey, drum and yarka. Ta-Shi-Yang-Ku invokes benign deities to bring fortune to a household, and is performed at the consecration of a new house and to bless a newly married couple. Yak Chham depicts the movements of the yak and the life of mountain herdsmen, with dancers in yak costume and mask; the state singles out the chhams at Pemayangtse, Rumtek and Enchey as especially impressive. Kagyed is the great masked ritual dance of the eight tantric gods.",
      "Four are Nepali, and each belongs to a specific community within that word. Tamang Selo is the Tamang group dance, driven by robust foot-tapping and the sound of the damphu. Chutkay is a romantic group dance for male and female dancers, sharing the joys of life during harvest and on happy occasions. Naumati is the dance of the Damai community, built on nine instruments. Chyap-Brung is the Limbu dance, named for the drum the dancers wear.",
      "What the list makes visible, once you lay it out, is what these communities dance about. Not one of these is a dance about a king or a battle. They are about mountains, paddy, houses, weddings, animals and gods — the working life of hill agriculture, plus the powers that hill agriculture depends on.",
      "The instruments deserve their own note. The Lepcha inventory includes sanga, a drum; yangjey, a string instrument; fungal; yarka; flute; and tungbuk. One popular Lepcha instrument is a four-string lute played with a bow. The Nepali inventory in Naumati alone runs to nine: two types of senai, turhi in small and large, two kinds of damaha, two of tuyamko, dholki and jhyamta.",
      "None of these are museum pieces. Naumati Baja is a regular feature at weddings; Tamang Selo is played at Sonam Lochar; the chhams are danced on their calendar dates in monastery courtyards. The right way to see any of them is to be in the right place on the right day, and the right day is a community's day rather than a tourism department's.",
    ],
    keyFacts: [
      "Sikkim Tourism names eleven folk dances and attributes each to a community.",
      "Lepcha dances: Chu-Faat, Zo-Mal-Lok and Tendong Lho Rum Faat.",
      "Bhutia dances: Denong-Neh-Nah, Ta-Shi-Yang-Ku, Yak Chham and Kagyed.",
      "Nepali dances: Tamang Selo, Chutkay, Naumati and the Limbu Chyap-Brung.",
      "Almost every dance is about mountains, harvest, houses, weddings or animals — not about rulers.",
    ],
    relatedMonasteries: ["pemayangtse", "rumtek", "enchey"],
    relatedPlaces: ["gangtok"],
    relatedStories: [
      "the-dance-that-worships-a-snowy-range",
      "the-drum-you-wear",
      "eight-tantric-gods-and-a-bonfire",
    ],
    sources: [
      govTourism(
        "dances",
        "All eleven dances, their community attribution, their descriptions and their instruments, including the chhams at Pemayangtse, Rumtek and Enchey.",
      ),
      wiki("Lepcha_people", "The Lepcha instrument inventory and the four-string bowed lute."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["folk dance", "Chu-Faat", "Zo-Mal-Lok", "Yak Chham", "Naumati", "Tamang Selo", "instruments"],
  }),

  defineStory({
    slug: "the-dance-that-worships-a-snowy-range",
    title: "The dance that worships a snowy range",
    category: "Folk Music & Dance",
    claimType: "documented history",
    communities: ["Lepcha"],
    legacyImageKey: "hero/kanchenjunga",
    heroAlt: "The snows of Khangchendzonga, honoured in the Lepcha Chu-Faat dance",
    imageNote:
      "No openly licensed photograph of the Chu-Faat dance exists on Wikimedia Commons. Shown instead is Khangchendzonga, which the dance honours.",
    summary:
      "Chu means snowy range. Faat means worship. In this Lepcha group dance, performers carry butter lamps and green bamboo leaves and sing to the mountain the whole state treats as its guardian.",
    content: [
      "Chu-Faat is a Lepcha group dance whose name states its purpose. Chu is the snowy range; faat is worship. It is performed in honour of Mount Khangchendzonga, the guardian deity of the Sikkimese people, and the dancers carry butter lamps and green bamboo leaves, singing devotional songs as they move.",
      "The two objects in their hands are worth pausing on. A butter lamp is the standard offering of Himalayan Buddhism, found on every altar in Sikkim. Green bamboo leaves are not: bamboo is abundant in Lepcha country and central to Lepcha material culture — houses, baskets, hats, containers. Held together, they are a fair image of what Lepcha practice actually is, a Buddhist frame around an older relationship with a specific forest.",
      "The mountain being addressed is the same one the Bhutia-founded state consecrated as its guardian deity at Pang Lhabsol, and the same one the Utsav portal notes has its origin in the Lepcha belief that the mountain is their place of origin. Two communities, two ceremonies, one mountain, and a genuine shared devotion rather than a borrowed one.",
      "Chu-Faat belongs to a small group of Lepcha dances that the Lepcha people themselves name as their popular folk dances: Zo-Mal-Lok, Chu-Faat, Tendong Lho Rum Faat and Kinchum-Chu-Bomsa. Between them they cover the mountain, the paddy field and the flood — which is to say, the three forces that decide whether a year in these hills goes well.",
      "Zo-Mal-Lok is the agricultural one, and the state's description of it is unusually warm: a famous Lepcha dance depicting the sowing, reaping and harvesting of paddy, in which old and young join hands to sing and make merry, their graceful movements set against the sounds of seasonal birds. It is danced to tungbuk, flute, cymbal and drum.",
      "The instruments used across Lepcha performance are sanga, a drum; yangjey, a string instrument; fungal; yarka; flute; and tungbuk, with a four-string lute played with a bow among the most distinctive.",
      "Much of what survives of this repertoire survives because one man went and collected it. Sonam Tshering Lepcha, born in 1928 at Bong Busty in Kalimpong, began his career as a soldier, then travelled through Sikkim collecting traditional musical instruments and compiling songs. He became the first Lepcha to feature on All India Radio, in 1960, and is credited with over 400 folk songs, 102 folk dances and 10 dance dramas. He founded a museum in Kalimpong holding indigenous instruments, ancient weapons and manuscripts, received the Sangeet Natak Akademi Award in 1995 and the Padma Shri in 2007, and died in 2020.",
      "That is the practical answer to how a small community's oral repertoire reaches the present: usually one person, with a notebook, for decades.",
    ],
    keyFacts: [
      "Chu-Faat honours Khangchendzonga; chu means snowy range and faat means worship.",
      "Dancers carry butter lamps and green bamboo leaves and sing devotional songs.",
      "The popular Lepcha folk dances are Zo-Mal-Lok, Chu-Faat, Tendong Lo Rum Faat and Kinchum-Chu-Bomsa.",
      "Lepcha instruments include sanga, yangjey, fungal, yarka, flute and tungbuk.",
      "Sonam Tshering Lepcha (1928–2020) is credited with collecting over 400 folk songs and 102 folk dances.",
    ],
    relatedMonasteries: ["ralang", "phodong"],
    relatedPlaces: ["kangchenjunga", "namchi", "mangan"],
    relatedStories: [
      "the-eleven-dances-of-three-communities",
      "the-five-treasures-of-the-great-snow",
      "the-people-who-say-they-never-arrived",
    ],
    sources: [
      govTourism("dances", "Chu-Faat's meaning, its dedication to Khangchendzonga, the butter lamps and bamboo leaves, and the Zo-Mal-Lok description."),
      wiki("Lepcha_people", "The list of popular Lepcha folk dances and the instrument inventory."),
      wiki("Sonam_Tshering_Lepcha", "His life, the collecting work, the All India Radio broadcast in 1960, the tallies of songs and dances, the museum and his awards."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Chu-Faat", "Lepcha", "Khangchendzonga", "butter lamp", "Zo-Mal-Lok", "Sonam Tshering Lepcha"],
  }),

  defineStory({
    slug: "the-drum-no-celebration-is-complete-without",
    title: "The drum no celebration is complete without",
    category: "Folk Music & Dance",
    claimType: "documented history",
    communities: ["Tamang"],
    imageKey: "story/naumati",
    heroAlt: "Naumati Baja — the nine-instrument ensemble played at Nepali weddings",
    summary:
      "Tamang Selo is carried by the damphu, a hand-held frame drum, and by songs called Hwai. The state's own line on it is blunt: no Nepali merrymaking is considered complete without singing one.",
    content: [
      "Tamang Selo is the group dance of the Tamang community, and the state describes it in terms of energy rather than form — robust foot-tapping, and the elaborate sound and display of the damphu, an instrument that is both played and shown. It is performed on all happy occasions and highlights the vigour and vitality of the community.",
      "The songs that go with it are called Hwai, and they are full of human emotion. Sikkim Tourism's own assessment is that they are so popular that no Nepali merrymaking is considered complete without singing one — which, for a government tourism page, is an unusually confident claim about cultural reach, and a fair one.",
      "The damphu is a hand-held frame drum, and it appears again in the Tamang new year: at Sonam Lochar, Tamang Selo and damphu are played for dancing, alongside the syabru danced by the Hyolmo and Rasuwali Tamang communities. The instrument, the dance, the song form and the new year are a single cultural package.",
      "Then there is Naumati, which is a different thing entirely — a group dance of the Damai community built on nine instruments, played, in the state's words, to perfection. The nine are two types of senai, which is the shehnai; turhi, small and large; damaha, the nagara, of two types; tuyamko, a small dhol, of two types; dholki; and jhyamta, the cymbal.",
      "The Naumati Baja is a regular feature at weddings and other auspicious occasions, and this is where the social history sits. The Damai are one of the artisan castes who came to Sikkim in the wave of Nepali settlement — Kamis are smiths, Damais are tailors, Sarkis are cobblers — and the Damai's traditional occupation carried with it the hereditary role of providing ceremonial music. A wedding in a Nepali household in Sikkim has, for generations, been announced to a valley by nine instruments played by a particular community.",
      "Chutkay completes the set of Nepali dances the state lists: a romantic group dance performed by male and female dancers together, sharing the joys of life and feelings of happiness during the harvest season and on other happy occasions.",
      "For a visitor, the honest note is that these are not staged for you. Wedding season and the winter new years are when you will actually hear a damphu or a naumati ensemble, and the sound will be coming from a courtyard rather than a stage.",
    ],
    keyFacts: [
      "Tamang Selo is the Tamang community's group dance, driven by the damphu frame drum.",
      "Its songs are called Hwai; the state says no Nepali merrymaking is complete without one.",
      "Naumati is the Damai community's dance, built on nine named instruments.",
      "The nine are two senai, turhi (small and large), two damaha, two tuyamko, dholki and jhyamta.",
      "Naumati Baja is a regular feature at weddings and auspicious occasions.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "jorethang", "singtam"],
    relatedStories: [
      "the-eleven-dances-of-three-communities",
      "three-new-years-in-one-winter",
      "who-the-nepali-of-sikkim-actually-are",
    ],
    sources: [
      govTourism("dances", "Tamang Selo and the damphu, the Hwai songs, Naumati and its nine instruments, and Chutkay."),
      wiki("Sonam_Lhosar", "Tamang Selo and damphu played at Sonam Lhosar, and the syabru of the Hyolmo and Rasuwali Tamang."),
      wiki("Indigenous_peoples_of_Sikkim", "The artisan castes brought to Sikkim — Kamis, Damais and Sarkis."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Tamang Selo", "damphu", "Hwai", "Naumati", "Damai", "wedding", "Chutkay"],
  }),

  defineStory({
    slug: "the-drum-you-wear",
    title: "The drum you wear",
    category: "Folk Music & Dance",
    claimType: "documented history",
    communities: ["Limbu"],
    imageKey: "story/chyabrung",
    heroAlt: "Rai and Limbu dancers performing with the chyabrung, a large barrel drum worn on a rope",
    summary:
      "The chyap-brung is a Limbu drum too big to sit down with. Dancers hang it round their necks and strike it with an open palm on one side and a stick on the other, producing two sounds that carry across a valley.",
    content: [
      "Chyap-Brung is the traditional musical instrument of the Limboo community, and the dance is named after it. The instrument is shaped like a dholak but very much bigger.",
      "The playing method explains everything about the sound. During the group dance, male dancers hang the drum around their necks with a rope. They beat one head with an open palm and the other with a stick. That manoeuvre produces two different sounds at once — and the state's own description of the effect is that they echo boldly across valleys and mountains.",
      "In Limbu the drum and the dance are Ke-langma; in Nepali the same dance is called chyabrung. It appears at the most important moment in Limbu social life. Limbu weddings feature two dances in particular: Yalakma, called dhan nach in Nepali — the rice-harvest dance, in which men and women dance in a slow circle — and Kelangma, which consists of complex footwork synchronised to the beat of the drums. Anyone may join, and the dancing can last many hours.",
      "The distinction between the two is worth keeping. Yalakma is slow, circular and inclusive, and can equally mark a harvest or any social occasion. Kelangma is where the footwork gets difficult, and it is built around an instrument heavy enough that carrying it is part of the performance.",
      "The Limbus — Yakthung, in their own language — are a major Sino-Tibetan ethnolinguistic group indigenous to eastern Nepal, northeastern India and western Bhutan, and among the earliest inhabitants of Sikkim; the state's name is generally derived from Limbu words. In Sikkim, Limbu is recognised as an additional official language for the preservation of culture and tradition, and the official weekly Sikkim Herald publishes a Limbu edition.",
      "So a drum that echoes across valleys is not a quaint survival — it belongs to a community whose language is in official use, whose script was invented in the 18th century, and whose scripture is a body of sung oral literature. The Kirat family the Limbus belong to also includes the Rai, whose Sakewa festival fills fields with dancers twice a year to the sound of drums and cymbals.",
      "If you want to hear a chyabrung, a Limbu wedding is the setting it was built for. Failing that, Sakewa Ubhauli in April or May, when Kirat communities dance in public across the state, is the reliable option.",
    ],
    keyFacts: [
      "Chyap-Brung is the traditional drum of the Limboo community, shaped like a dholak but much larger.",
      "It is worn on a rope around the neck and struck with an open palm on one side and a stick on the other.",
      "The two-handed technique produces two distinct sounds that carry across valleys.",
      "Limbu weddings feature Yalakma (dhan nach), a slow circle dance, and Kelangma, with complex footwork.",
      "Limbu is an official language of Sikkim for cultural preservation, with its own Sikkim Herald edition.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gyalshing", "soreng", "gangtok"],
    relatedStories: [
      "the-scripture-that-is-sung-not-read",
      "dancing-the-year-into-the-ground",
      "the-scholar-killed-for-an-alphabet",
    ],
    sources: [
      govTourism("dances", "Chyap-Brung as the Limboo community's instrument, its size, the rope, the two-handed technique and the sound."),
      wiki("Limbu_people", "Yalakma and Kelangma at weddings, the Yakthung self-name, and Limbu's official language status and Sikkim Herald edition."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Chyap-Brung", "chyabrung", "Limbu", "Kelangma", "Yalakma", "wedding", "drum"],
  }),

  defineStory({
    slug: "painting-on-cotton-and-silk",
    title: "Painting on cotton and silk",
    category: "Art & Craft",
    claimType: "documented history",
    communities: ["Bhutia"],
    legacyImageKey: "arch/thangka",
    heroAlt: "A thangka painting in progress on stretched cotton",
    summary:
      "A thangka is a painting on cotton or silk appliqué, kept rolled when not in use. In a Sikkimese gompa it is not decoration — it is a teaching aid whose iconography has to be reproduced exactly.",
    content: [
      "A thangka is a Tibetan Buddhist painting made on cotton, or as silk appliqué, usually depicting a deity, a narrative scene or a mandala. They are traditionally kept unframed and rolled when not on display, which is a large part of why so many have survived at all: a rolled painting travels, and travels out of a burning building.",
      "In a Sikkimese gompa they are working objects. A thangka is a teaching aid, a support for practice, and a record of iconography that must be reproduced accurately — proportions, attributes, colours, gestures. That accuracy requirement is why the painters' training is so long and why the tradition has changed so little.",
      "It is also why they are among the most at-risk objects in any monastery collection. They are portable, which makes them stealable; they are organic, which makes them perishable; and they are rolled, which means most of them are not on a wall being noticed. A monastery's most valuable art is usually in a cupboard.",
      "The wider material culture around them follows the same logic. Sikkim's monasteries hold block-printed texts, carved masks brought out once a year for chham, brocade costumes, ritual instruments, and murals painted directly onto plaster. Aritar Gumpa in eastern Sikkim is described as reflecting the monastic art of Sikkim through exactly this combination — carved and painted murals, manuscripts and icons.",
      "Some of it has been institutionally collected. The Namgyal Institute of Tibetology in Gangtok, whose foundation stone was laid by the 14th Dalai Lama in 1957 and which was inaugurated by Jawaharlal Nehru in 1958, holds one of the largest collections of Tibetan works outside Tibet. Its research programmes include documenting the social history of Sikkim's roughly sixty monasteries, and digitising old and rare photographs of Sikkim. That second project is the quiet one, and it may matter more than the first.",
      "Gangtok also has a working craft economy that predates the tourist market. The city has a cottage industry in watchmaking, country-made alcohol and handicrafts, including handmade paper produced from vegetable fibres or cotton rags. The main market gives rural residents somewhere to sell produce during harvest seasons.",
      "For a visitor with an interest in this material, the sequence that works is: the Institute of Tibetology first, to see what good examples look like and to read the labels; then a monastery, where you will recognise what you are looking at; then a shop, where you will be able to tell the difference between a thangka painted to iconographic standard and a souvenir. That order also means the money you spend is better informed.",
    ],
    keyFacts: [
      "A thangka is painted on cotton or made as silk appliqué, and is kept rolled when not displayed.",
      "In a working gompa a thangka is a teaching aid and an iconographic record, not decoration.",
      "Portability and organic materials make thangkas among the most at-risk objects in monastery collections.",
      "The Namgyal Institute of Tibetology, founded 1957–58, holds one of the largest Tibetan collections outside Tibet.",
      "Gangtok's cottage industries include handmade paper from vegetable fibres and cotton rags.",
    ],
    relatedMonasteries: ["pemayangtse", "phodong", "rumtek"],
    relatedPlaces: ["namgyal-institute-of-tibetology", "gangtok"],
    relatedStories: [
      "the-institute-that-digitises-what-it-cannot-save",
      "what-a-gompa-actually-is",
      "why-any-of-this-needs-documenting",
    ],
    sources: [
      wiki("Thangka", "The medium, the rolled storage, the iconographic requirements and their function."),
      wiki("Namgyal_Institute_of_Tibetology", "The 1957 foundation stone, the 1958 inauguration, the collection and the documentation and digitisation programmes."),
      wiki("Gangtok", "Gangtok's cottage industries, including handmade paper, and the main market's role at harvest."),
      wiki("Aritar,_Sikkim", "Aritar Gumpa's murals, manuscripts and icons as monastic art of Sikkim."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["thangka", "craft", "Tibetology", "murals", "handicraft", "conservation"],
  }),

  defineStory({
    slug: "the-scholar-killed-for-an-alphabet",
    title: "The scholar killed for an alphabet",
    category: "Languages & Script",
    claimType: "documented history",
    communities: ["Limbu"],
    legacyImageKey: "arch/manuscript",
    heroAlt: "A Himalayan manuscript leaf with handwritten script",
    summary:
      "Te-ongsi Sirijunga revived the Limbu script, taught it village by village, and was tied to a tree and killed at Martam. The script he restored is now one of Sikkim's official written languages.",
    content: [
      "Sirijunga was born Rupihang Thebe in 1704, in the Yangwarok area of the Sen kingdom. He took the name Sirijanga by claiming to be the reincarnation of a legendary 9th-century Limbu king of that name, who ruled Limbuwan from 882 to 925 and to whom the invention of the ancient Limbu script is traditionally credited — though no historical evidence for that script survives.",
      "What Sirijunga actually did is documented. He researched and taught the Limbu script, language and religion across Limbuwan and Sikkim. He revived the old script and used it to collect, compose and copy a large body of Limbu literature on history and cultural tradition. He travelled through remote regions gathering sources, then went village to village publicising what he had found and establishing centres of Limbu learning.",
      "He was deliberate about method. His conviction was that acquiring broad cultural knowledge and experience was the key to a community's revival — so he studied first with local Tibetan Buddhist lamas, who were then the only route to a learned tradition in the region, and also learned to read and write Khas, now called Nepali. Understanding both of the region's dominant cultures was, in his view, a precondition for defending his own.",
      "The politics were sharp. During his life, Bhutanese and Sikkimese efforts to control the eastern Himalaya produced repeated wars between Limbu and Sikkimese Bhutia authorities, and the Sikkimese lamas extended their monastic centres into northern Limbuwan. Sirijunga's conclusion — that the contest was fundamentally about knowledge and culture rather than territory — is why he insisted on a peaceful, knowledge-based movement.",
      "He entered Sikkim in 1734, in response to the forceful teaching of Buddhism, the Bhutia language and the Tibetan script to Limbus and Lepchas. He began teaching Yuma Mundhum and the Limbu script. Limbus stopped visiting Buddhist monasteries. The monks saw this as a danger to the spread of Buddhism, and conspired with the Bhutia rulers to kill him. Knowing the risk, Sirijunga took refuge in caves. The lamas found him, tied him to a tree and killed him at Martam in Sikkim. His disciples were killed or fled to Nepal, and the Limbu language and script were banned in Sikkim, falling into obscurity here.",
      "The script itself is a Brahmic abugida, in which a basic letter carries a consonant plus an inherent vowel — in Limbu, /ɔ/. It was probably composed at roughly the same time as the Lepcha script, and was likely invented as an act of defiance. It entered Unicode in April 2003. Two methods exist for writing long vowels with final consonants; the first is widely used in Sikkim, the second favoured by certain writers in Nepal.",
      "Today Limbu is an official language of Sikkim for the preservation of culture and tradition, the Sikkim Herald publishes a Limbu edition, and the community keeps Sirijunga's birth anniversary as a state-recognised festival. It took roughly three hundred years.",
    ],
    keyFacts: [
      "Sirijunga was born Rupihang Thebe in 1704 and revived the Limbu script in the 18th century.",
      "He entered Sikkim in 1734, taught Yuma Mundhum and the script, and was killed at Martam.",
      "The Limbu language and script were then banned in Sikkim and fell into obscurity here.",
      "The script is a Brahmic abugida whose inherent vowel is /ɔ/; it entered Unicode in April 2003.",
      "Limbu is now an official language of Sikkim, and Sirijunga's birth anniversary is a recognised festival.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "gyalshing"],
    relatedStories: [
      "two-festivals-the-tourist-calendar-misses",
      "the-scripture-that-is-sung-not-read",
      "an-alphabet-turned-on-its-side",
    ],
    sources: [
      wiki(
        "Te-ongsi_Sirijunga_Xin_Thebe",
        "His birth in 1704, the claimed reincarnation, his teaching and collecting, his study under lamas, his entry into Sikkim in 1734, and his killing at Martam with the subsequent ban.",
      ),
      wiki("Limbu_script", "The script as a Brahmic abugida, its 18th-century invention, the parallel with the Lepcha script, the two long-vowel methods and Unicode inclusion in 2003."),
      govFestivals("Teyongsi Srijunga Sawan Tongnam as a Limboo observance marking his birth anniversary."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Sirijunga", "Limbu script", "Martam", "language", "revival", "Unicode"],
  }),

  defineStory({
    slug: "an-alphabet-turned-on-its-side",
    title: "An alphabet turned on its side",
    category: "Languages & Script",
    claimType: "documented history",
    communities: ["Lepcha"],
    legacyImageKey: "arch/canon",
    heroAlt: "A Tibetan Buddhist canon volume, of the kind held in Sikkimese monastery libraries",
    summary:
      "Early Lepcha manuscripts were written vertically. When the script was later written horizontally, the letters kept their orientation — and the final consonants ended up stacked on top, which almost no other alphabet in the world does.",
    content: [
      "The Lepcha script, also called Róng, is an abugida used to write the Lepcha language — and it contains a visible historical accident that makes it unlike almost any other writing system.",
      "It is derived from the Tibetan script, possibly with some Burmese influence. Tradition ascribes it either to prince Chakdor Namgyal of Sikkim's Namgyal dynasty at the beginning of the 18th century, or to the scholar Thikúng Men Salóng in the 17th. Chakdor Namgyal is the same Chogyal who spent ten years exiled in Lhasa and returned with the Pangtoed dance: a king with an unusually productive decade of reading.",
      "The accident is this. Early Lepcha manuscripts were written vertically. When the script was later written horizontally, the letters kept their new orientations — rotated ninety degrees from their Tibetan prototypes. The result is an unusual method of writing final consonants: what were conjunct ligatures in Tibetan became diacritics placed above the letter. Unusually for an abugida, syllable-final consonants are written as marks rather than as letters.",
      "The system has other quirks. Short /-a/ is not written, as in most Brahmic scripts. Other vowels sit before, after or under the initial consonant. The length mark goes above everything, including any final-consonant diacritic. There are seven dedicated conjunct letters for medial /-l-/, meaning there is a special letter for /kla/ that looks nothing like the letter for /ka/. And final /-ŋ/ breaks all the rules: it is written to the left of the initial consonant rather than on top, so /kiŋ/ is written 'ngki'.",
      "The script entered Unicode in April 2008, at block U+1C00–U+1C4F. Free Unicode fonts exist, including a Róng Kít keyboard and font kit published by the Sikkim Bhutia Lepcha Apex Committee, a Noto Sans Lepcha face, and Mingzat from SIL.",
      "That last detail is the one worth dwelling on. A script devised in a Himalayan kingdom three centuries ago, for a language with roughly eighty thousand speakers, has a Unicode block, an open-source font family and a keyboard layout maintained by a community organisation. Digitisation is not only about scanning manuscripts; it is also about whether a language can be typed at all.",
      "The Limbu script, invented at roughly the same period and for related reasons, entered Unicode five years earlier. Sikkim thus has two indigenous scripts in the standard — an unusual concentration for a state of well under a million people, and a direct result of two 18th-century decisions to write a language down rather than let it be replaced.",
    ],
    keyFacts: [
      "The Lepcha or Róng script is an abugida derived from Tibetan, dated to the 17th or early 18th century.",
      "It is ascribed either to Chakdor Namgyal of the Namgyal dynasty or to the scholar Thikúng Men Salóng.",
      "Early manuscripts were vertical; when writing turned horizontal, letters stayed rotated 90°.",
      "Syllable-final consonants are written as diacritics above the letter — rare among abugidas.",
      "Lepcha entered Unicode in April 2008 at U+1C00–U+1C4F; free fonts and a keyboard kit exist.",
    ],
    relatedMonasteries: ["pemayangtse", "tashiding"],
    relatedPlaces: ["namgyal-institute-of-tibetology", "gangtok"],
    relatedStories: [
      "the-scholar-killed-for-an-alphabet",
      "twelve-official-languages-in-one-small-state",
      "the-people-who-say-they-never-arrived",
    ],
    sources: [
      wiki(
        "Lepcha_script",
        "The derivation from Tibetan, the attributions to Chakdor Namgyal and Thikúng Men Salóng, the vertical-to-horizontal rotation and its effect on final consonants, the vowel system, and the Unicode block and fonts.",
      ),
      wiki("Limbu_script", "Limbu's Unicode inclusion in 2003 and its parallel 18th-century composition."),
      wiki("Lepcha_language", "The language's classification and its speakers."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Lepcha script", "Rong", "Unicode", "abugida", "Chakdor Namgyal", "typography"],
  }),

  defineStory({
    slug: "twelve-official-languages-in-one-small-state",
    title: "Twelve official languages in one small state",
    category: "Languages & Script",
    claimType: "documented history",
    communities: ["Shared"],
    imageKey: "story/mg-marg",
    heroAlt: "M.G. Marg, the pedestrian main street of Gangtok",
    summary:
      "Sikkim recognises Nepali, Sikkimese, Lepcha, Limbu, Newar, Rai, Gurung, Magar, Sherpa, Tamang, Sunwar and Bhujel. Ten of those exist officially for one stated purpose: keeping a culture from disappearing.",
    content: [
      "Sikkim has a population smaller than many Indian towns and twelve official languages: Nepali, Sikkimese (Bhutia), Lepcha, Limbu, Newar, Rai, Gurung, Magar, Sherpa, Tamang, Sunwar (Mukhia) and Bhujel. English and Nepali are the working languages of the executive and legislature. The others exist officially for the purpose of preserving culture and tradition — which is written into the arrangement rather than implied by it.",
      "The spoken picture is different from the official one, and both are worth knowing. Sikkim Tourism publishes the shares: Nepali 62.61 per cent, Sikkimese (Bhutia) 7.73, Hindi 6.67, Lepcha 6.61, Limbu 6.34, Sherpa 2.57, Tamang 1.87 and Rai 1.64. Nepali is the lingua franca; English is spoken and understood across most of the state. Dzongkha, Groma, Majhi, Majhwar, Thulung, Tibetan and Yakha are also spoken.",
      "Notice the gap between those numbers and the community numbers. The Rai are the largest single ethnic community in Sikkim, at around thirteen per cent of the population, but only 1.64 per cent of people report Rai as their spoken language. That gap is the whole reason the preservation category exists: a community can persist while its language does not.",
      "Three of these languages have their own scripts, and two of those scripts are in Unicode. Lepcha is written in the Róng script, derived from Tibetan and developed between the 17th and 18th centuries. Limbu is written in the Sirijanga script, revived in the 18th century by the scholar the Limbus honour with a state festival. Sikkimese, or Drejongke, is written in Tibetan script proper.",
      "The institutional support is real rather than nominal. The Sikkim Herald, the official weekly, publishes a Limbu edition. Free Unicode fonts and keyboard kits for Lepcha are published by the Sikkim Bhutia Lepcha Apex Committee. Limbu is also recommended as an official language in Koshi Province across the border in Nepal, and several rural municipalities there have adopted it as a working language.",
      "For a visitor, this has a practical dimension that is easy to miss. When you ask someone in Sikkim what language they speak, you may get two answers — the one they use at the market and the one they use at home — and the second may be one you have never heard of. Asking which community someone is from is not intrusive here; it is closer to asking someone in Europe which country they are from.",
      "There is one more thing the language list tells you. Ten small languages given official status is an expensive, deliberate policy choice made by a state with limited resources, and it is the clearest evidence that Sikkim's plurality is something it defends rather than something it merely has.",
    ],
    keyFacts: [
      "Sikkim has twelve official languages; Nepali and English are the working languages of government.",
      "Ten are official specifically for the preservation of culture and tradition.",
      "Spoken shares: Nepali 62.61%, Sikkimese 7.73%, Hindi 6.67%, Lepcha 6.61%, Limbu 6.34%.",
      "The Rai are the largest community but only 1.64% report Rai as a spoken language.",
      "Lepcha and Limbu both have their own scripts, and both are encoded in Unicode.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok"],
    relatedStories: [
      "an-alphabet-turned-on-its-side",
      "the-scholar-killed-for-an-alphabet",
      "who-the-nepali-of-sikkim-actually-are",
    ],
    sources: [
      wiki("Sikkim", "The twelve official languages, the working languages, and the other languages spoken in the state."),
      govTourism("about", "The published spoken-language shares for Sikkim."),
      wiki("Sikkimese_people", "The official language list for cultural preservation and community population shares."),
      wiki("Limbu_people", "The Sikkim Herald Limbu edition and Limbu's official status in Koshi Province."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["languages", "Nepali", "Lepcha", "Limbu", "Bhutia", "policy", "preservation"],
  }),
];
