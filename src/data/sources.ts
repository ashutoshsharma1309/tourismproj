/**
 * Central source registry (§22).
 *
 * Every factual claim rendered in the product must point at an entry here.
 * If a fact has no entry, it does not ship — it renders as "Data not available".
 *
 * `retrievedAt` is the date the claim was last checked against the source.
 */

export type SourceType =
  | "government"
  | "press"
  | "encyclopedia"
  | "commons"
  | "internal";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  /** ISO date this source was last checked. */
  retrievedAt: string;
  /** What may legitimately be cited from it. */
  covers: string;
  notes?: string;
}

export const SOURCES: Record<string, Source> = {
  "sikkim-tourist-trade-rules-2025": {
    id: "sikkim-tourist-trade-rules-2025",
    name: "Sikkim Registration of Tourist Trade Rules, 2025 — ₹50 tourist entry fee",
    type: "press",
    url: "https://sikkimexpress.com/news-details/sikkim-introduces-rs50-entry-fee-for-tourists-to-fund-sustainable-tourism-development",
    retrievedAt: "2026-08-14",
    covers:
      "Existence, amount (₹50 per person), collection point (hotels at check-in), one-month validity, exemptions, and destination (Tourism Sustainability Development Fund).",
    notes:
      "TODO: replace with the gazetted Rules PDF from the Government of Sikkim once a stable public URL is confirmed.",
  },
  "sikkim-entry-fee-uni": {
    id: "sikkim-entry-fee-uni",
    name: "UNI — Tourist entry fee of ₹50 per person imposed in Sikkim",
    type: "press",
    url: "https://www.uniindia.com/news/east/tourism-sikkim-entry-fee/3414026.html",
    retrievedAt: "2026-08-14",
    covers: "Corroborates the ₹50 entry fee and its March 2025 commencement.",
  },
  "sikkim-arrivals-2025": {
    id: "sikkim-arrivals-2025",
    name: "Sikkim tourist arrivals, 2025",
    type: "press",
    url: "https://www.travelandtourworld.com/news/article/sikkim-tourism-shows-resilience-in-2025-with-over-seventeen-lakh-visitors-domestic-travel-growth-outpaces-foreign-arrivals/",
    retrievedAt: "2026-08-14",
    covers:
      "2025 arrivals: 17,12,360 total (16,35,650 domestic + 61,710 foreign); 2024 comparison 16,25,241.",
    notes:
      "TODO: replace with the Tourism & Civil Aviation Department statistical handbook when a public URL is confirmed.",
  },
  "sikkim-tourism-portal": {
    id: "sikkim-tourism-portal",
    name: "Sikkim Tourism (Government of Sikkim) — attraction pages",
    type: "government",
    url: "https://sikkimtourism.gov.in/",
    retrievedAt: "2026-08-14",
    covers:
      "Checked for official monastery visiting hours. The portal's attraction pages do not publish opening times, closing times or days of operation for any monastery. That negative finding is why this archive shows no official hours.",
  },
  "community-timing-reports": {
    id: "community-timing-reports",
    name: "Travel-aggregator and visitor reports (non-authoritative)",
    type: "press",
    url: "https://www.trawell.in/sikkim/gangtok/rumtek-monastery",
    retrievedAt: "2026-08-14",
    covers:
      "Widely republished visiting hours for major monasteries. These sources disagree with one another — reported opening times for Rumtek alone range from 6am to 10am and closing from 5pm to 6pm — and none cites the monastery or the department. Usable only as a labelled 'reported' hint, never as fact.",
    notes: "Replace with monastery-confirmed hours before any of this is presented as authoritative.",
  },
  "sikkim-gov-festivals": {
    id: "sikkim-gov-festivals",
    name: "Government of Sikkim — Festivals in Sikkim",
    type: "government",
    url: "https://www.sikkim.gov.in/KnowSikkim/about-sikkim/festivals-in-sikkim",
    retrievedAt: "2026-08-17",
    covers:
      "The state's own account of twenty-two observances: Maghe Sankranti and the Jorethang Maghe Mela, Losar and the Gutor Chaam, Sonam Lochar, Chaite Dashain, Saga Dawa, Bhanu Jayanti, Drukpa Tshechi, Tendong Lho Rum Faat, Guru Rinpoche's Thunkar Tshechu, Indra Jatra, Pang Lhabsol, Dassain, Deepawali, Lhabab Duechen, Teyongsi Srijunga Sawan Tongnam, Barahimizong, Sakewa, the Kagyed dance, Losoong/Namsoong and Tamu Lochar — with the community each belongs to.",
    notes:
      "The single most authoritative source in this archive for which community keeps which festival. Where it disagrees with a travel site, it wins.",
  },
  "sikkim-tourism-dances": {
    id: "sikkim-tourism-dances",
    name: "Sikkim Tourism (Government of Sikkim) — Folk dances of Sikkim",
    type: "government",
    url: "https://sikkimtourism.gov.in/about/dances",
    retrievedAt: "2026-08-17",
    covers:
      "Eleven folk dances with their community attribution and instruments: Tamang Selo, Chutkay, Chu-Faat, Denong-Neh-Nah, Kagyed, Naumati, Ta-Shi-Yang-Ku, Tendong Lho Rum Faat, Yak Chham, Zo-Mal-Lok and Chyap-Brung.",
    notes:
      "Community attribution for every dance in this archive comes from here, not from secondary travel writing.",
  },
  "sikkim-tourism-cuisine": {
    id: "sikkim-tourism-cuisine",
    name: "Sikkim Tourism (Government of Sikkim) — Cuisine of Sikkim",
    type: "government",
    url: "https://sikkimtourism.gov.in/about/cuisine",
    retrievedAt: "2026-08-17",
    covers:
      "The state's description of Sikkimese cuisine as a blend of Tibetan, Nepali and Lepcha cooking; the foraged and organic pantry (ningro, nakima, bamboo shoot, kinema, dalle chillies); local beverages (arra, chaang/tongba); and signature dishes including sel roti, sha phaley, sishnu soup, churpi and momo.",
  },
  "sikkim-tourism-about": {
    id: "sikkim-tourism-about",
    name: "Sikkim Tourism (Government of Sikkim) — About Sikkim: people, culture and languages",
    type: "government",
    url: "https://sikkimtourism.gov.in/about/sikkim",
    retrievedAt: "2026-08-17",
    covers:
      "The state's own framing of its culture as three ethnic groups — Lepcha, Bhutia and Nepali — with notes on each community's origin, the spoken-language shares, state symbols and district descriptions.",
  },
  "sikkim-tourism-conduct": {
    id: "sikkim-tourism-conduct",
    name: "Sikkim Tourism (Government of Sikkim) — Do's and Don'ts",
    type: "government",
    url: "https://sikkimtourism.gov.in/do-and-do-not",
    retrievedAt: "2026-08-17",
    covers:
      "Official visitor conduct guidance: monastery and sacred-site etiquette, photography permission, the single-use plastic restrictions, permits, waste, wildlife, high-altitude safety and community support.",
  },
  "utsav-gov-in": {
    id: "utsav-gov-in",
    name: "Utsav — Ministry of Tourism, Government of India",
    type: "government",
    url: "https://utsav.gov.in/view-event/pang-lhabsol-1",
    retrievedAt: "2026-08-17",
    covers:
      "Pang Lhabsol: the consecration of Khangchendzonga as guardian deity, Lhatsun Chenpo's vision at Dzongri, Chakdor Namgyal's Pangtoed dance, the masks worn by Khangchendzonga and Yabdu, Mahakala's entry, and the Tsuklakhang venue. Event listed by the Tourism & Civil Aviation Department, Government of Sikkim.",
  },
  "wikipedia": {
    id: "wikipedia",
    name: "Wikipedia",
    type: "encyclopedia",
    url: "https://en.wikipedia.org/",
    retrievedAt: "2026-08-14",
    covers:
      "Monastery names, districts, lineage, founding years, coordinates and historical background. Tertiary source — medium confidence, per-article URLs recorded on each record.",
  },
  "wikimedia-commons": {
    id: "wikimedia-commons",
    name: "Wikimedia Commons",
    type: "commons",
    url: "https://commons.wikimedia.org/",
    retrievedAt: "2026-08-14",
    covers:
      "Freely licensed photography. Each file was resolved by searching the subject's own name and HEAD-verified reachable.",
  },
  "openstreetmap": {
    id: "openstreetmap",
    name: "OpenStreetMap",
    type: "encyclopedia",
    url: "https://www.openstreetmap.org/copyright",
    retrievedAt: "2026-08-14",
    covers: "Base map tiles for the heritage map.",
  },

  /* ---------------------------------------------------------------------
     Added for the historical timeline and the digital heritage archive.
     --------------------------------------------------------------------- */

  "sikkim-ipr": {
    id: "sikkim-ipr",
    name: "Information & Public Relations Department, Government of Sikkim",
    type: "government",
    url: "https://ipr.sikkim.gov.in/Home/AboutSikkim",
    retrievedAt: "2026-08-17",
    covers:
      "Sikkim becoming the 22nd state of India in 1975 following a political transition, and its declaration as India's first fully organic state in 2016.",
  },
  "unesco-whc": {
    id: "unesco-whc",
    name: "UNESCO World Heritage Centre",
    type: "government",
    url: "https://whc.unesco.org/en/list/1513/",
    retrievedAt: "2026-08-17",
    covers:
      "Khangchendzonga National Park's 2016 inscription as India's first mixed World Heritage property, under criteria (iii), (vi), (vii) and (x).",
    notes:
      "whc.unesco.org answers automated requests with 403; the inscription year, type and criteria were corroborated against the property's encyclopedia record.",
  },

  /* ---------------------------------------------------------------------
     Added for the immersive experience, visitor voices and the timeline.
     --------------------------------------------------------------------- */

  "wikivoyage": {
    id: "wikivoyage",
    name: "Wikivoyage — traveller-written destination guides",
    type: "encyclopedia",
    url: "https://en.wikivoyage.org/",
    retrievedAt: "2026-08-17",
    covers:
      "Visitor-perspective notes on reaching, entering and seeing each site. Written collaboratively by travellers and licensed CC BY-SA 4.0, so short excerpts may be quoted with attribution.",
    notes:
      "These are guide notes, not star-rated reviews. Listings are unsigned: there is no author to name, and none is invented. No rating or date is derived from them.",
  },
  "youtube": {
    id: "youtube",
    name: "YouTube — embedded player and public oEmbed endpoint",
    type: "internal",
    url: "https://www.youtube.com/",
    retrievedAt: "2026-08-17",
    covers:
      "Existence, title, channel and thumbnail of every embedded monastery video, resolved through YouTube's own keyless oEmbed endpoint. Playback happens in YouTube's embedded player; nothing is downloaded, re-encoded or re-hosted.",
  },
  "google-places": {
    id: "google-places",
    name: "Google Places API — visitor ratings and reviews",
    type: "internal",
    url: "https://developers.google.com/maps/documentation/places/web-service/place-details",
    retrievedAt: "2026-08-17",
    covers:
      "Visitor ratings and reviews, when GOOGLE_PLACES_API_KEY is configured. It is unset in this build, so no Google review data is shown and no rating is averaged.",
  },
};

export type Confidence = "high" | "medium" | "unverified";

/** Provenance attached to any displayed fact or record (§15). */
export interface Provenance {
  sourceId: keyof typeof SOURCES | (string & {});
  /** Deep link to the specific page/article backing this record. */
  sourceUrl?: string;
  verifiedAt: string;
  confidence: Confidence;
  /** Set when a record is knowingly incomplete. */
  caveat?: string;
}

export function getSource(id: string): Source | undefined {
  return SOURCES[id];
}
