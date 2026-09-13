/**
 * What each capsule covers — Phases 18, 19 and B.
 *
 * THIS FILE IS THE ONLY PLACE A HUMAN DECISION LIVES.
 *
 * It names the destinations, the places to look up, the category each place
 * belongs to and the interest themes it carries. Everything else — the
 * sentences, the coordinates, the dates, the photographs, the licences — is
 * retrieved and recorded by `retrieve.mjs`. Nothing in this file asserts a
 * fact about the world; it asserts which pages to go and read.
 *
 * WHY THE SELECTION IS SMALL
 * --------------------------
 * Five to seven places per destination, by instruction and by design. A
 * capsule is "these few things are true and here is who says so". A longer
 * list would be a worse capsule, not a better one, and the destination would
 * be asking to become a researched or deep destination instead.
 *
 * `themes` uses the planner's own interest vocabulary, so a capsule
 * destination answers "show me heritage" through the machinery that already
 * exists. A theme is only listed where the place plainly carries it: a fort
 * is architecture and heritage; whether it is "food" is not for this file to
 * decide.
 *
 * PHASE 19 — WHY FOUR NON-INDIAN CITIES
 * -------------------------------------
 * Not to make the archive bigger. To find out whether the model bends: a
 * `scope` line that has to admit Versailles is not in Paris, a `category`
 * vocabulary written for forts and ghats meeting a cistern and a skyscraper,
 * and a date extractor built for four-digit years meeting a building finished
 * in AD 80. Everything that had to change to hold them is written down in
 * docs/phase-19-global-capsules.md; nothing that changed was a component.
 */

/** @typedef {{id:string,title:string,category:string,themes:string[],image?:false}} PlannedPlace */

export const PLAN = [
  {
    id: "delhi",
    scope: "Mughal and colonial monuments of the capital",
    places: [
      { id: "red-fort", title: "Red Fort", category: "Fort", themes: ["heritage", "architecture", "history"] },
      { id: "qutub-minar", title: "Qutb Minar", category: "Monument", themes: ["heritage", "architecture", "history"] },
      { id: "humayuns-tomb", title: "Humayun's Tomb", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      { id: "india-gate", title: "India Gate", category: "Memorial", themes: ["heritage", "architecture", "history"] },
      { id: "lotus-temple", title: "Lotus Temple", category: "Temple", themes: ["architecture", "sacred"] },
      { id: "jama-masjid", title: "Jama Masjid, Delhi", category: "Mosque", themes: ["heritage", "architecture", "sacred"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "safdarjung-tomb", title: "Tomb of Safdar Jang", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      { id: "purana-qila", title: "Purana Qila", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "hauz-khas", title: "Hauz Khas Complex", category: "Heritage site", themes: ["heritage", "history", "architecture"] },
      { id: "rashtrapati-bhavan", title: "Rashtrapati Bhavan", category: "Palace", themes: ["architecture", "history", "heritage"] },
      { id: "jantar-mantar-delhi", title: "Jantar Mantar, New Delhi", category: "Observatory", themes: ["heritage", "history", "architecture"] },
      { id: "nizamuddin-dargah", title: "Hazrat Nizamuddin Dargah", category: "Shrine", themes: ["sacred", "heritage", "culture"] },
      { id: "agrasen-ki-baoli", title: "Agrasen Ki Baoli", category: "Stepwell", themes: ["heritage", "architecture", "history"] },
    ],
  },
  {
    id: "varanasi",
    scope: "The riverfront city and its sacred geography",
    places: [
      { id: "dashashwamedh-ghat", title: "Dashashwamedh Ghat", category: "Ghat", themes: ["sacred", "culture", "heritage"] },
      { id: "kashi-vishwanath", title: "Kashi Vishwanath Temple", category: "Temple", themes: ["sacred", "heritage", "history"] },
      { id: "sarnath", title: "Sarnath", category: "Heritage site", themes: ["heritage", "history", "sacred"] },
      { id: "manikarnika-ghat", title: "Manikarnika Ghat", category: "Ghat", themes: ["sacred", "culture"] },
      { id: "ramnagar-fort", title: "Ramnagar Fort", category: "Fort", themes: ["heritage", "architecture", "museums"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "assi-ghat", title: "Assi Ghat", category: "Ghat", themes: ["sacred", "culture", "local"] },
      { id: "bhu", title: "Banaras Hindu University", category: "University", themes: ["culture", "history", "heritage"] },
      { id: "chunar-fort", title: "Chunar Fort", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "durga-mandir", title: "Durga Mandir, Varanasi", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "tulsi-manas", title: "Tulsi Manas Mandir", category: "Temple", themes: ["sacred", "culture", "heritage"] },
      { id: "alamgir-mosque", title: "Alamgir Mosque", category: "Mosque", themes: ["sacred", "architecture", "history"] },
      { id: "bharat-mata-mandir", title: "Bharat Mata Mandir", category: "Temple", themes: ["culture", "history", "heritage"] },
    ],
  },
  {
    id: "agra",
    scope: "The Mughal capital and its imperial architecture",
    places: [
      { id: "taj-mahal", title: "Taj Mahal", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      { id: "agra-fort", title: "Agra Fort", category: "Fort", themes: ["heritage", "architecture", "history"] },
      { id: "fatehpur-sikri", title: "Fatehpur Sikri", category: "Heritage site", themes: ["heritage", "architecture", "history"] },
      { id: "itmad-ud-daulah", title: "Tomb of I'timād-ud-Daulah", category: "Mausoleum", themes: ["heritage", "architecture"] },
      { id: "akbars-tomb", title: "Akbar's tomb", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "mehtab-bagh", title: "Mehtab Bagh", category: "Garden", themes: ["heritage", "nature", "history"] },
      { id: "jama-masjid-agra", title: "Jama Mosque, Agra", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "chini-ka-rauza", title: "Chini Ka Rauza", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      /* "Ram Bagh" is a disambiguation page; the Agra garden is Aram Bagh. */
      { id: "aram-bagh", title: "Aram Bagh, Agra", category: "Garden", themes: ["heritage", "nature", "history"] },
      { id: "moti-masjid-agra", title: "Moti Masjid (Agra Fort)", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "jahangiri-mahal", title: "Jahangiri Mahal", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "mariam-tomb", title: "Tomb of Mariam-uz-Zamani", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      /* PHASE 3 raised Agra from 12 places to 15 — the target band — and, more
         to the point, gave its story selector more lead text to work with. It
         had ONE publishable story, because stories are drawn from sentences
         describing practice rather than chronology and twelve Mughal monument
         articles are almost entirely chronology. */
      { id: "keetham-lake", title: "Keetham Lake", category: "Bird sanctuary", themes: ["nature", "local"] },
      { id: "guru-ka-tal", title: "Guru Ka Tal", category: "Gurdwara", themes: ["sacred", "heritage", "architecture"] },
      { id: "dayalbagh", title: "Dayalbagh", category: "Settlement", themes: ["culture", "sacred", "local"] },
    ],
  },
  {
    id: "mumbai",
    scope: "The colonial waterfront and the island city's monuments",
    places: [
      { id: "gateway-of-india", title: "Gateway of India", category: "Monument", themes: ["heritage", "architecture", "history"] },
      { id: "elephanta-caves", title: "Elephanta Caves", category: "Heritage site", themes: ["heritage", "sacred", "history"] },
      { id: "cst", title: "Chhatrapati Shivaji Maharaj Terminus", category: "Railway station", themes: ["heritage", "architecture", "history"] },
      { id: "marine-drive", title: "Marine Drive, Mumbai", category: "Promenade", themes: ["architecture", "local"] },
      { id: "csmvs", title: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", category: "Museum", themes: ["museums", "heritage", "culture"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "haji-ali", title: "Haji Ali Dargah", category: "Shrine", themes: ["sacred", "heritage", "architecture"] },
      { id: "banganga", title: "Banganga Tank", category: "Heritage site", themes: ["sacred", "heritage", "history"] },
      { id: "kanheri-caves", title: "Kanheri Caves", category: "Heritage site", themes: ["heritage", "history", "sacred"] },
      { id: "rajabai-tower", title: "Rajabai Clock Tower", category: "Monument", themes: ["architecture", "heritage", "history"] },
      { id: "bombay-high-court", title: "Bombay High Court", category: "Landmark", themes: ["architecture", "heritage", "history"] },
      { id: "flora-fountain", title: "Flora Fountain", category: "Monument", themes: ["architecture", "heritage", "local"] },
      { id: "asiatic-society", title: "The Asiatic Society of Mumbai", category: "Library", themes: ["culture", "heritage", "architecture"] },
    ],
  },
  {
    id: "kolkata",
    scope: "The colonial capital and its institutions",
    places: [
      { id: "victoria-memorial", title: "Victoria Memorial, Kolkata", category: "Memorial", themes: ["heritage", "architecture", "museums"] },
      { id: "howrah-bridge", title: "Howrah Bridge", category: "Bridge", themes: ["architecture", "heritage"] },
      { id: "indian-museum", title: "Indian Museum, Kolkata", category: "Museum", themes: ["museums", "heritage", "culture"] },
      { id: "dakshineswar", title: "Dakshineswar Kali Temple", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "marble-palace", title: "Marble Palace (Kolkata)", category: "Palace", themes: ["heritage", "architecture", "museums"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "fort-william", title: "Fort William, West Bengal", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "st-pauls-cathedral", title: "St. Paul's Cathedral, Kolkata", category: "Cathedral", themes: ["sacred", "architecture", "heritage"] },
      { id: "belur-math", title: "Belur Math", category: "Temple", themes: ["sacred", "architecture", "culture"] },
      { id: "shaheed-minar", title: "Shaheed Minar, Kolkata", category: "Monument", themes: ["heritage", "history", "architecture"] },
      { id: "kalighat", title: "Kalighat Temple", category: "Temple", themes: ["sacred", "culture", "heritage"] },
      { id: "park-street", title: "Park Street, Kolkata", category: "District", themes: ["culture", "local", "heritage"] },
      /* The final transformation topped these four destinations up toward the
         12-15 target. Every title was resolved against Wikipedia before being
         written here: four proposed places for Jaipur and one for Kochi were
         dropped because no article exists, which is why the counts below are
         not round. */
      { id: "science-city-kolkata", title: "Science City, Kolkata", category: "Museum", themes: ["museums", "local"] },
      { id: "nakhoda-mosque", title: "Nakhoda Mosque", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "rabindra-sarobar", title: "Rabindra Sarobar", category: "Lake", themes: ["nature", "local"] },
      { id: "eden-gardens", title: "Eden Gardens", category: "Stadium", themes: ["local", "history"] },
    ],
  },
  {
    id: "hyderabad",
    scope: "The Qutb Shahi and Nizami city",
    places: [
      { id: "charminar", title: "Charminar", category: "Monument", themes: ["heritage", "architecture", "history"] },
      { id: "golconda-fort", title: "Golconda Fort", category: "Fort", themes: ["heritage", "architecture", "history"] },
      { id: "qutb-shahi-tombs", title: "Qutb Shahi tombs", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      { id: "chowmahalla", title: "Chowmahalla Palace", category: "Palace", themes: ["heritage", "architecture", "museums"] },
      { id: "salar-jung", title: "Salar Jung Museum", category: "Museum", themes: ["museums", "heritage", "culture"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "mecca-masjid", title: "Makkah Masjid, Hyderabad", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "falaknuma", title: "Falaknuma Palace", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "hussain-sagar", title: "Hussain Sagar", category: "Lake", themes: ["nature", "heritage", "local"] },
      { id: "birla-mandir-hyd", title: "Birla Mandir, Hyderabad", category: "Temple", themes: ["sacred", "architecture", "culture"] },
      { id: "paigah-tombs", title: "Paigah Tombs", category: "Mausoleum", themes: ["heritage", "architecture", "history"] },
      { id: "purani-haveli", title: "Purani Haveli", category: "Palace", themes: ["heritage", "architecture", "museums"] },
      { id: "taramati-baradari", title: "Taramati Baradari", category: "Heritage site", themes: ["heritage", "culture", "architecture"] },
    ],
  },
  {
    id: "kochi",
    scope: "The spice port and its layered colonial quarter",
    places: [
      { id: "fort-kochi", title: "Fort Kochi", category: "Heritage quarter", themes: ["heritage", "history", "local"] },
      { id: "mattancherry-palace", title: "Mattancherry Palace", category: "Palace", themes: ["heritage", "architecture", "museums"] },
      { id: "paradesi-synagogue", title: "Paradesi Synagogue", category: "Synagogue", themes: ["heritage", "sacred", "history"] },
      { id: "chinese-fishing-nets", title: "Chinese fishing nets", category: "Cultural landmark", themes: ["culture", "local", "heritage"] },
      { id: "santa-cruz-basilica", title: "Santa Cruz Cathedral Basilica, Kochi", category: "Church", themes: ["heritage", "architecture", "sacred"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "st-francis-church", title: "Church of Saint Francis, Kochi", category: "Church", themes: ["sacred", "heritage", "history"] },
      { id: "bolgatty-palace", title: "Bolgatty Palace and Island Resort", category: "Palace", themes: ["heritage", "history", "architecture"] },
      { id: "hill-palace", title: "Hill Palace, Kochi", category: "Palace", themes: ["heritage", "museums", "architecture"] },
      { id: "vypin", title: "Vypin", category: "Island", themes: ["local", "nature", "history"] },
      { id: "willingdon-island", title: "Willingdon Island", category: "Island", themes: ["history", "local", "heritage"] },
      /* The final transformation topped these four destinations up toward the
         12-15 target. Every title was resolved against Wikipedia before being
         written here: four proposed places for Jaipur and one for Kochi were
         dropped because no article exists, which is why the counts below are
         not round. */
      { id: "cherai-beach", title: "Cherai Beach", category: "Beach", themes: ["nature", "local"] },
      { id: "marine-drive-kochi", title: "Marine Drive, Kochi", category: "Promenade", themes: ["local", "nature"] },
      { id: "thevara", title: "Thevara", category: "Neighbourhood", themes: ["local", "culture"] },
      /* PHASE 3: a museum and a sanctuary, both inside the city. */
      { id: "indo-portuguese-museum", title: "Indo-Portuguese Museum", category: "Museum", themes: ["museums", "heritage", "history"] },
      { id: "mangalavanam", title: "Mangalavanam Bird Sanctuary", category: "Bird sanctuary", themes: ["nature", "local"] },
      /* PHASE 3, second pass: Kochi still had TWO publishable stories after
         gaining three places, because stories are drawn from sentences about
         practice and a museum article is chronology. These three are the
         communities and the landscape that Fort Kochi's own records keep
         referring to — the text that actually describes how the place is
         lived in. */
      { id: "cochin-jews", title: "Cochin Jews", category: "Community", themes: ["culture", "heritage", "sacred"] },
      { id: "saint-thomas-christians", title: "Saint Thomas Christians", category: "Community", themes: ["culture", "sacred", "heritage"] },
      { id: "kerala-backwaters", title: "Kerala backwaters", category: "Waterway", themes: ["nature", "local"] },
    ],
  },
  {
    id: "goa",
    scope: "The churches and forts of Portuguese Goa",
    places: [
      { id: "basilica-bom-jesus", title: "Basilica of Bom Jesus", category: "Church", themes: ["heritage", "architecture", "sacred"] },
      { id: "se-cathedral", title: "Sé Cathedral", category: "Cathedral", themes: ["heritage", "architecture", "sacred"] },
      { id: "fort-aguada", title: "Fort Aguada", category: "Fort", themes: ["heritage", "architecture", "history"] },
      { id: "chapora-fort", title: "Chapora Fort", category: "Fort", themes: ["heritage", "history"] },
      { id: "church-st-francis-assisi", title: "Church and Convent of St. Francis of Assisi", category: "Church", themes: ["heritage", "architecture", "sacred"] },
      { id: "old-goa", title: "Velha Goa", category: "Heritage site", themes: ["heritage", "history"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "st-cajetan", title: "St. Cajetan Church", category: "Church", themes: ["sacred", "architecture", "heritage"] },
      { id: "reis-magos", title: "Reis Magos", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "cabo-de-rama", title: "Cabo de Rama Fort", category: "Fort", themes: ["heritage", "history", "nature"] },
      { id: "shanta-durga", title: "Shanta Durga Temple", category: "Temple", themes: ["sacred", "culture", "architecture"] },
      { id: "mangueshi", title: "Mangueshi Temple", category: "Temple", themes: ["sacred", "culture", "architecture"] },
      { id: "tiracol", title: "Fort Tiracol", category: "Fort", themes: ["heritage", "history"] },
      { id: "immaculate-conception", title: "Our Lady of the Immaculate Conception Church, Goa", category: "Church", themes: ["sacred", "architecture", "heritage"] },
      /* PHASE 3: three more, widening Goa beyond churches and forts into the
         landscape and museums its own records already imply. */
      { id: "dudhsagar-falls", title: "Dudhsagar Falls", category: "Waterfall", themes: ["nature", "local"] },
      { id: "naval-aviation-museum", title: "Naval Aviation Museum (Goa)", category: "Museum", themes: ["museums", "history"] },
      { id: "anjuna", title: "Anjuna", category: "Village", themes: ["local", "culture"] },
    ],
  },
  /* ---------------------------------------------------------------------
     Phase 19 — global capsules.

     Same shape, four countries. The only field here that required a
     judgement rather than a lookup is `scope`, and Paris's says out loud
     that Versailles is not in Paris, because the alternative is a capsule
     that quietly annexes a town 20 km away.
     --------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------
     Phase B — the two destinations that held reviewed knowledge and nothing
     to visit.

     Jaipur published 35 approved claims and Kyoto 15, and both said, on their
     own discovery pages, that no catalogued place existed. A capsule gives
     them places without touching the research corpus: the two systems sit
     side by side, one supplying knowledge and the other records, exactly as
     the capability model already allows.
     --------------------------------------------------------------------- */
  {
    id: "jaipur",
    scope: "The walled city of the Kachwaha Rajputs and its royal observatories",
    places: [
      { id: "hawa-mahal", title: "Hawa Mahal", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "amber-fort", title: "Amber Fort", category: "Fort", themes: ["heritage", "architecture", "history"] },
      { id: "city-palace-jaipur", title: "City Palace, Jaipur", category: "Palace", themes: ["heritage", "architecture", "museums"] },
      { id: "jantar-mantar-jaipur", title: "Jantar Mantar, Jaipur", category: "Observatory", themes: ["heritage", "history", "architecture"] },
      { id: "nahargarh", title: "Nahargarh Fort", category: "Fort", themes: ["heritage", "history", "nature"] },
      { id: "jal-mahal", title: "Jal Mahal", category: "Palace", themes: ["heritage", "architecture"] },
      { id: "jaigarh", title: "Jaigarh Fort", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "albert-hall", title: "Albert Hall Museum", category: "Museum", themes: ["museums", "architecture", "culture"] },
      { id: "galtaji", title: "Galtaji", category: "Temple", themes: ["sacred", "heritage", "nature"] },
      /* The final transformation topped these four destinations up toward the
         12-15 target. Every title was resolved against Wikipedia before being
         written here: four proposed places for Jaipur and one for Kochi were
         dropped because no article exists, which is why the counts below are
         not round. */
      { id: "birla-mandir-jaipur", title: "Birla Mandir, Jaipur", category: "Temple", themes: ["sacred", "architecture"] },
      { id: "jawahar-kala-kendra", title: "Jawahar Kala Kendra", category: "Arts centre", themes: ["culture", "art", "architecture"] },
      { id: "govind-dev-ji", title: "Govind Dev Ji Temple", category: "Temple", themes: ["sacred", "heritage", "culture"] },
      { id: "ram-niwas-garden", title: "Ram Niwas Garden", category: "Garden", themes: ["heritage", "nature", "history"] },
      { id: "central-park-jaipur", title: "Central Park, Jaipur", category: "Park", themes: ["nature", "local"] },
    ],
  },
  /*
   * INDIA-ONLY (SIH 2026 final). Eight more Indian cities, chosen to widen
   * the kinds of cultural tourism the archive can show — Sikh, Awadhi,
   * Maratha, Wadiyar, Tamil temple, Kalinga temple, Kashmiri and the
   * walled-city textile heritage of Gujarat. As above: this file names pages
   * to read and nothing else. A title that turns out not to exist is dropped
   * by retrieve.mjs and reported, never invented.
   */
  {
    id: "amritsar",
    scope: "The Golden Temple city — Sikh heritage, Partition memory and Punjabi food",
    places: [
      { id: "golden-temple", title: "Golden Temple", category: "Gurdwara", themes: ["sacred", "heritage", "architecture"] },
      { id: "akal-takht", title: "Akal Takht", category: "Gurdwara", themes: ["sacred", "heritage", "history"] },
      { id: "jallianwala-bagh", title: "Jallianwala Bagh", category: "Memorial", themes: ["history", "heritage"] },
      { id: "partition-museum", title: "Partition Museum", category: "Museum", themes: ["museums", "history"] },
      { id: "gobindgarh-fort", title: "Gobindgarh Fort", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "durgiana-temple", title: "Durgiana Temple", category: "Temple", themes: ["sacred", "architecture"] },
      { id: "wagah", title: "Wagah", category: "Border crossing", themes: ["culture", "history", "local"] },
      { id: "khalsa-college", title: "Khalsa College, Amritsar", category: "College", themes: ["architecture", "heritage", "history"] },
      { id: "gurdwara-baba-atal", title: "Gurdwara Baba Atal", category: "Gurdwara", themes: ["sacred", "architecture", "heritage"] },
      { id: "central-sikh-museum", title: "Central Sikh Museum", category: "Museum", themes: ["museums", "history", "sacred"] },
      { id: "pul-kanjari", title: "Pul Kanjri", category: "Heritage site", themes: ["heritage", "history"] },
      { id: "guru-nanak-dev-university", title: "Guru Nanak Dev University", category: "University", themes: ["culture", "architecture"] },
    ],
  },
  {
    id: "ahmedabad",
    scope: "The walled city and its pols, stepwells, mosques and textile heritage",
    places: [
      { id: "sabarmati-ashram", title: "Sabarmati Ashram", category: "Heritage site", themes: ["history", "heritage", "culture"] },
      { id: "adalaj-stepwell", title: "Adalaj Stepwell", category: "Stepwell", themes: ["heritage", "architecture", "history"] },
      { id: "sidi-saiyyed-mosque", title: "Sidi Saiyyed Mosque", category: "Mosque", themes: ["architecture", "heritage", "sacred"] },
      { id: "jama-masjid-ahmedabad", title: "Jama Masjid, Ahmedabad", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "bhadra-fort", title: "Bhadra Fort", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "jhulta-minar", title: "Jhulta Minar", category: "Monument", themes: ["architecture", "heritage"] },
      { id: "calico-museum", title: "Calico Museum of Textiles", category: "Museum", themes: ["museums", "art", "culture"] },
      { id: "hutheesing-jain-temple", title: "Hutheesing Jain Temple", category: "Temple", themes: ["sacred", "architecture", "heritage"] },
      { id: "sarkhej-roza", title: "Sarkhej Roza", category: "Mausoleum", themes: ["heritage", "architecture", "sacred"] },
      { id: "kankaria-lake", title: "Kankaria Lake", category: "Lake", themes: ["nature", "local", "history"] },
      { id: "manek-chowk", title: "Manek Chowk (Ahmedabad)", category: "Market", themes: ["food", "local", "culture"] },
      { id: "teen-darwaza", title: "Teen Darwaza", category: "Gateway", themes: ["heritage", "architecture", "history"] },
      { id: "dada-harir-stepwell", title: "Dada Harir Stepwell", category: "Stepwell", themes: ["heritage", "architecture", "history"] },
      { id: "rani-no-hajiro", title: "Rani no Hajiro", category: "Mausoleum", themes: ["heritage", "architecture", "local"] },
      { id: "lalbhai-dalpatbhai-museum", title: "Lalbhai Dalpatbhai Museum", category: "Museum", themes: ["museums", "art", "heritage"] },
      { id: "swaminarayan-kalupur", title: "Swaminarayan Temple, Ahmedabad", category: "Temple", themes: ["sacred", "architecture", "heritage"] },
      { id: "sabarmati-riverfront", title: "Sabarmati Riverfront", category: "Riverfront", themes: ["local", "nature"] },
    ],
  },
  {
    id: "lucknow",
    scope: "The Nawabi capital — Awadhi architecture, Urdu literature, chikankari and its cuisine",
    places: [
      { id: "bara-imambara", title: "Bara Imambara", category: "Imambara", themes: ["heritage", "architecture", "history"] },
      { id: "chota-imambara", title: "Chota Imambara", category: "Imambara", themes: ["heritage", "architecture", "sacred"] },
      { id: "rumi-darwaza", title: "Rumi Darwaza", category: "Gateway", themes: ["architecture", "heritage", "history"] },
      { id: "the-residency", title: "The Residency, Lucknow", category: "Heritage site", themes: ["history", "heritage", "architecture"] },
      { id: "la-martiniere", title: "La Martinière College", category: "College", themes: ["architecture", "heritage", "history"] },
      { id: "hussainabad-clock-tower", title: "Husainabad Clock Tower", category: "Monument", themes: ["architecture", "heritage"] },
      { id: "dilkusha-kothi", title: "Dilkusha Kothi", category: "Palace", themes: ["heritage", "history", "architecture"] },
      { id: "chattar-manzil", title: "Chattar Manzil", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "ambedkar-memorial-park", title: "Ambedkar Memorial Park", category: "Memorial", themes: ["architecture", "culture"] },
      { id: "state-museum-lucknow", title: "State Museum Lucknow", category: "Museum", themes: ["museums", "history", "art"] },
      { id: "qaisar-bagh", title: "Qaisar Bagh", category: "Palace", themes: ["heritage", "history", "architecture"] },
      { id: "hazratganj", title: "Hazratganj", category: "Market", themes: ["local", "food", "culture"] },
      { id: "shah-najaf-imambara", title: "Shah Najaf Imambara", category: "Imambara", themes: ["sacred", "heritage", "history"] },
      { id: "sikandar-bagh", title: "Sikandar Bagh", category: "Garden", themes: ["history", "heritage", "nature"] },
      { id: "charbagh-station", title: "Lucknow Charbagh railway station", category: "Railway station", themes: ["architecture", "heritage"] },
    ],
  },
  {
    id: "pune",
    scope: "The Peshwa capital — Maratha history, its wadas, museums and institutions of learning",
    places: [
      { id: "shaniwar-wada", title: "Shaniwar Wada", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "aga-khan-palace", title: "Aga Khan Palace", category: "Palace", themes: ["history", "heritage", "architecture"] },
      { id: "sinhagad", title: "Sinhagad", category: "Fort", themes: ["history", "heritage", "nature"] },
      { id: "kelkar-museum", title: "Raja Dinkar Kelkar Museum", category: "Museum", themes: ["museums", "art", "culture"] },
      { id: "dagadusheth-temple", title: "Dagadusheth Halwai Ganapati Temple", category: "Temple", themes: ["sacred", "culture", "local"] },
      { id: "pataleshwar-caves", title: "Pataleshwar Caves, Pune", category: "Cave temple", themes: ["heritage", "sacred", "history"] },
      { id: "lal-mahal", title: "Lal Mahal", category: "Palace", themes: ["history", "heritage"] },
      { id: "vishrambaug-wada", title: "Vishrambaug Wada", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "parvati-hill", title: "Parvati Hill", category: "Hill", themes: ["sacred", "nature", "history"] },
      { id: "fergusson-college", title: "Fergusson College", category: "College", themes: ["heritage", "architecture", "culture"] },
      { id: "deccan-college", title: "Deccan College Post-Graduate and Research Institute", category: "Institute", themes: ["heritage", "history", "culture"] },
      { id: "bhandarkar-institute", title: "Bhandarkar Oriental Research Institute", category: "Institute", themes: ["culture", "history", "heritage"] },
      { id: "shinde-chhatri", title: "Shinde Chhatri", category: "Memorial", themes: ["heritage", "architecture", "history"] },
      { id: "tulshibaug", title: "Tulshibaug", category: "Market", themes: ["local", "culture", "sacred"] },
      { id: "chaturshringi-temple", title: "Chaturshringi Temple", category: "Temple", themes: ["sacred", "local"] },
    ],
  },
  {
    id: "mysuru",
    scope: "The Wadiyar capital — palace architecture, Dasara, sandalwood and silk",
    places: [
      { id: "mysore-palace", title: "Mysore Palace", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "chamundi-hills", title: "Chamundi Hills", category: "Hill", themes: ["sacred", "nature", "heritage"] },
      { id: "chamundeshwari-temple", title: "Chamundeshwari Temple", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "brindavan-gardens", title: "Brindavan Gardens", category: "Garden", themes: ["nature", "local"] },
      { id: "st-philomenas", title: "St. Philomena's Cathedral, Mysore", category: "Church", themes: ["sacred", "architecture", "heritage"] },
      { id: "jaganmohan-palace", title: "Jaganmohan Palace", category: "Palace", themes: ["art", "museums", "heritage"] },
      { id: "lalitha-mahal", title: "Lalitha Mahal", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "mysore-zoo", title: "Sri Chamarajendra Zoological Gardens", category: "Zoo", themes: ["nature", "local"] },
      { id: "devaraja-market", title: "Devaraja Market", category: "Market", themes: ["local", "food", "culture"] },
      { id: "rail-museum-mysore", title: "Railway Museum, Mysore", category: "Museum", themes: ["museums", "heritage"] },
      { id: "karanji-lake", title: "Karanji Lake", category: "Lake", themes: ["nature", "local"] },
      { id: "somanathapura", title: "Chennakeshava Temple, Somanathapura", category: "Temple", themes: ["heritage", "architecture", "sacred"] },
      { id: "ranganathaswamy-srirangapatna", title: "Ranganathaswamy Temple, Srirangapatna", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "daria-daulat-bagh", title: "Daria Daulat Bagh", category: "Palace", themes: ["heritage", "history", "art"] },
      { id: "gumbaz", title: "Gumbaz, Srirangapatna", category: "Mausoleum", themes: ["heritage", "history", "architecture"] },
      { id: "krs-dam", title: "Krishna Raja Sagara", category: "Dam", themes: ["nature", "history"] },
      { id: "oriental-research-institute", title: "Oriental Research Institute Mysore", category: "Institute", themes: ["culture", "history", "heritage"] },
    ],
  },
  {
    id: "madurai",
    scope: "The temple city — Meenakshi, Tamil literature, Sangam heritage and its street food",
    places: [
      { id: "meenakshi-temple", title: "Meenakshi Temple", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "thirumalai-nayakkar-mahal", title: "Thirumalai Nayakkar Mahal", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "koodal-azhagar", title: "Koodal Azhagar Temple", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "kallazhagar-temple", title: "Kallazhagar Temple", category: "Temple", themes: ["sacred", "heritage", "nature"] },
      { id: "thiruparankundram", title: "Subramaniya Swamy Temple, Thiruparankundram", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "teppakulam", title: "Vandiyur Mariamman Teppakulam", category: "Temple tank", themes: ["sacred", "culture", "heritage"] },
      { id: "pazhamudircholai", title: "Pazhamudircholai Murugan Temple", category: "Temple", themes: ["sacred", "nature"] },
      { id: "samanar-hills", title: "Samanar Hills", category: "Heritage site", themes: ["heritage", "history", "sacred"] },
      { id: "goripalayam-dargah", title: "Goripalayam Mosque", category: "Shrine", themes: ["sacred", "heritage", "history"] },
      { id: "st-marys-cathedral-madurai", title: "St. Mary's Cathedral, Madurai", category: "Church", themes: ["sacred", "architecture"] },
      { id: "keeladi", title: "Keeladi excavation site", category: "Archaeological site", themes: ["history", "heritage"] },
      /* "Gandhi Memorial Museum" alone resolves to Delhi's National Gandhi
         Museum — the distance check caught it. The Madurai museum has its
         own article under the disambiguated title. */
      { id: "gandhi-memorial-museum", title: "Gandhi Memorial Museum, Madurai", category: "Museum", themes: ["museums", "history"] },
      { id: "yanaimalai", title: "Yanaimalai", category: "Hill", themes: ["heritage", "nature", "sacred"] },
    ],
  },
  {
    id: "bhubaneswar",
    scope: "The temple city of Kalinga — Odia temple architecture, rock-cut caves and Pattachitra",
    places: [
      { id: "lingaraja-temple", title: "Lingaraja Temple", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "mukteshvara-temple", title: "Mukteshvara Temple, Bhubaneswar", category: "Temple", themes: ["heritage", "architecture", "sacred"] },
      { id: "rajarani-temple", title: "Rajarani Temple", category: "Temple", themes: ["heritage", "architecture", "art"] },
      { id: "parashurameshvara-temple", title: "Parashurameshvara Temple", category: "Temple", themes: ["heritage", "architecture", "history"] },
      { id: "udayagiri-khandagiri", title: "Udayagiri and Khandagiri Caves", category: "Cave complex", themes: ["heritage", "history", "sacred"] },
      { id: "dhauli", title: "Dhauli", category: "Heritage site", themes: ["history", "heritage", "sacred"] },
      { id: "brahmeswara-temple", title: "Brahmeswara Temple", category: "Temple", themes: ["heritage", "architecture", "sacred"] },
      { id: "ananta-vasudeva-temple", title: "Ananta Vasudeva Temple", category: "Temple", themes: ["sacred", "heritage", "food"] },
      { id: "bindu-sagar", title: "Bindusagar Lake", category: "Tank", themes: ["sacred", "heritage", "local"] },
      { id: "odisha-state-museum", title: "Odisha State Museum", category: "Museum", themes: ["museums", "history", "art"] },
      { id: "nandankanan", title: "Nandankanan Zoological Park", category: "Zoo", themes: ["nature", "local"] },
      { id: "ekamra-kshetra", title: "Ekamra Kshetra", category: "Heritage site", themes: ["sacred", "heritage", "history"] },
      { id: "chausathi-jogini-hirapur", title: "Chausathi Jogini Temple, Hirapur", category: "Temple", themes: ["heritage", "sacred", "art"] },
      { id: "ekamra-haat", title: "Ekamra Haat", category: "Market", themes: ["local", "art", "food"] },
      { id: "kedar-gouri-temple", title: "Kedar Gouri Temple", category: "Temple", themes: ["sacred", "heritage"] },
    ],
  },
  {
    id: "srinagar",
    scope: "The lake city of Kashmir — Mughal gardens, houseboats, shrines and its crafts",
    places: [
      { id: "dal-lake", title: "Dal Lake", category: "Lake", themes: ["nature", "culture", "local"] },
      { id: "shalimar-bagh", title: "Shalimar Bagh, Srinagar", category: "Garden", themes: ["heritage", "architecture", "nature"] },
      { id: "nishat-bagh", title: "Nishat Bagh", category: "Garden", themes: ["heritage", "architecture", "nature"] },
      { id: "chashme-shahi", title: "Chashme Shahi", category: "Garden", themes: ["heritage", "nature"] },
      { id: "pari-mahal", title: "Pari Mahal", category: "Garden", themes: ["heritage", "history", "architecture"] },
      { id: "hazratbal-shrine", title: "Hazratbal Shrine", category: "Shrine", themes: ["sacred", "heritage", "architecture"] },
      { id: "jamia-masjid-srinagar", title: "Jamia Masjid, Srinagar", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "shankaracharya-temple", title: "Shankaracharya Temple", category: "Temple", themes: ["sacred", "heritage", "nature"] },
      { id: "hari-parbat", title: "Hari Parbat", category: "Fort", themes: ["heritage", "history", "sacred"] },
      { id: "khanqah-e-moula", title: "Khanqah-e-Moula", category: "Shrine", themes: ["sacred", "architecture", "heritage"] },
      { id: "nigeen-lake", title: "Nigeen Lake", category: "Lake", themes: ["nature", "local"] },
      { id: "sps-museum", title: "SPS Museum", category: "Museum", themes: ["museums", "history", "art"] },
      { id: "tulip-garden", title: "Indira Gandhi Memorial Tulip Garden", category: "Garden", themes: ["nature", "local"] },
      { id: "char-chinar", title: "Char Chinar", category: "Island", themes: ["nature", "heritage"] },
      { id: "pathar-masjid", title: "Pathar Masjid", category: "Mosque", themes: ["architecture", "heritage", "history"] },
      { id: "burzahom", title: "Burzahom archaeological site", category: "Archaeological site", themes: ["history", "heritage"] },
      { id: "kheer-bhawani", title: "Kheer Bhawani", category: "Temple", themes: ["sacred", "culture"] },
    ],
  },
];
