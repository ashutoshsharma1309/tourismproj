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

/**
 * WHICH DESTINATION A SOURCE MAY BE CITED FOR (Phase 2.5).
 *
 * Sources used to be implicitly global, which was harmless while Sikkim was
 * the only destination and dangerous the moment it stopped being. A research
 * engine that discovers a source while researching Kyoto must not be able to
 * let it drift into evidence for Rome, and the only reliable way to prevent
 * that is to make the relationship part of the record rather than something
 * inferred from the id or the URL.
 *
 * Modelled as a discriminated union rather than an optional `destinationId`
 * for one reason: "applies everywhere" is a real, distinct answer, and a null
 * field cannot tell it apart from "nobody said". Wikipedia genuinely is
 * citable for any destination; the Sikkim Tourism portal genuinely is not.
 *
 * `country` exists because it is genuinely needed, not for symmetry: the
 * Ministry of Tourism's Utsav portal covers every Indian destination, and ten
 * of the fifteen registered destinations are in India.
 */
export type SourceScope =
  /** Citable only for this destination. */
  | { kind: "destination"; destinationId: string }
  /** Citable for any destination in this country (ISO 3166-1 alpha-2). */
  | { kind: "country"; countryCode: string }
  /** A reference work or service citable anywhere. */
  | { kind: "global" };

/**
 * HOW TERRASTORY OBTAINED THIS SOURCE.
 *
 * Deliberately orthogonal to `SourceType`, which says what kind of publisher
 * it is. A government portal found by a person and a government portal
 * surfaced by an automated search are the same `type` and very different
 * provenance, and Phase 3 turns that difference into a gate: a source a model
 * proposed but no human confirmed must never back a published claim.
 *
 * Every record today is `human-curated`, because every record today was
 * written by a person — including the entries for Wikipedia and Commons,
 * whose *contents* offline scripts consume but whose registry entries a human
 * authored. Recording that honestly is what makes the Phase 3 values mean
 * something when they start appearing.
 */
export type RetrievalMethod =
  /** A person located, read and entered it. */
  | "human-curated"
  /** An offline script fetched it from a documented API endpoint. */
  | "agent-api"
  /** Phase 3: discovered by automated web search. Requires review. */
  | "web-search"
  /** Phase 3: proposed by a model, unconfirmed. MUST NOT back a published claim. */
  | "model-proposed";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  /**
   * Which destination(s) this source may be cited for. Required, so a source
   * cannot enter the registry without stating it — the compiler is the
   * enforcement, not a convention someone has to remember.
   */
  scope: SourceScope;
  /** How this source was obtained. Required, for the same reason. */
  retrievalMethod: RetrievalMethod;
  /** ISO date this source was last checked. */
  retrievedAt: string;
  /** What may legitimately be cited from it. */
  covers: string;
  notes?: string;
}

/** Scoping shorthand. */
const SIKKIM: SourceScope = { kind: "destination", destinationId: "sikkim" };
const INDIA: SourceScope = { kind: "country", countryCode: "IN" };
const GLOBAL: SourceScope = { kind: "global" };
/** For destinations beyond Sikkim, scoped as their official sources are added. */
const forDestination = (destinationId: string): SourceScope => ({ kind: "destination", destinationId });

export const SOURCES: Record<string, Source> = {
  "sikkim-tourist-trade-rules-2025": {
    id: "sikkim-tourist-trade-rules-2025",
    name: "Sikkim Registration of Tourist Trade Rules, 2025 — ₹50 tourist entry fee",
    type: "press",
    url: "https://sikkimexpress.com/news-details/sikkim-introduces-rs50-entry-fee-for-tourists-to-fund-sustainable-tourism-development",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-14",
    covers:
      "Existence, amount (₹50 per person), collection point (hotels at check-in), one-month validity, exemptions, and destination (Tourism Sustainability Development Fund).",
    notes:
      "Cited from press reporting. The gazetted Rules themselves are the primary source, but the Government of Sikkim has not published them at a stable public URL, so this record cites the reporting and says so.",
  },
  "sikkim-entry-fee-uni": {
    id: "sikkim-entry-fee-uni",
    name: "UNI — Tourist entry fee of ₹50 per person imposed in Sikkim",
    type: "press",
    url: "https://www.uniindia.com/news/east/tourism-sikkim-entry-fee/3414026.html",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-14",
    covers: "Corroborates the ₹50 entry fee and its March 2025 commencement.",
  },
  "sikkim-arrivals-2025": {
    id: "sikkim-arrivals-2025",
    name: "Sikkim tourist arrivals, 2025",
    type: "press",
    url: "https://www.travelandtourworld.com/news/article/sikkim-tourism-shows-resilience-in-2025-with-over-seventeen-lakh-visitors-domestic-travel-growth-outpaces-foreign-arrivals/",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-14",
    covers:
      "2025 arrivals: 17,12,360 total (16,35,650 domestic + 61,710 foreign); 2024 comparison 16,25,241.",
    notes:
      "Cited from press reporting of the department's figures. The Tourism & Civil Aviation Department's statistical handbook is the primary source; no public URL for it has been confirmed, so the reporting is cited in its place.",
  },
  "sikkim-tourism-portal": {
    id: "sikkim-tourism-portal",
    name: "Sikkim Tourism (Government of Sikkim) — attraction pages",
    type: "government",
    url: "https://sikkimtourism.gov.in/",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-14",
    covers:
      "Checked for official monastery visiting hours. The portal's attraction pages do not publish opening times, closing times or days of operation for any monastery. That negative finding is why this archive shows no official hours.",
  },
  "community-timing-reports": {
    id: "community-timing-reports",
    name: "Travel-aggregator and visitor reports (non-authoritative)",
    type: "press",
    url: "https://www.trawell.in/sikkim/gangtok/rumtek-monastery",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
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
    scope: SIKKIM,
    retrievalMethod: "human-curated",
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
    scope: SIKKIM,
    retrievalMethod: "human-curated",
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
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-17",
    covers:
      "The state's description of Sikkimese cuisine as a blend of Tibetan, Nepali and Lepcha cooking; the foraged and organic pantry (ningro, nakima, bamboo shoot, kinema, dalle chillies); local beverages (arra, chaang/tongba); and signature dishes including sel roti, sha phaley, sishnu soup, churpi and momo.",
  },
  "sikkim-tourism-about": {
    id: "sikkim-tourism-about",
    name: "Sikkim Tourism (Government of Sikkim) — About Sikkim: people, culture and languages",
    type: "government",
    url: "https://sikkimtourism.gov.in/about/sikkim",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-17",
    covers:
      "The state's own framing of its culture as three ethnic groups — Lepcha, Bhutia and Nepali — with notes on each community's origin, the spoken-language shares, state symbols and district descriptions.",
  },
  "sikkim-tourism-conduct": {
    id: "sikkim-tourism-conduct",
    name: "Sikkim Tourism (Government of Sikkim) — Do's and Don'ts",
    type: "government",
    url: "https://sikkimtourism.gov.in/do-and-do-not",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-17",
    covers:
      "Official visitor conduct guidance: monastery and sacred-site etiquette, photography permission, the single-use plastic restrictions, permits, waste, wildlife, high-altitude safety and community support.",
  },
  "utsav-gov-in": {
    id: "utsav-gov-in",
    name: "Utsav — Ministry of Tourism, Government of India",
    type: "government",
    url: "https://utsav.gov.in/view-event/pang-lhabsol-1",
    scope: INDIA,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-17",
    covers:
      "Pang Lhabsol: the consecration of Khangchendzonga as guardian deity, Lhatsun Chenpo's vision at Dzongri, Chakdor Namgyal's Pangtoed dance, the masks worn by Khangchendzonga and Yabdu, Mahakala's entry, and the Tsuklakhang venue. Event listed by the Tourism & Civil Aviation Department, Government of Sikkim.",
  },
  "wikipedia": {
    id: "wikipedia",
    name: "Wikipedia",
    type: "encyclopedia",
    url: "https://en.wikipedia.org/",
    scope: GLOBAL,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-14",
    covers:
      "Monastery names, districts, lineage, founding years, coordinates and historical background. Tertiary source — medium confidence, per-article URLs recorded on each record.",
  },
  "wikimedia-commons": {
    id: "wikimedia-commons",
    name: "Wikimedia Commons",
    type: "commons",
    url: "https://commons.wikimedia.org/",
    scope: GLOBAL,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-14",
    covers:
      "Freely licensed photography. Each file was resolved by searching the subject's own name and HEAD-verified reachable.",
  },
  "openstreetmap": {
    id: "openstreetmap",
    name: "OpenStreetMap",
    type: "encyclopedia",
    url: "https://www.openstreetmap.org/copyright",
    scope: GLOBAL,
    retrievalMethod: "human-curated",
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
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-17",
    covers:
      "Sikkim becoming the 22nd state of India in 1975 following a political transition, and its declaration as India's first fully organic state in 2016.",
  },
  "unesco-whc": {
    id: "unesco-whc",
    name: "UNESCO World Heritage Centre",
    type: "government",
    url: "https://whc.unesco.org/en/list/1513/",
    scope: GLOBAL,
    retrievalMethod: "human-curated",
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
    scope: GLOBAL,
    retrievalMethod: "human-curated",
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
    scope: GLOBAL,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-17",
    covers:
      "Existence, title, channel and thumbnail of every embedded monastery video, resolved through YouTube's own keyless oEmbed endpoint. Playback happens in YouTube's embedded player; nothing is downloaded, re-encoded or re-hosted.",
  },
  "sikkim-tourism-permits": {
    id: "sikkim-tourism-permits",
    name: "Protected & Restricted Area Permits — Tourism & Civil Aviation Department, Government of Sikkim",
    type: "government",
    url: "https://sikkimtourism.gov.in/pap",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-18",
    covers:
      "Which Sikkim destinations require a Protected Area Permit, the issuing authority for each and how it differs for foreign nationals, documents required at Nathula, Gurudongmar and Zuluk, the two-wheeler permit conditions, and the Restricted Area Permit rules for foreign nationals.",
    notes:
      "The RAP issuing-office list on the same source is deliberately not reproduced — its markup pairs each office name with the following office's address, and a wrong address for a permit office is worse than a link out.",
  },
  "sikkim-tourism-do-and-do-not": {
    id: "sikkim-tourism-do-and-do-not",
    name: "Do and Do Not — Tourism & Civil Aviation Department, Government of Sikkim",
    type: "government",
    url: "https://sikkimtourism.gov.in/do-and-do-not",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-18",
    covers:
      "Responsible-tourism guidance for visitors to Sikkim: environment and waste, wildlife, single-use plastic restrictions, permits and identity documents, road and high-altitude safety, conduct at religious sites, photography etiquette, adventure tourism, smoking and alcohol, emergency cooperation and community tourism. 64 guidelines across 14 sections.",
    notes:
      "Each guideline is ticked or crossed on the department's page and that marking is preserved as the item's polarity. It is load-bearing: several crossed items are phrased as bare noun phrases which, flattened, read as instructions to do the opposite of what is intended.",
  },
  "sikkim-tourism-registered-hotels": {
    id: "sikkim-tourism-registered-hotels",
    name: "Registered Hotels — Tourism & Civil Aviation Department, Government of Sikkim",
    type: "government",
    url: "https://sikkimtourism.gov.in/registered-establishments/hotels",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-18",
    covers:
      "Name, proprietor, address, district, star category where one is recorded, departmental registration number, contact and licence validity for every hotel on the state register. 905 named entries of 907 reported; the remaining two carry no publishable name.",
    notes:
      "Read by `npm run ingest:tourism`. The department publishes this as a paginated table inside an Angular bundle with no JSON API, so it is rendered and read rather than fetched. Note that the register states a star category for only 22 of the 905 entries — the previous directory here asserted a tier for all 20 of its properties, which the register does not support.",
  },
  "sikkim-tourism-registered-travel-agents": {
    id: "sikkim-tourism-registered-travel-agents",
    name: "Registered Travel Agents \u2014 Tourism & Civil Aviation Department, Government of Sikkim",
    type: "government",
    url: "https://sikkimtourism.gov.in/registered-establishments/travel-agents",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-18",
    covers:
      "Agency name, address, district, departmental grade where one is recorded, registration number, telephone, email or website, date of issue and licence validity for every travel agency on the state register. 1,858 entries, matching the total the department reports.",
    notes:
      "Read by `npm run ingest:tourism` across 75 paginated views and promoted by `scripts/promote-registers.mjs`. This register is load-bearing rather than decorative: the department's own permit rules route Nathula, Tsomgo, Singalila, Green Lake and Maenam permits through a registered travel agency, so this list is a precondition for those trips. The department records a grade for only 70 of the 1,858 entries \u2014 an absent grade means the register states none, and is never rendered as a low one.",
  },
  "sikkim-tourist-trade-act-2024": {
    id: "sikkim-tourist-trade-act-2024",
    name: "The Sikkim Registration of Tourist Trade Bill, 2024 (Bill 23 of 2024)",
    type: "government",
    url: "https://prsindia.org/files/bills_acts/bills_states/sikkim/2024/Bill23of2024SK.pdf",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-24",
    covers:
      "The statutory basis for registering Sikkim's tourism trade. \u00a72 defines a \u201ctourism entity\u201d to include hotels, resorts, homestays, travel agents, tour operators, tour guides and adventure operators. \u00a76 makes registration mandatory before a trade licence and declares unregistered operators defaulters. \u00a78(2) leaves the renewal period to the Rules. \u00a710(1)(j) makes failure to renew a ground for cancellation and removal from the register.",
    notes:
      "Cited from the PRS India copy because the department's own mirror at sikkimtourism.gov.in returns the Angular app shell rather than the PDF. Note what this source does NOT establish: \u00a78(2) defers the licence validity period to the Sikkim Registration of Tourist Trade Rules, 2025, whose full text is not published at any public URL. So no statement about how long a registration lasts is sourceable, and the product uses only the per-row validity date the register itself prints.",
  },
  "sikkim-glof-2023": {
    id: "sikkim-glof-2023",
    name: "The Sikkim flood of October 2023: drivers, causes, and impacts of a multihazard cascade (Science)",
    type: "press",
    url: "https://www.science.org/doi/10.1126/science.ads2659",
    scope: SIKKIM,
    retrievalMethod: "human-curated",
    retrievedAt: "2026-08-24",
    covers:
      "The 4 October 2023 South Lhonak glacial-lake outburst flood: a landslide-triggered outburst that travelled the Teesta, destroyed thirteen bridges and the Chungthang hydropower plant, and wiped out connectivity infrastructure along the river through North Sikkim. Cited only for the destruction of transport infrastructure in 2023.",
    notes:
      "What this source does NOT establish, and what must therefore not be claimed from it: the state of road access in any later year, or any effect on tourist arrivals or hotel supply in Mangan district. Those would need a separate source and none was found. The capacity page cites this to say a shock occurred, never to explain a present-day figure.",
  },
  /* ---------------------------------------------------------------------
     Phase 4 — higher-tier sources for the pilot destinations.
     Each URL was fetched and checked by hand before being added here; the
     retrieval date is recorded on the record. Discovery never guesses an
     official portal address.
     --------------------------------------------------------------------- */
  "rajasthan-tourism-jaipur": {
    id: "rajasthan-tourism-jaipur",
    name: "Jaipur — Department of Tourism, Government of Rajasthan",
    type: "government",
    url: "https://tourism.rajasthan.gov.in/jaipur.html",
    scope: forDestination("jaipur"),
    retrievalMethod: "agent-api",
    retrievedAt: "2026-08-25",
    covers:
      "The state tourism department's own description of Jaipur: its founding, monuments and cultural context. Authoritative for what the Government of Rajasthan states about the city; not a source for prices, timings or permits, which this project does not take from any narrative page.",
  },
  "incredible-india-jaipur": {
    id: "incredible-india-jaipur",
    name: "Jaipur — Incredible India, Ministry of Tourism",
    type: "government",
    url: "https://www.incredibleindia.gov.in/en/rajasthan/jaipur",
    scope: forDestination("jaipur"),
    retrievalMethod: "agent-api",
    retrievedAt: "2026-08-25",
    covers:
      "The national tourism ministry's destination page for Jaipur — heritage sites and cultural description.",
  },
  "google-places": {
    id: "google-places",
    name: "Google Places API — visitor ratings and reviews",
    type: "internal",
    url: "https://developers.google.com/maps/documentation/places/web-service/place-details",
    scope: GLOBAL,
    retrievalMethod: "human-curated",
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

/**
 * Look up a source. Returns undefined for an unregistered id.
 *
 * Note that `sourceId: "internal"` is deliberately NOT a key in SOURCES, even
 * though "internal" is a valid `SourceType`. They are two different things
 * sharing a word: the *type* marks a registered source we operate ourselves
 * (the YouTube oEmbed endpoint, the Places API), while the *id* is the sentinel
 * a record carries when no external source was found for it at all — 20 hotels,
 * one monastery and one story.
 *
 * Resolving to undefined is the point. SourceNote renders "No published source
 * located" and "Last checked" instead of a link and "Last verified" precisely
 * because there is nothing here to return. Adding a SOURCES.internal entry would
 * make every unsourced record display a source and claim verification, which is
 * the failure this registry exists to prevent.
 */
export function getSource(id: string): Source | undefined {
  return SOURCES[id];
}

/* =========================================================================
   DESTINATION SCOPING (Phase 2.5)
   ========================================================================= */

/**
 * May this source be cited as evidence for this destination?
 *
 * Structural, not textual. There is deliberately no matching on the id, the
 * name or the URL: "sikkim-tourism-portal" is citable for Sikkim because its
 * `scope` says so, not because its id contains the word. A Phase 3 research
 * engine that discovers a source for Kyoto and names it anything at all still
 * cannot have it count as evidence for Rome.
 *
 * `countryCode` comes from the caller rather than being looked up here, so
 * this module stays free of a dependency on the destination registry and can
 * be imported anywhere without pulling it in.
 */
export function sourceAppliesTo(
  source: Source,
  destinationId: string,
  countryCode?: string,
): boolean {
  switch (source.scope.kind) {
    case "global":
      return true;
    case "country":
      /* Without a country we cannot confirm the match, so we refuse it.
         Failing closed is the only safe default for an evidence relationship. */
      return countryCode !== undefined && source.scope.countryCode === countryCode;
    case "destination":
      return source.scope.destinationId === destinationId;
  }
}

/** Every source citable for a destination, in registry order. */
export function sourcesForDestination(destinationId: string, countryCode?: string): Source[] {
  return Object.values(SOURCES).filter((s) => sourceAppliesTo(s, destinationId, countryCode));
}

/**
 * Sources that may back a *published* claim.
 *
 * Phase 3 gate. A source a model proposed but no human confirmed is registered
 * and traceable, and it is not evidence. Filtering here means the rule lives
 * with the model rather than in whichever renderer remembers to apply it.
 */
export function publishableSources(sources: Source[]): Source[] {
  return sources.filter((s) => s.retrievalMethod !== "model-proposed");
}
