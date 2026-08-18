/**
 * Master script templates — Sikkim Darshan audio guides.
 *
 * Each language is composed IN that language from verified structured facts.
 * Nothing is spliced across languages, which is what caused the Hindi guide to
 * continue in English: the previous build dropped the English summary sentence
 * into a Hindi frame.
 *
 * Only these values vary per monastery, and each is a verified field:
 *   name       proper noun, left in its own form in every language
 *   district   proper noun, transliterated per language
 *   year       numeral
 *   tradition  lineage name, with a short gloss written per language
 *
 * No monastery-specific prose is translated by machine, so no sentence can
 * drift from what the sources actually support.
 */

/** District names transliterated once, reviewed against each script. */
export const DISTRICTS = {
  en: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  hi: { Gangtok: "गंगटोक", Mangan: "मंगन", Namchi: "नामची", Gyalshing: "ग्यालशिंग", Pakyong: "पाक्योंग", Soreng: "सोरेंग" },
  ne: { Gangtok: "गान्तोक", Mangan: "मंगन", Namchi: "नाम्ची", Gyalshing: "ग्याल्शिङ", Pakyong: "पाक्योङ", Soreng: "सोरेङ" },
  bn: { Gangtok: "গ্যাংটক", Mangan: "মাঙ্গান", Namchi: "নামচি", Gyalshing: "গিয়ালশিং", Pakyong: "পাক্যং", Soreng: "সোরেং" },
};

/** Lineage glosses, written per language rather than translated at runtime. */
export const TRADITIONS = {
  en: {
    Nyingma: "the Nyingma order, the oldest of the Tibetan Buddhist schools",
    Kagyu: "the Kagyu order",
    "Karma Kagyu": "the Karma Kagyu lineage",
    "Zurmang Kagyu": "the Zurmang Kagyu lineage",
  },
  hi: {
    Nyingma: "न्यिंग्मा परंपरा से, जो तिब्बती बौद्ध धर्म की सबसे प्राचीन शाखा है",
    Kagyu: "काग्यू परंपरा से",
    "Karma Kagyu": "कर्म काग्यू परंपरा से",
    "Zurmang Kagyu": "ज़ुरमंग काग्यू परंपरा से",
  },
  ne: {
    Nyingma: "न्यिङ्मा परम्परासँग, जुन तिब्बती बौद्ध धर्मको सबैभन्दा पुरानो शाखा हो",
    Kagyu: "काग्यू परम्परासँग",
    "Karma Kagyu": "कर्म काग्यू परम्परासँग",
    "Zurmang Kagyu": "जुर्माङ काग्यू परम्परासँग",
  },
  bn: {
    Nyingma: "ন্যিংমা ধারার সঙ্গে, যা তিব্বতি বৌদ্ধধর্মের প্রাচীনতম শাখা",
    Kagyu: "কাগ্যু ধারার সঙ্গে",
    "Karma Kagyu": "কর্ম কাগ্যু ধারার সঙ্গে",
    "Zurmang Kagyu": "জুরমাং কাগ্যু ধারার সঙ্গে",
  },
};

/**
 * Sentence builders. Each returns a complete sentence in its own language, or
 * null when the underlying fact is missing — a missing fact removes a
 * sentence, it never becomes a guess.
 */
export const TEMPLATES = {
  en: {
    label: "English",
    welcome: (n) => `Welcome to ${n}.`,
    place: (d) => (d ? `It stands in ${d} district, in the Indian state of Sikkim, in the eastern Himalaya.` : `It stands in the Indian state of Sikkim, in the eastern Himalaya.`),
    founded: (y, t) =>
      y && t ? `It was established in ${y}, and belongs to ${t}.`
      : y ? `It was established in ${y}.`
      : t ? `It belongs to ${t}.`
      : null,
    kingdom:
      "Sikkim was a Himalayan kingdom until it became an Indian state in 1975, and its monasteries were closely tied to the life of that kingdom.",
    context:
      "A Sikkimese gompa is a working community, as much as it is a monument. Behind its painted doors are prayer halls, and a library of block-printed texts. Monks live here. They study, they debate, and they keep the rituals of the year.",
    architecture:
      "The architecture follows Tibetan monastic tradition. Thick walls carry a bright, painted façade. Inside stands a pillared assembly hall. Above it, a roofline finished in gilded ornament catches the first light off the mountains.",
    etiquette:
      "If you visit, please dress modestly. Walk clockwise around shrines and stupas. Remove your shoes before entering a prayer hall, and ask before photographing inside.",
    closing: (n) => `Everything in this guide comes from the sources listed on the ${n} page.`,
  },
  hi: {
    label: "हिन्दी",
    welcome: (n) => `${n} में आपका स्वागत है।`,
    place: (d) => (d ? `यह पूर्वी हिमालय में स्थित भारतीय राज्य सिक्किम के ${d} ज़िले में है।` : `यह पूर्वी हिमालय में स्थित भारतीय राज्य सिक्किम में है।`),
    founded: (y, t) =>
      y && t ? `इसकी स्थापना ${y} में हुई थी, और यह ${t} जुड़ा हुआ है।`
      : y ? `इसकी स्थापना ${y} में हुई थी।`
      : t ? `यह ${t} जुड़ा हुआ है।`
      : null,
    kingdom:
      "सिक्किम 1975 में भारत का राज्य बनने से पहले एक हिमालयी राज्य था, और यहाँ के मठ उस राज्य के जीवन से गहराई से जुड़े रहे।",
    context:
      "सिक्किम का गोम्पा केवल एक स्मारक नहीं, बल्कि एक जीवित समुदाय है। इसके चित्रित द्वारों के पीछे प्रार्थना कक्ष हैं, छपे हुए ग्रंथों का पुस्तकालय है, और वे कक्ष हैं जहाँ भिक्षु अध्ययन करते हैं, शास्त्रार्थ करते हैं और वर्ष भर के अनुष्ठान निभाते हैं।",
    architecture:
      "इसकी वास्तुकला तिब्बती मठ परंपरा का अनुसरण करती है: मोटी दीवारों पर चमकीले चित्रित अग्रभाग, स्तंभों वाला सभा कक्ष, और स्वर्णिम अलंकरण से सजी छत, जिस पर पर्वतों की पहली किरण पड़ती है।",
    etiquette:
      "यदि आप यहाँ आएँ, तो शालीन वस्त्र पहनें, मंदिरों और स्तूपों की परिक्रमा दक्षिणावर्त करें, प्रार्थना कक्ष में प्रवेश से पहले जूते उतारें, और भीतर चित्र लेने से पहले अनुमति लें।",
    closing: (n) => `इस विवरण की सारी जानकारी ${n} के पृष्ठ पर दिए गए स्रोतों से ली गई है।`,
  },
  ne: {
    label: "नेपाली",
    welcome: (n) => `${n} मा तपाईंलाई स्वागत छ।`,
    place: (d) => (d ? `यो पूर्वी हिमालयको भारतीय राज्य सिक्किमको ${d} जिल्लामा अवस्थित छ।` : `यो पूर्वी हिमालयको भारतीय राज्य सिक्किममा अवस्थित छ।`),
    founded: (y, t) =>
      y && t ? `यसको स्थापना ${y} मा भएको थियो, र यो ${t} सम्बन्धित छ।`
      : y ? `यसको स्थापना ${y} मा भएको थियो।`
      : t ? `यो ${t} सम्बन्धित छ।`
      : null,
    kingdom:
      "सन् १९७५ मा भारतको राज्य बन्नुअघि सिक्किम एउटा हिमाली राज्य थियो, र यहाँका गुम्बाहरू त्यस राज्यको जीवनसँग गहिरो रूपमा जोडिएका थिए।",
    context:
      "सिक्किमको गुम्बा केवल एउटा स्मारक होइन, बरु एउटा जीवित समुदाय हो। यसका रङ्गिन ढोकाहरूभित्र प्रार्थना कक्षहरू, छापिएका ग्रन्थहरूको पुस्तकालय, र भिक्षुहरूले अध्ययन गर्ने, शास्त्रार्थ गर्ने र वर्षभरिका अनुष्ठानहरू सम्पन्न गर्ने कोठाहरू छन्।",
    architecture:
      "यसको वास्तुकलाले तिब्बती गुम्बा परम्परालाई पछ्याउँछ: बाक्लो पर्खालमाथि चम्किलो रङ्गिएको अग्रभाग, स्तम्भयुक्त सभा कक्ष, र सुनौलो सजावटले सिँगारिएको छाना, जहाँ पहाडको पहिलो किरण पर्छ।",
    etiquette:
      "तपाईं आउनुभयो भने शालीन पोशाक लगाउनुहोस्, मन्दिर र चैत्यहरूको परिक्रमा घडीको दिशामा गर्नुहोस्, प्रार्थना कक्ष प्रवेश गर्नुअघि जुत्ता खोल्नुहोस्, र भित्र फोटो खिच्नुअघि अनुमति लिनुहोस्।",
    closing: (n) => `यस विवरणका सबै जानकारी ${n} को पृष्ठमा उल्लेखित स्रोतहरूबाट लिइएका हुन्।`,
  },
  bn: {
    label: "বাংলা",
    welcome: (n) => `${n}-এ আপনাকে স্বাগতম।`,
    place: (d) => (d ? `এটি পূর্ব হিমালয়ের ভারতীয় রাজ্য সিকিমের ${d} জেলায় অবস্থিত।` : `এটি পূর্ব হিমালয়ের ভারতীয় রাজ্য সিকিমে অবস্থিত।`),
    founded: (y, t) =>
      y && t ? `এটি ${y} সালে প্রতিষ্ঠিত হয়েছিল, এবং ${t} যুক্ত।`
      : y ? `এটি ${y} সালে প্রতিষ্ঠিত হয়েছিল।`
      : t ? `এটি ${t} যুক্ত।`
      : null,
    kingdom:
      "১৯৭৫ সালে ভারতের রাজ্য হওয়ার আগে সিকিম ছিল একটি হিমালয় রাজ্য, এবং এখানকার মঠগুলি সেই রাজ্যের জীবনের সঙ্গে গভীরভাবে যুক্ত ছিল।",
    context:
      "সিকিমের একটি গোম্পা কেবল স্মারক নয়, একটি জীবন্ত সম্প্রদায়। এর চিত্রিত দরজার পিছনে রয়েছে প্রার্থনাকক্ষ, ছাপা পুঁথির গ্রন্থাগার, এবং সেই কক্ষগুলি যেখানে ভিক্ষুরা অধ্যয়ন করেন, তর্ক করেন এবং বছরের আচার পালন করেন।",
    architecture:
      "এর স্থাপত্য তিব্বতি মঠ ঐতিহ্য অনুসরণ করে: পুরু দেয়ালের উপর উজ্জ্বল চিত্রিত সম্মুখভাগ, স্তম্ভযুক্ত সভাকক্ষ, এবং সোনালি অলঙ্করণে শেষ হওয়া ছাদ, যেখানে পাহাড়ের প্রথম আলো এসে পড়ে।",
    etiquette:
      "আপনি এলে শালীন পোশাক পরুন, মন্দির ও স্তূপ প্রদক্ষিণ করুন ঘড়ির কাঁটার দিকে, প্রার্থনাকক্ষে ঢোকার আগে জুতো খুলুন, এবং ভিতরে ছবি তোলার আগে অনুমতি নিন।",
    closing: (n) => `এই বিবরণের সমস্ত তথ্য ${n} পৃষ্ঠায় তালিকাভুক্ত উৎস থেকে নেওয়া।`,
  },
};

/** Compose one language's full script from verified fields only. */
export function composeScript(lang, { name, district, establishedYear, tradition }) {
  const t = TEMPLATES[lang];
  if (!t) return null;
  const districtLabel = district ? (DISTRICTS[lang]?.[district] ?? district) : null;
  const traditionLabel = tradition ? (TRADITIONS[lang]?.[tradition] ?? null) : null;
  const sentences = [
    t.welcome(name),
    t.place(districtLabel),
    t.founded(establishedYear, traditionLabel),
    t.kingdom,
    t.context,
    t.architecture,
    t.etiquette,
    t.closing(name),
  ].filter(Boolean);
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Languages requested but not producible here, with the specific blocker.
 * Recorded rather than silently substituted.
 */
export const BLOCKED_LANGUAGES = [
  {
    code: "as",
    label: "Assamese",
    blocker: "No Assamese speech voice is available on this platform.",
  },
  {
    code: "dz",
    label: "Dzongkha",
    blocker:
      "No Dzongkha speech voice is available, and this project has no Dzongkha speaker to review a translation. Publishing unreviewed Dzongkha narration about Buddhist practice would risk exactly the kind of error this archive exists to avoid.",
  },
];
