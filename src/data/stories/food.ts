import { defineStory, govTourism, wiki } from "./types";
import type { Story } from "./types";

/**
 * Food & Flavours.
 *
 * The Government of Sikkim's cuisine page is the anchor here, backed by
 * reference articles for individual dishes. One negative finding worth
 * recording: Wikipedia's "Momo" title is a disambiguation page, not an article
 * about the dumpling, so nothing in this archive is cited to it.
 */

export const foodStories: Story[] = [
  defineStory({
    slug: "sikkim-eats-what-the-road-brought",
    title: "Sikkim eats what the road brought",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Shared"],
    imageKey: "story/momo",
    heroAlt: "A plate of steamed momos with chilli sauce",
    summary:
      "Tibetan, Nepali and Lepcha cooking meet on the same plate here, because the state sat on a trade route between two worlds. Rice is the base, spices are used sparingly, and the point is the ingredient rather than the seasoning.",
    content: [
      "Sikkim's own tourism department describes the traditional food of the state as a delicious blend of Tibetan, Nepali and Lepcha dishes drawn from its many ethnic communities, largely based on rice, with vegetables foraged from the jungle and generous use of fresh and fermented produce.",
      "The reason for the blend is geography. Sikkim lay on the ancient Silk Road connecting China via Tibet, and centuries of inter-kingdom trade, migration and annexation moved along it. Every community that arrived brought a kitchen. The Lepcha and Limbu were here first; the Bhutia came from Tibet; Nepali settlement in the 18th and 19th centuries brought the largest culinary group; British colonial rule brought Marwari and Bihari traders. What is called Sikkimese cuisine is all of them, adapted to what grows at this altitude.",
      "The cooking method is the thing visitors notice. Dishes are generally stir-fried, boiled or steamed, with very limited use of spices and herbs — the state's stated logic being to let the fresh, organic ingredients show. If you have arrived from the plains expecting heat and masala, Sikkimese food will read as restrained until you recalibrate. Then it reads as clean.",
      "A Sikkimese meal typically follows a bhat-dal-tharkari-achar pattern: rice, pulses, curry, pickle. Around that sit the dishes everyone has heard of. Momo, steamed dumplings filled with meat or vegetables, served hot with a fiery chilli sauce — the state's own recipe note says the filling is lightly fried first and not allowed to brown, and that the steaming water afterwards makes a good soup. Thukpa, a Tibetan and Nepalese noodle soup that originated in eastern Tibet, of which the hand-pulled thenthuk variant is the one most eaten in the Indian Himalaya.",
      "Then the ones you have to come here for. Sha phaley, a Tibetan deep-fried bread stuffed with spiced minced chicken and crimped at the edge. Sishnu ko soup, made from nettle with garlic and lemon — the same nettle whose bark the Lepchas traditionally used for cordage. Phagshapa, pork with radish and dried chillies. Churpi in its soft form, cooked with green vegetables or ground with tomato and chilli into a chutney called senpen.",
      "Most Sikkimese people are meat eaters, and fresh and processed meats feature in almost every meal; mutton, beef, pork, chicken and fish are all common, though about 11.7 per cent of rural Sikkim is vegetarian. Bhutia households traditionally eat rice with vegetables or meat fried in animal fat, usually pork or beef.",
      "The drinks are a category of their own. Arra is homemade spirit; chaang and tongba are fermented millet, the second named for the bamboo vessel it is served in. Butter tea appears at religious and social occasions, and ordinary milk-and-sugar tea appears everywhere else.",
      "One thing to know before ordering: fermented food is not a novelty item here but a staple, making up around an eighth of everything eaten in the state. If you skip it, you have not eaten Sikkimese food — you have eaten around it.",
    ],
    keyFacts: [
      "Sikkim Tourism describes the state's cuisine as a blend of Tibetan, Nepali and Lepcha cooking, based on rice.",
      "Dishes are usually stir-fried, boiled or steamed, with deliberately limited spice.",
      "A typical meal follows the bhat-dal-tharkari-achar pattern — rice, pulses, curry, pickle.",
      "Sikkim's position on the ancient Silk Road via Tibet shaped what the kitchens here cook.",
      "About 11.7% of rural Sikkim is vegetarian; meat features in most meals elsewhere.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "namchi", "pelling"],
    relatedStories: [
      "why-sikkim-ferments-almost-everything",
      "what-grows-wild-and-gets-eaten",
      "the-old-silk-route-over-zuluk",
    ],
    sources: [
      govTourism(
        "cuisine",
        "The blend of Tibetan, Nepali and Lepcha cooking; the stir-fried/boiled/steamed method and limited spice; and the descriptions of momo, sha phaley, sishnu ko soup and churpi.",
      ),
      wiki(
        "Sikkimese_cuisine",
        "Rice as staple, the communities that shaped the cuisine, the Silk Road influence, the bhat-dal-tharkari-achar pattern and the 11.7% rural vegetarian figure.",
      ),
      wiki("Thukpa", "Thukpa's origin in eastern Tibet and the thenthuk variant eaten in the Indian Himalaya."),
      wiki("Bhutia", "Bhutia household eating patterns, chhaang, tongba and butter tea."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["food", "momo", "thukpa", "sha phaley", "phagshapa", "cuisine", "Silk Road"],
  }),

  defineStory({
    slug: "why-sikkim-ferments-almost-everything",
    title: "Why Sikkim ferments almost everything",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Limbu", "Rai", "Nepali", "Lepcha"],
    imageKey: "story/gundruk",
    heroAlt: "Gundruk, fermented leafy greens, prepared as a Nepali dish",
    summary:
      "Fermented food is about an eighth of everything eaten in Sikkim, and two-thirds of households make it at home. In a place where winter cuts off the vegetables, a jar of soured greens is not a delicacy — it is the plan.",
    content: [
      "Fermented foods are an integral part of Sikkimese cuisine, comprising 12.6 per cent of total food consumption in the state. Polling indicates 67.7 per cent of Sikkimese people prepare them at home rather than buying them. The exceptions bought at market are chhurpi and marchaa, the starter culture.",
      "The reason is arithmetic. Terraced hill agriculture produces a glut at harvest and very little afterwards, and Sikkim's winters are long. Gundruk exists because in October and November the harvest of broad mustard, radish and cauliflower leaves produces far more than anyone can eat fresh. The leaves are wilted for a day or two, shredded, packed tightly into an earthenware container, covered with warm water and left in a warm place. After about a week, a mild acidity signals the end of fermentation; the contents are removed and dried in the sun.",
      "The process is close to sauerkraut or kimchi with one difference — no salt is added before fermentation. Pediococcus and Lactobacillus species do the work, the pH falls to about 4.0, and acid rises to about one per cent by the sixth day. Gundruk matters nutritionally as much as gastronomically: it is an important source of minerals during the off-season, when diets otherwise lean on starchy tubers and maize.",
      "Kinema is the other landmark, and it belongs specifically to the Limbu people. The name comes from the Limbu kinama — ki, fermented; nama, to smell. Soybeans are soaked overnight, boiled for two or three hours, cracked in a mortar, mixed with about one per cent firewood ash, packed into a bamboo bucket lined with fern, covered with a jute bag and left to ferment naturally for one to three days. No culture is added; Bacillus subtilis does the work on its own.",
      "The scholarship on kinema is unexpectedly grand. The microbiologist Jyoti Prakash Tamang estimates it originated between roughly 600 BC and 100 AD under Kirat rule, introduced by the Limbu people, and has shown evidence that all fermented soybean styles in India derive from it. The Japanese ethnobiologist Sasuke Nakao proposed a 'natto triangle' of fermented soybean cultures across Asia; kinema is one of its vertices, alongside Japan's natto and Thailand's thua nao.",
      "The rest of the shelf: sinki, fermented radish taproot; masaura; khalpi, fermented cucumber. The alcoholic side uses marchaa introduced to cooked cereal — millet, rice or maize — saccharified in an earthenware pot for one to two days, then fermented for two to eight. That yields chyang, tongba, raksi and kodo ko jaanr.",
      "None of this is precious or artisanal in the way a European delicatessen would frame it. It is the ordinary technology of feeding a family through a Himalayan winter, worked out over centuries, and it happens to produce some of the most interesting flavours in India.",
    ],
    keyFacts: [
      "Fermented foods make up 12.6% of total food consumption in Sikkim.",
      "67.7% of Sikkimese people prepare fermented foods at home; chhurpi and marchaa are usually bought.",
      "Gundruk is made from surplus mustard, radish and cauliflower leaves, fermented without salt.",
      "Kinema is a Limbu fermented soybean, made with firewood ash in a fern-lined bamboo bucket.",
      "Kinema is estimated to date from c. 600 BC–100 AD and is a vertex of the Asian 'natto triangle'.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "jorethang"],
    relatedStories: [
      "sikkim-eats-what-the-road-brought",
      "the-drink-you-sip-through-a-straw",
      "what-grows-wild-and-gets-eaten",
    ],
    sources: [
      wiki(
        "Sikkimese_cuisine",
        "The 12.6% consumption figure, the 67.7% home-preparation figure, the marchaa process and the list of fermented foods and drinks.",
      ),
      wiki("Gundruk", "The harvest surplus, the salt-free process, the microorganisms, the pH and acid figures, and its role as an off-season mineral source."),
      wiki("Kinema", "The Limbu etymology, the production method, Bacillus subtilis, Tamang's dating and the natto triangle."),
      govTourism("cuisine", "Kinema and other fermented produce listed in the state's local pantry."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["fermentation", "gundruk", "kinema", "sinki", "marchaa", "Limbu", "preservation"],
  }),

  defineStory({
    slug: "the-ring-of-bread-that-means-its-tihar",
    title: "The ring of bread that means it's Tihar",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Nepali"],
    imageKey: "story/sel-roti",
    heroAlt: "Golden rings of sel roti, the fried rice bread of Dashain and Tihar",
    summary:
      "Sel roti is poured by hand into hot oil in a ring, and it is the smell of the Nepali autumn. It is also a piece of accidental food science: the batter is left to sour, which makes the finished bread absorb less oil.",
    content: [
      "Sel roti is a ring-shaped sweet fried bread made from rice flour, prepared above all for Dashain and Tihar across Nepal, Sikkim, Darjeeling, Kalimpong and the Kumaon hills. Sikkim Tourism describes it, accurately, as a mildly sweet and addictive Nepali snack, poured by hand into hot oil and fried until golden and crisp, often eaten with a meat curry.",
      "The making is a skill rather than a recipe. Roughly ground rice flour is mixed with water, sugar and ghee — oil or butter can substitute — and spices such as cardamom and clove may go in. The batter rests for a few hours. Then it is poured, by hand, in a continuous ring into hot oil at around 175–190°C, and turned with two foot-long sticks called jhir until it browns on both sides. Anyone who has watched it done well has watched someone make a perfect circle freehand into boiling fat, repeatedly, without thinking about it.",
      "The resting time turns out to matter more than tradition needed to know. Studies show that leaving the batter for about six hours at around 30°C improves both taste and economy: natural bacteria and yeast ferment it and make it more acidic, and the extra acidity makes the sel roti absorb less oil during frying. Less greasy, more flavourful, cheaper to make. A ritual step that was presumably about convenience turns out to be applied food chemistry.",
      "It keeps, too, which is the other reason it belongs to a festival. Sel roti is cooked in bulk and stores at room temperature for at least twenty days — one estimate says about two weeks in a dry airtight container. It is regularly sent as a gift to family members living elsewhere. A festival food that survives the post is a festival food that holds a diaspora together.",
      "Its age is uncertain and the honest answer is a range. A professor at Nepal Sanskrit University estimates the dish is over 800 years old. A food columnist suggests it was once made plain, without sugar or spices, and reached its modern form as communities intermingled, possibly as a modified form of a rice pancake called babari — same batter, cooked flat on a griddle instead of deep-fried in a ring.",
      "Even the name is unsettled. One theory derives sel from a variety of rice grown in the Nepali foothills. Another derives it from saal, meaning year, on the grounds that it was made as a ceremonial dish for the new year — saal roti becoming sel roti.",
      "In Sikkim you will find it year-round in bakeries and at bus stands, and in enormous quantities in October and November. Buy it warm, from somewhere that is clearly making it rather than reselling it, and eat it the same day.",
    ],
    keyFacts: [
      "Sel roti is a ring-shaped fried rice bread made above all for Dashain and Tihar.",
      "The batter is poured freehand into hot oil and turned with two wooden sticks called jhir.",
      "Resting the batter about six hours at ~30°C ferments it, and the added acidity reduces oil absorption.",
      "It keeps for around twenty days at room temperature and is often posted to relatives.",
      "Its age is estimated at over 800 years; the name may derive from a rice variety or from saal, 'year'.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "jorethang", "singtam"],
    relatedStories: [
      "fifteen-days-of-dashain-five-of-tihar",
      "sikkim-eats-what-the-road-brought",
      "why-sikkim-ferments-almost-everything",
    ],
    sources: [
      wiki(
        "Sel_roti",
        "The festivals it is made for, the ingredients and frying method, the jhir sticks, the six-hour fermentation study, its shelf life, the age estimates and the etymologies.",
      ),
      govTourism("cuisine", "Sel roti as a mildly sweet ring-shaped rice bread made during Tihar, poured by hand and eaten with meat curry."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["sel roti", "Tihar", "Dashain", "bread", "fermentation", "Nepali"],
  }),

  defineStory({
    slug: "the-cheese-you-chew-for-five-hours",
    title: "The cheese you chew for five hours",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Bhutia", "Nepali"],
    imageKey: "story/chhurpi",
    heroAlt: "Cubes of hard chhurpi, the dried smoked cheese of the eastern Himalayas",
    summary:
      "Hard chhurpi is among the hardest cheeses in the world. You do not bite it. You park it in your cheek and let it soften, and a single cube can last most of a mountain drive.",
    content: [
      "Chhurpi is a traditional cheese of Nepal, Bhutan, Tibet and northeastern India, and it comes in two forms that are barely the same food. Soft chhurpi is white, mild and close to ricotta. Hard chhurpi is considered one of the hardest cheeses in the world.",
      "The making is the same until it isn't. Buttermilk is boiled and the solid mass separated from the liquid, then wrapped and hung in a thin cloth to drain — the result is the soft variety, often left to ferment a little for a tangy taste. For the hard variety, that soft cheese is wrapped in a jute bag and pressed hard to force out the remaining water, dried, cut into small cubes and hung over a fire to harden further.",
      "Then it is eaten in a manner unlike any other cheese. You keep it in your mouth to moisten it, let parts soften, and chew it like gum. One block can last anywhere from thirty minutes to five hours. On a Sikkimese road journey — six hours to cover ninety kilometres of switchbacks is normal — this is an entirely rational form of food.",
      "Soft chhurpi is a proper ingredient. It is cooked with green vegetables as a savoury dish, used as a filling for momo, ground with tomatoes and chillies into a chutney called senpen, and made into soup. In the high Himalaya it is eaten as a substitute for vegetables, because it is an excellent source of protein and vegetables are not always available.",
      "It is one of the very few Sikkimese foods bought rather than made at home. In a state where 67.7 per cent of people ferment their own food, chhurpi and marchaa are the notable market purchases — which tells you it takes equipment and time rather than a jar and patience.",
      "There is also a modern footnote that will surprise anyone who has met chhurpi only in a Himalayan kitchen. Hard chhurpi has become a substantial export as a dog chew: production of chhurpi dog treats is a growing industry, with exports from Nepal worth around ₹4 billion in 2025. A Himalayan preservation technique developed for herders has found a second market in pet shops in Europe and North America.",
      "For a visitor: hard chhurpi is sold in strings at almost every market in Sikkim and costs very little. Buy the smoked kind. Do not attempt to bite it. And if you are given a piece by a driver, that is a small courtesy and worth accepting.",
    ],
    keyFacts: [
      "Chhurpi comes in a soft ricotta-like form and a very hard dried form.",
      "Hard chhurpi is made by pressing soft chhurpi in a jute bag, drying it, cubing it and hanging it over fire.",
      "A single cube is chewed like gum and can last from thirty minutes to five hours.",
      "Soft chhurpi is cooked with greens, used as momo filling and ground into a chutney called senpen.",
      "Chhurpi and marchaa are among the few fermented products Sikkimese households buy rather than make.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "lachung", "namchi"],
    relatedStories: [
      "why-sikkim-ferments-almost-everything",
      "sikkim-eats-what-the-road-brought",
      "life-at-the-top-of-the-road",
    ],
    sources: [
      wiki(
        "Chhurpi",
        "The two varieties, the preparation from buttermilk, the hardening process, the chewing method and duration, the culinary uses including senpen, and the dog-treat export figure.",
      ),
      govTourism("cuisine", "The state's own description of hard churpi made from buttermilk, fermented for tang, pressed, dried and hung over fire."),
      wiki("Sikkimese_cuisine", "Chhurpi and marchaa as the fermented products usually purchased rather than made at home."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["chhurpi", "churpi", "cheese", "dairy", "market", "senpen"],
  }),

  defineStory({
    slug: "the-drink-you-sip-through-a-straw",
    title: "The drink you sip through a straw",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Limbu", "Bhutia"],
    imageKey: "story/tongba",
    heroAlt: "A tongba — a bamboo vessel of fermented millet, drunk through a bamboo straw",
    summary:
      "Tongba is the vessel, not the drink. Fermented millet goes in, hot water goes over it, and you sip through a bamboo straw with a filter at the bottom. Among the Limbus it is part of a wedding, not just a night out.",
    content: [
      "Tongba is a millet-based alcoholic beverage of the eastern hills of Nepal and the neighbouring Indian regions of Sikkim and Darjeeling. Strictly, tongba is the name of the vessel that holds the fermented millet; the beverage itself is mandokpenaa thee in Limbu.",
      "It is made from brown finger millet — Eleusine coracana, ragi in India, kodo in Nepal — grown in the hills, cooked and combined with a traditionally cultured starter. That starter has a name in every language of the region, which tells you how widely it is used: khesung in Limbu, marchā in Nepali, thamik in Lepcha, khabe in Chamling and phab in Bhutia.",
      "The serving method is the memorable part. Fermented millet is steeped in the vessel for a few minutes, and the cloudy liquid is sucked up through a bamboo straw with a seed-filtering bottom, so you drink the liquor and leave the grain. It is mildly alcoholic, smooth, milky and slightly mushroomy with a bready edge, and you can top it up with more hot water several times before the millet gives out.",
      "In the Limbu community it is not casual. Being offered a tongba is a sign of respect to a guest, and it is an essential element of special occasions, religious functions and festivals. Tongba drinking among guests and tongba sharing between a newly wed couple is a required part of the Limbu marriage ceremony as set out in the Limbu Mundhum — and the Limbus are described as the only people who use tongba in their wedding ceremony that way.",
      "Its close relative chhaang is drunk more widely — by Tibetan, Ladakhi and Nepalese communities and to a lesser degree in neighbouring countries — usually at room temperature in summer and served hot in brass bowls or wooden mugs when it is cold. It is brewed from barley, finger millet or rice. Sikkim Tourism lists arra, a homemade spirit, and chaang or tongba as the state's local beverages.",
      "There is a health claim attached to tongba that circulates widely, and it deserves care. Studies have reported that it contains glycosides, amino acids, fatty acids, terpenoids and phenols with antioxidant and antibacterial potential, and there are reported therapeutic properties against high-altitude illness. This archive reports that these claims have been published; it does not endorse them, and nobody should treat a millet beer as altitude medicine.",
      "For a visitor: order one on a cold evening, ask for more hot water when it runs thin, and do not stir it with the straw — the straw is a filter, and stirring defeats it.",
    ],
    keyFacts: [
      "Tongba is the bamboo vessel; the beverage is mandokpenaa thee in Limbu.",
      "It is made from brown finger millet with a traditional starter — khesung, marchā, thamik, khabe or phab.",
      "Hot water is poured over the fermented millet and the liquid sipped through a filtering bamboo straw.",
      "Sharing tongba is a required part of a Limbu wedding as set out in the Mundhum.",
      "Chhaang, its close relative, is brewed from barley, millet or rice and served warm in cold weather.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["gangtok", "gyalshing", "lachen"],
    relatedStories: [
      "why-sikkim-ferments-almost-everything",
      "the-scripture-that-is-sung-not-read",
      "people-of-the-rice-valley",
    ],
    sources: [
      wiki(
        "Tongba",
        "Tongba as the vessel, mandokpenaa thee, the finger millet and the starter names, the straw and steeping method, its role in Limbu weddings per the Mundhum, and the published ethno-medicinal claims.",
      ),
      wiki("Chhaang", "Chhaang's ingredients, its geographical spread and the way it is served hot or at room temperature."),
      govTourism("cuisine", "Arra and chaang/tongba listed as Sikkim's local beverages."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["tongba", "chhaang", "millet", "Limbu", "wedding", "drink"],
  }),

  defineStory({
    slug: "indias-only-himalayan-tea-garden",
    title: "The tea garden a king planted for refugees",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Sherpa", "Bhutia"],
    imageKey: "story/temi-tea",
    heroAlt: "The Temi tea garden in south Sikkim, planted in rows down a long slope",
    summary:
      "Temi is the only tea garden in Sikkim, planted in 1969 by the last Chogyal to give work to Tibetan refugees. It is entirely organic, sells most of its crop through Kolkata, and its first flush has gone for over ₹10,000 a kilo.",
    content: [
      "Temi Tea Garden was established in 1969 by Palden Thondup Namgyal, the last king of Sikkim, as a source of employment for the large number of Tibetan refugees then living in the region. It remains the only tea garden in the state and the only government-run estate, and it is generally rated among the best in India.",
      "It covers 177 hectares — about 440 acres — on gentle slopes running down from the Tendong hill range, on loamy soil with a thirty to fifty per cent gradient. Around 406 workers are supported by a staff of 43, and annual production averages about 100 tonnes. The estate operates under a Tea Board set up by the Government of Sikkim, which also established the Sang-Martam Tea Growers' Cooperative Society to encourage other growers.",
      "The land has a history before the tea. Before the estate was created, this was a Sherpa village with about ten acres of Forest Department nurseries around a missionary building that became the Divisional Forest Officer's office and residence. During British rule the site was a landmark for Scottish missionary buildings in the early twentieth century; the Government of Sikkim acquired them in 1954.",
      "The tea itself is sold mostly as Temi tea. Sikkim produces two varieties — a traditionally grown China variety and a newer clonal one — and around half a million kilos annually across the estate and small growers. The usual output is black tea, with a delicate white tea made to order from buds and unfurled new leaves, plus a flowery green and an oolong. The first flush is harvested in spring and is golden in the cup with a light floral finish and a slight sweetness; the monsoon flush is full-bodied and mellow; the autumn flush is well rounded with a hint of warm spice.",
      "Its market is international. About 75 per cent is sold through the Kolkata auction centre and the rest packaged locally, with Germany, the United States, France, Canada and Japan the major importers. The 2023 first flush sold for ₹10,250 a kilogram to buyers in Italy and Korea. The organic status is certified by the Institute for Market Ecology of Switzerland, and organic guidelines were adopted at Temi from a project begun in April 2005.",
      "Unlike Darjeeling tea next door, Sikkim tea does not yet hold a GI tag — a small fact with commercial consequences, and one worth knowing before paying a premium for something labelled as Sikkim tea somewhere else.",
      "For a visitor, Temi is one of the easiest good half-days in south Sikkim: rows of tea running down a long slope with the Khangchendzonga range behind, a factory that can be visited, cherry trees planted along the approach road, and a four-room guest house at the factory available on prior booking.",
    ],
    keyFacts: [
      "Temi was established in 1969 by the last Chogyal as employment for Tibetan refugees.",
      "It covers 177 hectares, employs around 406 workers and produces about 100 tonnes a year.",
      "About 75% of Sikkim's tea is sold through the Kolkata auction centre; Germany, the US, France, Canada and Japan import it.",
      "The 2023 first flush sold for ₹10,250 per kg to buyers in Italy and Korea.",
      "Sikkim tea is certified organic by Switzerland's Institute for Market Ecology but has no GI tag.",
    ],
    relatedMonasteries: ["ralang"],
    relatedPlaces: ["temi-tea-garden", "namchi", "ravangla"],
    relatedStories: [
      "the-terraces-that-turned-organic",
      "the-dharma-kings",
      "the-hill-that-saved-the-lepchas",
    ],
    sources: [
      wiki(
        "Temi_Tea_Garden",
        "The 1969 establishment by Palden Thondup Namgyal, the 177-hectare area, the workforce and output, the Tea Board and cooperative, the Sherpa village and missionary buildings, and the guest house.",
      ),
      wiki(
        "Sikkim_tea",
        "Temi as the state's only and largest garden, the China and clonal varieties, the flush characteristics, the Kolkata auction share and importers, the 2023 first-flush price, IMO certification and the absence of a GI tag.",
      ),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["Temi", "tea", "organic", "Namchi", "Chogyal", "export", "Tendong"],
  }),

  defineStory({
    slug: "the-terraces-that-turned-organic",
    title: "The terraces that turned organic",
    category: "Nature & Culture",
    claimType: "documented history",
    communities: ["Nepali", "Lepcha", "Limbu"],
    imageKey: "story/terrace-farming",
    heroAlt: "Terraced fields stepping down a hillside in Sikkim",
    summary:
      "Sikkim converted its entire farmland to organic between 2003 and 2016 — the first Indian state to do it. The terraces those crops grow on are themselves an import, brought by Nepali settlers two centuries ago.",
    content: [
      "Sikkim achieved full conversion of its agriculture to organic between 2003 and 2016, becoming the first state in India to do so. It is the single most-quoted fact about the state, and it is worth putting on the ground it actually happened on.",
      "That ground is terraced. Because the terrain is mountainous and much of the land is unsuitable for farming, terrace cultivation — particularly of rice — is the standard method. It is not indigenous: the Nepalese introduced the system of terraced cultivation to Sikkim's hills during the settlement of the 18th and 19th centuries, and it transformed the cultivation of rice, maize and the cash crops of cardamom and ginger, bringing significant revenue to the state.",
      "So the stepped hillsides that define Sikkim's landscape photography are roughly two centuries old and are a technology transfer between communities. That is a more interesting fact than 'timeless terraces', and it is also true.",
      "What grows on them: rice as the staple, plus wheat, maize, barley and millet, with potatoes, ginger, oranges, tea and cardamom. Sikkim produces more cardamom than any other Indian state — about 4,200 tonnes annually — and has the largest cultivated area of it in the country. The relevant species is Amomum subulatum, black or large cardamom, native to the eastern Himalayas and cultivated mainly in eastern Nepal, Sikkim and the Darjeeling hills. Common vegetables include tomato, broccoli and iskus, the chayote.",
      "The soil the terraces hold is not generous. Sikkim's hills are gneiss and schist weathering to shallow brown clay, coarse, high in iron oxide, ranging from neutral to acidic and lacking organic and mineral nutrients. Combined with heavy rainfall — Sikkim is the most humid region in the entire Himalayan range — this produces extensive erosion and nutrient leaching, and frequent landslides that cut villages off from towns. Farming here has always been a negotiation with a slope that wants to move.",
      "Livestock plays a subsidiary role: cattle, sheep, goats, pigs and yaks are raised, and dairy is common in the diet. The state's own pantry list names the wild and organic produce that fills the gaps — ningro fern, nakima wild lily, bamboo shoot, cheuw mushrooms, iskus, pumpkin and its leaves, kinema, tree tomato and the fierce little dalle chilli.",
      "The economics are modest and worth stating plainly. Sikkim's economy is largely agrarian, its GDP among the smallest of any Indian state, and its industrial base limited by terrain and transport. The organic conversion was not a wealthy state's gesture; it was a policy decision by a poor, mountainous one, applied to every field it had.",
    ],
    keyFacts: [
      "Sikkim converted all its agricultural land to organic between 2003 and 2016 — a first for an Indian state.",
      "Terraced cultivation was introduced by Nepalese settlers in the 18th and 19th centuries.",
      "Sikkim produces more cardamom than any other Indian state — about 4,200 tonnes a year.",
      "The soil is coarse, acidic and nutrient-poor, and the state is the most humid region of the Himalaya.",
      "Erosion, leaching and frequent landslides are the standing constraints on hill agriculture here.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["namchi", "temi-tea-garden", "jorethang", "singtam"],
    relatedStories: [
      "indias-only-himalayan-tea-garden",
      "what-grows-wild-and-gets-eaten",
      "who-the-nepali-of-sikkim-actually-are",
    ],
    sources: [
      wiki(
        "Sikkim",
        "The 2003–2016 organic conversion, terraced farming, the crop list, cardamom leadership, the geology and soil, humidity, erosion and landslides, and the state's economic scale.",
      ),
      wiki("Sikkimese_cuisine", "The 4,200-tonne annual cardamom figure, the crops grown and the role of livestock."),
      wiki("Cardamom", "Amomum subulatum as black/large cardamom native to the eastern Himalayas and cultivated in Sikkim."),
      wiki("Indigenous_peoples_of_Sikkim", "The Nepalese introduction of terraced cultivation and its effect on rice, maize, cardamom and ginger."),
      govTourism("cuisine", "The state's pantry list of jungle and organic vegetables."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["organic", "terrace", "cardamom", "agriculture", "soil", "landslide"],
  }),

  defineStory({
    slug: "what-grows-wild-and-gets-eaten",
    title: "What grows wild and gets eaten",
    category: "Food & Flavours",
    claimType: "documented history",
    communities: ["Lepcha", "Limbu", "Nepali"],
    imageKey: "story/cardamom",
    heroAlt: "Large cardamom in flower, the eastern Himalayan spice grown across Sikkim",
    summary:
      "Fern shoots, wild lily buds, bamboo shoots, forest mushrooms and stinging nettle: a substantial part of what Sikkim eats is gathered rather than grown, and the gathering knowledge is community-specific.",
    content: [
      "Sikkim Tourism's cuisine page lists the state's pantry in four categories, and the first is 'jungle vegetables'. That is not a marketing flourish. Foraging is a working part of the food supply here, and the list is specific: ningro, the fiddlehead fern; nakima, a wild lily; baas ko tusa, bamboo shoot; and cheuw, mushrooms.",
      "The organic garden list that follows is nearly as wild: iskus, the chayote, whose leaves are eaten as well as its fruit; pharsi, pumpkin, likewise; kinema, the fermented soybean; ruk tamatar, the tree tomato; and dalle, the round red chilli that is one of the hottest things grown in India and is pickled in almost every Sikkimese kitchen.",
      "Nettle deserves its own paragraph. Sishnu ko soup is a traditional nettle soup — sisnu boiled with salt, then garlic paste, then a spoon of lemon juice — described by the state as simple, tangy and warming. Nettle is also a material rather than only a food: the Lepcha traditionally use the bark of the nettle for multiple purposes, and one folk account of the origin of Khecheopalri Lake begins with a Lepcha couple peeling nettle bark in what was then a grazing ground.",
      "The scale of this knowledge is documented and it is large. In Sikkim, Lepchas are known to use over 370 species of animals, fungi and plants. The Bhutia community is recorded as using over 70. These are not casual numbers — they represent generations of trial, transmission and, in some cases, ritual restriction on when and how a species may be taken.",
      "The reason so much is available is the ecology. Sikkim is part of the Eastern Himalayas biodiversity hotspot and of the Kangchenjunga landscape stretching from Nepal through India into Bhutan, with tropical, temperate and alpine climates inside an area of just 7,096 square kilometres. A day's drive can pass through subtropical forest, temperate broadleaf woodland and alpine meadow.",
      "Padmasambhava, passing through in the eighth century, wrote about the produce he found: about 155 varieties of fruit, a walnut that tastes like butter, a grape with the taste of wine, fruits called tingding with the taste of meat, thirty-seven types of root vegetable, twenty varieties of garlic, 360 edible plants in all, and beehives in the trees and cliffs. It reads as hyperbole until you have walked through a Sikkimese forest in August.",
      "For a visitor the practical version is: order the ningro when you see it on a menu, buy dalle pickle to take home, and treat any offer of foraged mushrooms from someone who knows the forest as a privilege. Do not pick anything yourself. Collecting plants, flowers, medicinal herbs and rare species is explicitly listed among the things visitors are asked not to do.",
    ],
    keyFacts: [
      "The state's own pantry list names ningro (fern), nakima (wild lily), bamboo shoot and cheuw (mushrooms).",
      "Dalle chillies, iskus, tree tomato and pumpkin leaves are the everyday organic garden staples.",
      "Lepchas in Sikkim are recorded using over 370 species of animals, fungi and plants; Bhutias over 70.",
      "Sikkim spans tropical to alpine climates within 7,096 sq km, in the Eastern Himalayas biodiversity hotspot.",
      "Visitors are asked not to collect plants, flowers, medicinal herbs or rare species.",
    ],
    relatedMonasteries: [],
    relatedPlaces: ["khecheopalri-lake", "varsey-rhododendron-sanctuary", "fambong-lho"],
    relatedStories: [
      "why-sikkim-ferments-almost-everything",
      "the-terraces-that-turned-organic",
      "how-to-be-a-guest-in-a-monastery",
    ],
    sources: [
      govTourism("cuisine", "The pantry lists of jungle and organic vegetables, local beverages, and the sishnu ko soup recipe."),
      wiki("Sikkimese_cuisine", "The Eastern Himalayas hotspot, the Kangchenjunga landscape and Padmasambhava's account of the produce."),
      wiki("Lepcha_people", "The 370-species figure and traditional use of nettle bark."),
      wiki("Bhutia", "The 70-species figure for Bhutia use of animals, fungi and plants."),
      govTourism("conduct", "The instruction not to collect plants, flowers, medicinal herbs or rare species."),
    ],
    verificationStatus: "verified",
    lastVerified: "2026-08-17",
    tags: ["foraging", "ningro", "dalle", "nettle", "biodiversity", "cardamom", "pantry"],
  }),
];
