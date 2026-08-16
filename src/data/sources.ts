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
