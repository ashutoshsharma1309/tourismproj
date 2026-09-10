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
  /* Latin-script languages keep the district names exactly as Sikkim writes
     them. They are proper nouns; there is nothing to translate. */
  de: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  fr: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  es: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  /* District names are proper nouns. Japanese, Korean, Mandarin, Arabic and
     Russian keep them in Latin script rather than transliterated: a
     transliteration is a claim about spelling that no source here supports. */
  ja: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  ko: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  zh: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  ar: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
  ru: { Gangtok: "Gangtok", Mangan: "Mangan", Namchi: "Namchi", Gyalshing: "Gyalshing", Pakyong: "Pakyong", Soreng: "Soreng" },
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
  /* Lineage names stay as they are — Nyingma and Kagyu are not German, French
     or Spanish words and have no translation. Only the gloss around them is
     written in each language. */
  de: {
    Nyingma: "der Nyingma-Schule an, der ältesten der tibetisch-buddhistischen Traditionen",
    Kagyu: "der Kagyü-Schule an",
    "Karma Kagyu": "der Karma-Kagyü-Linie an",
    "Zurmang Kagyu": "der Zurmang-Kagyü-Linie an",
  },
  fr: {
    Nyingma: "à l'école Nyingma, la plus ancienne des traditions du bouddhisme tibétain",
    Kagyu: "à l'école Kagyu",
    "Karma Kagyu": "à la lignée Karma Kagyu",
    "Zurmang Kagyu": "à la lignée Zurmang Kagyu",
  },
  es: {
    Nyingma: "a la escuela Nyingma, la más antigua de las tradiciones del budismo tibetano",
    Kagyu: "a la escuela Kagyu",
    "Karma Kagyu": "al linaje Karma Kagyu",
    "Zurmang Kagyu": "al linaje Zurmang Kagyu",
  },
  ja: {
    Nyingma: "チベット仏教で最も古い宗派であるニンマ派",
    Kagyu: "カギュ派",
    "Karma Kagyu": "カルマ・カギュ派",
    "Zurmang Kagyu": "ズルマン・カギュ派",
  },
  ko: {
    Nyingma: "티베트 불교에서 가장 오래된 종파인 닝마파",
    Kagyu: "카규파",
    "Karma Kagyu": "카르마 카규파",
    "Zurmang Kagyu": "주르망 카규파",
  },
  zh: {
    Nyingma: "藏传佛教中最古老的宁玛派",
    Kagyu: "噶举派",
    "Karma Kagyu": "噶玛噶举派",
    "Zurmang Kagyu": "苏曼噶举派",
  },
  ar: {
    Nyingma: "مدرسة نيينغما، أقدم المدارس التبتية",
    Kagyu: "مدرسة كاغيو",
    "Karma Kagyu": "سلالة كارما كاغيو",
    "Zurmang Kagyu": "سلالة زورمانغ كاغيو",
  },
  ru: {
    Nyingma: "школе Ньингма, старейшей из школ тибетского буддизма",
    Kagyu: "школе Кагью",
    "Karma Kagyu": "линии Карма Кагью",
    "Zurmang Kagyu": "линии Зурманг Кагью",
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
  /*
   * German, French and Spanish.
   *
   * Written per language rather than machine-translated from the English, for
   * the same reason the Hindi and Bengali blocks were: a translator that does
   * not know the subject renders "Kagyu order" as an order of monks, "gompa"
   * as a generic temple, and "Chogyal" as a surname. The proper nouns held in
   * src/data/protected-terms.json never move; only the common noun beside them
   * does — "Rumtek Monastery" is "Kloster Rumtek", never "Kloster Rumtekkloster".
   *
   * Sentences are kept short on purpose. Punctuation is where a TTS engine
   * takes breath, and long clauses are the main cause of the flat, rushed
   * delivery that reads as synthetic.
   */
  de: {
    label: "Deutsch",
    welcome: (n) => `Willkommen im ${n}.`,
    place: (d) => (d ? `Es liegt im Distrikt ${d}, im indischen Bundesstaat Sikkim, im östlichen Himalaya.` : `Es liegt im indischen Bundesstaat Sikkim, im östlichen Himalaya.`),
    founded: (y, t) =>
      y && t ? `Es wurde ${y} gegründet und gehört ${t}.`
      : y ? `Es wurde ${y} gegründet.`
      : t ? `Es gehört ${t}.`
      : null,
    kingdom:
      "Sikkim war ein Himalaya-Königreich, bis es 1975 ein indischer Bundesstaat wurde. Seine Klöster waren eng mit dem Leben dieses Königreichs verbunden.",
    context:
      "Ein Gompa in Sikkim ist ebenso eine lebendige Gemeinschaft wie ein Denkmal. Hinter den bemalten Türen liegen Gebetshallen und eine Bibliothek gedruckter Schriften. Hier leben Mönche. Sie studieren, sie debattieren, und sie halten die Rituale des Jahres.",
    architecture:
      "Die Bauweise folgt tibetischer Klostertradition. Dicke Mauern tragen eine leuchtend bemalte Fassade. Im Inneren steht eine Versammlungshalle mit Säulen. Darüber fängt ein vergoldetes Dach das erste Licht der Berge.",
    etiquette:
      "Wenn Sie zu Besuch kommen, kleiden Sie sich bitte zurückhaltend. Umrunden Sie Schreine und Stupas im Uhrzeigersinn. Ziehen Sie vor dem Betreten einer Gebetshalle die Schuhe aus, und fragen Sie, bevor Sie drinnen fotografieren.",
    closing: (n) => `Alle Angaben dieses Führers stammen aus den Quellen, die auf der Seite zu ${n} aufgeführt sind.`,
  },
  fr: {
    label: "Français",
    welcome: (n) => `Bienvenue au ${n}.`,
    place: (d) => (d ? `Il se trouve dans le district de ${d}, dans l'État indien du Sikkim, dans l'Himalaya oriental.` : `Il se trouve dans l'État indien du Sikkim, dans l'Himalaya oriental.`),
    founded: (y, t) =>
      y && t ? `Il fut fondé en ${y} et appartient ${t}.`
      : y ? `Il fut fondé en ${y}.`
      : t ? `Il appartient ${t}.`
      : null,
    kingdom:
      "Le Sikkim fut un royaume himalayen jusqu'à devenir un État indien en 1975. Ses monastères étaient étroitement liés à la vie de ce royaume.",
    context:
      "Un gompa du Sikkim est une communauté vivante autant qu'un monument. Derrière ses portes peintes se trouvent des salles de prière et une bibliothèque de textes imprimés. Des moines y vivent. Ils étudient, ils débattent, et ils perpétuent les rituels de l'année.",
    architecture:
      "L'architecture suit la tradition monastique tibétaine. Des murs épais portent une façade aux couleurs vives. À l'intérieur s'ouvre une salle d'assemblée à colonnes. Au-dessus, un toit orné de dorures capte la première lumière des montagnes.",
    etiquette:
      "Si vous venez, habillez-vous sobrement. Contournez les sanctuaires et les stupas dans le sens des aiguilles d'une montre. Retirez vos chaussures avant d'entrer dans une salle de prière, et demandez avant de photographier à l'intérieur.",
    closing: (n) => `Toutes les informations de ce guide proviennent des sources indiquées sur la page consacrée à ${n}.`,
  },
  es: {
    label: "Español",
    welcome: (n) => `Bienvenido al ${n}.`,
    place: (d) => (d ? `Se encuentra en el distrito de ${d}, en el estado indio de Sikkim, en el Himalaya oriental.` : `Se encuentra en el estado indio de Sikkim, en el Himalaya oriental.`),
    founded: (y, t) =>
      y && t ? `Fue fundado en ${y} y pertenece ${t}.`
      : y ? `Fue fundado en ${y}.`
      : t ? `Pertenece ${t}.`
      : null,
    kingdom:
      "Sikkim fue un reino del Himalaya hasta convertirse en estado indio en 1975. Sus monasterios estuvieron estrechamente ligados a la vida de aquel reino.",
    context:
      "Un gompa de Sikkim es una comunidad viva tanto como un monumento. Tras sus puertas pintadas hay salas de oración y una biblioteca de textos impresos. Aquí viven monjes. Estudian, debaten y mantienen los rituales del año.",
    architecture:
      "La arquitectura sigue la tradición monástica tibetana. Muros gruesos sostienen una fachada de colores intensos. Dentro se abre una sala de asambleas con columnas. Sobre ella, un tejado rematado en dorado recoge la primera luz de las montañas.",
    etiquette:
      "Si viene de visita, vista con discreción. Rodee los santuarios y las estupas en el sentido de las agujas del reloj. Descálcese antes de entrar en una sala de oración, y pida permiso antes de fotografiar el interior.",
    closing: (n) => `Toda la información de esta guía procede de las fuentes indicadas en la página de ${n}.`,
  },
  /*
   * The five languages added in the expansion, written per language.
   *
   * Monastery names stay in Latin script and are never transliterated, the same
   * rule bn and ne already follow above. A transliteration is a claim about how
   * a name is written in that language, and this project has no source for
   * "Rumtek in Korean". The common noun beside it — 사원, 寺院, دير, монастырь —
   * is a translation and does move.
   *
   * Sentences are short deliberately. Punctuation is where a TTS engine takes
   * breath, and in Japanese and Mandarin especially a long clause is where the
   * prosody flattens out.
   */
  ja: {
    label: "日本語",
    welcome: (n) => `${n}僧院へようこそ。`,
    place: (d) => (d ? `インド・シッキム州の${d}地区、東ヒマラヤに位置します。` : `東ヒマラヤ、インドのシッキム州に位置します。`),
    founded: (y, t) =>
      y && t ? `${y}年に創建され、${t}に属します。`
      : y ? `${y}年に創建されました。`
      : t ? `${t}に属します。`
      : null,
    kingdom:
      "シッキムは1975年にインドの州となるまでヒマラヤの王国でした。僧院はその王国の暮らしと深く結びついていました。",
    context:
      "シッキムのゴンパは記念物であると同時に、生きた共同体です。彩色された扉の奥には本堂があり、木版の経典を収めた書庫があります。僧たちがここに暮らし、学び、問答し、一年の儀礼を守り続けています。",
    architecture:
      "建築はチベット僧院の伝統に従います。厚い壁が鮮やかな彩色の正面を支え、内部には柱の並ぶ講堂があります。その上の金色の屋根飾りが、山からの最初の光を受けます。",
    etiquette:
      "参拝の際は控えめな服装でお願いします。仏塔や祠は時計回りに巡ってください。本堂に入る前に靴を脱ぎ、堂内での撮影は必ず許可を得てください。",
    closing: (n) => `この案内の内容はすべて、${n}のページに記載された出典に基づいています。`,
  },
  ko: {
    label: "한국어",
    welcome: (n) => `${n} 사원에 오신 것을 환영합니다.`,
    place: (d) => (d ? `인도 시킴주 ${d} 지구, 동히말라야에 자리하고 있습니다.` : `동히말라야, 인도 시킴주에 자리하고 있습니다.`),
    founded: (y, t) =>
      y && t ? `${y}년에 세워졌으며, ${t}에 속합니다.`
      : y ? `${y}년에 세워졌습니다.`
      : t ? `${t}에 속합니다.`
      : null,
    kingdom:
      "시킴은 1975년 인도의 주가 되기까지 히말라야의 왕국이었습니다. 이곳의 사원들은 그 왕국의 삶과 긴밀히 이어져 있었습니다.",
    context:
      "시킴의 곰파는 기념물이자 살아 있는 공동체입니다. 채색된 문 안에는 법당이 있고, 목판으로 찍은 경전을 모은 서고가 있습니다. 승려들이 이곳에 머물며 공부하고, 논쟁하고, 한 해의 의례를 이어 갑니다.",
    architecture:
      "건축은 티베트 사원의 전통을 따릅니다. 두꺼운 벽이 선명하게 채색된 정면을 받치고, 안에는 기둥이 늘어선 법당이 있습니다. 그 위 금빛 지붕 장식이 산에서 오는 첫 햇빛을 받습니다.",
    etiquette:
      "방문하실 때에는 단정한 옷차림을 부탁드립니다. 탑과 사당은 시계 방향으로 도십시오. 법당에 들어가기 전 신발을 벗고, 내부 촬영은 반드시 허락을 구하십시오.",
    closing: (n) => `이 안내의 모든 내용은 ${n} 페이지에 실린 출처에 근거합니다.`,
  },
  zh: {
    label: "中文",
    welcome: (n) => `欢迎来到 ${n} 寺院。`,
    place: (d) => (d ? `它坐落在印度锡金邦的${d}县，位于东喜马拉雅。` : `它坐落在印度锡金邦，位于东喜马拉雅。`),
    founded: (y, t) =>
      y && t ? `建于${y}年，属于${t}。`
      : y ? `建于${y}年。`
      : t ? `属于${t}。`
      : null,
    kingdom:
      "锡金在一九七五年成为印度的一个邦之前，是喜马拉雅山中的王国。这里的寺院与那个王国的生活紧密相连。",
    context:
      "锡金的贡巴既是古迹，也是仍在运转的僧团。彩绘的门后是经堂，还有收藏木刻经卷的书库。僧人在此居住、修学、辩经，并守着一年之中的仪轨。",
    architecture:
      "建筑遵循藏传寺院的传统。厚墙托起色彩浓烈的立面，内部是列柱的大殿。殿顶的鎏金饰件，最先接住山间的晨光。",
    etiquette:
      "前来参访时，请着装得体。绕行佛塔与殿堂请顺时针方向。进入经堂前请脱鞋，殿内摄影须先征得许可。",
    closing: (n) => `本导览的全部内容，均出自 ${n} 页面所列的资料来源。`,
  },
  ar: {
    label: "العربية",
    welcome: (n) => `أهلاً بكم في دير ${n}.`,
    place: (d) => (d ? `يقع في منطقة ${d} بولاية سيكيم الهندية، في شرق الهيمالايا.` : `يقع في ولاية سيكيم الهندية، في شرق الهيمالايا.`),
    founded: (y, t) =>
      y && t ? `أُسّس عام ${y}، وينتمي إلى ${t}.`
      : y ? `أُسّس عام ${y}.`
      : t ? `ينتمي إلى ${t}.`
      : null,
    kingdom:
      "كانت سيكيم مملكة في الهيمالايا حتى صارت ولاية هندية عام 1975، وارتبطت أديرتها بحياة تلك المملكة.",
    /* Arabic runs long. The full-length blocks used by the other eleven
       languages put every Arabic guide over the 90-second ceiling, and the
       voice caps its own speaking rate — 130 to 190 moved 110s to only 93s — so
       speeding it up could not recover the difference. These blocks are
       shortened rather than the ceiling raised: the format is a guide someone
       listens to while walking, and that is the constraint that should win. */
    context:
      "الغومبا في سيكيم جماعة حيّة بقدر ما هي أثر. خلف أبوابها المزخرفة قاعات للصلاة ومكتبة من النصوص. يعيش الرهبان هنا، ويقيمون طقوس السنة.",
    architecture:
      "تتبع العمارة تقاليد الأديرة التبتية: جدران سميكة، وواجهة زاهية الألوان، وقاعة اجتماع ذات أعمدة يعلوها سقف مذهّب.",
    etiquette:
      "الرجاء ارتداء ملابس محتشمة، والطواف حول المزارات باتجاه عقارب الساعة، وخلع الأحذية قبل دخول قاعة الصلاة، والاستئذان قبل التصوير.",
    closing: (n) => `كل ما ورد في هذا الدليل مأخوذ من المصادر المذكورة في صفحة ${n}.`,
  },
  ru: {
    label: "Русский",
    welcome: (n) => `Добро пожаловать в монастырь ${n}.`,
    place: (d) => (d ? `Он расположен в округе ${d}, в индийском штате Сикким, в Восточных Гималаях.` : `Он расположен в индийском штате Сикким, в Восточных Гималаях.`),
    founded: (y, t) =>
      y && t ? `Основан в ${y} году и принадлежит ${t}.`
      : y ? `Основан в ${y} году.`
      : t ? `Принадлежит ${t}.`
      : null,
    kingdom:
      "До 1975 года, когда Сикким стал индийским штатом, он был гималайским королевством. Его монастыри были тесно связаны с жизнью этого королевства.",
    context:
      "Гомпа в Сиккиме — не только памятник, но и живая община. За расписными дверями лежат молитвенные залы и библиотека ксилографических текстов. Здесь живут монахи: учатся, ведут диспуты и соблюдают обряды годового круга.",
    architecture:
      "Архитектура следует тибетской монастырской традиции. Толстые стены несут ярко расписанный фасад, внутри — колонный зал собраний. Над ним позолоченная кровля первой ловит свет, сходящий с гор.",
    etiquette:
      "Если вы приедете, оденьтесь скромно. Обходите святыни и ступы по часовой стрелке. Разувайтесь перед входом в молитвенный зал и спрашивайте разрешения, прежде чем фотографировать внутри.",
    closing: (n) => `Все сведения этого путеводителя взяты из источников, перечисленных на странице «${n}».`,
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

/**
 * Render a monastery's name in the target language.
 *
 * Only the common noun moves. "Rumtek Monastery" is "Kloster Rumtek" in German
 * and "monastère de Rumtek" in French — Rumtek itself is a name and is never
 * translated, transliterated or inflected. Anything not recognised is returned
 * untouched, because passing a name through unchanged is always safer than
 * guessing at it.
 *
 * The article forms in the templates were written to agree with these: German
 * `Kloster` is neuter ("im Kloster"), French `monastère` and Spanish
 * `monasterio` are masculine ("au monastère", "al monasterio").
 */
const NAME_FORMS = {
  en: (core, noun) => `${core} ${noun}`,
  /* Scripts whose templates already supply the common noun take the bare name.
     Without this the Japanese line read "Rumtek Monastery僧院へようこそ" —
     "welcome to Rumtek Monastery monastery". */
  hi: (core) => core,
  ne: (core) => core,
  bn: (core) => core,
  ja: (core) => core,
  ko: (core) => core,
  zh: (core) => core,
  ar: (core) => core,
  ru: (core) => core,
  de: (core, noun) => `${noun} ${core}`,
  fr: (core, noun) => `${noun} de ${core}`,
  es: (core, noun) => `${noun} de ${core}`,
};

const COMMON_NOUN = {
  en: { monastery: "Monastery" },
  de: { monastery: "Kloster" },
  fr: { monastery: "monastère" },
  es: { monastery: "monasterio" },
};

export function localiseName(name, lang) {
  const form = NAME_FORMS[lang];
  if (!form) return name;
  /* Strip the English common noun(s) to recover the bare proper name. Palace is
     handled because one record is "Tsuklakhang Palace Monastery"; the name the
     narration wants there is simply Tsuklakhang. */
  const core = name.replace(/\s+(Monastery|Palace)\b/g, "").trim();
  const noun = COMMON_NOUN[lang]?.monastery;
  if (!noun) return core; // Devanagari/Bengali scripts take the bare name
  return form(core, noun);
}

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
