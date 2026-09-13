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
  /* INDIA-ONLY (SIH 2026 final): the eight added cities. Over-long on purpose;
     check-titles.mjs keeps only the titles that are real articles. */
  amritsar: {
    food: ["Amritsari kulcha", "Amritsari fish", "Chole bhature", "Lassi", "Punjabi cuisine", "Sarson da saag", "Makki di roti", "Langar (Sikhism)", "Pinni", "Tandoori chicken", "Kulfi"],
    festival: ["Vaisakhi", "Guru Nanak Gurpurab", "Bandi Chhor Divas", "Hola Mohalla", "Lohri", "Diwali"],
    craft: ["Phulkari", "Jutti", "Dhurrie", "Parandi", "Punjabi suit"],
    stay: [],
  },
  ahmedabad: {
    food: ["Gujarati cuisine", "Dhokla", "Khaman", "Fafda", "Thepla", "Undhiyu", "Khandvi", "Gujarati thali", "Dabeli", "Handvo", "Sev khamani"],
    festival: ["Uttarayan", "International Kite Festival in Gujarat", "Navaratri", "Rath Yatra (Ahmedabad)", "Diwali", "Kankaria Carnival"],
    craft: ["Bandhani", "Patola", "Ajrakh", "Block printing", "Mata ni Pachedi", "Rogan painting", "Kutch embroidery"],
    stay: [],
  },
  lucknow: {
    food: ["Awadhi cuisine", "Tunday Kababi", "Galouti kebab", "Kakori kebab", "Awadhi biryani", "Sheermal", "Nihari", "Makhan malai", "Paan", "Kulfi", "Basket chaat"],
    festival: ["Lucknow Mahotsav", "Muharram", "Eid al-Fitr", "Diwali", "Holi", "Bada Mangal"],
    craft: ["Chikan (embroidery)", "Zardozi", "Ittar", "Mukaish", "Lucknow zardozi"],
    stay: [],
  },
  pune: {
    food: ["Maharashtrian cuisine", "Misal pav", "Bakarwadi", "Puran poli", "Vada pav", "Poha", "Sabudana khichdi", "Mastani (drink)", "Pithla", "Shrewsbury biscuit", "Bhakri"],
    festival: ["Ganesh Chaturthi", "Sawai Gandharva Bhimsen Mahotsav", "Gudi Padwa", "Pandharpur Wari", "Diwali", "Pune Festival"],
    craft: ["Paithani", "Kolhapuri chappal", "Warli painting", "Tambat", "Copper craft"],
    stay: [],
  },
  mysuru: {
    food: ["Mysore pak", "Masala dosa", "Karnataka cuisine", "Bisi bele bath", "Ragi mudde", "Indian filter coffee", "Set dosa", "Holige", "Mysore bonda", "Chow chow bath", "Kesari bath"],
    festival: ["Mysore Dasara", "Ugadi", "Deepavali", "Makar Sankranti", "Vairamudi Brahmotsava"],
    craft: ["Mysore silk", "Mysore painting", "Channapatna toys", "Mysore Sandal Soap", "Mysore rosewood inlay", "Ganjifa", "Sandalwood carving"],
    stay: [],
  },
  madurai: {
    food: ["Jigarthanda", "Tamil cuisine", "Idli", "Dosa", "Paruthi paal", "Chettinad cuisine", "Sambar (dish)", "Indian filter coffee", "Pongal (dish)", "Kari dosai", "Madurai malli"],
    festival: ["Chithirai Thiruvizha", "Pongal", "Thaipusam", "Diwali", "Aadi Perukku", "Float Festival"],
    craft: ["Sungudi", "Madurai malli", "Kolam", "Thanjavur painting", "Pattamadai pai", "Bronze casting"],
    stay: [],
  },
  bhubaneswar: {
    food: ["Odia cuisine", "Dalma", "Pakhala", "Chhena poda", "Odisha Rasagola", "Chhena jhili", "Khaja", "Santula", "Pitha", "Dahi vada", "Chhena gaja"],
    festival: ["Rath Yatra", "Raja Parba", "Durga Puja", "Bali Jatra", "Ashokashtami", "Konark Dance Festival", "Nuakhai", "Kartik Purnima"],
    craft: ["Pattachitra", "Pipili applique work", "Tarakasi", "Sambalpuri saree", "Dhokra", "Bomkai sari", "Odisha Ikat"],
    stay: [],
  },
  srinagar: {
    food: ["Kashmiri cuisine", "Wazwan", "Rogan josh", "Kahwah", "Noon chai", "Yakhni", "Gushtaba", "Rista", "Kashmiri pulao", "Harisa (dish)", "Tabak maaz", "Modur pulav"],
    festival: ["Tulip Festival (Srinagar)", "Eid al-Fitr", "Eid al-Adha", "Nowruz", "Kheer Bhawani", "Maha Shivaratri", "Baisakhi"],
    craft: ["Pashmina", "Kashmir shawl", "Kashmiri papier-mache", "Kashmiri carpet", "Walnut wood carving", "Kani shawl", "Namda (rug)", "Khatamband", "Sozni embroidery"],
    stay: [],
  },
};
