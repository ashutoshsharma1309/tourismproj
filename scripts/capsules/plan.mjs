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
  {
    id: "paris",
    /* Stated rather than derived: "new-york-city" does not title-case into
       "New York City", and an image alt text is not the place to find out. */
    name: "Paris",
    scope: "Landmarks of the capital, and the royal court at Versailles that shaped it",
    places: [
      { id: "eiffel-tower", title: "Eiffel Tower", category: "Tower", themes: ["architecture", "heritage", "history"] },
      { id: "louvre", title: "Louvre", category: "Museum", themes: ["museums", "art", "heritage"] },
      { id: "notre-dame", title: "Notre-Dame de Paris", category: "Cathedral", themes: ["architecture", "sacred", "heritage", "history"] },
      { id: "arc-de-triomphe", title: "Arc de Triomphe", category: "Monument", themes: ["architecture", "heritage", "history"] },
      { id: "montmartre", title: "Montmartre", category: "District", themes: ["art", "culture", "local"] },
      { id: "versailles", title: "Palace of Versailles", category: "Palace", themes: ["heritage", "architecture", "history"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "sainte-chapelle", title: "Sainte-Chapelle", category: "Chapel", themes: ["sacred", "architecture", "heritage"] },
      { id: "pantheon-paris", title: "Panthéon", category: "Monument", themes: ["architecture", "history", "heritage"] },
      { id: "musee-dorsay", title: "Musée d'Orsay", category: "Museum", themes: ["museums", "art", "architecture"] },
      { id: "place-concorde", title: "Place de la Concorde", category: "Square", themes: ["history", "heritage", "architecture"] },
      { id: "les-invalides", title: "Les Invalides", category: "Monument", themes: ["history", "architecture", "museums"] },
      { id: "centre-pompidou", title: "Centre Pompidou", category: "Museum", themes: ["museums", "art", "architecture"] },
      { id: "pere-lachaise", title: "Père Lachaise Cemetery", category: "Cemetery", themes: ["heritage", "history", "culture"] },
    ],
  },
  {
    id: "rome",
    /* Stated rather than derived: "new-york-city" does not title-case into
       "New York City", and an image alt text is not the place to find out. */
    name: "Rome",
    scope: "The ancient city, its temples and its Baroque squares",
    places: [
      { id: "colosseum", title: "Colosseum", category: "Amphitheatre", themes: ["heritage", "architecture", "history"] },
      { id: "roman-forum", title: "Roman Forum", category: "Archaeological site", themes: ["heritage", "history", "architecture"] },
      { id: "pantheon", title: "Pantheon, Rome", category: "Temple", themes: ["architecture", "heritage", "sacred", "history"] },
      { id: "trevi-fountain", title: "Trevi Fountain", category: "Fountain", themes: ["architecture", "culture", "heritage"] },
      { id: "vatican-museums", title: "Vatican Museums", category: "Museum", themes: ["museums", "art", "heritage"] },
      { id: "piazza-navona", title: "Piazza Navona", category: "Square", themes: ["architecture", "culture", "local"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "castel-santangelo", title: "Castel Sant'Angelo", category: "Fort", themes: ["heritage", "history", "architecture"] },
      { id: "palatine-hill", title: "Palatine Hill", category: "Archaeological site", themes: ["heritage", "history", "architecture"] },
      { id: "baths-caracalla", title: "Baths of Caracalla", category: "Archaeological site", themes: ["heritage", "history", "architecture"] },
      { id: "spanish-steps", title: "Spanish Steps", category: "Landmark", themes: ["architecture", "culture", "local"] },
      { id: "trastevere", title: "Trastevere", category: "District", themes: ["culture", "local", "heritage"] },
      { id: "capitoline-museums", title: "Capitoline Museums", category: "Museum", themes: ["museums", "art", "heritage"] },
      { id: "st-peters", title: "St. Peter's Basilica", category: "Basilica", themes: ["sacred", "architecture", "heritage"] },
    ],
  },
  {
    id: "istanbul",
    /* Stated rather than derived: "new-york-city" does not title-case into
       "New York City", and an image alt text is not the place to find out. */
    name: "Istanbul",
    scope: "Byzantine and Ottoman monuments of the historic peninsula",
    places: [
      { id: "hagia-sophia", title: "Hagia Sophia", category: "Mosque", themes: ["heritage", "architecture", "sacred", "history"] },
      /* The article's own title. "Sultan Ahmed Mosque" redirects here, and a
         capsule cites the page it actually retrieved. */
      { id: "blue-mosque", title: "Blue Mosque, Istanbul", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "topkapi-palace", title: "Topkapı Palace", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "grand-bazaar", title: "Grand Bazaar, Istanbul", category: "Market", themes: ["culture", "local", "heritage"] },
      { id: "basilica-cistern", title: "Basilica Cistern", category: "Cistern", themes: ["heritage", "architecture", "history"] },
      { id: "galata-tower", title: "Galata Tower", category: "Tower", themes: ["architecture", "heritage", "history"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "suleymaniye", title: "Süleymaniye Mosque", category: "Mosque", themes: ["sacred", "architecture", "heritage"] },
      { id: "chora", title: "The Chora", category: "Church", themes: ["sacred", "art", "heritage"] },
      { id: "dolmabahce", title: "Dolmabahçe Palace", category: "Palace", themes: ["heritage", "architecture", "history"] },
      { id: "rustem-pasha", title: "Rüstem Pasha Mosque", category: "Mosque", themes: ["sacred", "architecture", "art"] },
      { id: "archaeology-museums", title: "Istanbul Archaeology Museums", category: "Museum", themes: ["museums", "heritage", "history"] },
      { id: "spice-bazaar", title: "Spice Bazaar", category: "Market", themes: ["culture", "local", "heritage"] },
      { id: "bosphorus", title: "Bosporus", category: "Strait", themes: ["nature", "history", "local"] },
    ],
  },
  {
    id: "new-york-city",
    /* Stated rather than derived: "new-york-city" does not title-case into
       "New York City", and an image alt text is not the place to find out. */
    name: "New York City",
    scope: "The harbour monuments, bridges and museums of the city",
    places: [
      { id: "statue-of-liberty", title: "Statue of Liberty", category: "Monument", themes: ["heritage", "architecture", "history"] },
      { id: "ellis-island", title: "Ellis Island", category: "Historic site", themes: ["history", "heritage", "culture"] },
      { id: "empire-state-building", title: "Empire State Building", category: "Skyscraper", themes: ["architecture", "heritage", "history"] },
      { id: "central-park", title: "Central Park", category: "Urban park", themes: ["nature", "culture", "local"] },
      { id: "brooklyn-bridge", title: "Brooklyn Bridge", category: "Bridge", themes: ["architecture", "heritage", "history"] },
      { id: "met-museum", title: "Metropolitan Museum of Art", category: "Museum", themes: ["museums", "art", "culture"] },
      /* PHASE B added these as records only. The final visual pass turns
         their photographs on: a tourism product whose places have no picture
         is a catalogue, and 58% of them had none. Every image is a freely
         licensed Commons file, vendored with its licence and attribution. */
      { id: "one-wtc", title: "One World Trade Center", category: "Skyscraper", themes: ["architecture", "history", "heritage"] },
      { id: "grand-central", title: "Grand Central Terminal", category: "Railway station", themes: ["architecture", "heritage", "history"] },
      { id: "times-square", title: "Times Square", category: "Square", themes: ["culture", "local", "history"] },
      { id: "amnh", title: "American Museum of Natural History", category: "Museum", themes: ["museums", "culture", "nature"] },
      { id: "moma", title: "Museum of Modern Art", category: "Museum", themes: ["museums", "art", "culture"] },
      { id: "high-line", title: "High Line", category: "Urban park", themes: ["nature", "architecture", "local"] },
      { id: "rockefeller-center", title: "Rockefeller Center", category: "Landmark", themes: ["architecture", "culture", "heritage"] },
    ],
  },
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
  {
    id: "kyoto",
    scope: "The imperial capital's temples, shrines and garden architecture",
    places: [
      { id: "kinkakuji", title: "Kinkaku-ji", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "ginkakuji", title: "Ginkaku-ji", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "fushimi-inari", title: "Fushimi Inari-taisha", category: "Shrine", themes: ["sacred", "heritage", "culture"] },
      { id: "kiyomizudera", title: "Kiyomizu-dera", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "nijo-castle", title: "Nijō Castle", category: "Castle", themes: ["heritage", "history", "architecture"] },
      { id: "ryoanji", title: "Ryōan-ji", category: "Temple", themes: ["sacred", "heritage", "nature"] },
      { id: "toji", title: "Tō-ji", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "sanjusangendo", title: "Sanjūsangen-dō", category: "Temple", themes: ["sacred", "art", "heritage"] },
      { id: "arashiyama", title: "Arashiyama", category: "District", themes: ["nature", "culture", "local"] },
      { id: "heian-shrine", title: "Heian Shrine", category: "Shrine", themes: ["sacred", "heritage", "architecture"] },
      /* The final transformation topped these four destinations up toward the
         12-15 target. Every title was resolved against Wikipedia before being
         written here: four proposed places for Jaipur and one for Kochi were
         dropped because no article exists, which is why the counts below are
         not round. */
      { id: "nanzen-ji", title: "Nanzen-ji", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "daitoku-ji", title: "Daitoku-ji", category: "Temple", themes: ["sacred", "heritage", "architecture"] },
      { id: "philosophers-walk", title: "Philosopher's Walk", category: "Walk", themes: ["nature", "culture", "local"] },
      { id: "nishiki-market", title: "Nishiki Market", category: "Market", themes: ["food", "local", "culture"] },
      { id: "kyoto-imperial-palace", title: "Kyoto Imperial Palace", category: "Palace", themes: ["heritage", "history", "architecture"] },
    ],
  },
];
