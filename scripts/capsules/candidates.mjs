/**
 * Candidate titles for the culture and stays pass — food, festivals, arts and
 * crafts, and documented places to stay.
 *
 * THIS IS A LIST OF PAGES TO GO AND READ, NOT A LIST OF FACTS.
 * Nothing here asserts anything about the world. `check-titles.mjs` decides
 * which of these are real articles; `retrieve.mjs` reads them; everything a
 * visitor sees is quoted from what came back.
 *
 * It is deliberately over-long. A candidate that turns out to be a redirect,
 * a disambiguation page or nothing at all is dropped by the checker, and it
 * is far better to propose twelve and keep seven than to propose seven and
 * quietly ship five.
 */
export const CANDIDATES = {
  delhi: {
    food: ["Chaat", "Butter chicken", "Nihari", "Mughlai cuisine", "Chole bhature", "Paratha", "Jalebi", "Daulat ki chaat", "Delhi cuisine"],
    festival: ["Diwali", "Holi", "Dussehra", "Eid al-Fitr", "Guru Nanak Gurpurab", "Republic Day (India)"],
    craft: ["Zardozi", "Meenakari", "Mughal painting", "Kundan"],
    stay: ["The Imperial, New Delhi", "Maidens Hotel", "The Oberoi, New Delhi", "Ashok Hotel", "Taj Palace, New Delhi"],
  },
  varanasi: {
    food: ["Banarasi paan", "Kachori", "Lassi", "Malaiyo", "Thandai", "Rabri", "Chaat"],
    festival: ["Dev Deepawali", "Ganga Mahotsav", "Maha Shivaratri", "Ramlila", "Nag Nathaiya"],
    craft: ["Banarasi sari", "Gulabi Meenakari", "Wood carving"],
    stay: ["Nadesar Palace", "BrijRama Palace", "Hotel de Paris, Varanasi"],
  },
  agra: {
    /* PHASE 3: Agra had ONE publishable food record. Braj is the region Agra
       sits in and Uttar Pradesh the state — both have documented cuisine
       articles, so this is geographic fact rather than a stretch to fill a
       quota. Bedmi puri and Dalmoth have no article and stay dropped. */
    food: ["Petha (sweet)", "Braj cuisine", "Uttar Pradesh cuisine", "Mughlai cuisine", "Bedmi puri", "Dalmoth"],
    festival: ["Taj Mahotsav", "Ram Barat", "Holi", "Diwali"],
    craft: ["Pietra dura", "Marble inlay", "Zari"],
    stay: ["Oberoi Amarvilas", "ITC Mughal", "Hotel Clarks Shiraz"],
  },
  jaipur: {
    food: ["Dal baati churma", "Ghevar", "Laal maas", "Rajasthani cuisine", "Pyaaz kachori", "Mawa kachori"],
    festival: ["Teej", "Gangaur", "Jaipur Literature Festival", "Elephant Festival", "Diwali"],
    craft: ["Blue pottery", "Bandhani", "Block printing", "Kundan", "Meenakari", "Leheriya"],
    stay: ["Rambagh Palace", "Jai Mahal Palace", "Raj Palace", "Samode Haveli", "Narain Niwas Palace"],
  },
  mumbai: {
    food: ["Vada pav", "Pav bhaji", "Bhelpuri", "Bombay duck", "Misal pav", "Maharashtrian cuisine", "Modak", "Falooda"],
    festival: ["Ganesh Chaturthi", "Navratri", "Kala Ghoda Arts Festival", "Diwali", "Gudi Padwa"],
    craft: ["Warli painting", "Paithani"],
    stay: ["Taj Mahal Palace Hotel", "The Oberoi, Mumbai", "Trident Nariman Point"],
  },
  kolkata: {
    food: ["Bengali cuisine", "Rasgulla", "Sandesh (confectionery)", "Mishti doi", "Kathi roll", "Machher jhol", "Luchi", "Puchka"],
    festival: ["Durga Puja", "Kali Puja", "Poila Boishakh", "Kolkata Book Fair", "Rath Yatra"],
    craft: ["Kantha", "Terracotta temples of Bengal", "Baluchari sari", "Dhokra"],
    stay: ["The Oberoi Grand, Kolkata", "Great Eastern Hotel (Kolkata)", "Tollygunge Club"],
  },
  hyderabad: {
    food: ["Hyderabadi biryani", "Haleem", "Hyderabadi cuisine", "Double ka meetha", "Qubani ka meetha", "Irani chai"],
    festival: ["Bonalu", "Bathukamma", "Ganesh Chaturthi", "Eid al-Fitr", "Deccan Festival"],
    craft: ["Bidriware", "Kalamkari", "Pochampally Ikat", "Nirmal painting"],
    stay: ["Taj Falaknuma Palace", "ITC Kohenur", "Hotel Ritz, Hyderabad"],
  },
  kochi: {
    food: ["Kerala cuisine", "Appam", "Puttu", "Karimeen", "Malabar matthi curry", "Sadya", "Kerala porotta"],
    festival: ["Onam", "Kochi-Muziris Biennale", "Thrissur Pooram", "Vishu", "Cochin Carnival"],
    craft: ["Kathakali", "Aranmula Kannadi", "Coir", "Mohiniyattam"],
    stay: ["Brunton Boatyard", "Bolgatty Palace", "Taj Malabar"],
  },
  goa: {
    food: ["Goan cuisine", "Vindaloo", "Xacuti", "Bebinca", "Feni", "Sorpotel", "Cafreal"],
    festival: ["Goa Carnival", "Shigmo", "Sunburn Festival", "Feast of Saint Francis Xavier"],
    craft: ["Azulejo", "Kunbi saree"],
    stay: ["Taj Exotica Goa", "Cidade de Goa", "Taj Fort Aguada"],
  },
  kyoto: {
    food: ["Kaiseki", "Japanese cuisine", "Matcha", "Yudofu", "Wagashi", "Tofu", "Japanese tea ceremony"],
    festival: ["Gion Matsuri", "Aoi Matsuri", "Jidai Matsuri", "Hanami", "Gozan no Okuribi"],
    craft: ["Nishijin-ori", "Yūzen", "Kyo-yaki", "Japanese lacquerware", "Kintsugi"],
    stay: ["Tawaraya Ryokan", "Hiiragiya", "Hotel Okura Kyoto"],
  },
  paris: {
    food: ["French cuisine", "Croissant", "Baguette", "Macaron", "Crème brûlée", "Steak frites", "Escargot", "Éclair"],
    festival: ["Bastille Day", "Nuit Blanche", "Fête de la Musique", "Paris Fashion Week"],
    craft: ["Haute couture", "Gobelins Manufactory", "Sèvres porcelain"],
    stay: ["Hôtel Ritz Paris", "Hôtel de Crillon", "Le Meurice", "Hôtel Plaza Athénée", "The Peninsula Paris"],
  },
  rome: {
    food: ["Roman cuisine", "Carbonara", "Cacio e pepe", "Supplì", "Saltimbocca", "Gelato", "Amatriciana", "Maritozzo"],
    festival: ["Natale di Roma", "Carnival of Rome", "Ferragosto", "Festa della Repubblica"],
    craft: ["Roman mosaic", "Micromosaic"],
    stay: ["Hotel de Russie", "Hassler Roma", "Hotel Eden (Rome)", "St. Regis Rome"],
  },
  istanbul: {
    food: ["Turkish cuisine", "Baklava", "Doner kebab", "Simit", "Turkish delight", "Turkish coffee", "Meze", "Lahmacun", "Balık ekmek"],
    festival: ["Istanbul Film Festival", "Istanbul Biennial", "Eid al-Fitr", "Hıdırellez", "Ramadan"],
    craft: ["İznik pottery", "Turkish carpet", "Ebru (art)", "Islamic calligraphy"],
    stay: ["Pera Palace Hotel", "Çırağan Palace", "Four Seasons Hotel Istanbul at Sultanahmet"],
  },
  "new-york-city": {
    food: ["New York-style pizza", "Bagel", "Pastrami", "New York-style cheesecake", "Hot dog", "Cuisine of New York City", "Black and white cookie"],
    festival: ["Macy's Thanksgiving Day Parade", "Tribeca Festival", "New York Fashion Week", "Village Halloween Parade", "St. Patrick's Day Parade, New York City"],
    craft: ["Tiffany glass", "Graffiti in New York City", "Hip-hop"],
    stay: ["Waldorf Astoria New York", "Plaza Hotel", "Hotel Chelsea", "The Carlyle", "St. Regis New York"],
  },
};
